import type { UserPayload } from './types/types.js';
import fastify, { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import websocketPlugin from '@fastify/websocket';
import { apiRoutes, publicRoutes } from './routes/gateway.routes.js';
import { logger, optimizeErrorHandler } from './utils/logger.js';
import { verifyRequestJWT } from './utils/jwt.service.js';
import { GATEWAY_CONFIG, ERROR_CODES } from './utils/constants.js';
import { gatewayenv } from './config/env.js';

const app = fastify({
  logger: false, // Utiliser notre logger
  disableRequestLogging: true, // Désactiver les logs automatiques
});

// Register fastify-cookie
app.register(fastifyCookie);

// Register fastify-jwt
app.register(fastifyJwt, { secret: gatewayenv.JWT_SECRET });

// Rate limiting global
app.register(fastifyRateLimit, {
  max: gatewayenv.RATE_LIMIT_MAX,
  timeWindow: gatewayenv.RATE_LIMIT_WINDOW,
  keyGenerator: (request: FastifyRequest) => {
    // Rate limit par IP
    return request.ip || 'unknown';
  },
  errorResponseBuilder: (req, context) => ({
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: context.after,
    },
  }),
});

console.log('register');
app.register(websocketPlugin);

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
  request.user = verification.user;
  logger.logAuth({ url: request.url, user: request.user?.username }, true);
});

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

// Log request end
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
  logger.error({
    event: 'unhandled_error',
    method: request?.method,
    url: request?.url,
    user: request?.user?.username || null,
    err: error?.message,
    stack: error?.stack,
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
