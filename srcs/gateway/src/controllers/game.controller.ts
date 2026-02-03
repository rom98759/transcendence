import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest, webSocketProxyRequest } from '../utils/proxy.js';
import { GATEWAY_CONFIG } from '../utils/constants.js';
import { fetchOptions } from '../utils/mtlsAgent.js';

export function registerGameRoutes(app: FastifyInstance) {
  // Regular HTTP routes
  app.get('/health', async (request, reply) => {
    app.log.info({ event: 'game_health', remote: 'game', url: '/health' });
    const res = await proxyRequest(
      app,
      request,
      reply,
      `${GATEWAY_CONFIG.SERVICES.GAME}/health`,
      fetchOptions,
    );
    return res;
  });

  app.post('/settings', async (request, reply) => {
    app.log.info({ event: 'game_settings', remote: 'game', url: '/settings' });
    const res = await proxyRequest(
      app,
      request,
      reply,
      `${GATEWAY_CONFIG.SERVICES.GAME}/settings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      },
    );
    return res;
  });

  app.get('/sessions', async (request, reply) => {
    app.log.info({ event: 'game_sessions', remote: 'game', url: '/sessions' });
    const res = await proxyRequest(app, request, reply, `${GATEWAY_CONFIG.SERVICES.GAME}/sessions`);
    return res;
  });

  // // WebSocket proxy route for /api/game/ws
  app.get('/ws', { websocket: true }, (connection: any, request: FastifyRequest) => {
    webSocketProxyRequest(app, connection, request, '/ws');
  });

  // WebSocket proxy route for /api/game/:sessionId (dynamic session IDs)
  app.get('/:sessionId', { websocket: true }, (connection: any, request: FastifyRequest) => {
    const { sessionId } = request.params as { sessionId: string };
    webSocketProxyRequest(app, connection, request, `/${sessionId}`);
  });

  app.all('/*', async (request, reply) => {
    const rawPath = (request.params as any)['*'];
    const cleanPath = rawPath.replace(/^api\/game\//, ''); // 🔥 FIX
    const url = `${GATEWAY_CONFIG.SERVICES.GAME}/${cleanPath}`;
    const queryString = new URL(request.url, 'https://localhost').search;
    const fullUrl = `${url}${queryString}`;

    app.log.info({
      event: 'game_proxy_request',
      // path,
      method: request.method,
      user: request.headers['x-user-name'] || null,
    });

    const init: RequestInit = {
      method: request.method,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = JSON.stringify(request.body);
    }

    const res = await proxyRequest(app, request, reply, fullUrl, init);
    return res;
  });
}
