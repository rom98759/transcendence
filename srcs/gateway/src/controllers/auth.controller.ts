import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest } from '../utils/proxy.js';
import { logger } from '../utils/logger.js';
import { CatchAllParams } from '../types/params.types.js';
import { mtlsAgent } from '../utils/mtlsAgent.js';
import { MTLSRequestInit } from '../types/https.js';
import { GATEWAY_CONFIG } from '../utils/constants.js';

export function registerAuthRoutes(app: FastifyInstance) {
  // Route health spécifique
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.logHealth({ serviceName: 'auth-service' }, 'service_check');
    // Ajout des options mTLS pour le healthcheck
    const init: MTLSRequestInit = {
      dispatcher: mtlsAgent,
    };
    const res = await proxyRequest(
      app,
      request,
      reply,
      `${GATEWAY_CONFIG.SERVICES.AUTH}/health`,
      init,
    );
    return res;
  });

  // Proxy toutes les autres requêtes vers le service auth
  app.all(
    '/*',
    async (request: FastifyRequest<{ Params: CatchAllParams }>, reply: FastifyReply) => {
      const rawPath = request.params['*'];
      const cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
      const url = `${GATEWAY_CONFIG.SERVICES.AUTH}/${cleanPath}`;
      const queryString = new URL(request.url, 'https://localhost').search;
      const fullUrl = `${url}${queryString}`;

      // Configuration de la requête avec l'agent mTLS
      const init: MTLSRequestInit = {
        method: request.method,
        headers: {
          // On propage les headers de contenu si nécessaire
          ...(request.headers['content-type'] && {
            'content-type': request.headers['content-type'] as string,
          }),
          // Ajout des headers de sécurité interne
          'x-user-name': (request.headers['x-user-name'] as string) || '',
          'x-user-id': (request.headers['x-user-id'] as string) || '',
        },
        dispatcher: mtlsAgent, // Injection cruciale pour le mTLS
      };

      const rawUser = request.headers['x-user-name'] as string | string[] | undefined;
      const user = Array.isArray(rawUser) ? rawUser[0] : (rawUser ?? null);

      logger.info({
        event: 'auth_proxy_request',
        rawPath,
        method: request.method,
        user,
      });

      if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
        // (init.headers as Record<string, string>)['content-type'] =
        //   request.headers['content-type'] || 'application/json';
        init.body = JSON.stringify(request.body);
      }

      const res = await proxyRequest(app, request, reply, fullUrl, init);
      return res;
    },
  );
}
