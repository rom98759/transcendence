import fastify, { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import websocketPlugin from '@fastify/websocket';
import { apiRoutes, publicRoutes } from './routes/gateway.routes.js';
import { logger, optimizeErrorHandler } from './utils/logger.js';
import { verifyRequestJWT } from './utils/jwt.service.js';
import fs from 'fs';
import { GATEWAY_CONFIG, ERROR_CODES, parseTimeWindowToSeconds } from './utils/constants.js';
import { gatewayenv, UM_SERVICE_URL } from './config/env.js';
import { UserPayload } from './types/types.d.js';
import replyFrom from '@fastify/reply-from';
import { mtlsAgent } from './utils/mtlsAgent.js';
import { setGlobalDispatcher } from 'undici';

setGlobalDispatcher(mtlsAgent);
const app = fastify({
  https: {
    key: fs.readFileSync('/etc/certs/api-gateway.key'),
    cert: fs.readFileSync('/etc/certs/api-gateway.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'),

    requestCert: true,
    rejectUnauthorized: false,
  },
  logger: false, // Utiliser notre logger
  disableRequestLogging: true, // Désactiver les logs automatiques
});

app.register(replyFrom, {
  base: `${UM_SERVICE_URL}`,
  globalAgent: true,
});

// Register fastify-cookie
app.register(fastifyCookie);

// Register fastify-jwt
app.register(fastifyJwt, { secret: gatewayenv.JWT_SECRET });

app.register(fastifyRateLimit, {
  max: gatewayenv.RATE_LIMIT_MAX,
  timeWindow: gatewayenv.RATE_LIMIT_WINDOW,
  keyGenerator: (request: FastifyRequest) => {
    return request.ip || 'unknown';
  },
});

app.register(websocketPlugin);

app.addContentTypeParser('multipart/form-data', function (req, payload, done) {
  done(null, payload); // Pass raw stream through
});

// Hook verify JWT routes `/api` sauf les routes publiques
app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
  const url = request.url || request.raw?.url || '';

  // Routes non `/api` : on ne fait rien
  if (!url.startsWith('/api')) return;

  // Routes publiques
  if (GATEWAY_CONFIG.PUBLIC_ROUTES.includes(url as any)) {
    return;
  }
  if (request.routeOptions.config?.isPublic) {
    logger.logAuth({ url, user: request.user?.username }, true);
    return;
  }

  // Vérifier le JWT localement (pas d'appel au service auth)
  const verification = verifyRequestJWT(app, request);

  if (!verification.valid) {
    logger.logAuth(
      {
        url: request.url,
        errorCode: verification.errorCode,
        errorMessage: verification.errorMessage,
      },
      false,
    );

    return reply.code(401).send({
      error: {
        message: verification.errorMessage || 'Unauthorized',
        code: verification.errorCode || ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  // Attacher les données utilisateur à la requête
  request.user = verification.user as UserPayload;
  logger.logAuth({ url: request.url, user: request.user?.username }, true);
});

// export const getInternalHeaders = (req: FastifyRequest): Record<string, string> => ({
//   'x-user-name': req.user?.username || (req.headers['x-user-name'] as string) || '',
//   'x-user-id': String(req.user?.sub || req.user?.id || req.headers['x-user-id'] || ''),
//   'x-user-role': req.user?.role || 'USER',
//   cookie: req.headers?.cookie || '',
// });

export const getInternalHeaders = (req: FastifyRequest): Record<string, string> => {
  const headers: Record<string, string> = {};

  // username
  if (typeof req.user?.username === 'string') {
    headers['x-user-name'] = req.user.username;
  } else if (typeof req.headers['x-user-name'] === 'string') {
    headers['x-user-name'] = req.headers['x-user-name'];
  }

  // user id
  if (req.user?.sub !== undefined) {
    headers['x-user-id'] = String(req.user.sub);
  } else if (req.user?.id !== undefined) {
    headers['x-user-id'] = String(req.user.id);
  } else if (typeof req.headers['x-user-id'] === 'string') {
    headers['x-user-id'] = req.headers['x-user-id'];
  }

  // role
  if (typeof req.user?.role === 'string') {
    headers['x-user-role'] = req.user.role;
  } else {
    headers['x-user-role'] = 'USER';
  }

  // cookie (CRITIQUE)
  if (typeof req.headers.cookie === 'string') {
    headers['cookie'] = req.headers.cookie;
  }

  return headers;
};

// Décorateur requêtes internes : ajoute automatiquement
// header `x-user-name` + `x-user-id` + cookies de fetchInternal dans proxyRequest
app.decorate(
  'fetchInternal',
  async (request: FastifyRequest, url: string, init: RequestInit = {}) => {
    const userName = request.user?.username || request.headers['x-user-name'] || '';
    const userId = request.user?.sub || request.user?.id || request.headers['x-user-id'] || '';

    const headers = Object.assign({}, init.headers || {}, {
      'x-user-name': userName,
      'x-user-id': String(userId),
      'x-user-role': request.user?.role || 'USER',
      cookie: request.headers?.cookie || '',
    });

    return fetch(url, Object.assign({}, init, { headers }));
  },
);

app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  logger.logRequest(
    {
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      user: request.user?.username || null,
    },
    'end',
  );
});

// Central error handler: structured errors
app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // Ne pas traiter les erreurs déjà envoyées
  if (reply.sent) {
    logger.debug({
      event: 'error_handler_skipped_reply_sent',
      method: request?.method,
      url: request?.url,
      errorCode: (error as any)?.code,
      errorMessage: error?.message,
    });
    return;
  }

  // Gestion spéciale pour les erreurs de rate limiting
  // @fastify/rate-limit utilise le code 'FST_ERR_RATE_LIMITED'
  if (
    (error as any).code === 'FST_ERR_RATE_LIMITED' ||
    (error as any).code === 'FST_ERR_RATE_LIMIT' ||
    error.message?.includes('Rate limit exceeded')
  ) {
    // Calculer le retry-after dynamiquement
    // header Retry-After de fastify-rate-limit en sec
    const retryAfterHeader = reply.getHeader('Retry-After');
    const retryAfterSeconds = retryAfterHeader
      ? Math.ceil(Number(retryAfterHeader))
      : Math.ceil(parseTimeWindowToSeconds(gatewayenv.RATE_LIMIT_WINDOW));

    const timeUnit = retryAfterSeconds === 1 ? 'second' : 'seconds';

    logger.warn({
      event: 'rate_limit_429_sent',
      method: request?.method,
      url: request?.url,
      user: request?.user?.username || null,
      ip: request.ip,
      errorCode: (error as any).code,
      retryAfter: `${retryAfterSeconds}s`,
    });

    // Envoi de la réponse 429 et stop
    return reply.code(429).send({
      error: {
        message: `Too many requests, please try again in ${retryAfterSeconds} ${timeUnit}`,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: `${retryAfterSeconds}s`,
      },
    });
  }

  // Gestion spéciale pour les timeouts de proxy
  if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    logger.warn({
      event: 'proxy_timeout',
      method: request?.method,
      url: request?.url,
      user: request?.user?.username || null,
      err: error?.message,
    });

    return reply.code(504).send({
      error: {
        message: 'Gateway timeout - upstream service took too long to respond',
        code: ERROR_CODES.UPSTREAM_TIMEOUT,
      },
    });
  }

  // Log l'erreur pour les autres cas avec plus de détails pour le débogage
  logger.error({
    event: 'unhandled_error',
    method: request?.method,
    url: request?.url,
    user: request?.user?.username || null,
    err: error?.message,
    errorCode: (error as any)?.code,
    statusCode: error?.statusCode,
    errorName: error?.name,
    stack: gatewayenv.NODE_ENV === 'development' ? error?.stack : undefined,
  });

  const status = error?.statusCode || 500;
  const isDev = gatewayenv.NODE_ENV === 'development';
  const errorResponse = optimizeErrorHandler(error, isDev);

  reply.code(status).send({ error: errorResponse });
});

app.register(fastifyCors, {
  origin: [
    'http://localhost:80', // Dev
    'https://localhost:443', // Dev HTTPS
    'https://localhost:5173', // Dev Vite
  ],
  credentials: true,
});

// Register routes
app.register(apiRoutes, { prefix: '/api' });
app.register(publicRoutes);

// Start the server
app.listen(
  { host: '0.0.0.0', port: gatewayenv.API_GATEWAY_PORT },
  (err: Error | null, address: string) => {
    if (err) {
      logger.error({
        event: 'server_startup_failed',
        err: err.message,
        stack: err.stack,
      });
      process?.exit?.(1);
    }

    logger.info({
      event: 'server_started',
      address,
      port: gatewayenv.API_GATEWAY_PORT,
      environment: gatewayenv.NODE_ENV,
    });
  },
);
