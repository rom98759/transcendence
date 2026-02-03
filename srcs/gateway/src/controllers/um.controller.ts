import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CatchAllParams } from '../types/params.types.js';
import { fastStreamProxy } from '../utils/proxy.js';
import { fastifyReplyFrom } from '@fastify/reply-from';

const UM_SERVICE_URL = 'https://user-service:3002';

export function registerUsersRoutes(app: FastifyInstance) {
  app.all<{ Params: CatchAllParams }>(
    '/*',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawPath = (request.params as CatchAllParams)['*'];
      const cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
      const url = `${UM_SERVICE_URL}/${cleanPath}`;

      await fastStreamProxy(request, reply, url);
      return;
    },
  );
}
