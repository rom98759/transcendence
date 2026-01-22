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
import { UserPayload } from './types/types.d.js';

const app = fastify({
  logger: false, // Utiliser notre logger
  disableRequestLogging: true, // Désactiver les logs automatiques
});

// Register fastify-cookie
app.register(fastifyCookie);

// Register fastify-jwt
const JWT_SECRET = process?.env?.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'supersecretkey') {
  console.error('❌ CRITICAL: JWT_SECRET must be defined and cannot be the default value');
  console.error('   Set a secure JWT_SECRET in environment variables');
  process?.exit?.(1);
}
app.register(fastifyJwt, { secret: JWT_SECRET });

// Rate limiting global
app.register(fastifyRateLimit, {
  max: GATEWAY_CONFIG.RATE_LIMIT.GLOBAL.max,
  timeWindow: GATEWAY_CONFIG.RATE_LIMIT.GLOBAL.timeWindow,
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

logger.info({ event: 'register' });
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

export const getInternalHeaders = (req: FastifyRequest): Record<string, string> => ({
  'x-user-name': req.user?.username || (req.headers['x-user-name'] as string) || '',
  'x-user-id': String(req.user?.sub || req.user?.id || req.headers['x-user-id'] || ''),
  'x-user-role': req.user?.role || 'USER',
  cookie: req.headers?.cookie || '',
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
  const isDev = process?.env?.NODE_ENV === 'development';
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
app.listen({ host: '0.0.0.0', port: 3000 }, (err: Error | null, address: string) => {
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
    port: 3000,
    environment: process?.env?.NODE_ENV || 'unknown',
  });
});
