import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { gameSessions } from '../core/game.state.js';
import { getGame as getSessionData } from '../service/game.init.js';
import { handleClientMessage } from '../service/game.communication.js';
import { GameSettings } from '../core/game.types.js';
import { WebSocket } from 'ws';
import { WS_CLOSE } from '../core/game.state.js';

// Controller - get sessionId from body
export async function gameSettings(this: FastifyInstance, req: FastifyRequest) {
  const body = req.body as {
    sessionId?: string;
    settings?: GameSettings;
  };

  // ✅ Get sessionId from body
  const sessionId = body.sessionId;
  const settings = body.settings;

  // Validate sessionId
  if (!sessionId) {
    this.log.warn({ body }, 'Missing sessionId in request body');
    return {
      status: 'failure',
      message: 'sessionId is required in request body',
    };
  }

  // Validate settings
  if (!settings) {
    this.log.warn({ sessionId, body }, 'Missing settings in request body');
    return {
      status: 'failure',
      message: 'settings are required in request body',
    };
  }

  // Get session
  const sessionData = gameSessions.get(sessionId);
  if (!sessionData) {
    this.log.warn({ sessionId }, 'Session not found');
    return {
      status: 'failure',
      message: `Session ${sessionId} not found`,
    };
  }

  if (sessionData.game.status != 'waiting') {
    this.log.warn({ sessionId }, 'Session is running or finished');
    return {
      status: 'failure',
      message: `game session cannot be changed (certainly running)`,
    };
  }
  // Apply settings
  sessionData.game.applySettings(settings as GameSettings);
  this.log.info({ sessionId, settings }, 'Game settings applied successfully');

  return {
    status: 'success',
    message: 'Settings applied',
    sessionId: sessionId,
    appliedSettings: sessionData.game.getSettings(),
  };
}

export async function newGameSession(this: FastifyInstance) {
  const sessionId = randomUUID();
  const sessionData = getSessionData.call(this, null, sessionId);
  if (sessionData.game) sessionData.game.preview();
  return {
    status: 'success',
    message: 'Game session created',
    sessionId: sessionId,
    wsUrl: `/game/${sessionId}`,
  };
}

export async function healthCheck() {
  return {
    status: 'healthy',
    service: 'websocket-game-service',
    activeSessions: gameSessions.size,
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
    status: 'success',
    count: sessions.length,
    sessions,
  };
}

export async function webSocketConnect(
  this: FastifyInstance,
  socket: WebSocket,
  req: FastifyRequest,
) {
  console.log('get to the sessions id by WS');
  const params = req.params as { sessionId: string };
  const sessionId = params.sessionId;

  // const sessionData = getSessionData.call(this, null, sessionId);
  // if (sessionData && sessionData.player.size === 2) {
  //  socket.close(WS_CLOSE.SESSION_FULL, 'Game session is full');
  //  return
  // }
  handleClientMessage.call(this, socket, sessionId);
}
