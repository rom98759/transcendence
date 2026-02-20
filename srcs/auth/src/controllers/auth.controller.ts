import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/auth.service.js';
import { ValidationSchemas } from '../utils/validation.js';
import { AUTH_CONFIG, ERROR_MESSAGES, ERROR_RESPONSE_CODES, UserRole } from '../utils/constants.js';
import * as totpService from '../services/totp.service.js';
import * as onlineService from '../services/online.service.js';
import { logger } from '../index.js';
import { generateJWT } from '../services/jwt.service.js';
import {
  AppError,
  ERROR_CODES,
  HTTP_STATUS,
  mapToFrontendError,
  mapZodIssuesToErrorDetails,
} from '@transcendence/core';
import * as oauthService from '../services/oauth.service.js';
/**
 * Configuration des cookies avec security enforcée en production
 */
function getCookieOptions(maxAgeSeconds: number = AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS) {
  const env = (globalThis as any).process?.env || {};
  const isProduction = env.NODE_ENV === 'production';
  const forceSecure = isProduction || env.FORCE_SECURE_COOKIE === 'true';
  return {
    path: '/',
    httpOnly: true,
    secure: forceSecure,
    sameSite: 'strict' as const,
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

    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
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
      return reply.code(HTTP_STATUS.CONFLICT).send({
        error: {
          message: 'Username is already taken',
          code: ERROR_CODES.CONFLICT,
          details: [{ field: 'username' }],
        },
      });
    }
    if (authService.findByEmail(email)) {
      logger.warn({ event: 'register_failed', email, reason: 'email_exists' });
      return reply.code(HTTP_STATUS.CONFLICT).send({
        error: {
          message: 'Email is already taken',
          code: ERROR_CODES.CONFLICT,
          details: [{ field: 'email' }],
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
      return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: {
          message: "Erreur lors de la vérification du nom d'utilisateur. Veuillez réessayer.",
          // code: 'DB_FIND_USER_BY_USERNAME_ERROR',
          code: ERROR_CODES.INTERNAL_ERROR,
          details: [{ field: 'username' }],
        },
      });
    }
    if (err && err.code === 'DB_FIND_USER_BY_EMAIL_ERROR') {
      return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: {
          message: "Erreur lors de la vérification de l'email. Veuillez réessayer.",
          // code: 'DB_FIND_USER_BY_EMAIL_ERROR',
          code: ERROR_CODES.INTERNAL_ERROR,
          details: [{ field: 'email' }],
        },
      });
    }
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
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
    return reply.code(HTTP_STATUS.CREATED).send({
      user: { id, username, email },
      message: 'Register success',
    });
  } catch (err: any) {
    req.log.error({ event: 'register_error', username, email, err: err?.message || err });
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        error: mapToFrontendError(err),
      });
    }
    // Add errors handling
    if (err && err.code === 'USER_EXISTS') {
      return reply.code(HTTP_STATUS.CONFLICT).send({
        error: {
          message: err.message || 'Username is already taken',
          code: ERROR_CODES.CONFLICT,
          details: [{ field: 'username' }],
        },
      });
    }
    if (err && err.code === 'EMAIL_EXISTS') {
      return reply.code(HTTP_STATUS.CONFLICT).send({
        error: {
          message: err.message || 'Email is already taken',
          code: ERROR_CODES.CONFLICT,
          details: [{ field: 'email' }],
        },
      });
    }
    if (err && err.code === 'DB_CREATE_USER_ERROR') {
      return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: {
          message: 'Impossible de créer votre compte pour le moment. Veuillez réessayer.',
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      });
    }
    if (err && err.code === 'UNIQUE_VIOLATION') {
      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
        error: {
          message:
            "Ces informations sont déjà utilisées. Veuillez vérifier votre nom d'utilisateur et email.",
          code: ERROR_CODES.CONFLICT,
        },
      });
    }

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: "Une erreur s'est produite lors de la création du compte. Veuillez réessayer.",
        code: ERROR_CODES.INTERNAL_ERROR,
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

    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        details: mapZodIssuesToErrorDetails(validation.error.issues),
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
        code: ERROR_CODES.VALIDATION_MANDATORY,
        details: [{ field: 'identifier' }],
      },
    });
  }

  if (!password) {
    logger.warn({ event: 'login_failed', reason: 'missing_password' });
    return reply.code(400).send({
      error: {
        message: 'Veuillez entrer votre mot de passe.',
        code: ERROR_CODES.VALIDATION_MANDATORY,
        details: [{ field: 'password' }],
      },
    });
  }

  req.log.info({ event: 'login_attempt', identifier });

  try {
    const user = authService.findUser(identifier!);

    if (!user) {
      logger.warn({ event: 'login_failed', identifier, reason: 'user_not_found' });
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          details: [{ field: 'identifier' }],
        },
      });
    }

    const valid = authService.validateUser(identifier!, password);
    if (!valid) {
      logger.warn({ event: 'login_failed', identifier, reason: 'invalid_password' });
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          details: [{ field: 'password' }],
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

      return reply.code(HTTP_STATUS.OK).send({
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
        .code(HTTP_STATUS.OK)
        .send({
          message: 'Login success',
          user: { id: user.id, username: user.username },
        });
    }
  } catch (err: any) {
    req.log.error({ event: 'login_error', identifier, err: err?.message || err });
    if (err && err.code === 'DB_FIND_USER_BY_IDENTIFIER_ERROR') {
      return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: {
          message: 'Error recovering account',
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      });
    }
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
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
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
      error: {
        message: 'No token provided',
        code: ERROR_CODES.UNAUTHORIZED,
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
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: {
          message: 'User not found',
          code: ERROR_CODES.INVALID_TOKEN,
        },
      });
    }

    logger.info({ event: 'verify_success', username: decoded.username, id: decoded.sub });
    return reply.code(HTTP_STATUS.OK).send({
      user: {
        id: decoded.sub,
        username: decoded.username,
      },
      valid: true,
    });
  } catch (err: any) {
    logger.warn({ event: 'verify_token_invalid', err: err?.message || err });
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
      error: {
        message: 'Invalid or expired token',
        code: ERROR_CODES.INVALID_TOKEN,
      },
    });
  }
}

// Handler pour récupérer les informations de l'utilisateur connecté
export async function meHandler(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const username = (req.headers as any)['x-user-name'] || null;
  const idHeader = (req.headers as any)['x-user-id'] || null;
  const id = idHeader ? Number(idHeader) : null;

  logger.info({ event: 'me_request', user: username, id });

  if (!id || !username) {
    logger.warn({ event: 'me_request_unauthorized', user: username, id });
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
      error: {
        message: 'Authentication required',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  try {
    // Récupérer les informations complètes de l'utilisateur
    const user = authService.findUserById(id);

    if (!user) {
      logger.warn({ event: 'me_request_user_not_found', user: username, id });
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
        error: {
          message: 'User not found',
          code: ERROR_CODES.UNAUTHORIZED,
        },
      });
    }

    // Récupérer le statut 2FA
    const has2FA = totpService.isTOTPEnabled(id);

    logger.info({ event: 'me_request_success', user: username, id });

    // Format de réponse standardisé
    return reply.code(HTTP_STATUS.OK).send({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is2FAEnabled: has2FA,
      },
    });
  } catch (err: any) {
    logger.error({ event: 'me_request_error', user: username, id, err: err?.message || err });
    return reply.code(500).send({
      error: {
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    });
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
  return reply.code(HTTP_STATUS.NOT_FOUND).send({
    error: {
      message: `Route not found: ${request.method} ${request.url}`,
      code: ERROR_CODES.NOT_FOUND,
    },
  });
}

// ============================================
// 2FA Handlers
// ============================================

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
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
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
      return reply.code(HTTP_STATUS.CONFLICT).send({
        error: {
          message: '2FA is already enabled. Disable it first to reconfigure.',
          code: 'TOTP_ALREADY_ENABLED',
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

    return reply.code(HTTP_STATUS.OK).send({
      result: {
        qrCode: setupData.qrCodeDataUrl,
        message: 'Scan the QR code with Google Authenticator and enter the 6-digit code',
        expiresIn: AUTH_CONFIG.LOGIN_TOKEN_EXPIRATION_SECONDS,
      },
    });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_error', err: err?.message || err });

    if (err.message && err.message.includes('jwt')) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      });
    }

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
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
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: { message: 'Code is required', code: 'MISSING_PARAMETERS' },
    });
  }

  // Validation du format du code
  if (!/^\d{6}$/.test(code)) {
    logger.warn({ event: '2fa_setup_verify_invalid_format' });
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: { message: 'Code must be 6 digits', code: 'INVALID_CODE_FORMAT' },
    });
  }

  try {
    // Récupérer la session de setup
    const session = totpService.getSetupSession(setupToken);

    if (!session) {
      logger.warn({ event: '2fa_setup_verify_session_invalid' });
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
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

      return reply.code(HTTP_STATUS.TOO_MANY_REQUESTS).send({
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

      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
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
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
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
      .code(HTTP_STATUS.OK)
      .send({
        result: {
          message: '2FA successfully activated',
          username: user.username,
        },
      });
  } catch (err: any) {
    logger.error({ event: '2fa_setup_verify_error', err: err?.message || err });
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
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
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: 'Code is required and login session must be active',
        code: 'MISSING_PARAMETERS',
      },
    });
  }

  // Validation du format du code
  if (!/^\d{6}$/.test(code)) {
    logger.warn({ event: '2fa_verify_invalid_format' });
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: { message: 'Code must be 6 digits', code: 'INVALID_CODE_FORMAT' },
    });
  }

  try {
    // Valider le loginToken
    const tokenData = authService.validateLoginToken(loginToken);

    if (!tokenData) {
      logger.warn({ event: '2fa_verify_invalid_token' });
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
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

      return reply.code(HTTP_STATUS.TOO_MANY_REQUESTS).send({
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

      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
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
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
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
      .code(HTTP_STATUS.OK)
      .send({
        result: {
          message: 'Login successful',
          username: user.username,
        },
      });
  } catch (err: any) {
    logger.error({ event: '2fa_verify_error', err: err?.message || err });
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
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
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
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
      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
        error: {
          message: '2FA is not enabled for this account',
          code: '2FA_NOT_ENABLED',
        },
      });
    }

    // Désactiver la 2FA
    totpService.disableTOTP(userId);

    logger.info({ event: '2fa_disabled', userId, username });

    return reply.code(HTTP_STATUS.OK).send({
      result: {
        message: '2FA successfully disabled',
        username,
      },
    });
  } catch (err: any) {
    logger.error({ event: '2fa_disable_error', err: err?.message || err });

    if (err.message && err.message.includes('jwt')) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      });
    }

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Handler pour le heartbeat - met à jour le statut en ligne de l'utilisateur
 */
export async function heartbeatHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const userId = idHeader ? Number(idHeader) : null;

  // Vérifier que l'utilisateur est authentifié
  if (!userId) {
    return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
      error: {
        message: ERROR_MESSAGES.UNAUTHORIZED,
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  try {
    // Enregistrer le heartbeat dans Redis
    await onlineService.recordHeartbeat(userId);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    logger.error({
      event: 'heartbeat_error',
      userId,
      error: error?.message || error,
    });

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.FAILED_HEARTBEAT,
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    });
  }
}

/**
 * Handler pour vérifier si un utilisateur est en ligne
 * GET /is-online/:name
 */
export async function isUserOnlineHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const params = req.params as { name?: string };
  const userName = params.name || null;

  // Validation des paramètres
  if (!userName) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: 'User name is required',
        code: 'MISSING_USER_NAME',
      },
    });
  }

  try {
    const user = authService.findByUsername(userName);
    if (!user || !user.id) {
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
        error: {
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
          details: [{ field: 'user' }],
        },
      });
    }
    const userId = user.id;

    // Vérifier le statut en ligne
    const isOnline = await onlineService.isUserOnline(userId);
    return reply.code(HTTP_STATUS.OK).send({
      username: userName,
      isOnline,
    });
  } catch (error: any) {
    logger.error({
      event: 'check_user_online_error',
      userName,
      error: error?.message || error,
    });
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.FAILED_CHECK_USER_ONLINE,
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    });
  }
}

/**
 * Suppression du compte utilisateur
 * Permet à un utilisateur de supprimer définitivement son compte
 */
export async function deleteUserHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // ID utilisateur headers
    const idHeader = (req.headers as any)['x-user-id'];
    const userId = idHeader ? Number(idHeader) : null;
    const username = (req.headers as any)['x-user-name'] || null;

    if (!userId) {
      this.log.warn({
        event: 'delete_user_unauthorized',
        username,
      });
      return reply.code(HTTP_STATUS.UNAUTHORIZED).send({
        error: {
          message: ERROR_MESSAGES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        },
      });
    }

    this.log.info({
      event: 'delete_user_request',
      userId,
      username,
    });

    await authService.deleteUser(userId);

    this.log.info({
      event: 'delete_user_success',
      userId,
      username,
    });

    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  } catch (error: unknown) {
    this.log.error({
      event: 'delete_user_error',
      error: (error as Error)?.message || error,
    });

    if (error instanceof AppError) {
      const frontendError = mapToFrontendError(error);
      return reply.code(frontendError.statusCode).send({
        error: {
          message: frontendError.message,
          code: frontendError.code,
        },
      });
    }

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: 'Internal server error',
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    });
  }
}

// ============================================
// OAuth Handlers
// ============================================

/**
 * POST /oauth/:provider/callback
 * Traite le callback OAuth et échange le code d'autorisation contre un JWT
 * Appelé par le frontend après redirection depuis Google/42 avec le code
 */
export async function oauthCallbackHandler(
  this: FastifyInstance,
  request: FastifyRequest<{
    Params: { provider: string };
    Body: { code: string; state?: string };
  }>,
  reply: FastifyReply,
) {
  const { provider } = request.params;

  // Validation du provider
  if (!['google', 'school42'].includes(provider)) {
    logger.warn({ event: 'oauth_invalid_provider', provider });
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: 'Invalid OAuth provider. Supported providers: google, school42',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: [{ field: 'provider', value: provider }],
      },
    });
  }

  // Validation du body
  const validation = ValidationSchemas.oauthCallback.safeParse({
    ...request.body,
    provider,
  });

  if (!validation.success) {
    logger.warn({
      event: 'oauth_callback_validation_failed',
      provider,
      errors: validation.error.issues,
    });

    const fieldErrors: Record<string, string[]> = {};
    validation.error.issues.forEach((issue: any) => {
      const field = (issue.path[0] as string) || 'general';
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    });

    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: 'Données OAuth callback invalides',
        code: ERROR_RESPONSE_CODES.VALIDATION_ERROR,
        details: validation.error.issues,
        fields: fieldErrors,
      },
    });
  }

  const { code } = validation.data;

  try {
    logger.info({ event: 'oauth_callback_start', provider, code_length: code.length });

    // Étape 1: Échanger le code contre un profil utilisateur
    const profile = await oauthService.exchangeCodeForProfile(
      provider as 'google' | 'school42',
      code,
    );

    logger.info({
      event: 'oauth_profile_received',
      provider,
      user_id: profile.id,
      email: profile.email,
      name: profile.name,
    });

    // Étape 2: Trouver ou créer l'utilisateur
    const userResult = await oauthService.findOrCreateOAuthUser(profile);

    logger.info({
      event: userResult.isNewUser ? 'oauth_user_created' : 'oauth_user_found',
      provider,
      userId: userResult.userId,
      username: userResult.username,
      isNewUser: userResult.isNewUser,
    });

    // Étape 3: Générer le JWT final
    const token = oauthService.generateOAuthJWT(this, userResult.userId, userResult.username);

    // Marquer l'utilisateur comme en ligne
    await onlineService.updateOnlineStatus(userResult.userId, true);

    logger.info({
      event: 'oauth_login_success',
      provider,
      userId: userResult.userId,
      username: userResult.username,
      isNewUser: userResult.isNewUser,
    });

    // Réponse avec cookie JWT et informations utilisateur
    reply
      .setCookie('token', token, getCookieOptions(AUTH_CONFIG.COOKIE_MAX_AGE_SECONDS))
      .code(HTTP_STATUS.OK)
      .send({
        result: {
          message: userResult.isNewUser
            ? `Welcome! Account created successfully with ${provider}`
            : `Login successful with ${provider}`,
          username: userResult.username,
          provider,
          isNewUser: userResult.isNewUser,
        },
      });
  } catch (error: unknown) {
    logger.error({
      event: 'oauth_callback_error',
      provider,
      error: error instanceof Error ? error.message : String(error),
    });

    // Gestion des erreurs spécifiques OAuth
    if (error instanceof AppError) {
      const frontendError = mapToFrontendError(error);
      return reply.code(frontendError.statusCode).send({
        error: {
          message: frontendError.message,
          code: frontendError.code,
          provider,
        },
      });
    }

    // Erreur générique
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: 'OAuth authentication failed',
        code: ERROR_RESPONSE_CODES.INTERNAL_SERVER_ERROR,
        provider,
      },
    });
  }
}
