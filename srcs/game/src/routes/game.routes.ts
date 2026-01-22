import { FastifyInstance } from 'fastify';
import {
  listGameSessions,
  webSocketConnect,
  newGameSession,
  healthCheck,
  gameSettings,
  resetGame,
  stepGame,
  getGameState,
} from '../controllers/game.controller.js';

export async function gameRoutes(app: FastifyInstance) {
  app.post('/settings', gameSettings);
  app.get('/sessions', listGameSessions);
  app.post('/create-session', newGameSession);
  app.get('/health', healthCheck);
  app.get('/:sessionId', { websocket: true }, webSocketConnect);

  app.post('/rl/reset', resetGame);
  app.post('/rl/step', stepGame);
  app.get('/rl/state', getGameState);
}
