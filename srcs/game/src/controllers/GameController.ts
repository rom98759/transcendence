// ============================================================================
// GameController — Thin HTTP layer, delegates to usecases and repositories
// ============================================================================

import { FastifyReply, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { AppError, LOG_REASONS, ErrorDetail } from '@transcendence/core';
import { GameMode, GameSettings, TournamentParams } from '../types/game.types.js';
import { SessionStore } from '../core/session/SessionStore.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { TournamentRepository } from '../repositories/TournamentRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { createSession } from '../usecases/CreateSession.js';
import { startGameLoop } from '../usecases/GameLoop.js';
import { handleWsConnection } from '../websocket/WsConnectionManager.js';

type StatsHistoryQuery = {
  username?: string;
  userId?: string | number;
  limit?: string | number;
};

function parsePositiveInt(value: string | number | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function hasLogReason(error: AppError, expectedReason: string): boolean {
  const details = error.context?.details;
  if (!Array.isArray(details)) return false;
  return details.some((detail) => {
    const reason = (detail as ErrorDetail).reason;
    return reason === expectedReason;
  });
}

/**
 * Creates a controller object bound to the shared dependencies.
 * This avoids global singletons and makes everything injectable.
 */
export function createGameController(
  sessionStore: SessionStore,
  matchRepo: MatchRepository,
  tournamentRepo: TournamentRepository,
  userRepo: UserRepository,
) {
  const resolveTargetUserId = (
    query: StatsHistoryQuery,
    fallbackUserId: number | null,
  ): { targetUserId: number | null; error: string | null; statusCode?: number } => {
    const requestedUsername = query.username?.trim();
    if (requestedUsername) {
      const targetUser = userRepo.getUserByUsername(requestedUsername);
      if (!targetUser) {
        return {
          targetUserId: null,
          error: `User ${requestedUsername} not found in game service`,
          statusCode: 404,
        };
      }
      return { targetUserId: targetUser.id, error: null };
    }

    if (query.userId != null) {
      const requestedUserId = parsePositiveInt(query.userId);
      if (!requestedUserId) {
        return {
          targetUserId: null,
          error: 'userId must be a positive integer',
          statusCode: 400,
        };
      }
      return { targetUserId: requestedUserId, error: null };
    }

    return { targetUserId: fallbackUserId, error: null };
  };

  return {
    // ---- Session Management ----

    async newGameSession(req: FastifyRequest, reply: FastifyReply) {
      const app = req.server;
      const body = req.body as { gameMode: string; tournamentId?: number | string };
      const userId = req.user?.id ?? null;
      const gameMode = body.gameMode as GameMode;
      const rawTournamentId = body.tournamentId != null ? Number(body.tournamentId) : null;
      if (
        rawTournamentId !== null &&
        (!Number.isInteger(rawTournamentId) || rawTournamentId <= 0)
      ) {
        return reply
          .code(400)
          .send({ status: 'failure', message: 'tournamentId must be a positive integer' });
      }
      const tournamentId = rawTournamentId;

      app.log.info(
        `[${gameMode}] New session request (userId=${userId}, tournamentId=${tournamentId})`,
      );

      try {
        const result = createSession(
          {
            gameMode,
            tournamentId,
            creatorUserId: userId,
            creatorUsername: req.user?.username ?? null,
          },
          sessionStore,
          matchRepo,
          tournamentRepo,
          app,
        );

        // Only start the loop for new sessions — re-joined tournament sessions
        if (!result.session.interval) {
          result.session.game.preview();
          startGameLoop(result.session, sessionStore, app);
        }

        return reply.code(200).send({
          status: 'success',
          message: 'Game session created',
          sessionId: result.sessionId,
          sessionName: result.session.displayName,
          wsUrl: `/game/ws/${result.sessionId}`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Session creation failed';
        app.log.error({ event: 'create_session_error', err: msg });
        return reply.code(400).send({
          status: 'failure',
          message: msg,
        });
      }
    },

    async deleteSession(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { sessionId: string };
      const sessionId = params.sessionId;
      if (!sessionId) {
        return reply.code(400).send({ status: 'error', message: 'Session ID required' });
      }

      const session = sessionStore.get(sessionId);
      if (!session) {
        return reply.code(404).send({ status: 'failure', message: 'No session for this id' });
      }

      session.destroy();
      sessionStore.delete(sessionId);

      return { status: 'success', message: 'Session deleted' };
    },

    async gameSettings(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as { sessionId?: string; settings?: GameSettings };
      const { sessionId, settings } = body;

      if (!sessionId)
        return reply.code(400).send({ status: 'failure', message: 'sessionId is required' });
      if (!settings)
        return reply.code(400).send({ status: 'failure', message: 'settings are required' });

      const session = sessionStore.get(sessionId);
      if (!session)
        return reply
          .code(404)
          .send({ status: 'failure', message: `Session ${sessionId} not found` });
      if (session.game.status !== 'waiting') {
        return reply.code(409).send({ status: 'failure', message: 'Game is running or finished' });
      }

      session.game.applySettings(settings);

      return {
        status: 'success',
        message: 'Settings applied',
        sessionId,
        appliedSettings: session.game.getSettings(),
      };
    },

    async listGameSessions() {
      const sessions = sessionStore.listByMode('remote').map((s) => ({
        sessionId: s.id,
        sessionName: s.displayName,
        state: s.game.getState(),
        playerCount: s.connectedPlayerCount,
        hasInterval: s.interval !== null,
        gameMode: s.gameMode,
        players: s.getPlayersInfo(),
      }));

      return { status: 'success', count: sessions.length, sessions };
    },

    async healthCheck() {
      return {
        status: 'healthy',
        service: 'websocket-game-service',
        activeSessions: sessionStore.size,
        timestamp: new Date().toISOString(),
      };
    },

    // ---- WebSocket ----

    async webSocketConnect(socket: WebSocket, req: FastifyRequest) {
      const app = req.server;
      const params = req.params as { sessionId: string };
      const sessionId = params.sessionId;

      // Extract userId from gateway headers
      const idHeader = (req.headers as Record<string, string | undefined>)['x-user-id'];
      const parsed = idHeader ? Number(idHeader) : NaN;
      const userId = Number.isFinite(parsed) ? parsed : null;

      const userName = (req.headers as Record<string, string | undefined>)['x-user-name'];
      const user =
        userId != null ? { id: userId, username: String(userName ?? 'anonymous') } : null;

      app.log.info({ event: 'ws_connect', sessionId, userId });

      await handleWsConnection(socket, sessionId, user, sessionStore, app);
    },

    // ---- Tournaments ----

    async newTournament(req: FastifyRequest, reply: FastifyReply) {
      const userId = req.user?.id;
      if (!userId)
        return reply.code(401).send({ status: 'failure', message: 'Authentication required' });
      const tournamentId = tournamentRepo.createTournament(userId);
      return reply.code(200).send(tournamentId);
    },

    async listTournament(_req: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send(tournamentRepo.listTournaments());
    },

    async joinTournament(req: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) {
      const tourId = Number(req.params.id);
      const userId = req.user.id;

      try {
        tournamentRepo.joinTournament(userId, tourId);
      } catch (err: unknown) {
        if (err instanceof AppError) {
          const isFull = hasLogReason(err, LOG_REASONS.TOURNAMENT.FULL);
          if (isFull) return reply.code(409).send({ message: String(err.message) });
        }
        throw err;
      }
      return reply.code(200).send({ joining: tourId });
    },

    async showTournament(req: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) {
      const tourId = Number(req.params.id);
      const result = tournamentRepo.showTournament(tourId);
      if (result.length === 0) return reply.code(404).send("tournament don't exist");
      return reply.code(200).send(result);
    },

    async getMatchToPlay(req: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) {
      const tourId = Number(req.params.id);
      const userId = req.user.id;

      try {
        const matchToPlay = tournamentRepo.getMatchToPlay(tourId, userId);
        return reply.code(200).send(matchToPlay);
      } catch (err: unknown) {
        if (err instanceof AppError) {
          const isNoMatch = hasLogReason(err, LOG_REASONS.TOURNAMENT.NO_MATCH_TO_PLAY);
          // Return 200 with null instead of 404 — more polling-friendly.
          // The frontend polls this endpoint; a 404 pollutes the network tab.
          if (isNoMatch) return reply.code(200).send(null);
        }
        throw err;
      }
    },

    /**
     * GET /tournaments/:id/state
     * Returns the full tournament state: status, players, all matches with scores.
     * Used by the frontend to reconstruct the entire bracket in one call.
     */
    async getTournamentState(
      req: FastifyRequest<{ Params: TournamentParams }>,
      reply: FastifyReply,
    ) {
      const tourId = Number(req.params.id);
      const state = tournamentRepo.getTournamentFullState(tourId);
      if (!state.status) {
        return reply.code(404).send({ message: 'Tournament not found' });
      }
      return reply.code(200).send(state);
    },

    /**
     * GET /matches/:matchId/session
     * Resolves a matchId to its session info (sessionId, tournamentId, round, status).
     * Used by /game/:matchId to find the WS session to connect to.
     */
    async getMatchSession(req: FastifyRequest, reply: FastifyReply) {
      const { matchId } = req.params as { matchId: string };
      const id = Number(matchId);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.code(400).send({ message: 'matchId must be a positive integer' });
      }
      const match = tournamentRepo.getMatchById(id);
      if (!match) {
        return reply.code(404).send({ message: 'Match not found' });
      }
      return reply.code(200).send({
        matchId: match.id,
        sessionId: match.sessionId,
        tournamentId: match.tournament_id,
        round: match.round,
        player1: match.player1,
        player2: match.player2,
        username_player1: match.username_player1,
        username_player2: match.username_player2,
        score_player1: match.score_player1,
        score_player2: match.score_player2,
        winner_id: match.winner_id,
        finished: match.winner_id !== null,
      });
    },

    // ---- Stats / History ----

    async getTournamentStats(req: FastifyRequest, reply: FastifyReply) {
      const query = (req.query ?? {}) as StatsHistoryQuery;

      // If no username or userId specified → global leaderboard (all players)
      if (!query.username?.trim() && query.userId == null) {
        return reply.code(200).send(tournamentRepo.getAllPlayersStats());
      }

      // Otherwise resolve to a specific user's stats
      const authUserId = req.user?.id ?? null;
      const { targetUserId, error, statusCode = 400 } = resolveTargetUserId(query, authUserId);

      if (!targetUserId) {
        return reply.code(statusCode).send({ status: 'failure', message: error ?? 'Invalid user' });
      }

      return reply.code(200).send(tournamentRepo.getTournamentStats(targetUserId));
    },

    async getMatchHistory(req: FastifyRequest, reply: FastifyReply) {
      const query = (req.query ?? {}) as StatsHistoryQuery;
      const authUserId = req.user?.id ?? null;
      const { targetUserId, error, statusCode = 400 } = resolveTargetUserId(query, authUserId);

      if (!targetUserId) {
        return reply.code(statusCode).send({ status: 'failure', message: error ?? 'Invalid user' });
      }

      const rawLimit = parsePositiveInt(query.limit);
      const limit = rawLimit == null ? 100 : Math.min(rawLimit, 200);

      return reply.code(200).send(matchRepo.getMatchHistory(targetUserId, limit));
    },

    // ---- RL API (AI mode) ----

    async resetGame(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as { sessionId?: string };
      const sessionId = body.sessionId;
      if (!sessionId)
        return reply.code(400).send({ status: 'failure', message: 'sessionId is required' });

      const session = sessionStore.get(sessionId);
      if (!session)
        return reply
          .code(404)
          .send({ status: 'failure', message: `Session ${sessionId} not found` });

      // Delegate reset to the domain object — avoids mutating internal state from the HTTP layer
      session.game.reset();
      return { status: 'success', state: session.game.getState() };
    },

    async stepGame(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as {
        sessionId?: string;
        action?: 'up' | 'down' | 'stop';
        paddle?: 'left' | 'right';
      };
      const { sessionId, action, paddle = 'right' } = body;
      if (!sessionId || !action) {
        return reply
          .code(400)
          .send({ status: 'failure', message: 'sessionId and action are required' });
      }

      const session = sessionStore.get(sessionId);
      if (!session)
        return reply
          .code(404)
          .send({ status: 'failure', message: `Session ${sessionId} not found` });

      session.game.setPaddleDirection(paddle, action);
      session.game.update();

      let reward = 0;
      let done = false;
      if (session.game.isFinished()) {
        done = true;
        reward = session.game.scores.right > session.game.scores.left ? 1 : -1;
      }
      return { status: 'success', state: session.game.getState(), reward, done };
    },

    async getGameState(req: FastifyRequest, reply: FastifyReply) {
      const sessionId =
        (req.query as { sessionId?: string }).sessionId ||
        (req.body as { sessionId?: string })?.sessionId;
      if (!sessionId)
        return reply.code(400).send({ status: 'failure', message: 'sessionId is required' });

      const session = sessionStore.get(sessionId);
      if (!session)
        return reply
          .code(404)
          .send({ status: 'failure', message: `Session ${sessionId} not found` });

      return { status: 'success', state: session.game.getState() };
    },
  };
}
