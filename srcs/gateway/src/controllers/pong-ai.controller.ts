import { FastifyInstance } from 'fastify';
import { proxyRequest } from '../utils/proxy.js';

export function registerAiRoutes(app: FastifyInstance) {
  // GET version - accepts sessionId as query param
  app.get('/join-game', async (request, reply) => {
    const { sessionId } = request.query as { sessionId?: string };
    app.log.info({
      event: 'ai_join_game_get',
      remote: 'pong-ai',
      url: '/join-game',
      sessionId,
    });
    const res = await proxyRequest(app, request, reply, 'http://pong-ai-service:3006/join-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
    return res;
  });

  // POST version - accepts sessionId in body
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
