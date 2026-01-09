import { FastifyInstance, FastifyRequest } from 'fastify';
import { gameSessions } from '../core/game.state.js';
import { ServerMessage, ClientMessage } from '../core/game.types.js';
import { addPlayerConnection, cleanupConnection } from './game.connections.js';
import { WS_CLOSE } from '../core/game.state.js';
// Broadcast state to all clients in a session
export function broadcastToSession(sessionId: string, message: ServerMessage) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players) return;

  const messageStr = JSON.stringify(message);
  currentSession.players.forEach((ws) => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    } catch (err) {
      console.error('Failed to send to client:', err);
    }
  });
}

export function handleClientMessage(this: FastifyInstance, ws: any, sessionId: string) {
  let currentSession = gameSessions.get(sessionId);
  if (!currentSession) {
    ws.send(JSON.stringify({ type: 'error', message: 'No game at this session' } as ServerMessage));
    return;
  }
  if (!currentSession.players || currentSession.players.size === 0)
    ws.send(JSON.stringify({ type: 'connected', message: 'Player A' }));
  else if (currentSession.players.size === 1)
    ws.send(JSON.stringify({ type: 'connected', message: 'Player B' }));
  else {
    ws.close(WS_CLOSE.SESSION_FULL, 'session is full');
    return;
  }
  addPlayerConnection.call(this, ws, sessionId);
  const game = currentSession.game;
  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      switch (message.type) {
        case 'start':
          if (game) {
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
            // broadcastToSession(sessionId, {
            //   type: 'gameOver',
            //   message: 'Game stopped',
            //   data: game.getState(),
            // });
            // game.stop();
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

export function defineCommunicationInterval(sessionId: string): any {
  // Create interval and store it
  const interval = setInterval(() => {
    const currentSessionData = gameSessions.get(sessionId);
    if (!currentSessionData) {
      return; // Session was deleted
    }

    const status = currentSessionData.game.getState().status;

    if (status === 'playing') {
      broadcastToSession(sessionId, {
        type: 'state',
        data: currentSessionData.game.getState(),
      });
    } else if (status === 'finished') {
      broadcastToSession(sessionId, {
        type: 'gameOver',
        data: currentSessionData.game.getState(),
      });
      //at game over, cleanup all WS connexions + delete the gameSession
      cleanupConnection(null, sessionId, 4001, 'Game Over');
      gameSessions.delete(sessionId);
    } else if (status === 'waiting') {
      broadcastToSession(sessionId, {
        type: 'state',
        data: currentSessionData.game.getState(),
      });
    }
  }, 16);
  return interval;
}
