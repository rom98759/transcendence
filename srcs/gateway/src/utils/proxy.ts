import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import WebSocket from 'ws'
import { logger, createLogContext } from './logger.js'

// Message types for type safety
interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping'
  paddle?: 'left' | 'right'
  direction?: 'up' | 'down' | 'stop'
}

interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong'
  sessionId?: string
  data?: any
  message?: string
}

function forwardWsMsgFromTo<
  DownstreamMsg extends { type: string; message?: string },
  UpstreamMsg extends { type: string },
>(app: FastifyInstance, downstreamWs: WebSocket, upstreamWs: WebSocket) {
  // Forward messages from Downstream to Upstream
  downstreamWs.on('message', (data: Buffer) => {
    if (upstreamWs.readyState === WebSocket.OPEN) {
      try {
        const messageStr = data.toString()
        const parsedMessage: UpstreamMsg = JSON.parse(messageStr)

        // Validate message structure
        if (!parsedMessage.type) {
          throw new Error('Missing message type')
        }
        upstreamWs.send(JSON.stringify(parsedMessage))
        app.log.debug({
          event: 'forward message',
          type: parsedMessage.type,
          messageSize: messageStr.length,
        })
      } catch (error) {
        // Properly handle unknown type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        app.log.error({
          event: 'invalid_message',
          error: errorMessage,
          rawData: data.toString(),
        })
        // Send error back
        const errorResponse: DownstreamMsg = {
          type: 'error',
          message: 'Invalid message format',
        } as DownstreamMsg
        downstreamWs.send(JSON.stringify(errorResponse))
      }
    }
  })
}

function handleErrorAndDisconnection(
  app: FastifyInstance,
  downstreamWs: WebSocket,
  upstreamWs: WebSocket,
) {
  // Handle errors
  downstreamWs.on('error', (error: Error) => {
    app.log.error({
      event: 'game_ws_client_error',
      error: error.message,
    })
    upstreamWs.close()
  })
  // Handle client disconnect
  downstreamWs.on('close', (code: number, reason: Buffer) => {
    app.log.info({
      event: 'game_ws_client_disconnect',
      code,
      reason: reason.toString(),
    })
    upstreamWs.close()
  })
}

export function webSocketProxyRequest(
  app: FastifyInstance,
  downstreamWs: WebSocket,
  request: FastifyRequest,
  path: string,
) {
  const userName = request.headers['x-user-name'] || 'anonymous'
  const userId = request.headers['x-user-id'] || 'unknown'

  app.log.info({
    event: 'game_ws_connect_attempt',
    path,
    user: userName,
    userId: userId,
  })

  // Create WebSocket downstreamWs to game-service
  const upstreamUrl = `ws://game-service:3003${path}`
  const upstreamWs = new WebSocket(upstreamUrl, {
    headers: {
      'x-user-name': userName as string,
      'x-user-id': userId as string,
      cookie: request.headers.cookie || '',
    },
  })

  // Handle upstream connection open
  upstreamWs.on('open', () => {
    app.log.info({
      event: 'game_ws_upstream_connected',
      path,
      user: userName,
    })
  })

  forwardWsMsgFromTo<ClientMessage, ServerMessage>(app, downstreamWs, upstreamWs)
  forwardWsMsgFromTo<ServerMessage, ClientMessage>(app, upstreamWs, downstreamWs)

  handleErrorAndDisconnection(app, downstreamWs, upstreamWs)
  handleErrorAndDisconnection(app, upstreamWs, downstreamWs)
}

export async function proxyRequest(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  url: string,
  init?: RequestInit,
) {
  const startTime = Date.now()
  const method = init?.method || 'GET'
  const userName = (request.headers as any)['x-user-name'] || null

  // Log début de proxy
  logger.logProxyRequest({
    targetUrl: url,
    method,
    user: userName,
    url: request.url,
  })

  // Timeout (5 secondes)
  const timeoutMs = (init as any)?.timeout ?? 5000
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const mergedInit = Object.assign({}, init || {}, { signal: controller.signal })
    const response: Response = await (app as any).fetchInternal(request, url, mergedInit)

    clearTimeout(timeoutHandle)

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      reply.header('set-cookie', setCookie)
    }

    const contentType = response.headers.get('content-type') || ''
    const duration = Date.now() - startTime

    // Log résultat proxy avec nouveau logger
    logger.logProxyRequest({
      targetUrl: url,
      method,
      status: response.status,
      user: userName,
      url: request.url,
      upstreamDuration: duration,
    })

    // Forward status code Service -> Gateway -> Client
    reply.code(response.status)

    if (contentType.includes('application/json')) {
      try {
        const body = await response.json()
        if (response.status >= 400) {
          return (
            body || {
              error: {
                message: 'Upstream error',
                code: 'UPSTREAM_ERROR',
                upstreamStatus: response.status,
              },
            }
          )
        }
        return body
      } catch (jsonErr) {
        const errorMessage = (jsonErr as Error)?.message || 'Unknown JSON error'
        logger.error({
          event: 'proxy_json_error',
          targetUrl: url,
          method,
          user: userName,
          err: errorMessage,
          upstreamDuration: Date.now() - startTime,
        })
        reply.code(502)
        return {
          error: {
            message: 'Invalid JSON from upstream',
            code: 'BAD_GATEWAY',
            details: errorMessage,
          },
        }
      }
    }

    try {
      const text = await response.text()
      if (response.status >= 400) {
        return {
          error: {
            message: text || 'Upstream error',
            code: 'UPSTREAM_ERROR',
            upstreamStatus: response.status,
          },
        }
      }
      return text
    } catch (textErr) {
      const errorMessage = (textErr as Error)?.message || 'Unknown text error'
      logger.error({
        event: 'proxy_text_error',
        targetUrl: url,
        method,
        user: userName,
        err: errorMessage,
        upstreamDuration: Date.now() - startTime,
      })
      reply.code(502)
      return {
        error: {
          message: 'Error reading upstream response',
          code: 'BAD_GATEWAY',
          details: errorMessage,
        },
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutHandle)
    const isAbort = err && (err.name === 'AbortError' || err.type === 'aborted')
    const errorMessage = (err as Error)?.message || 'Unknown network error'
    const duration = Date.now() - startTime

    logger.error({
      event: isAbort ? 'proxy_timeout' : 'proxy_error',
      targetUrl: url,
      method,
      user: userName,
      err: errorMessage,
      upstreamDuration: duration,
      timeout: isAbort,
    })
    reply.code(502)
    if (isAbort) {
      return {
        error: {
          message: 'Upstream request timed out',
          code: 'BAD_GATEWAY',
          details: errorMessage,
        },
      }
    }
    return { error: { message: 'Bad gateway', code: 'BAD_GATEWAY', details: errorMessage } }
  }
}
