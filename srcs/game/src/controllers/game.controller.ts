import { FastifyInstance, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import { gameSessions } from '../core/game.state.js'
import { getGame } from '../service/game.init.js'
import { handleClientMessage } from '../service/game.communication.js'
import { GameSettings } from '../core/game.types.js'

// Controller - get sessionId from body
export async function gameSettings(this: FastifyInstance, req: FastifyRequest) {
  const body = req.body as {
    sessionId?: string
    settings?: GameSettings
  }

  // ✅ Get sessionId from body
  const sessionId = body.sessionId
  const settings = body.settings

  // Validate sessionId
  if (!sessionId) {
    this.log.warn({ body }, 'Missing sessionId in request body')
    return {
      status: 'failure',
      message: 'sessionId is required in request body',
    }
  }

  // Validate settings
  if (!settings) {
    this.log.warn({ sessionId, body }, 'Missing settings in request body')
    return {
      status: 'failure',
      message: 'settings are required in request body',
    }
  }

  // Get session
  const sessionData = gameSessions.get(sessionId)
  if (!sessionData) {
    this.log.warn({ sessionId }, 'Session not found')
    return {
      status: 'failure',
      message: `Session ${sessionId} not found`,
    }
  }

  // Apply settings
  sessionData.game.applySettings(settings as GameSettings)
  this.log.info({ sessionId, settings }, 'Game settings applied successfully')

  return {
    status: 'success',
    message: 'Settings applied',
    sessionId: sessionId,
    appliedSettings: sessionData.game.getSettings(),
  }
}

export async function newGameSession(this: FastifyInstance) {
  const sessionId = randomUUID()
  getGame.call(this, null, sessionId)
  return {
    status: 'success',
    message: 'Game session created',
    sessionId: sessionId,
    wsUrl: `/game/${sessionId}`,
  }
}

export async function healthCheck() {
  return {
    status: 'healthy',
    service: 'websocket-game-service',
    activeSessions: gameSessions.size,
    timestamp: new Date().toISOString(),
  }
}

export async function listGameSessions() {
  const sessions = Array.from(gameSessions.entries()).map(([id, sessionData]) => ({
    sessionId: id,
    state: sessionData.game.getState(),
    playerCount: sessionData.players.size,
    hasInterval: sessionData.interval !== null,
  }))

  return {
    status: 'success',
    count: sessions.length,
    sessions,
  }
}

export async function webSocketConnect(this: FastifyInstance, socket: any, req: FastifyRequest) {
  console.log('get to the sessions id by WS')
  const params = req.params as { sessionId: string }
  const sessionId = params.sessionId
  handleClientMessage.call(this, socket, sessionId)
}
