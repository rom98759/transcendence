import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { proxyRequest } from "../utils/proxy.js";




export function registerBlockRoutes(app: FastifyInstance) {
  // Regular HTTP routes
  app.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
    app.log.info({ event: 'blockchain_health', remote: 'blockchain', url: '/health' });
    const res = await proxyRequest(app, request, reply, "http://blockchain-service:3005/health");
    return res;
  });

  app.all("/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (request.params as any)['*'];
    const cleanPath = rawPath.replace(/^api\/block\//, ""); // 🔥 FIX
    const url = `http://blockchain-service:3005/${cleanPath}`;
    const queryString = new URL(request.url, 'http://localhost').search;
    const fullUrl = `${url}${queryString}`;

    app.log.info({
      event: 'blockchain_proxy_request',
      rawPath,
      method: request.method,
      user: request.headers['x-user-name'] || null
    });

    const init: RequestInit = {
      method: request.method,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = JSON.stringify(request.body);
    }

    const res = await proxyRequest(app, request, reply, fullUrl, init);
    return res;
  });
}
