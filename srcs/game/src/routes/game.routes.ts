import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PongGame } from '../core/game.engine.js';
import { listGameSessions, handleWebSocketConnection, newGameSession, healthCheck } from '../controllers/game.controller.js'
import { gameSessions, playerConnections } from '../core/game.state.js'

export async function gameRoutes(app: FastifyInstance)
{ 
  app.get('/sessions', listGameSessions);
  app.get('/:sessionId', {websocket: true}, handleWebSocketConnection);
  app.post('/create-session', newGameSession);
  app.get('/health', healthCheck );

  // 404 handler
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      status: 'error',
      message: 'Endpoint not found',
      method: request.method,
      path: request.url
    });
  });
}

