import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import * as authService from "../services/auth.service.js";

interface User {
  username?: string;
  email?: string;
  password: string;
}

export function registerRoutes(app: FastifyInstance) {
  app.get("/me", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return meHandler.call(this, request, reply);
    }
  );

  app.post("/register", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return registerHandler.call(this, request, reply);
    }
  );

  app.post("/login", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return loginHandler.call(this, request, reply);
    }
  );

  app.post("/logout", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return logoutHandler.call(this, request, reply);
    }
  );
}

export async function registerHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { username, email, password } = request.body as User;
  this.log.info({ event: 'register_attempt', username, email });
  if (!username || !email || !password) {
    this.log.warn({ event: 'register_failed', username, email, reason: 'missing_fields' });
    return reply.code(400).send({ error: { message: 'username, email and password are required', code: 'MISSING_FIELDS' } });
  }
  if (authService.findByUsername(username)) {
    this.log.warn({ event: 'register_failed', username, reason: 'user_exists' });
    return reply.code(400).send({ error: { message: 'User already exists', code: 'USER_EXISTS' } });
  }
  if (authService.findByEmail(email)) {
    this.log.warn({ event: 'register_failed', email, reason: 'email_exists' });
    return reply.code(400).send({ error: { message: 'Email already in use', code: 'EMAIL_EXISTS' } });
  }

  const id = authService.createUser({ username, email, password });
  this.log.info({ event: 'register_success', username, email, id });
  return reply.code(201).send({ result: { message: 'User registered successfully', id } });
}

export async function loginHandler(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { username, email, password } = request.body as User;
  const identifier = username || email;
  this.log.info({ event: 'login_attempt', identifier });
  if (!identifier || !password) {
    this.log.warn({ event: 'login_failed', identifier, reason: 'missing_fields' });
    return reply.code(400).send({ error: { message: 'username/email and password required', code: 'MISSING_FIELDS' } });
  }

  const user = authService.findUser(identifier);
  const valid = user && authService.validateUser(identifier, password);
  if (!valid) {
    this.log.warn({ event: 'login_failed', identifier });
    return reply.code(401).send({ error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } });
  }

  const payload = {
    sub: user.id || 0,
    username: user.username,
  };

  const token = (this as any).jwt.sign(payload, { expiresIn: '1h' });
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
  return reply.clearCookie("token").send({ result: { message: 'Logged out' } });
}
