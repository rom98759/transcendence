import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { initAdminUser, initInviteUser } from './utils/init-users.js';
import * as totpService from './services/totp.service.js';
import * as onlineService from './services/online.service.js';
import { loggerConfig } from './config/logger.config.js';
import { AUTH_CONFIG, ERROR_CODES, EVENTS, REASONS } from './utils/constants.js';
import { AppBaseError } from './types/errors.js';
import { authenv } from './config/env.js';
import fs from 'fs';

const app = fastify({
  https: {
    key: fs.readFileSync('/etc/certs/auth-service.key'),
    cert: fs.readFileSync('/etc/certs/auth-service.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'),

    requestCert: true,
    rejectUnauthorized: false,
  },
  logger: loggerConfig,
  disableRequestLogging: false,
});

export const logger = app.log;

app.addHook('onRequest', (request, reply, done) => {
  const socket = request.raw.socket as any;
  // Autorise les healthchecks locaux sans mTLS
  if (socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1') {
    return done();
  }
  const cert = socket.getPeerCertificate();
  if (!cert || !cert.subject) {
    reply.code(401).send({ error: 'Client certificate required' });
    return;
  }
  done();
});

/**
 * @abstract add userId and userName to logger
 */
app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = request.headers['x-user-id'];
  const userName = request.headers['x-user-name'];
  const bindings: Record<string, any> = {};
  if (userId) {
    bindings.userId = Number(userId) || userId;
  }
  if (userName) {
    bindings.username = userName;
  }
  if (Object.keys(bindings).length > 0) {
    request.log = request.log.child(bindings);
  }
});

app.setErrorHandler((error: AppBaseError, req, reply) => {
  // Ne pas traiter les erreurs déjà envoyées
  if (reply.sent) {
    req.log.debug({
      event: 'error_handler_skipped_reply_sent',
      method: req.method,
      url: req.url,
      errorCode: (error as any)?.code,
      errorMessage: (error as any)?.message,
    });
    return;
  }

  // Gestion spéciale pour les erreurs de rate limiting
  if (
    (error as any).code === 'FST_ERR_RATE_LIMITED' ||
    (error as any).code === 'FST_ERR_RATE_LIMIT' ||
    (error as any).message?.includes('Rate limit exceeded')
  ) {
    // Calculer retry-after
    // Le header Retry-After est déjà en secondes
    const retryAfterHeader = reply.getHeader('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Math.ceil(Number(retryAfterHeader)) : 60; // Fallback

    const timeUnit = retryAfterSeconds === 1 ? 'second' : 'seconds';

    req.log.warn({
      event: 'rate_limit_429_sent',
      ip: req.ip,
      url: req.url,
      method: req.method,
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

  // autres erreurs statusCode
  const statusCode = (error as any)?.statusCode || 500;

  req.log.error(
    {
      err: error,
      event: error?.context?.event || EVENTS.CRITICAL.BUG,
      reason: error?.context?.reason || REASONS.UNKNOWN,
      statusCode: statusCode,
      errorCode: (error as any)?.code,
      errorName: (error as any)?.name,
    },
    'Error',
  );

  reply.code(statusCode).send({
    error: {
      message: (error as any)?.message || 'Internal server error',
      code: (error as any)?.code || EVENTS.CRITICAL.BUG,
      reason: error?.context?.reason || REASONS.UNKNOWN,
    },
  });
});

// Register shared plugins once
app.register(fastifyCookie);
app.register(fastifyJwt, { secret: authenv.JWT_SECRET });

app.register(fastifyRateLimit, {
  max: AUTH_CONFIG.RATE_LIMIT.GLOBAL.max,
  timeWindow: AUTH_CONFIG.RATE_LIMIT.GLOBAL.timeWindow,
});

app.register(authRoutes, { prefix: '/' });
app.register(adminRoutes, { prefix: '/admin' });

(async () => {
  try {
    const address = await app.listen({ host: '0.0.0.0', port: authenv.AUTH_SERVICE_PORT });
    console.log(`Auth service listening at ${address}`);

    await initAdminUser();
    await initInviteUser();

    // Initialiser le client Redis pour les statuts en ligne
    onlineService.initRedisClient();

    // Nettoyer les sessions expirées au démarrage
    totpService.cleanupExpiredSessions();

    // Maintenance automatique toutes les 5 minutes
    setInterval(() => {
      totpService.cleanupExpiredSessions();
    }, AUTH_CONFIG.CLEANUP_INTERVAL_MS);

    // Démarrer le job de nettoyage des statuts en ligne
    onlineService.startCleanupJob(AUTH_CONFIG.ONLINE_STATUS_CLEANUP_INTERVAL_MS);

    logger.info({
      event: 'service_ready',
      message: 'Auth service is ready',
      cleanupInterval: `${AUTH_CONFIG.CLEANUP_INTERVAL_MS / 1000}s`,
    });
  } catch (error: any) {
    logger.error({ event: 'service_startup_failed', err: error?.message || error });
    console.error(error);
    (globalThis as any).process?.exit?.(1);
  }
})();
