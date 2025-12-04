import { FastifyInstance } from "fastify";
import { listGameSessions, webSocketConnect, newGameSession, healthCheck } from '../controllers/game.controller.js'

export async function gameRoutes(app: FastifyInstance)
{ 
  app.get('/sessions', listGameSessions);
  app.post('/create-session', newGameSession);
  app.get('/health', healthCheck );
  app.get('/:sessionId', {websocket: true}, webSocketConnect);
}

