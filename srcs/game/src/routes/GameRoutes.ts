// ============================================================================
// GameRoutes — Route registration, delegates all logic to GameController
// ============================================================================

import { FastifyInstance } from 'fastify';
import { SessionStore } from '../core/session/SessionStore.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { TournamentRepository } from '../repositories/TournamentRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { createGameController } from '../controllers/GameController.js';
import { TournamentParams } from '../types/game.types.js';

/**
 * Registers all game routes on the Fastify instance.
 *
 * Dependencies are injected explicitly — no singletons, no globals.
 */
export async function gameRoutes(
  app: FastifyInstance,
  opts: {
    sessionStore: SessionStore;
    matchRepo: MatchRepository;
    tournamentRepo: TournamentRepository;
    userRepo: UserRepository;
  },
) {
  const { sessionStore, matchRepo, tournamentRepo, userRepo } = opts;
  const ctrl = createGameController(sessionStore, matchRepo, tournamentRepo, userRepo);

  // ---- Session management ----
  app.post('/create-session', { preHandler: app.recoveryHeaders }, ctrl.newGameSession);
  app.delete('/del/:sessionId', ctrl.deleteSession);
  app.post('/settings', ctrl.gameSettings);
  app.get('/sessions', ctrl.listGameSessions);
  app.get('/health', ctrl.healthCheck);

  // ---- WebSocket ----
  app.get('/ws/:sessionId', { websocket: true }, ctrl.webSocketConnect);

  // ---- Tournaments ----
  app.post('/create-tournament', { preHandler: app.recoveryHeaders }, ctrl.newTournament);
  app.get('/tournaments', { preHandler: app.recoveryHeaders }, ctrl.listTournament);
  app.post<{ Params: TournamentParams }>(
    '/tournaments/:id',
    { preHandler: app.recoveryHeaders },
    ctrl.joinTournament,
  );
  app.get<{ Params: TournamentParams }>(
    '/tournaments/:id',
    { preHandler: app.recoveryHeaders },
    ctrl.showTournament,
  );
  app.get<{ Params: TournamentParams }>(
    '/tournaments/:id/match-to-play',
    { preHandler: app.recoveryHeaders },
    ctrl.getMatchToPlay,
  );
  app.get<{ Params: TournamentParams }>(
    '/tournaments/:id/state',
    { preHandler: app.recoveryHeaders },
    ctrl.getTournamentState,
  );

  // ---- Match resolution (matchId -> sessionId) ----
  app.get('/matches/:matchId/session', { preHandler: app.recoveryHeaders }, ctrl.getMatchSession);

  // ---- Stats / History ----
  app.get('/stats', { preHandler: app.recoveryHeaders }, ctrl.getTournamentStats);
  app.get('/history', { preHandler: app.recoveryHeaders }, ctrl.getMatchHistory);

  // ---- RL API (AI training) ----
  app.post('/ai/reset', ctrl.resetGame);
  app.post('/ai/step', ctrl.stepGame);
  app.get('/ai/state', ctrl.getGameState);
}
