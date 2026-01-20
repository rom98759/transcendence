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
    currentSession.players.forEach((id, socket) => socket.close(code, message));
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

export function addPlayerConnection(this: FastifyInstance, socket: WebSocket, sessionId: string) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players || !socket) return false;

  const players = currentSession.players;

  if (players.size === 1 && Array.from(players.values())[0] === 'A') {
    players.set(socket, 'B');
    socket.send(JSON.stringify({ type: 'connected', message: 'Player B' }));
  } else if (players.size === 1 || players.size === 0) {
    players.set(socket, 'A');
    socket.send(JSON.stringify({ type: 'connected', message: 'Player A' }));
  } else if (players.size >= 2) {
    socket.close(WS_CLOSE.SESSION_FULL, 'Session full');
    return false;
  }

  this.log.info(
    `[${sessionId}] Player ${players} connected. Total: ${currentSession.players.size}`,
  );

  // Handle connection close
  socket.on('close', (code: number, reason: string) => {
    this.log.info(`[${sessionId}] Player disconnected: ${code} - ${reason}`);
    players.delete(socket);
    if (players.size === 0 && currentSession.game.status === 'waiting') {
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
  return true;
}
