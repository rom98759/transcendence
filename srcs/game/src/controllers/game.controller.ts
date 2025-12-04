import { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { gameSessions } from "../core/game.state.js";
import { getGame } from '../service/game.init.js';
import { handleClientMessage } from '../service/game.communication.js'

export async function newGameSession(
  this: FastifyInstance
) {
  const sessionId = randomUUID();
  getGame.call(this, null, sessionId);
  return {
    status: "success",
    message: "Game session created",
    sessionId: sessionId,
    wsUrl: `/game/${sessionId}`,
  };
}

export async function healthCheck(
) {
  return {
    status: "healthy",
    service: "websocket-game-service",
    activeSessions: gameSessions.size,
    // activeConnections: Array.from(playerConnections.values()).reduce(
    //   (sum, conns) => sum + conns.size,
    //   0,
    // ),
    timestamp: new Date().toISOString(),
  };
}

export async function listGameSessions() {
  const sessions = Array.from(gameSessions.entries()).map(([id, sessionData]) => ({
    sessionId: id,
    state: sessionData.game.getState(),
    playerCount: sessionData.players.size,
    hasInterval: sessionData.interval !== null,
  }));
  
  return {
    status: "success",
    count: sessions.length,
    sessions,
  };
}

export async function webSocketConnect(
  this: FastifyInstance,
  socket: any,
  req: FastifyRequest,
) {
  console.log("get to the sessions id by WS");
  const params = req.params as { sessionId: string };
  const sessionId = params.sessionId;
  handleClientMessage.call(this, socket, sessionId);
}
