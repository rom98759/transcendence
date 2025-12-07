import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as authService from "../services/auth.service.js";
import { generateJWT } from "../services/jwt.service.js";
import { logger } from "../utils/logger.js";
import { ValidationSchemas } from "../utils/validation.js";
import { AUTH_CONFIG, UserRole } from "../utils/constants.js";

/**
 * Configuration des cookies avec security enforcée en production
 */
function getCookieOptions(maxAgeSeconds: number = AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS) {
  const env = (globalThis as any).process?.env || {};
  const isProduction = env.NODE_ENV === 'production';
  const forceSecure = isProduction || env.FORCE_SECURE_COOKIE === 'true';

  return {
    httpOnly: true,
    secure: forceSecure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds
  };
}

export async function registerHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  // Validation Zod
  const validation = ValidationSchemas.register.safeParse(request.body);
  if (!validation.success) {
    this.log.warn({ event: 'register_validation_failed', errors: validation.error.issues });
    return reply.code(400).send({
      error: {
        message: 'Invalid registration data',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      }
    });
  }

  const { username, email, password } = validation.data;
  logger.info({ event: 'register_attempt', username, email });

  try {
    if (authService.findByUsername(username)) {
      logger.warn({ event: 'register_failed', username, reason: 'user_exists' });
      return reply.code(400).send({ error: { message: 'User already exists', code: 'USER_EXISTS' } });
    }
    if (authService.findByEmail(email)) {
      logger.warn({ event: 'register_failed', email, reason: 'email_exists' });
      return reply.code(400).send({ error: { message: 'Email already in use', code: 'EMAIL_EXISTS' } });
    }
  } catch (err: any) {
    logger.error({ event: 'register_validation_error', username, email, err: err?.message || err });
    if (err && err.code === 'DB_FIND_USER_BY_USERNAME_ERROR') {
      return reply.code(500).send({ error: { message: 'Database error during username verification', code: 'DB_FIND_USER_BY_USERNAME_ERROR' } });
    }
    if (err && err.code === 'DB_FIND_USER_BY_EMAIL_ERROR') {
      return reply.code(500).send({ error: { message: 'Database error during email verification', code: 'DB_FIND_USER_BY_EMAIL_ERROR' } });
    }
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }

  try {
    const id = authService.createUser({ username, email, password });
    logger.info({ event: 'register_success', username, email });
    return reply.code(201).send({ result: { message: 'User registered successfully', id } });
  } catch (err: any) {
    logger.error({ event: 'register_error', username, email, err: err?.message || err });
    // Add errors handling
    if (err && err.code === 'USER_EXISTS') {
      return reply.code(400).send({ error: { message: err.message || 'User already exists', code: 'USER_EXISTS' } });
    }
    if (err && err.code === 'EMAIL_EXISTS') {
      return reply.code(400).send({ error: { message: err.message || 'Email already in use', code: 'EMAIL_EXISTS' } });
    }
    if (err && err.code === 'DB_CREATE_USER_ERROR') {
      return reply.code(500).send({ error: { message: 'Internal error during user creation', code: 'DB_CREATE_USER_ERROR' } });
    }
    if (err && err.code === 'UNIQUE_VIOLATION') {
      return reply.code(400).send({ error: { message: 'Data conflicts with uniqueness constraints', code: 'UNIQUE_VIOLATION' } });
    }

    // Else internal server error
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

export async function loginHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  // Validation Zod
  const validation = ValidationSchemas.login.safeParse(request.body);
  if (!validation.success) {
    this.log.warn({ event: 'login_validation_failed', errors: validation.error.issues });
    return reply.code(400).send({
      error: {
        message: 'Invalid login data',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      }
    });
  }

  const { username, email, password } = validation.data;
  const identifier = username || email;

  // TypeScript safety check
  if (!identifier) {
    logger.warn({ event: 'login_failed', reason: 'missing_identifier' });
    return reply.code(400).send({ error: { message: 'Username or email required', code: 'MISSING_IDENTIFIER' } });
  }

  logger.info({ event: 'login_attempt', identifier });

  try {
    const user = authService.findUser(identifier);
    const valid = user && authService.validateUser(identifier, password);
    if (!valid || !user) {
      logger.warn({ event: 'login_failed', identifier, reason: 'invalid_credentials' });
      return reply.code(401).send({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

    // Vérifier si la 2FA est activée
    const has2FA = authService.is2FAEnabled(user.id || 0);

    if (has2FA) {
      // 2FA activée : créer un loginToken temporaire
      const loginToken = authService.createLoginToken(user.id || 0);
      logger.info({ event: 'login_2fa_required', identifier, userId: user.id });

      // Stocker le loginToken dans un cookie temporaire (2 minutes)
      reply.setCookie('2fa_login_token', loginToken, getCookieOptions(AUTH_CONFIG.COOKIE_2FA_MAX_AGE_SECONDS));

      return reply.code(200).send({
        result: {
          require2FA: true,
          message: 'Please provide your 2FA code'
        }
      });
    } else {
      // Pas de 2FA : générer le JWT directement
      const token = generateJWT(this, user.id || 0, user.username, '1h');
      logger.info({ event: 'login_success', identifier });

      reply.setCookie("token", token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
        .code(200)
        .send({ result: { message: 'Login successful' } });
    }
  } catch (err: any) {
    logger.error({ event: 'login_error', identifier, err: err?.message || err });
    if (err && err.code === 'DB_FIND_USER_BY_IDENTIFIER_ERROR') {
      return reply.code(500).send({ error: { message: 'Database error during user lookup', code: 'DB_FIND_USER_BY_IDENTIFIER_ERROR' } });
    }
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

export async function logoutHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  logger.info({ event: 'logout', user: username });
  return reply.clearCookie("token").send({ result: { message: 'Logged out successfully' } });
}

// Appeler depuis gateway pour vérifier la validité du token cookie
export async function verifyHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: 'verify_token_missing' });
    return reply.code(401).send({
      error: {
        message: 'No token provided',
        code: 'TOKEN_MISSING'
      }
    });
  }

  try {
    // Vérifie et décode le token JWT
    const decoded = this.jwt.verify(token) as { sub: number; username: string };

    // Vérifier user found
    const user = authService.findByUsername(decoded.username);
    if (!user) {
      logger.warn({ event: 'verify_user_not_found', username: decoded.username });
      return reply.code(401).send({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    logger.info({ event: 'verify_success', username: decoded.username, id: decoded.sub });
    return reply.code(200).send({
      result: {
        valid: true,
        user: {
          id: decoded.sub,
          username: decoded.username
        }
      }
    });
  } catch (err: any) {
    logger.warn({ event: 'verify_token_invalid', err: err?.message || err });
    return reply.code(401).send({
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
    });
  }
}

// DEV ONLY - À supprimer    ADMIN ONLY
export async function meHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const idHeader = (request.headers as any)["x-user-id"] || null;
  const id = idHeader ? Number(idHeader) : null;
  logger.info({ event: 'me_request_dev_only', user: username, id });
  return reply.code(200).send({ data: { user: username ? { id, username } : null } });
}

// ADMIN ONLY
export async function listAllUsers(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const idHeader = (request.headers as any)["x-user-id"];
  const userId = idHeader ? Number(idHeader) : null;
  const username = (request.headers as any)["x-user-name"] || null;

  logger.info({ event: 'list_users_attempt', user: username, userId });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!userId || !authService.hasRole(userId, UserRole.ADMIN)) {
    logger.warn({ event: 'list_users_forbidden', user: username, userId });
    return reply.code(403).send({ error: { message: 'Forbidden - Admin role required', code: 'FORBIDDEN' } });
  }

  try {
	const users = authService.listUsers();
	logger.info({ event: 'list_users_success', user: username, count: users.length });
	return reply.code(200).send({ result: { users } });
  } catch (err: any) {
	logger.error({ event: 'list_users_error', user: username, err: err?.message || err });
	return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// Handler pour les routes inconnues
export async function notFoundHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  logger.warn({
    event: 'route_not_found',
    method: request.method,
    url: request.url,
    user: username
  });
  return reply.code(404).send({
    error: {
      message: `Route not found: ${request.method} ${request.url}`,
      code: 'ROUTE_NOT_FOUND'
    }
  });
}

// ============================================
// 2FA Handlers
// ============================================

/**
 * POST /2fa/setup
 * Génère un secret TOTP et un QR code pour configurer la 2FA
 */
export async function setup2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: '2fa_setup_token_missing' });
    return reply.code(401).send({
      error: { message: 'Authentication required', code: 'TOKEN_MISSING' }
    });
  }

  try {
    // Vérifier le token JWT
    const decoded = this.jwt.verify(token) as { sub: number; username: string };
    const userId = decoded.sub;
    const username = decoded.username;

    // Vérifier si 2FA déjà activée
    if (authService.is2FAEnabled(userId)) {
      logger.warn({ event: '2fa_setup_already_enabled', userId, username });
      return reply.code(400).send({
        error: { message: '2FA is already enabled for this account', code: '2FA_ALREADY_ENABLED' }
      });
    }

    // Générer le secret TOTP
    const { secret, otpauthUrl } = authService.generate2FASecret(username);

    // Générer le QR code
    const qrCode = await authService.generateQRCode(otpauthUrl);

    // Créer un loginToken temporaire pour la vérification
    const loginToken = authService.createLoginToken(userId);

    logger.info({ event: '2fa_setup_initiated', userId, username });

    // Stocker le loginToken dans un cookie temporaire (2 minutes)
    reply.setCookie('2fa_setup_token', loginToken, getCookieOptions(AUTH_CONFIG.COOKIE_2FA_MAX_AGE_SECONDS));

    return reply.code(200).send({
      result: {
        qrCode,
        message: 'Scan the QR code with Google Authenticator and verify with a code'
      }
    });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_error', err: err?.message || err });
    if (err.message && err.message.includes('jwt')) {
      return reply.code(401).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' }
      });
    }
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
    });
  }
}

/**
 * POST /2fa/setup/verify
 * Vérifie le premier code TOTP et active définitivement la 2FA
 */
export async function verify2FASetupHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { code?: string; secret?: string };
  const { code, secret } = body;
  const loginToken = request.cookies?.['2fa_setup_token'];

  if (!loginToken || !code || !secret) {
    logger.warn({ event: '2fa_setup_verify_missing_data' });
    return reply.code(400).send({
      error: { message: 'code and secret are required', code: 'MISSING_PARAMETERS' }
    });
  }

  try {
    // Valider le loginToken
    const tokenData = authService.validateLoginToken(loginToken);
    if (!tokenData) {
      logger.warn({ event: '2fa_setup_verify_invalid_token' });
      return reply.code(401).send({
        error: { message: 'Invalid or expired login token', code: 'INVALID_LOGIN_TOKEN' }
      });
    }

    const { userId, attempts } = tokenData;

    // Vérifier si le nombre maximal de tentatives est atteint
    if (attempts >= AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS) {
      logger.warn({ event: '2fa_setup_verify_too_many_attempts', userId });
      return reply.code(429).send({
        error: { message: 'Too many failed attempts. Please restart the setup process.', code: 'TOO_MANY_ATTEMPTS' }
      });
    }

    // Vérifier le code TOTP avec le secret temporaire
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      // Incrémenter les tentatives AVANT de retourner l'erreur
      authService.incrementLoginTokenAttempts(loginToken);
      logger.warn({ event: '2fa_setup_verify_invalid_code', userId, attempts: attempts + 1 });
      return reply.code(400).send({
        error: { message: 'Invalid 2FA code', code: 'INVALID_2FA_CODE' }
      });
    }

    // Activer la 2FA définitivement
    authService.enable2FA(userId, secret);

    // Supprimer le loginToken de la base de données
    authService.deleteLoginToken(loginToken);

    // Récupérer l'utilisateur pour générer le JWT
    const user = authService.findUserById(userId);
    if (!user) {
      logger.error({ event: '2fa_setup_verify_user_not_found', userId });
      return reply.code(404).send({
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
    }

    // Générer un JWT pour la session
    const token = generateJWT(this, userId, user.username, '1h');

    logger.info({ event: '2fa_setup_completed', userId, username: user.username });

    reply
      .clearCookie('2fa_setup_token') // Supprimer le cookie temporaire
      .setCookie("token", token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
      .code(200)
      .send({
        result: { message: '2FA successfully activated' }
      });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_verify_error', err: err?.message || err });
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
    });
  }
}

/**
 * POST /2fa/verify
 * Vérifie le code TOTP lors du login
 */
export async function verify2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { code?: string };
  const { code } = body;
  const loginToken = request.cookies?.['2fa_login_token'];

  if (!loginToken || !code) {
    logger.warn({ event: '2fa_verify_missing_data' });
    return reply.code(400).send({
      error: { message: 'code is required and login session must be active', code: 'MISSING_PARAMETERS' }
    });
  }

  try {
    // Valider le loginToken
    const tokenData = authService.validateLoginToken(loginToken);
    if (!tokenData) {
      logger.warn({ event: '2fa_verify_invalid_token' });
      return reply.code(401).send({
        error: { message: 'Invalid or expired login token', code: 'INVALID_LOGIN_TOKEN' }
      });
    }

    const { userId, attempts } = tokenData;

    // Vérifier si le nombre maximal de tentatives est atteint
    if (attempts >= AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS) {
      logger.warn({ event: '2fa_verify_too_many_attempts', userId });
      return reply.code(429).send({
        error: { message: 'Too many failed attempts. Please login again.', code: 'TOO_MANY_ATTEMPTS' }
      });
    }

    // Vérifier le code TOTP
    const isValid = authService.verify2FACode(userId, code);
    if (!isValid) {
      // Incrémenter les tentatives AVANT de retourner l'erreur
      authService.incrementLoginTokenAttempts(loginToken);
      logger.warn({ event: '2fa_verify_invalid_code', userId, attempts: attempts + 1 });
      return reply.code(400).send({
        error: { message: 'Invalid 2FA code', code: 'INVALID_2FA_CODE' }
      });
    }

    // Récupérer l'utilisateur
    const user = authService.findUserById(userId);

    if (!user) {
      logger.error({ event: '2fa_verify_user_not_found', userId });
      return reply.code(404).send({
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
    }

    // Supprimer le loginToken de la base de données
    authService.deleteLoginToken(loginToken);

    // Générer le JWT
    const token = generateJWT(this, userId, user.username, '1h');
    logger.info({ event: '2fa_verify_success', userId, username: user.username });

    reply
      .clearCookie('2fa_login_token') // Supprimer le cookie temporaire
      .setCookie("token", token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
      .code(200)
      .send({
        result: { message: 'Login successful' }
      });
  } catch (err: any) {
    logger.error({ event: '2fa_verify_error', err: err?.message || err });
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
    });
  }
}

/**
 * POST /2fa/disable
 * Désactive la 2FA pour l'utilisateur connecté
 */
export async function disable2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: '2fa_disable_token_missing' });
    return reply.code(401).send({
      error: { message: 'Authentication required', code: 'TOKEN_MISSING' }
    });
  }

  try {
    // Vérifier le token JWT
    const decoded = this.jwt.verify(token) as { sub: number; username: string };
    const userId = decoded.sub;
    const username = decoded.username;

    // Vérifier si 2FA est activée
    if (!authService.is2FAEnabled(userId)) {
      logger.warn({ event: '2fa_disable_not_enabled', userId, username });
      return reply.code(400).send({
        error: { message: '2FA is not enabled for this account', code: '2FA_NOT_ENABLED' }
      });
    }

    // Désactiver la 2FA
    authService.disable2FA(userId);
    logger.info({ event: '2fa_disabled', userId, username });

    return reply.code(200).send({
      result: { message: '2FA successfully disabled' }
    });
  } catch (err: any) {
    logger.error({ event: '2fa_disable_error', err: err?.message || err });
    if (err.message && err.message.includes('jwt')) {
      return reply.code(401).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' }
      });
    }
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
    });
  }
}
