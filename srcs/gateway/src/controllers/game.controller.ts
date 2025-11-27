import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { proxyRequest, webSocketProxyRequest } from "../utils/proxy.js";




export function registerGameRoutes(app: FastifyInstance) {
  // Regular HTTP routes
  app.get("/health", async (request, reply) => {
    app.log.info({ event: 'game_health', remote: 'game', url: '/health' });
    const res = await proxyRequest(app, request, reply, "http://game-service:3003/health");
    return res;
  });

  // WebSocket proxy route for /api/game/ws
  app.get("/ws", { websocket: true }, (connection: any, request: FastifyRequest) => {
    webSocketProxyRequest(app, connection, request, "/ws");
  });

  // WebSocket proxy route for /api/game/:sessionId (dynamic session IDs)
  app.get("/:sessionId", { websocket: true }, (connection: any, request: FastifyRequest) => {
    const { sessionId } = request.params as { sessionId: string };
    webSocketProxyRequest(app, connection, request, `/${sessionId}`);
  });



  app.all("/*", async (request, reply) => {
    const rawPath = (request.params as any)['*'];
    const cleanPath = rawPath.replace(/^api\/game\//, ""); // 🔥 FIX
    const url = `http://game-service:3003/${cleanPath}`;
    // const path = (request.params as any)['*'];
    // const url = `http://game-service:3003/${path}`;
    const queryString = new URL(request.url, 'http://localhost').search;
    const fullUrl = `${url}${queryString}`;

    app.log.info({
      event: 'game_proxy_request',
      // path,
      method: request.method,
      user: request.headers['x-user-name'] || null
    });

    const init: RequestInit = {
      method: request.method,
      headers: {
        'content-type': request.headers['content-type'] || 'application/json',
      },
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = JSON.stringify(request.body);
    }

    const res = await proxyRequest(app, request, reply, fullUrl, init);
    return res;
  });
}
