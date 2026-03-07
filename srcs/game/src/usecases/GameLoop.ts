// ============================================================================
// GameLoop — Communication interval: broadcasts state + handles game finish
// This is the 16ms loop that keeps clients in sync.
// ============================================================================

import { FastifyInstance } from 'fastify';
import { Session } from '../core/session/Session.js';
import { SessionStore } from '../core/session/SessionStore.js';
import { GameOverData, WS_CLOSE } from '../types/game.types.js';
import { broadcastToSession } from '../websocket/WsBroadcast.js';

/**
 * Build the GameOverData payload from session state.
 */
function buildGameOverData(session: Session): GameOverData {
  const scores = session.game.scores;
  const winnerSide: 'left' | 'right' = scores.left > scores.right ? 'left' : 'right';

  // A = left paddle, B = right paddle
  const winnerUserId = winnerSide === 'left' ? session.getUserId('A') : session.getUserId('B');

  return {
    scores,
    winner: winnerSide,
    winnerUserId,
    status: 'finished',
  };
}

/**
 * Start the communication interval for a session.
 * Broadcasts game state to clients every 16ms (~62 fps).
 * When the game finishes: persists result via mode strategy, broadcasts gameOver, cleans up.
 */
export function startGameLoop(
  session: Session,
  sessionStore: SessionStore,
  app: FastifyInstance,
): NodeJS.Timeout {
  const interval = setInterval(() => {
    const status = session.game.status;

    if (status === 'playing') {
      broadcastToSession(session, {
        type: 'state',
        data: session.game.getState(),
      });
    } else if (status === 'finished') {
      // Prevent re-entry
      clearInterval(interval);

      // Async finish lifecycle
      (async () => {
        // Build the game-over payload before entering the persist try-block so it
        // is available in the catch branch even if onGameOver throws.
        const gameOverData = buildGameOverData(session);

        try {
          // 1. Persist result (delegates to mode strategy)
          if (!session.persisted) {
            session.persisted = true;
            await session.mode.onGameOver(session, gameOverData, app);

            // 2. Broadcast game over
            broadcastToSession(session, {
              type: 'gameOver',
              data: session.game.getState(),
              gameOverData,
            });
          }
        } catch (err) {
          app.log.error({ event: 'persist_unhandled_error', sessionId: session.id, err });

          // Still broadcast gameOver with scores even if persist failed
          broadcastToSession(session, {
            type: 'gameOver',
            data: session.game.getState(),
            gameOverData,
          });
        } finally {
          // 3. Cleanup
          session.closeAll(WS_CLOSE.GAME_OVER, 'Game Over');
          session.clearInterval();
          sessionStore.delete(session.id);
          app.log.info({ event: 'session_destroyed', sessionId: session.id });
        }
      })();
    }
  }, 16);

  session.interval = interval;
  return interval;
}
