import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest, webSocketProxyRequest } from '../utils/proxy.js';

export function registerAiRoutes(app: FastifyInstance) {
  app.get('/invite-pong-ai', async (request, reply) => {
    app.log.info({ event: 'invite_pong_ai', remote: 'pong-ai', url: '/invite-pong-ai' });
    const res = await proxyRequest(
      app,
      request,
      reply,
      'http://pong-ai-service:3006/invite-pong-ai',
    );
    return res;
  });

  app.post('/join-game', async (request, reply) => {
    app.log.info({
      event: 'ai_join_game',
      remote: 'pong-ai',
      url: '/join-game',
      body: request.body,
    });
    const res = await proxyRequest(app, request, reply, 'http://pong-ai-service:3006/join-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    return res;
  });
}
