import { gameSessions } from '../core/game.state.js';
import { FastifyInstance } from 'fastify';
import { addPlayerConnection } from './game.connections.js';
import { PongGame } from '../core/game.engine.js';
import { defineCommunicationInterval } from './game.communication.js';

// return the sessionData (incuding the game var) for a sessionId. If no Data at this sessionId, create new sessionData.
// If a socket is given, add it to the players list.
export function getGame(this: FastifyInstance, socket: any | null, sessionId: any): any {
  let sessionData = gameSessions.get(sessionId);

  if (!sessionData) {
    let game = new PongGame(sessionId);
    sessionData = {
      id: sessionId,
      game: game,
      interval: null,
      players: new Set(),
    };
    gameSessions.set(sessionId, sessionData);
    this.log.info(`[${sessionId}] Game session created via WebSocket`);
    sessionData.interval = defineCommunicationInterval(sessionId);
    this.log.info(`[${sessionId}] Game created, interval started`);
  }

  if (socket) {
    addPlayerConnection.call(this, socket, sessionId);
  }

  return sessionData;
}
