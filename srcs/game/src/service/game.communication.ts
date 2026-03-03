import { FastifyInstance, FastifyRequest } from 'fastify';
import { gameSessions, SessionData } from '../core/game.state.js';
import { ServerMessage, ClientMessage, GameOverData } from '../core/game.types.js';
import { addPlayerConnection, cleanupConnection } from './game.connections.js';
import { WS_CLOSE } from '../core/game.state.js';
import { WebSocket } from 'ws';
import * as db from '../core/game.database.js';

// Broadcast state to all clients in a session
export function broadcastToSession(sessionId: string, message: ServerMessage) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players) return;

  const messageStr = JSON.stringify(message);
  currentSession.players.forEach((id, ws) => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    } catch (err) {
      console.error('Failed to send to client:', err);
    }
  });
}

/**
 * Handle WebSocket messages from a client and manage game interaction.
 * @param userId - DB user ID of the connecting player (from x-user-id header)
 */
export function handleClientMessage(
  this: FastifyInstance,
  ws: WebSocket,
  sessionId: string,
  userId: number | null = null,
) {
  let currentSession = gameSessions.get(sessionId);
  if (!currentSession) {
    ws.send(JSON.stringify({ type: 'error', message: 'No game at this session' } as ServerMessage));
    return;
  }

  if (!addPlayerConnection.call(this, ws, sessionId, userId)) {
    return;
  }

  const game = currentSession.game;
  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    this.log.info(`receives WS: ${data}`);
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      this.log.info(`${message}`);
      switch (message.type) {
        case 'start':
          if (game && game.status === 'waiting') {
            game.start();
            broadcastToSession(sessionId, {
              type: 'state',
              message: 'Game started',
              data: game.getState(),
            });
            this.log.info(`[${sessionId}] Game started`);
          }
          break;
        case 'stop': // Should be 'quit' -> it mean quit & disconnect but the game still running (even with no players)
          if (game) {
            cleanupConnection(
              ws,
              currentSession.id,
              WS_CLOSE.PLAYER_QUIT,
              'A player has quit the game',
            );
          }
          break;
        case 'paddle':
          if (game && message.paddle && message.direction) {
            game.setPaddleDirection(message.paddle, message.direction);
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' } as ServerMessage));
          break;
        default:
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            } as ServerMessage),
          );
      }
    } catch (err: unknown) {
      console.error(`[${sessionId}] Error processing message:`, err);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        } as ServerMessage),
      );
    }
  });
}

/**
 * Persist game result to DB and trigger tournament progression.
 * Called once when game status transitions to 'finished'.
 * Guards against double execution via session.persisted flag.
 *
 * Returns GameOverData for the gameOver WS message.
 */
async function persistGameResult(
  app: FastifyInstance,
  sessionId: string,
  sessionData: SessionData,
): Promise<GameOverData> {
  // Guard: only persist once
  if (sessionData.persisted) {
    return buildGameOverData(sessionData);
  }
  sessionData.persisted = true;

  const { game, playerUserIds, tournamentId, gameMode } = sessionData;
  const scores = game.scores;

  app.log.info({
    event: 'game_persist_start',
    sessionId,
    scores,
    playerUserIds,
    tournamentId,
    gameMode,
  });

  // For tournament matches, persist in DB and progress bracket
  if (gameMode === 'tournament' && tournamentId != null) {
    try {
      // Look up the match in DB using sessionId
      const match = db.getMatchBySessionId(sessionId);
      if (!match) {
        app.log.error({ event: 'game_persist_no_match', sessionId }, 'No DB match for sessionId');
        return buildGameOverData(sessionData);
      }

      // Player A = left paddle, Player B = right paddle
      // match.player1 and match.player2 are DB user IDs
      // We need to determine which paddle corresponds to which DB player.
      let scorePlayer1: number;
      let scorePlayer2: number;

      if (playerUserIds.A === match.player1) {
        scorePlayer1 = scores.left;
        scorePlayer2 = scores.right;
      } else {
        scorePlayer1 = scores.right;
        scorePlayer2 = scores.left;
      }

      const winnerId = scorePlayer1 > scorePlayer2 ? match.player1 : match.player2;

      app.log.info({
        event: 'game_persist_match_result',
        matchId: match.id,
        scorePlayer1,
        scorePlayer2,
        winnerId,
      });

      // Atomic: update match result + trigger bracket progression (onMatchFinished)
      db.updateMatchResult(match.id, scorePlayer1, scorePlayer2, winnerId);

      // Check if the entire tournament is now complete
      const tournamentComplete = db.isTournamentComplete(tournamentId);
      if (tournamentComplete) {
        db.setTournamentFinished(tournamentId);
        app.log.info({ event: 'tournament_complete', tournamentId });

        // Publish tournament result to Redis stream for blockchain service
        await publishTournamentToBlockchain(app, tournamentId);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'game_persist_error', sessionId, err: errorMessage });
      // Don't rethrow — game cleanup must continue even if persist fails
    }
  } else if (gameMode === 'local') {
    // Local match: player1 = authenticated user, player2 = GUEST (id=2)
    try {
      db.ensureGuestPlayer();

      const player1Id = playerUserIds.A ?? db.GUEST_USER_ID;
      const player2Id = db.GUEST_USER_ID;

      const winnerId = scores.left > scores.right ? player1Id : player2Id;

      db.createFreeMatch(player1Id, player2Id, sessionId, scores.left, scores.right, winnerId);

      app.log.info({
        event: 'local_match_persisted',
        sessionId,
        player1Id,
        player2Id,
        scores,
        winnerId,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'local_match_persist_error', sessionId, err: errorMessage });
    }
  } else {
    // Free remote match: both players are real users
    try {
      const player1Id = playerUserIds.A;
      const player2Id = playerUserIds.B;

      if (player1Id != null && player2Id != null) {
        const winnerId = scores.left > scores.right ? player1Id : player2Id;

        db.createFreeMatch(player1Id, player2Id, sessionId, scores.left, scores.right, winnerId);

        app.log.info({
          event: 'free_match_persisted',
          sessionId,
          player1Id,
          player2Id,
          scores,
          winnerId,
        });
      } else {
        app.log.warn({
          event: 'free_match_missing_players',
          sessionId,
          playerUserIds,
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      app.log.error({ event: 'free_match_persist_error', sessionId, err: errorMessage });
    }
  }

  return buildGameOverData(sessionData);
}

/**
 * Build the GameOverData payload from session data.
 */
function buildGameOverData(sessionData: SessionData): GameOverData {
  const scores = sessionData.game.scores;
  const winnerSide: 'left' | 'right' = scores.left > scores.right ? 'left' : 'right';

  // Determine the winner's userId based on which side won
  let winnerUserId: number | null = null;
  if (winnerSide === 'left') {
    winnerUserId = sessionData.playerUserIds.A; // A = left paddle
  } else {
    winnerUserId = sessionData.playerUserIds.B; // B = right paddle
  }

  return {
    scores,
    winner: winnerSide,
    winnerUserId,
    status: 'finished',
  };
}

/**
 * Publish a completed tournament to the Redis stream 'tournament.results'
 * for the blockchain service to consume asynchronously.
 */
async function publishTournamentToBlockchain(
  app: FastifyInstance,
  tournamentId: number,
): Promise<void> {
  try {
    const result = db.getTournamentResultForBlockchain(tournamentId);
    if (!result) {
      app.log.warn({ event: 'blockchain_publish_no_data', tournamentId });
      return;
    }

    if (!app.redis) {
      app.log.warn({ event: 'blockchain_publish_no_redis', tournamentId });
      return;
    }

    await app.redis.xadd('tournament.results', '*', 'data', JSON.stringify(result));

    app.log.info({
      event: 'blockchain_published',
      tournamentId,
      payload: result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    app.log.error({
      event: 'blockchain_publish_error',
      tournamentId,
      err: errorMessage,
    });
    // Non-blocking: blockchain publish failure should not break the game flow.
    // The blockchain consumer has its own retry mechanism via Redis pending messages.
  }
}

/**
 * Communication interval: broadcasts game state and handles finish lifecycle.
 * @param app - Fastify instance (needed for DB/Redis access at game finish)
 */
export function defineCommunicationInterval(
  sessionId: string,
  app: FastifyInstance,
): ReturnType<typeof setInterval> {
  // Create interval and store it
  const interval = setInterval(() => {
    const currentSessionData = gameSessions.get(sessionId);
    if (!currentSessionData) {
      clearInterval(interval);
      return; // Session was deleted
    }

    const status = currentSessionData.game.getState().status;

    if (status === 'playing') {
      broadcastToSession(sessionId, {
        type: 'state',
        data: currentSessionData.game.getState(),
      });
    } else if (status === 'finished') {
      // Clear interval immediately to prevent re-entry
      clearInterval(interval);

      // Async finish lifecycle — persist THEN cleanup
      (async () => {
        try {
          // 1. Persist result to DB + trigger tournament progression
          const gameOverData = await persistGameResult(app, sessionId, currentSessionData);

          // 2. Broadcast game over to all connected clients with enriched data
          broadcastToSession(sessionId, {
            type: 'gameOver',
            data: currentSessionData.game.getState(),
            gameOverData,
          });
        } catch (err) {
          app.log.error({ event: 'persist_unhandled_error', sessionId, err });

          // Still broadcast gameOver even if persist failed
          broadcastToSession(sessionId, {
            type: 'gameOver',
            data: currentSessionData.game.getState(),
          });
        } finally {
          // 3. Cleanup all WS connections + delete the gameSession
          cleanupConnection(null, sessionId, WS_CLOSE.GAME_OVER, 'Game Over');
          gameSessions.delete(sessionId);

          app.log.info({ event: 'session_destroyed', sessionId });
        }
      })();
    } else if (status === 'waiting') {
      broadcastToSession(sessionId, {
        type: 'state',
        data: currentSessionData.game.getState(),
      });
    }
  }, 16);
  return interval;
}
