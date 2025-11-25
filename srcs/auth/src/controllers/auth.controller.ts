import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as authService from "../services/auth.service.js";
import { logger } from "../utils/logger.js";
import { ValidationSchemas } from "../utils/validation.js";

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
    logger.info({ event: 'register_success', username, email, id });
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
    if (!valid) {
      logger.warn({ event: 'login_failed', identifier, reason: 'invalid_credentials' });
      return reply.code(401).send({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

	// const payload = {
    //   sub: user.id || 0,
    //   username: user.username,
    // };

    // const token = this.jwt.sign(payload, { expiresIn: '1h' });
    // logger.info({ event: 'login_success', identifier });
    // reply.setCookie("token", token, {
    //   httpOnly: true,
    //   secure: (globalThis as any).process?.env?.NODE_ENV === 'production',
    //   sameSite: "strict",
    //   path: "/",
    //   maxAge: 60 * 60,        // 1h comme le JWT
    // })
    //   .code(200)
    //   .send({ result: { message: 'Login successful' } });

    // Vérifier si le 2FA est activé pour cet utilisateur
    if (!user.twofa_enabled) {
      // 2FA désactivé → Connexion directe avec JWT
      const payload = {
        sub: user.id || 0,
        username: user.username,
      };

      const token = this.jwt.sign(payload, { expiresIn: '1h' });
      logger.info({ event: 'login_success_no_2fa', identifier, userId: user.id });

      return reply.setCookie("token", token, {
        httpOnly: true,
        secure: (globalThis as any).process?.env?.NODE_ENV === 'production',
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,        // 1h comme le JWT
      })
        .code(200)
        .send({ result: { message: 'Login successful', token } });
    }

    // 2FA activé → Vérifier que l'utilisateur a un email
    if (!user.email) {
      logger.error({ event: 'login_failed', identifier, reason: 'no_email' });
      return reply.code(400).send({ error: { message: 'No email associated with this account', code: 'NO_EMAIL' } });
    }

    // Générer et envoyer le code 2FA
    try {
      await authService.initiate2FA(user.id!, user.email);
      logger.info({ event: '2fa_initiated', identifier, userId: user.id });
      return reply.code(200).send({
        result: {
          message: '2FA code sent to your email',
          requiresVerification: true
        }
      });
    } catch (err: any) {
      logger.error({ event: '2fa_initiation_error', identifier, userId: user.id, err: err?.message || err });
      return reply.code(500).send({ error: { message: 'Error sending 2FA code', code: '2FA_SEND_ERROR' } });
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

export async function verify2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  // Validation Zod
  const validation = ValidationSchemas.verify2FA.safeParse(request.body);
  if (!validation.success) {
    this.log.warn({ event: 'verify_2fa_validation_failed', errors: validation.error.issues });
    return reply.code(400).send({
      error: {
        message: 'Invalid 2FA verification data',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      }
    });
  }

  const { identifier, code } = validation.data;
  logger.info({ event: 'verify_2fa_attempt', identifier });

  try {
    // Trouver l'utilisateur
    const user = authService.findUser(identifier);
    if (!user) {
      logger.warn({ event: 'verify_2fa_failed', identifier, reason: 'user_not_found' });
      return reply.code(401).send({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

    // Vérifier le code 2FA
    const valid = authService.verify2FA(user, code);
    if (!valid) {
      logger.warn({ event: 'verify_2fa_failed', identifier, userId: user.id, reason: 'invalid_code' });
      return reply.code(401).send({ error: { message: 'Invalid or expired 2FA code', code: 'INVALID_2FA_CODE' } });
    }

    // Générer le token JWT
    const payload = {
      sub: user.id || 0,
      username: user.username,
    };

    const token = this.jwt.sign(payload, { expiresIn: '1h' });
    logger.info({ event: 'verify_2fa_success', identifier, userId: user.id });

    reply.setCookie("token", token, {
      httpOnly: true,
      secure: (globalThis as any).process?.env?.NODE_ENV === 'production',
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,        // 1h comme le JWT
    })
      .code(200)
      .send({ result: { message: 'Login successful', token } });
  } catch (err: any) {
    logger.error({ event: 'verify_2fa_error', identifier, err: err?.message || err });
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// DEV ONLY - À supprimer
export async function meHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const idHeader = (request.headers as any)["x-user-id"] || null;
  const id = idHeader ? Number(idHeader) : null;
  logger.info({ event: 'me_request_dev_only', user: username, id });
  return reply.code(200).send({ data: { user: username ? { id, username } : null } });
}

export async function listAllUsers(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  logger.info({ event: 'list_users_attempt', user: username });
  if (username !== 'admin')
    return reply.code(403).send({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
  try {
	const users = authService.listUsers();
	logger.info({ event: 'list_users_success', user: username, count: users.length });
	return reply.code(200).send({ result: { users } });
  } catch (err: any) {
	logger.error({ event: 'list_users_error', user: username, err: err?.message || err });
	return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// Activer le 2FA pour l'utilisateur connecté
export async function enable2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const userId = (request.headers as any)["x-user-id"] || null;

  if (!userId) {
    logger.warn({ event: 'enable_2fa_failed', reason: 'not_authenticated' });
    return reply.code(401).send({ error: { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' } });
  }

  logger.info({ event: 'enable_2fa_attempt', username, userId });

  try {
    authService.enable2FA(Number(userId));
    logger.info({ event: 'enable_2fa_success', username, userId });
    return reply.code(200).send({ result: { message: '2FA enabled successfully' } });
  } catch (err: any) {
    logger.error({ event: 'enable_2fa_error', username, userId, err: err?.message || err });
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// Désactiver le 2FA pour l'utilisateur connecté
export async function disable2FAHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const userId = (request.headers as any)["x-user-id"] || null;

  if (!userId) {
    logger.warn({ event: 'disable_2fa_failed', reason: 'not_authenticated' });
    return reply.code(401).send({ error: { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' } });
  }

  logger.info({ event: 'disable_2fa_attempt', username, userId });

  try {
    authService.disable2FA(Number(userId));
    logger.info({ event: 'disable_2fa_success', username, userId });
    return reply.code(200).send({ result: { message: '2FA disabled successfully' } });
  } catch (err: any) {
    logger.error({ event: 'disable_2fa_error', username, userId, err: err?.message || err });
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// Obtenir le statut du 2FA
export async function get2FAStatusHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const userId = (request.headers as any)["x-user-id"] || null;

  if (!userId) {
    logger.warn({ event: 'get_2fa_status_failed', reason: 'not_authenticated' });
    return reply.code(401).send({ error: { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' } });
  }

  logger.info({ event: 'get_2fa_status', username, userId });

  try {
    const enabled = authService.get2FAStatus(Number(userId));
    return reply.code(200).send({ result: { twofa_enabled: enabled } });
  } catch (err: any) {
    logger.error({ event: 'get_2fa_status_error', username, userId, err: err?.message || err });
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}