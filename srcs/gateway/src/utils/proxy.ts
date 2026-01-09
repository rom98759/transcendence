import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import WebSocket from 'ws';
import { logger, createLogContext } from './logger.js';
import { GATEWAY_CONFIG, ERROR_CODES } from './constants.js';
import { pipeline } from 'node:stream/promises';

export async function proxyBlockRequest(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  url: string,
  init: RequestInit = {},
): Promise<void> {
  const res = await fetch(url, init);

  // 🔥 headers typés correctement
  const headers: Record<string, string> = {};

  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'transfer-encoding' && lower !== 'content-length') {
      headers[key] = value;
    }
  });

  reply.raw.writeHead(res.status, headers);

  if (!res.body) {
    reply.raw.end();
    return;
  }

  // 🔥 streaming direct backend → client
  await pipeline(res.body, reply.raw);
}
// Message types for type safety
interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping';
  paddle?: 'left' | 'right';
  direction?: 'up' | 'down' | 'stop';
}

interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: any;
  message?: string;
}

function forwardWsMsgFromTo<
  DownstreamMsg extends { type: string; message?: string },
  UpstreamMsg extends { type: string },
>(app: FastifyInstance, downstreamWs: WebSocket, upstreamWs: WebSocket) {
  // Forward messages from Downstream to Upstream
  downstreamWs.on('message', (data: Buffer) => {
    if (upstreamWs.readyState === WebSocket.OPEN) {
      try {
        const messageStr = data.toString();
        const parsedMessage: UpstreamMsg = JSON.parse(messageStr);

        // Validate message structure
        if (!parsedMessage.type) {
          throw new Error('Missing message type');
        }
        upstreamWs.send(JSON.stringify(parsedMessage));
        app.log.debug({
          event: 'forward message',
          type: parsedMessage.type,
          messageSize: messageStr.length,
        });
      } catch (error) {
        // Properly handle unknown type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        app.log.error({
          event: 'invalid_message',
          error: errorMessage,
          rawData: data.toString(),
        });
        // Send error back
        const errorResponse: DownstreamMsg = {
          type: 'error',
          message: 'Invalid message format',
        } as DownstreamMsg;
        downstreamWs.send(JSON.stringify(errorResponse));
      }
    }
  });
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
    });
    upstreamWs.close();
  });
  // Handle client disconnect
  downstreamWs.on('close', (code: number, reason: Buffer) => {
    app.log.info({
      event: 'game_ws_client_disconnect',
      code,
      reason: reason.toString(),
    });
    upstreamWs.close(code, reason);
  });
}

export function webSocketProxyRequest(
  app: FastifyInstance,
  downstreamWs: WebSocket,
  request: FastifyRequest,
  path: string,
) {
  const userName = request.headers['x-user-name'] || 'anonymous';
  const userId = request.headers['x-user-id'] || 'unknown';

  app.log.info({
    event: 'game_ws_connect_attempt',
    path,
    user: userName,
    userId: userId,
  });

  // Create WebSocket downstreamWs to game-service
  const upstreamUrl = `ws://game-service:3003${path}`;
  const upstreamWs = new WebSocket(upstreamUrl, {
    headers: {
      'x-user-name': userName as string,
      'x-user-id': userId as string,
      cookie: request.headers.cookie || '',
    },
  });

  // Handle upstream connection open
  upstreamWs.on('open', () => {
    app.log.info({
      event: 'game_ws_upstream_connected',
      path,
      user: userName,
    });
  });

  forwardWsMsgFromTo<ClientMessage, ServerMessage>(app, downstreamWs, upstreamWs);
  forwardWsMsgFromTo<ServerMessage, ClientMessage>(app, upstreamWs, downstreamWs);

  handleErrorAndDisconnection(app, downstreamWs, upstreamWs);
  handleErrorAndDisconnection(app, upstreamWs, downstreamWs);
}

export async function proxyRequest(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  url: string,
  init?: RequestInit,
) {
  const startTime = Date.now();
  const method = init?.method || 'GET';
  const userName = (req.headers as any)['x-user-name'] || null;

  // Log début de proxy
  logger.logProxyRequest({
    targetUrl: url,
    method,
    user: userName,
    url: req.url,
  });

  // Timeout
  const timeoutMs = (init as any)?.timeout ?? GATEWAY_CONFIG.PROXY_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const mergedInit = Object.assign({}, init || {}, { signal: controller.signal });
    const response: Response = await (app as any).fetchInternal(req, url, mergedInit);

    clearTimeout(timeoutHandle);

    // Forward all Set-Cookie headers from upstream (getSetCookie() returns array of all cookies)
    const setCookies = response.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      setCookies.forEach((cookie) => reply.header('set-cookie', cookie));
    }

    const contentType = response.headers.get('content-type') || '';
    const duration = Date.now() - startTime;

    // Log résultat proxy avec nouveau logger
    logger.logProxyRequest({
      targetUrl: url,
      method,
      status: response.status,
      user: userName,
      url: req.url,
      upstreamDuration: duration,
    });

    // Forward status code Service -> Gateway -> Client
    reply.code(response.status);

    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        if (response.status >= 400) {
          return (
            body || {
              error: {
                message: 'Upstream error',
                code: ERROR_CODES.UPSTREAM_ERROR,
                upstreamStatus: response.status,
              },
            }
          );
        }
        return body;
      } catch (jsonErr) {
        const errorMessage = (jsonErr as Error)?.message || 'Unknown JSON error';
        req.log.error({
          event: 'proxy_json_error',
          targetUrl: url,
          method,
          user: userName,
          err: errorMessage,
          upstreamDuration: Date.now() - startTime,
        });
        reply.code(502);
        return {
          error: {
            message: 'Invalid JSON from upstream',
            code: ERROR_CODES.BAD_GATEWAY,
            details: errorMessage,
          },
        };
      }
    }

    try {
      const text = await response.text();
      if (response.status >= 400) {
        return {
          error: {
            message: text || 'Upstream error',
            code: ERROR_CODES.UPSTREAM_ERROR,
            upstreamStatus: response.status,
          },
        };
      }
      return text;
    } catch (textErr) {
      const errorMessage = (textErr as Error)?.message || 'Unknown text error';
      req.log.error({
        event: 'proxy_text_error',
        targetUrl: url,
        method,
        user: userName,
        err: errorMessage,
        upstreamDuration: Date.now() - startTime,
      });
      reply.code(502);
      return {
        error: {
          message: 'Error reading upstream response',
          code: ERROR_CODES.BAD_GATEWAY,
          details: errorMessage,
        },
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutHandle);
    const isAbort = err && (err.name === 'AbortError' || err.type === 'aborted');
    const isNetworkError =
      err &&
      (err.code === 'ECONNREFUSED' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNRESET');
    const errorMessage = (err as Error)?.message || 'Unknown network error';
    const duration = Date.now() - startTime;

    // Log avec distinction entre timeout, erreur réseau et autres erreurs
    const event = isAbort
      ? 'proxy_timeout'
      : isNetworkError
        ? 'proxy_network_error'
        : 'proxy_error';
    logger.error({
      event,
      targetUrl: url,
      method,
      user: userName,
      err: errorMessage,
      errorCode: err?.code,
      upstreamDuration: duration,
      timeout: isAbort,
      networkError: isNetworkError,
    });

    reply.code(502);

    // Distinction entre timeout et erreur réseau pour un meilleur diagnostic
    if (isAbort) {
      return {
        error: {
          message: `Upstream request timed out after ${timeoutMs}ms`,
          code: ERROR_CODES.UPSTREAM_TIMEOUT,
          details: errorMessage,
          timeout: timeoutMs,
        },
      };
    }

    if (isNetworkError) {
      return {
        error: {
          message: 'Cannot connect to upstream service',
          code: ERROR_CODES.NETWORK_ERROR,
          details: errorMessage,
          errorCode: err?.code,
        },
      };
    }

    return {
      error: {
        message: 'Bad gateway',
        code: ERROR_CODES.BAD_GATEWAY,
        details: errorMessage,
      },
    };
  }
}
