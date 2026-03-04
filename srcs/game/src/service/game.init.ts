import { gameSessions } from '../core/game.state.js';
import { FastifyInstance } from 'fastify';
import { addPlayerConnection } from './game.connections.js';
import { PongGame } from '../core/game.engine.js';
import { defineCommunicationInterval } from './game.communication.js';
import { WebSocket } from 'ws';

/**
 * Get or create a game session.
 * @param socket - Player WebSocket (null to just get/create without connecting)
 * @param sessionId - The game session identifier
 * @param sessionMode - 'remote' | 'local' | 'tournament' | null (null = get only, don't create)
 * @param tournamentId - DB tournament ID if mode is 'tournament'
 * @param userId - DB user ID of the connecting player
 */
export function getGame(
  this: FastifyInstance,
  socket: WebSocket | null,
  sessionId: any,
  sessionMode: string | null,
  tournamentId: number | null = null,
  userId: number | null = null,
): any {
  let sessionData = gameSessions.get(sessionId);

  if (!sessionData) {
    if (!sessionMode) {
      return null;
    }
    let game = new PongGame(sessionId);
    sessionData = {
      id: sessionId,
      game: game,
      interval: null,
      players: new Map(),
      // Store the creating user's ID immediately as Player A (left paddle).
      // This ensures playerUserIds.A is set even if the WS header is missing.
      playerUserIds: { A: userId, B: null },
      gameMode: sessionMode,
      tournamentId: tournamentId,
      createdAt: Date.now(),
      persisted: false,
    };
    gameSessions.set(sessionId, sessionData);
    this.log.info(
      `[${sessionId}] Game session created (mode=${sessionMode}, tournament=${tournamentId})`,
    );
    sessionData.interval = defineCommunicationInterval(sessionId, this);
    this.log.info(`[${sessionId}] Game created, interval started`);
  }

  if (socket) {
    addPlayerConnection.call(this, socket, sessionId, userId);
  }

  return sessionData;
}
