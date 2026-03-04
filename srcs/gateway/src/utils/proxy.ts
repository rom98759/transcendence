import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import WebSocket from 'ws';
import { logger } from './logger.js';
import { GATEWAY_CONFIG, ERROR_CODES } from './constants.js';
import { pipeline } from 'node:stream/promises';
import { getInternalHeaders } from '../index.js';
import fs from 'fs';

// mTLS certs reused for upstream WS connections to game-service (TLS-only)
const WS_TLS_OPTIONS = {
  key: fs.readFileSync('/etc/certs/api-gateway.key'),
  cert: fs.readFileSync('/etc/certs/api-gateway.crt'),
  ca: fs.readFileSync('/etc/ca/ca.crt'),
  rejectUnauthorized: false, // game-service uses internal/self-signed CA
};

export async function proxyBlockRequest(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  url: string,
  init: RequestInit = {},
): Promise<void> {
  const res = await fetch(url, init);

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
  await pipeline(res.body, reply.raw);
}

interface GameState {
  ball: { x: number; y: number; radius: number };
  paddles: { left: { y: number; height: number }; right: { y: number; height: number } };
  scores: Scores;
  status: GameStatus;
  cosmicBackground: number[][] | null;
}
type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';
interface Scores {
  left: number;
  right: number;
}
interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping';
  paddle?: 'left' | 'right';
  direction?: 'up' | 'down' | 'stop';
}
interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  message?: string;
}

function forwardWsMsgFromTo<
  DownstreamMsg extends { type: string; message?: string },
  UpstreamMsg extends { type: string },
>(app: FastifyInstance, downstreamWs: WebSocket, upstreamWs: WebSocket) {
  downstreamWs.on('message', (data: Buffer) => {
    if (upstreamWs.readyState === WebSocket.OPEN) {
      try {
        const messageStr = data.toString();
        const parsedMessage: UpstreamMsg = JSON.parse(messageStr);
        if (!parsedMessage.type) throw new Error('Missing message type');
        upstreamWs.send(JSON.stringify(parsedMessage));
        app.log.debug({ event: 'forward_message', type: parsedMessage.type });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        app.log.error({ event: 'invalid_message', error: errorMessage, rawData: data.toString() });
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
  downstreamWs.on('error', (error: Error) => {
    app.log.error({ event: 'game_ws_client_error', error: error.message });
    upstreamWs.close();
  });
  downstreamWs.on('close', (code: number, reason: Buffer) => {
    app.log.info({ event: 'game_ws_client_disconnect', code, reason: reason.toString() });
    upstreamWs.close(code, reason);
  });
}

export function webSocketProxyRequest(
  app: FastifyInstance,
  downstreamWs: WebSocket,
  request: FastifyRequest,
  path: string,
) {
  // Use authenticated identity from request.user (set by onRequest auth hook)
  // instead of raw headers (which the client never sends)
  const internalHeaders = getInternalHeaders(request);
  const userName = internalHeaders['x-user-name'] || 'anonymous';
  const userId = internalHeaders['x-user-id'] || '';

  app.log.info({ event: 'game_ws_connect_attempt', path, user: userName, userId });

  if (!userId) {
    app.log.warn({ event: 'game_ws_missing_user_id', path, user: userName });
  }

  // Create WebSocket to game-service, reusing mTLS options (includes rejectUnauthorized: false)
  const upstreamUrl = `wss://game-service:3003${path}`;
  const upstreamWs = new WebSocket(upstreamUrl, {
    headers: {
      'x-user-name': userName,
      'x-user-id': userId,
      cookie: request.headers.cookie || '',
    },
    ...WS_TLS_OPTIONS,
  });

  upstreamWs.on('open', () => {
    app.log.info({ event: 'game_ws_upstream_connected', path, user: userName });
  });

  upstreamWs.on('error', (err: Error) => {
    app.log.error({ event: 'game_ws_upstream_error', path, error: err.message });
    downstreamWs.close(1011, 'Upstream connection failed');
  });

  forwardWsMsgFromTo<ClientMessage, ServerMessage>(app, downstreamWs, upstreamWs);
  forwardWsMsgFromTo<ServerMessage, ClientMessage>(app, upstreamWs, downstreamWs);

  handleErrorAndDisconnection(app, downstreamWs, upstreamWs);
  handleErrorAndDisconnection(app, upstreamWs, downstreamWs);
}

export async function fastStreamProxy(req: FastifyRequest, reply: FastifyReply, targetUrl: string) {
  return reply.from(targetUrl, {
    rewriteRequestHeaders: (originalReq, headers) => ({
      ...headers,
      ...getInternalHeaders(req),
    }),
  });
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

  logger.logProxyRequest({ targetUrl: url, method, user: userName, url: req.url });

  const timeoutMs = (init as any)?.timeout ?? GATEWAY_CONFIG.PROXY_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const mergedInit = Object.assign({}, init || {}, { signal: controller.signal });
    const response: Response = await (app as any).fetchInternal(req, url, mergedInit);
    clearTimeout(timeoutHandle);

    const setCookies = response.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) setCookies.forEach((cookie) => reply.header('set-cookie', cookie));

    const contentType = response.headers.get('content-type') || '';
    const duration = Date.now() - startTime;
    logger.logProxyRequest({
      targetUrl: url,
      method,
      status: response.status,
      user: userName,
      url: req.url,
      upstreamDuration: duration,
    });
    reply.code(response.status);

    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        if (response.status >= 400)
          return (
            body || {
              error: {
                message: 'Upstream error',
                code: ERROR_CODES.UPSTREAM_ERROR,
                upstreamStatus: response.status,
              },
            }
          );
        return body;
      } catch (jsonErr) {
        const errorMessage = (jsonErr as Error)?.message || 'Unknown JSON error';
        req.log.error({ event: 'proxy_json_error', targetUrl: url, err: errorMessage });
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
      if (response.status >= 400)
        return {
          error: {
            message: text || 'Upstream error',
            code: ERROR_CODES.UPSTREAM_ERROR,
            upstreamStatus: response.status,
          },
        };
      return text;
    } catch (textErr) {
      const errorMessage = (textErr as Error)?.message || 'Unknown text error';
      req.log.error({ event: 'proxy_text_error', targetUrl: url, err: errorMessage });
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
    });
    reply.code(502);
    if (isAbort)
      return {
        error: {
          message: `Upstream request timed out after ${timeoutMs}ms`,
          code: ERROR_CODES.UPSTREAM_TIMEOUT,
          timeout: timeoutMs,
        },
      };
    if (isNetworkError)
      return {
        error: {
          message: 'Cannot connect to upstream service',
          code: ERROR_CODES.NETWORK_ERROR,
          errorCode: err?.code,
        },
      };
    return {
      error: { message: 'Bad gateway', code: ERROR_CODES.BAD_GATEWAY, details: errorMessage },
    };
  }
}
