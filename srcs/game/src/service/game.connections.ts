import { gameSessions } from '../core/game.state.js';
import { FastifyInstance } from 'fastify';
import { WS_CLOSE } from '../core/game.state.js';
import { WebSocket } from 'ws';

export function cleanupConnection(
  socket: WebSocket | null,
  sessionId: string,
  code: number = 1000,
  message: string,
) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players) return;

  if (socket) {
    socket.close(code, message);
  } else {
    currentSession.players.forEach((id, s) => s.close(code, message));
    currentSession.players.clear();
  }
  if (currentSession.players.size === 0) {
    if (currentSession.interval) {
      clearInterval(currentSession.interval);
      currentSession.interval = null;
    }
  }
}

/**
 * Add a player to a game session.
 * @param userId - The DB user ID (from x-user-id header), used to map left/right paddle to real players.
 */
export function addPlayerConnection(
  this: FastifyInstance,
  socket: WebSocket,
  sessionId: string,
  userId: number | null = null,
) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players || !socket) return false;

  const players = currentSession.players;

  if (players.size >= 2) {
    this.log.info('Too much players in session, refused connection.');
    socket.close(WS_CLOSE.SESSION_FULL, 'Session full');
    return false;
  } else if (players.size === 1 && Array.from(players.values())[0] === 'A') {
    players.set(socket, 'B');
    currentSession.playerUserIds.B = userId;
    this.log.info(`Player connected as Player B (userId=${userId})`);
    socket.send(JSON.stringify({ type: 'connected', message: 'Player B' }));
  } else {
    players.set(socket, 'A');
    currentSession.playerUserIds.A = userId;
    this.log.info(`Player connected as Player A (userId=${userId})`);
    socket.send(JSON.stringify({ type: 'connected', message: 'Player A' }));
  }

  this.log.info(`[${sessionId}] Player ${players.get(socket)} connected. Total: ${players.size}`);

  // Auto-start the game once both players are in
  if (players.size === 2) {
    const game = currentSession.game;
    if (game && game.status === 'waiting') {
      game.start();
      this.log.info(`[${sessionId}] Both players connected — game auto-started`);
    }
  }

  // Handle disconnection
  socket.on('close', (code: number, reason: string) => {
    this.log.info(`[${sessionId}] Player disconnected: ${code} - ${reason}`);
    players.delete(socket);
    if (players.size === 0 && currentSession.game.status === 'waiting') {
      currentSession.game.stop();
      this.log.info(`[${sessionId}] Game stopped — no players left`);
      // Clean up orphan waiting session immediately
      if (currentSession.interval) {
        clearInterval(currentSession.interval);
        currentSession.interval = null;
      }
      gameSessions.delete(sessionId);
      this.log.info(`[${sessionId}] Orphan waiting session deleted`);
    }
  });

  // Handle errors
  socket.on('error', (err: Error) => {
    console.error(`[${sessionId}] WebSocket error:`, err);
    cleanupConnection(socket, sessionId, 4444, 'error');
  });

  return true;
}
