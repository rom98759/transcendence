import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit, { errorResponseBuilderContext } from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.routes.js';
import { initAdminUser, initInviteUser } from './utils/init-users.js';
import * as totpService from './services/totp.service.js';
import { loggerConfig } from './config/logger.config.js';
import { AUTH_CONFIG, ERROR_CODES, EVENTS, REASONS } from './utils/constants.js';
import { AppBaseError } from './types/errors.js';
import { JWT_SECRET } from './config/env.js';

// Validation du JWT_SECRET au démarrage (CRITIQUE)
if (!JWT_SECRET || JWT_SECRET === 'supersecretkey') {
  console.error('❌ CRITICAL: JWT_SECRET must be defined and cannot be the default value');
  console.error('   Set a secure JWT_SECRET in environment variables');
  (globalThis as any).process?.exit?.(1);
  throw new Error('JWT_SECRET not configured');
}

const app = fastify({
  logger: loggerConfig,
  disableRequestLogging: false,
});

export const logger = app.log;

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
  const statusCode = (error as any)?.statusCode || 500;

  req.log.error(
    {
      err: error,
      event: error?.context?.event || EVENTS.CRITICAL.BUG,
      reason: error?.context?.reason || REASONS.UNKNOWN,
    },
    'Error',
  );

  if (reply.sent) return;

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
app.register(fastifyJwt, { secret: JWT_SECRET });

// Rate limiting global
app.register(fastifyRateLimit, {
  max: AUTH_CONFIG.RATE_LIMIT.GLOBAL.max,
  timeWindow: AUTH_CONFIG.RATE_LIMIT.GLOBAL.timeWindow,
  errorResponseBuilder: (_req: FastifyRequest, context: errorResponseBuilderContext) => ({
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: context.after,
    },
  }),
});

app.register(authRoutes, { prefix: '/' });

(async () => {
  try {
    const address = await app.listen({ host: '0.0.0.0', port: 3001 });
    console.log(`Auth service listening at ${address}`);

    await initAdminUser();
    await initInviteUser();

    // Nettoyer les sessions expirées au démarrage
    totpService.cleanupExpiredSessions();

    // Maintenance automatique toutes les 5 minutes
    setInterval(() => {
      totpService.cleanupExpiredSessions();
    }, AUTH_CONFIG.CLEANUP_INTERVAL_MS);

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
