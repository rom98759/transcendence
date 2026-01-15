import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest } from '../utils/proxy.js';
import { CatchAllParams } from '../types/params.types.js';
import { GATEWAY_CONFIG } from '../utils/constants.js';

interface UserParams {
  username: string;
}

export function registerUsersRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    app.log.info({ event: 'um_health', remote: 'user-service', url: '/health' });
    const res = await proxyRequest(app, request, reply, `${GATEWAY_CONFIG.SERVICES.USERS}/health`);
    return res;
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    app.log.info({ event: 'um_new', remote: 'user-service', url: '/' });
    const res = await proxyRequest(app, request, reply, `${GATEWAY_CONFIG.SERVICES.USERS}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });
    return res;
  });

  app.get<{ Params: UserParams }>(
    '/:username',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username } = request.params as UserParams;
      app.log.info({
        event: 'um_get_by_username',
        username,
        url: request.url,
      });
      const targetUrl = `${GATEWAY_CONFIG.SERVICES.USERS}/${username}`;
      return proxyRequest(app, request, reply, targetUrl);
    },
  );

  app.all<{ Params: CatchAllParams }>(
    '/*',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawPath = (request.params as CatchAllParams)['*'];
      const cleanPath = rawPath.replace(/^api\/users\//, '');
      const url = `${GATEWAY_CONFIG.SERVICES.USERS}/${cleanPath}`;
      const queryString = new URL(request.url, 'http://localhost').search;
      const fullUrl = `${url}${queryString}`;

      app.log.info({
        event: 'um_proxy_request',
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
    },
  );
}
