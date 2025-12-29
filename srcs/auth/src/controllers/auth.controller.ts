import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/auth.service.js';
import { ValidationSchemas } from '../utils/validation.js';
import { AUTH_CONFIG, UserRole } from '../utils/constants.js';

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
    maxAge: maxAgeSeconds,
  };
}

export async function registerHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // Validation Zod
  const validation = ValidationSchemas.register.safeParse(req.body);
  if (!validation.success) {
    this.log.warn({ event: 'register_validation_failed', errors: validation.error.issues });

    // Formater les erreurs de validation de manière lisible
    const fieldErrors: Record<string, string[]> = {};
    validation.error.issues.forEach((issue: any) => {
      const field = (issue.path[0] as string) || 'general';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    });

    return reply.code(400).send({
      error: {
        message: "Données d'inscription invalides",
        code: 'VALIDATION_ERROR',
        details: validation.error.issues,
        fields: fieldErrors,
      },
    });
  }

  const { username, email, password } = validation.data;
  req.log.info({ event: 'register_attempt', username, email });

  try {
    if (authService.findByUsername(username)) {
      logger.warn({ event: 'register_failed', username, reason: 'user_exists' });
      return reply.code(400).send({
        error: {
          message: `Le nom d'utilisateur "${username}" est déjà utilisé. Veuillez en choisir un autre.`,
          code: 'USER_EXISTS',
          field: 'username',
        },
      });
    }
    if (authService.findByEmail(email)) {
      logger.warn({ event: 'register_failed', email, reason: 'email_exists' });
      return reply.code(400).send({
        error: {
          message: `L'adresse email "${email}" est déjà associée à un compte existant.`,
          code: 'EMAIL_EXISTS',
          field: 'email',
        },
      });
    }
  } catch (err: any) {
    req.log.error({
      event: 'register_validation_error',
      username,
      email,
      err: err?.message || err,
    });
    if (err && err.code === 'DB_FIND_USER_BY_USERNAME_ERROR') {
      return reply.code(500).send({
        error: {
          message: "Erreur lors de la vérification du nom d'utilisateur. Veuillez réessayer.",
          code: 'DB_FIND_USER_BY_USERNAME_ERROR',
        },
      });
    }
    if (err && err.code === 'DB_FIND_USER_BY_EMAIL_ERROR') {
      return reply.code(500).send({
        error: {
          message: "Erreur lors de la vérification de l'email. Veuillez réessayer.",
          code: 'DB_FIND_USER_BY_EMAIL_ERROR',
        },
      });
    }
    return reply.code(500).send({
      error: {
        message: "Une erreur interne s'est produite. Veuillez réessayer plus tard.",
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }

  logger.info('validations passed');
  try {
    const id = await authService.createUser({ username, email, password });
    req.log.info({ event: 'register_success', username, email, id });
    return reply.code(201).send({ result: { message: 'User registered successfully', id: id } });
  } catch (err: any) {
    req.log.error({ event: 'register_error', username, email, err: err?.message || err });
    // Add errors handling
    if (err && err.code === 'USER_EXISTS') {
      return reply.code(400).send({
        error: {
          message: err.message || `Le nom d'utilisateur "${username}" est déjà pris.`,
          code: 'USER_EXISTS',
          field: 'username',
        },
      });
    }
    if (err && err.code === 'EMAIL_EXISTS') {
      return reply.code(400).send({
        error: {
          message: err.message || `L'email "${email}" est déjà utilisé.`,
          code: 'EMAIL_EXISTS',
          field: 'email',
        },
      });
    }
    if (err && err.code === 'DB_CREATE_USER_ERROR') {
      return reply.code(500).send({
        error: {
          message: 'Impossible de créer votre compte pour le moment. Veuillez réessayer.',
          code: 'DB_CREATE_USER_ERROR',
        },
      });
    }
    if (err && err.code === 'UNIQUE_VIOLATION') {
      return reply.code(400).send({
        error: {
          message:
            "Ces informations sont déjà utilisées. Veuillez vérifier votre nom d'utilisateur et email.",
          code: 'UNIQUE_VIOLATION',
        },
      });
    }

    return reply.code(500).send({
      error: {
        message: "Une erreur s'est produite lors de la création du compte. Veuillez réessayer.",
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}

export async function loginHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // Validation Zod
  const validation = ValidationSchemas.login.safeParse(req.body);
  if (!validation.success) {
    this.log.warn({ event: 'login_validation_failed', errors: validation.error.issues });

    // Formater les erreurs de validation
    const fieldErrors: Record<string, string[]> = {};
    validation.error.issues.forEach((issue: any) => {
      const field = (issue.path[0] as string) || 'general';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    });

    return reply.code(400).send({
      error: {
        message: "Veuillez fournir un nom d'utilisateur (ou email) et un mot de passe valides.",
        code: 'VALIDATION_ERROR',
        details: validation.error.issues,
        fields: fieldErrors,
      },
    });
  }

  const { username, email, password } = validation.data;
  const identifier = username || email;

  // TypeScript safety check
  if (!identifier) {
    logger.warn({ event: 'login_failed', reason: 'missing_identifier' });
    return reply.code(400).send({
      error: {
        message: "Veuillez entrer votre nom d'utilisateur ou votre adresse email.",
        code: 'MISSING_IDENTIFIER',
      },
    });
  }

  if (!password) {
    logger.warn({ event: 'login_failed', reason: 'missing_password' });
    return reply.code(400).send({
      error: {
        message: 'Veuillez entrer votre mot de passe.',
        code: 'MISSING_PASSWORD',
      },
    });
  }

  req.log.info({ event: 'login_attempt', identifier });

  try {
    const user = authService.findUser(identifier);

    if (!user) {
      logger.warn({ event: 'login_failed', identifier, reason: 'user_not_found' });
      return reply.code(401).send({
        error: {
          message: "Nom d'utilisateur ou mot de passe incorrect. Veuillez réessayer.",
          code: 'INVALID_CREDENTIALS',
          hint: 'Vérifiez que vous avez bien saisi vos identifiants.',
        },
      });
    }

    const valid = authService.validateUser(identifier, password);
    if (!valid) {
      logger.warn({ event: 'login_failed', identifier, reason: 'invalid_password' });
      return reply.code(401).send({
        error: {
          message: 'Mot de passe incorrect. Veuillez réessayer.',
          code: 'INVALID_CREDENTIALS',
          hint: 'Mot de passe oublié ? Contactez un administrateur.',
        },
      });
    }

    // Vérifier si la 2FA est activée
    const has2FA = totpService.isTOTPEnabled(user.id || 0);

    if (has2FA) {
      // 2FA activée : créer un loginToken temporaire
      const loginToken = authService.createLoginToken(user.id || 0);
      logger.info({ event: 'login_2fa_required', identifier, userId: user.id });

      // Stocker le loginToken dans un cookie temporaire (2 minutes)
      reply.setCookie(
        '2fa_login_token',
        loginToken,
        getCookieOptions(AUTH_CONFIG.COOKIE_2FA_MAX_AGE_SECONDS),
      );

      return reply.code(200).send({
        result: {
          require2FA: true,
          message: 'Authentification 2FA requise',
          details:
            "Veuillez entrer le code à 6 chiffres depuis votre application d'authentification (Google Authenticator, etc.)",
          expiresIn: AUTH_CONFIG.LOGIN_TOKEN_EXPIRATION_SECONDS,
          username: user.username,
        },
      });
    } else {
      // Pas de 2FA : générer le JWT directement
      const userRole = authService.getUserRole(user.id || 0);
      const token = generateJWT(
        this,
        user.id || 0,
        user.username,
        userRole,
        AUTH_CONFIG.JWT_EXPIRATION,
      );
      logger.info({ event: 'login_success', identifier });

      reply
        .setCookie('token', token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
        .code(200)
        .send({
          result: {
            message: `Bienvenue ${user.username} !`,
            username: user.username,
          },
        });
    }
  } catch (err: any) {
    req.log.error({ event: 'login_error', identifier, err: err?.message || err });
    if (err && err.code === 'DB_FIND_USER_BY_IDENTIFIER_ERROR') {
      return reply.code(500).send({
        error: {
          message: 'Erreur lors de la recherche de votre compte. Veuillez réessayer.',
          code: 'DB_FIND_USER_BY_IDENTIFIER_ERROR',
        },
      });
    }
    return reply.code(500).send({
      error: {
        message: "Une erreur s'est produite lors de la connexion. Veuillez réessayer.",
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}

export async function logoutHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const username = (req.headers as any)['x-user-name'] || null;
  req.log.info({ event: 'logout', user: username });
  return reply.clearCookie('token').send({ result: { message: 'Logged out successfully' } });
}

// Appeler depuis gateway pour vérifier la validité du token cookie
export async function verifyHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: 'verify_token_missing' });
    return reply.code(401).send({
      error: {
        message: 'No token provided',
        code: 'TOKEN_MISSING',
      },
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
          code: 'USER_NOT_FOUND',
        },
      });
    }

    logger.info({ event: 'verify_success', username: decoded.username, id: decoded.sub });
    return reply.code(200).send({
      result: {
        valid: true,
        user: {
          id: decoded.sub,
          username: decoded.username,
        },
      },
    });
  } catch (err: any) {
    logger.warn({ event: 'verify_token_invalid', err: err?.message || err });
    return reply.code(401).send({
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      },
    });
  }
}

// DEV ONLY - À supprimer    ADMIN ONLY
export async function meHandler(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const username = (req.headers as any)['x-user-name'] || null;
  const idHeader = (req.headers as any)['x-user-id'] || null;
  const id = idHeader ? Number(idHeader) : null;

  logger.info({ event: 'me_request_dev_only', user: username, id });

  if (!id || !username) {
    return reply.code(200).send({ data: { user: null } });
  }

  try {
    // Récupérer les informations complètes de l'utilisateur
    const user = authService.findUserById(id);

    if (!user) {
      return reply.code(200).send({ data: { user: null } });
    }

    // Récupérer le statut 2FA
    const has2FA = totpService.isTOTPEnabled(id);

    // Construire la réponse avec toutes les informations disponibles
    return reply.code(200).send({
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is2FAEnabled: has2FA,
        },
      },
    });
  } catch (err: any) {
    logger.error({ event: 'me_request_error', user: username, id, err: err?.message || err });
    return reply.code(500).send({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}

// ADMIN ONLY
export async function listAllUsers(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const userId = idHeader ? Number(idHeader) : null;
  const username = (req.headers as any)['x-user-name'] || null;

  logger.info({ event: 'list_users_attempt', user: username, userId });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!userId || !authService.hasRole(userId, UserRole.ADMIN)) {
    logger.warn({ event: 'list_users_forbidden', user: username, userId });
    return reply
      .code(403)
      .send({ error: { message: 'Forbidden - Admin role required', code: 'FORBIDDEN' } });
  }

  try {
    const users = authService.listUsers();
    req.log.info({ event: 'list_users_success', user: username, count: users.length });
    return reply.code(200).send({ result: { users } });
  } catch (err: any) {
    req.log.error({ event: 'list_users_error', user: username, err: err?.message || err });
    return reply
      .code(500)
      .send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// Handler pour les routes inconnues
export async function notFoundHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const username = (request.headers as any)['x-user-name'] || null;
  logger.warn({
    event: 'route_not_found',
    method: request.method,
    url: request.url,
    user: username,
  });
  return reply.code(404).send({
    error: {
      message: `Route not found: ${request.method} ${request.url}`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
}

// ============================================
// 2FA Handlers
// ============================================

import * as totpService from '../services/totp.service.js';
import { logger } from '../index.js';
import { generateJWT } from '../services/jwt.service.js';

/**
 * POST /2fa/setup
 * Initialise la configuration 2FA pour un utilisateur
 * Génère un secret TOTP et un QR code que l'utilisateur doit scanner
 */
export async function setup2FAHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: '2fa_setup_token_missing' });
    return reply.code(401).send({
      error: { message: 'Authentication required', code: 'TOKEN_MISSING' },
    });
  }

  try {
    // Vérifier et décoder le token JWT
    const decoded = this.jwt.verify(token) as { sub: number; username: string };
    const userId = decoded.sub;
    const username = decoded.username;

    // Vérifier si 2FA déjà activée
    if (totpService.isTOTPEnabled(userId)) {
      logger.warn({ event: '2fa_setup_already_enabled', userId, username });
      return reply.code(400).send({
        error: {
          message: '2FA is already enabled. Disable it first to reconfigure.',
          code: '2FA_ALREADY_ENABLED',
        },
      });
    }

    // Générer le setup complet (secret + QR code)
    const setupData = await totpService.generateTOTPSetup(username);

    // Créer une session de setup sécurisée
    const setupToken = totpService.createSetupSession(userId, setupData.secret);

    logger.info({ event: '2fa_setup_initiated', userId, username });

    // Stocker le token de setup dans un cookie sécurisé (2 minutes)
    reply.setCookie(
      '2fa_setup_token',
      setupToken,
      getCookieOptions(AUTH_CONFIG.COOKIE_2FA_MAX_AGE_SECONDS),
    );

    return reply.code(200).send({
      result: {
        qrCode: setupData.qrCodeDataUrl,
        message: 'Scan the QR code with Google Authenticator and enter the 6-digit code',
        expiresIn: AUTH_CONFIG.LOGIN_TOKEN_EXPIRATION_SECONDS,
      },
    });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_error', err: err?.message || err });

    if (err.message && err.message.includes('jwt')) {
      return reply.code(401).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      });
    }

    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * POST /2fa/setup/verify
 * Vérifie le premier code TOTP et active définitivement la 2FA
 * Le client envoie uniquement le code, le secret est stocké côté serveur
 */
export async function verify2FASetupHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as { code?: string };
  const { code } = body;
  const setupToken = request.cookies?.['2fa_setup_token'];

  // Validation des paramètres
  if (!setupToken || !code) {
    logger.warn({ event: '2fa_setup_verify_missing_data' });
    return reply.code(400).send({
      error: { message: 'Code is required', code: 'MISSING_PARAMETERS' },
    });
  }

  // Validation du format du code
  if (!/^\d{6}$/.test(code)) {
    logger.warn({ event: '2fa_setup_verify_invalid_format' });
    return reply.code(400).send({
      error: { message: 'Code must be 6 digits', code: 'INVALID_CODE_FORMAT' },
    });
  }

  try {
    // Récupérer la session de setup
    const session = totpService.getSetupSession(setupToken);

    if (!session) {
      logger.warn({ event: '2fa_setup_verify_session_invalid' });
      return reply.code(401).send({
        error: {
          message: 'Setup session expired or invalid. Please restart the setup process.',
          code: 'SETUP_SESSION_EXPIRED',
        },
      });
    }

    const { userId, attempts } = session;

    // Vérifier le nombre de tentatives
    if (attempts >= AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS) {
      logger.warn({ event: '2fa_setup_verify_too_many_attempts', userId, attempts });
      totpService.deleteSetupSession(setupToken);

      return reply.code(429).send({
        error: {
          message: `Too many failed attempts (${attempts}/${AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS}). Please restart the setup process.`,
          code: 'TOO_MANY_ATTEMPTS',
        },
      });
    }

    // Vérifier le code TOTP
    const isValid = totpService.verifySetupCode(setupToken, code);

    if (!isValid) {
      // Incrémenter les tentatives
      totpService.incrementSetupAttempts(setupToken);

      const remainingAttempts = AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS - attempts - 1;
      logger.warn({
        event: '2fa_setup_verify_invalid_code',
        userId,
        attempts: attempts + 1,
        remainingAttempts,
      });

      return reply.code(400).send({
        error: {
          message: `Invalid 2FA code. ${remainingAttempts} attempt(s) remaining.`,
          code: 'INVALID_2FA_CODE',
          remainingAttempts,
        },
      });
    }

    // Code valide : activer la 2FA définitivement
    totpService.enableTOTP(userId, session.secret);

    // Nettoyer la session de setup
    totpService.deleteSetupSession(setupToken);

    // Récupérer l'utilisateur pour le JWT
    const user = authService.findUserById(userId);
    if (!user) {
      logger.error({ event: '2fa_setup_verify_user_not_found', userId });
      return reply.code(404).send({
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    // Générer un nouveau JWT pour la session authentifiée
    const userRole = authService.getUserRole(userId);
    const token = generateJWT(this, userId, user.username, userRole, AUTH_CONFIG.JWT_EXPIRATION);

    logger.info({ event: '2fa_setup_completed', userId, username: user.username });

    // Retour avec nouveau token
    reply
      .clearCookie('2fa_setup_token')
      .setCookie('token', token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
      .code(200)
      .send({
        result: {
          message: '2FA successfully activated',
          username: user.username,
        },
      });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_verify_error', err: err?.message || err });
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * POST /2fa/verify
 * Vérifie le code TOTP lors du login (phase 2 de l'authentification)
 * Appelé après un login réussi avec username/password pour un utilisateur ayant la 2FA activée
 */
export async function verify2FAHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as { code?: string };
  const { code } = body;
  const loginToken = request.cookies?.['2fa_login_token'];

  // Validation des paramètres
  if (!loginToken || !code) {
    logger.warn({ event: '2fa_verify_missing_data' });
    return reply.code(400).send({
      error: {
        message: 'Code is required and login session must be active',
        code: 'MISSING_PARAMETERS',
      },
    });
  }

  // Validation du format du code
  if (!/^\d{6}$/.test(code)) {
    logger.warn({ event: '2fa_verify_invalid_format' });
    return reply.code(400).send({
      error: { message: 'Code must be 6 digits', code: 'INVALID_CODE_FORMAT' },
    });
  }

  try {
    // Valider le loginToken
    const tokenData = authService.validateLoginToken(loginToken);

    if (!tokenData) {
      logger.warn({ event: '2fa_verify_invalid_token' });
      return reply.code(401).send({
        error: {
          message: 'Login session expired. Please login again.',
          code: 'LOGIN_SESSION_EXPIRED',
        },
      });
    }

    const { userId, attempts } = tokenData;

    // Vérifier le nombre de tentatives
    if (attempts >= AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS) {
      logger.warn({ event: '2fa_verify_too_many_attempts', userId, attempts });
      authService.deleteLoginToken(loginToken);

      return reply.code(429).send({
        error: {
          message: `Too many failed attempts (${attempts}/${AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS}). Please login again.`,
          code: 'TOO_MANY_ATTEMPTS',
        },
      });
    }

    // Vérifier le code TOTP avec le secret permanent de l'utilisateur
    const isValid = totpService.verifyLoginCode(userId, code);

    if (!isValid) {
      // Incrémenter les tentatives
      authService.incrementLoginTokenAttempts(loginToken);

      const remainingAttempts = AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS - attempts - 1;
      logger.warn({
        event: '2fa_verify_invalid_code',
        userId,
        attempts: attempts + 1,
        remainingAttempts,
      });

      return reply.code(400).send({
        error: {
          message: `Invalid 2FA code. ${remainingAttempts} attempt(s) remaining.`,
          code: 'INVALID_2FA_CODE',
          remainingAttempts,
        },
      });
    }

    // Code valide : récupérer l'utilisateur
    const user = authService.findUserById(userId);

    if (!user) {
      logger.error({ event: '2fa_verify_user_not_found', userId });
      return reply.code(404).send({
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    // Supprimer le loginToken
    authService.deleteLoginToken(loginToken);

    // Générer le JWT final
    const userRole = authService.getUserRole(userId);
    const token = generateJWT(this, userId, user.username, userRole, AUTH_CONFIG.JWT_EXPIRATION);

    logger.info({ event: '2fa_verify_success', userId, username: user.username });

    // Retour avec token final
    reply
      .clearCookie('2fa_login_token')
      .setCookie('token', token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
      .code(200)
      .send({
        result: {
          message: 'Login successful',
          username: user.username,
        },
      });
  } catch (err: any) {
    logger.error({ event: '2fa_verify_error', err: err?.message || err });
    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * POST /2fa/disable
 * Désactive la 2FA pour l'utilisateur connecté
 * Nécessite une authentification valide
 */
export async function disable2FAHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ event: '2fa_disable_token_missing' });
    return reply.code(401).send({
      error: { message: 'Authentication required', code: 'TOKEN_MISSING' },
    });
  }

  try {
    // Vérifier et décoder le token JWT
    const decoded = this.jwt.verify(token) as { sub: number; username: string };
    const userId = decoded.sub;
    const username = decoded.username;

    // Vérifier si 2FA est actuellement activée
    if (!totpService.isTOTPEnabled(userId)) {
      logger.warn({ event: '2fa_disable_not_enabled', userId, username });
      return reply.code(400).send({
        error: {
          message: '2FA is not enabled for this account',
          code: '2FA_NOT_ENABLED',
        },
      });
    }

    // Désactiver la 2FA
    totpService.disableTOTP(userId);

    logger.info({ event: '2fa_disabled', userId, username });

    return reply.code(200).send({
      result: {
        message: '2FA successfully disabled',
        username,
      },
    });
  } catch (err: any) {
    logger.error({ event: '2fa_disable_error', err: err?.message || err });

    if (err.message && err.message.includes('jwt')) {
      return reply.code(401).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      });
    }

    return reply.code(500).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
