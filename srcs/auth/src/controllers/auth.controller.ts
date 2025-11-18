import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as authService from "../services/auth.service.js";

interface User {
  username?: string;
  email?: string;
  password: string;
}

export async function registerHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { username, email, password } = request.body as User;
  this.log.info({ event: 'register_attempt', username, email });
  if (!username || !email || !password) {
    this.log.warn({ event: 'register_failed', username, email, reason: 'missing_fields' });
    return reply.code(400).send({ error: { message: 'username, email and password are required', code: 'MISSING_FIELDS' } });
  }

  try {
    if (authService.findByUsername(username)) {
      this.log.warn({ event: 'register_failed', username, reason: 'user_exists' });
      return reply.code(400).send({ error: { message: 'User already exists', code: 'USER_EXISTS' } });
    }
    if (authService.findByEmail(email)) {
      this.log.warn({ event: 'register_failed', email, reason: 'email_exists' });
      return reply.code(400).send({ error: { message: 'Email already in use', code: 'EMAIL_EXISTS' } });
    }
  } catch (err: any) {
    this.log.error({ event: 'register_validation_error', username, email, err: err?.message || err });
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
    this.log.info({ event: 'register_success', username, email, id });
    return reply.code(201).send({ result: { message: 'User registered successfully', id } });
  } catch (err: any) {
    this.log.error({ event: 'register_error', username, email, err: err?.message || err });
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
  const { username, email, password } = request.body as User;
  const identifier = username || email;
  this.log.info({ event: 'login_attempt', identifier });
  if (!identifier || !password) {
    this.log.warn({ event: 'login_failed', identifier, reason: 'missing_fields' });
    return reply.code(400).send({ error: { message: 'Username/email and password required', code: 'MISSING_FIELDS' } });
  }

  try {
    const user = authService.findUser(identifier);
    const valid = user && authService.validateUser(identifier, password);
    if (!valid) {
      this.log.warn({ event: 'login_failed', identifier, reason: 'invalid_credentials' });
      return reply.code(401).send({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
    }

    const payload = {
      sub: user.id || 0,
      username: user.username,
    };

    const token = this.jwt.sign(payload, { expiresIn: '1h' });
    this.log.info({ event: 'login_success', identifier });
    reply.setCookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,        // 1h comme le JWT
    })
      .code(200)
      .send({ result: { message: 'Login successful' } });
  } catch (err: any) {
    this.log.error({ event: 'login_error', identifier, err: err?.message || err });
    if (err && err.code === 'DB_FIND_USER_BY_IDENTIFIER_ERROR') {
      return reply.code(500).send({ error: { message: 'Database error during user lookup', code: 'DB_FIND_USER_BY_IDENTIFIER_ERROR' } });
    }
    return reply.code(500).send({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } });
  }
}

export async function meHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  const idHeader = (request.headers as any)["x-user-id"] || null;
  const id = idHeader ? Number(idHeader) : null;
  this.log.info({ event: 'me_request', user: username, id });
  return reply.code(200).send({ data: { user: username ? { id, username } : null } });
}

export async function logoutHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const username = (request.headers as any)["x-user-name"] || null;
  this.log.info({ event: 'logout', user: username });
  return reply.clearCookie("token").send({ result: { message: 'Logged out successfully' } });
}
