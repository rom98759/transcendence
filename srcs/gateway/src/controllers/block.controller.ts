import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest, proxyBlockRequest } from '../utils/proxy.js';
import { GATEWAY_CONFIG } from '../utils/constants.js';
import { fetchOptions } from '../utils/mtlsAgent.js';

export function registerBlockRoutes(app: FastifyInstance) {
  // Regular HTTP routes
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    app.log.info({ event: 'blockchain_health', remote: 'blockchain', url: '/health' });
    const res = await proxyRequest(
      app,
      request,
      reply,
      `${GATEWAY_CONFIG.SERVICES.BLOCK}/health`,
      fetchOptions,
    );
    return res;
  });
  // app.get('/blockchain', async (request, reply) => {
  //   app.log.info({ event: 'blockchain_consult', remote: 'blockchain', url: '/blockchain' });
  //   const url = `${GATEWAY_CONFIG.SERVICES.BLOCK}/blockchain`;
  //   return proxyBlockRequest(app, request, reply, url);
  // });

  app.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (request.params as any)['*'];
    const cleanPath = rawPath.replace(/^api\/block\//, ''); // 🔥 FIX
    const url = `${GATEWAY_CONFIG.SERVICES.BLOCK}/${cleanPath}`;
    const queryString = new URL(request.url, 'https://localhost').search;
    const fullUrl = `${url}${queryString}`;

    app.log.info({
      event: 'blockchain_proxy_request',
      rawPath,
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
