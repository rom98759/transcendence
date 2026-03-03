import { FastifyInstance, FastifyRequest } from 'fastify';
import { gameSessions, SessionData } from '../core/game.state.js';
import { ServerMessage, ClientMessage } from '../core/game.types.js';
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
 */
async function persistGameResult(
  app: FastifyInstance,
  sessionId: string,
  sessionData: SessionData,
): Promise<void> {
  // Guard: only persist once
  if (sessionData.persisted) return;
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
        return;
      }

      // Player A = left paddle, Player B = right paddle
      // match.player1 and match.player2 are DB user IDs
      // We need to determine which paddle corresponds to which DB player.
      //
      // The first player to connect gets role A (left). We stored userId in playerUserIds.
      // We map: if playerUserIds.A === match.player1 → left = player1, right = player2
      //         otherwise → left = player2, right = player1
      let scorePlayer1: number;
      let scorePlayer2: number;

      if (playerUserIds.A === match.player1) {
        // A (left) = player1, B (right) = player2
        scorePlayer1 = scores.left;
        scorePlayer2 = scores.right;
      } else {
        // A (left) = player2, B (right) = player1
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
      // (FINAL and LITTLE_FINAL both have winners)
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
  } else {
    // Free match (non-tournament): log result but no DB persistence for now
    // Future: create a free match record if needed
    app.log.info({
      event: 'free_match_finished',
      sessionId,
      scores,
      playerUserIds,
    });
  }
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
      // 1. Persist result to DB + trigger tournament progression (async, non-blocking)
      persistGameResult(app, sessionId, currentSessionData).catch((err) => {
        app.log.error({ event: 'persist_unhandled_error', sessionId, err });
      });

      // 2. Broadcast game over to all connected clients
      broadcastToSession(sessionId, {
        type: 'gameOver',
        data: currentSessionData.game.getState(),
      });

      // 3. Cleanup all WS connections + delete the gameSession
      cleanupConnection(null, sessionId, WS_CLOSE.GAME_OVER, 'Game Over');
      gameSessions.delete(sessionId);
      clearInterval(interval);

      app.log.info({ event: 'session_destroyed', sessionId });
    } else if (status === 'waiting') {
      broadcastToSession(sessionId, {
        type: 'state',
        data: currentSessionData.game.getState(),
      });
    }
  }, 16);
  return interval;
}
