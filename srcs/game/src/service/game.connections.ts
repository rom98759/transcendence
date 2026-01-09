import { gameSessions } from '../core/game.state.js';
import { FastifyInstance } from 'fastify';
import { WS_CLOSE } from '../core/game.state.js';

export function cleanupConnection(
  socket: any | null,
  sessionId: string,
  code: number = 1000,
  message: string,
) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players) return;

  if (socket) {
    socket.close(code, message);
  } else {
    currentSession.players.forEach((socket) => socket.close(code, message));
    currentSession.players.clear();
  }
  if (currentSession.players.size === 0) {
    if (currentSession.interval) {
      clearInterval(currentSession.interval);
      currentSession.interval = null;
    }
    // gameSessions.delete(sessionId) 	// let the game finish to determine a winner even if everybody left.
    // (Should not loop infinite because of forcefield, the game should find a winer)
  }
}

export function addPlayerConnection(this: FastifyInstance, socket: any, sessionId: string) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players || !socket) return;

  currentSession.players.add(socket);
  this.log.info(`[${sessionId}] Player connected. Total: ${currentSession.players.size}`);

  // Handle connection close
  socket.on('close', (code: number, reason: string) => {
    this.log.info(`[${sessionId}] Player disconnected: ${code} - ${reason}`);
    currentSession.players.delete(socket);
    if (currentSession.players.size === 0 && currentSession.game.status === 'waiting') {
      currentSession.game.stop();
      this.log.info(`[${sessionId}] Game stopped`);
    }
    // cleanupConnection(socket, sessionId)
  });

  // Handle errors
  socket.on('error', (err: Error) => {
    console.error(`[${sessionId}] WebSocket error:`, err);
    cleanupConnection(socket, sessionId, 4444, 'error');
  });
}
