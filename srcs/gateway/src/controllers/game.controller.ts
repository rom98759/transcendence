import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest, webSocketProxyRequest } from '../utils/proxy.js';
import { GATEWAY_CONFIG } from '../utils/constants.js';
import { fetchOptions } from '../utils/mtlsAgent.js';
import { getInternalHeaders } from '../index.js';
import { error } from 'node:console';

function getProxyHeaders(request: FastifyRequest): HeadersInit {
  const internalHeaders = getInternalHeaders(request);
  const contentType = request.headers['content-type'];
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...internalHeaders,
  };
}

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

  app.delete('/del/:sessionId', async (request, reply) => {
    app.log.info({ event: 'game_delete_session', remote: 'game', url: '/del/:sessionId' });
    const { sessionId } = request.params as { sessionId: string };
    const res = await proxyRequest(
      app,
      request,
      reply,
      `${GATEWAY_CONFIG.SERVICES.GAME}/del/${sessionId}`,
      {
        method: 'DELETE',
        headers: getProxyHeaders(request),
      },
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

  // WebSocket proxy route for /api/game/:sessionId (dynamic session IDs)
  // add ws because /:sessionId  intercept all routes
  app.get('/ws/:sessionId', { websocket: true }, (connection: any, request: FastifyRequest) => {
    const { sessionId } = request.params as { sessionId: string };
    const socket = connection.socket ?? connection; // handles both version of ws
    webSocketProxyRequest(app, socket, request, `/ws/${sessionId}`);
  });

  app.all('/*', async (request, reply) => {
    const rawPath = (request.params as any)['*'];
    const cleanPath = rawPath.replace(/^api\/game\//, ''); // 🔥 FIX
    const url = `${GATEWAY_CONFIG.SERVICES.GAME}/${cleanPath}`;
    const queryString = new URL(request.url, 'https://localhost').search;
    const fullUrl = `${url}${queryString}`;

    app.log.info({
      event: 'game_proxy_request',
      fullUrl,
      method: request.method,
      body: request.body,
      user: request.headers['x-user-name'] || null,
    });

    const init: RequestInit = {
      method: request.method,
      headers: getProxyHeaders(request),
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // Avoid circcular structure JSON.stringify by cleaning the body if it exists
      // const cleanBody = request.body ? { ...request.body } : undefined;
      // init.body = cleanBody ? JSON.stringify(cleanBody) : undefined;
      const contentType = request.headers['content-type'];
      if (contentType?.includes('application/json')) {
        if (request.body !== null && request.body !== undefined) {
          if (typeof request.body === 'object') {
            try {
              init.body = JSON.stringify(request.body);
            } catch (err) {
              app.log.error({
                event: 'game_proxy_body_stringify_error',
                error: (err as Error).message,
                bodyType: typeof request.body,
              });
              return reply.code(400).send({
                error: 'INVALID_JSON_BODY',
                message: 'Failed to process request body as JSON',
              });
            }
          } else {
            init.body = String(request.body);
          }
        } else if (contentType === 'application/json') {
          init.body = '{}';
        }
      } else {
        init.body = request.body as any;
      }
    }
    const res = await proxyRequest(app, request, reply, fullUrl, init);
    return res;
  });
}
