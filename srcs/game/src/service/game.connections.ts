import { gameSessions } from '../core/game.state.js';
import { FastifyInstance } from 'fastify';
import { WS_CLOSE } from '../core/game.state.js';
import { WebSocket } from 'ws';
import * as db from '../core/game.database.js';

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
 * For tournament mode, validates that the connecting userId is one of the expected match players.
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

  // Tournament mode: validate that userId is an authorized player
  if (currentSession.gameMode === 'tournament' && currentSession.tournamentId != null) {
    if (userId == null) {
      this.log.warn({ sessionId, userId }, 'Tournament WS: missing userId');
      socket.close(WS_CLOSE.PLAYER_QUIT, 'Missing user identity for tournament match');
      return false;
    }

    const match = db.getMatchBySessionId(sessionId);
    if (match && match.player1 !== userId && match.player2 !== userId) {
      this.log.warn(
        { sessionId, userId, expectedPlayers: [match.player1, match.player2] },
        'Tournament WS: unauthorized player',
      );
      socket.close(WS_CLOSE.PLAYER_QUIT, 'You are not a player in this tournament match');
      return false;
    }

    // Prevent same user from connecting twice
    for (const [, role] of players) {
      const existingUserId =
        role === 'A' ? currentSession.playerUserIds.A : currentSession.playerUserIds.B;
      if (existingUserId === userId) {
        this.log.warn({ sessionId, userId }, 'Tournament WS: player already connected');
        socket.close(WS_CLOSE.SESSION_FULL, 'You are already connected to this match');
        return false;
      }
    }
  }

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

  // For local mode, auto-start with a single player (both paddles controlled locally)
  if (currentSession.gameMode === 'local' && players.size === 1) {
    const game = currentSession.game;
    if (game && game.status === 'waiting') {
      game.start();
      this.log.info(`[${sessionId}] Local mode — game auto-started with 1 player`);
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
