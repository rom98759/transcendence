import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { proxyRequest } from "../utils/proxy.js";

export function registerRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    app.log.info({ event: 'auth_root', remote: 'auth', url: '/'});
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/");
    return res;
  });

  app.get("/health", async (request, reply) => {
    app.log.info({ event: 'auth_health', remote: 'auth', url: '/health'});
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/health");
  return res;
  });

  app.get("/me", async (request, reply) => {
    app.log.info({ event: 'auth_me', user: request.headers['x-user-name'] || null });
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/me");
    return res;
  });

  app.post("/login", async (request, reply) => {
    app.log.info({ event: 'auth_login_attempt', username: (request.body as any)?.username || null });
    const body = JSON.stringify(request.body);
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    app.log.info({ event: 'auth_login_result', status: reply.statusCode, username: (request.body as any)?.username || null });
    return res;
  });

  app.post("/register", async (request, reply) => {
    app.log.info({ event: 'auth_register_attempt', username: (request.body as any)?.username || null });
    const body = JSON.stringify(request.body);
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    app.log.info({ event: 'auth_register_result', status: reply.statusCode, username: (request.body as any)?.username || null });
    return res;
  });

  app.post("/logout", async (request, reply) => {
    app.log.info({ event: 'auth_logout', user: request.headers['x-user-name'] || null });
    const body = JSON.stringify(request.body);
    const res = await proxyRequest(app, request, reply, "http://localhost:3001/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return res;
  });
}
