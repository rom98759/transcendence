import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.routes.js';
import { initAdminUser, initInviteUser } from './utils/init-users.js';
import { logger } from './utils/logger.js';
import { AUTH_CONFIG, ERROR_CODES } from './utils/constants.js';

const env = (globalThis as any).process?.env || {};

// Validation du JWT_SECRET au démarrage (CRITIQUE)
const JWT_SECRET = env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'supersecretkey') {
  console.error('❌ CRITICAL: JWT_SECRET must be defined and cannot be the default value');
  console.error('   Set a secure JWT_SECRET in environment variables');
  (globalThis as any).process?.exit?.(1);
  throw new Error('JWT_SECRET not configured');
}

const app = fastify({ logger: { level: env.LOG_LEVEL || 'info'} });

// Register shared plugins once
app.register(fastifyCookie);
app.register(fastifyJwt, { secret: JWT_SECRET });

// Rate limiting global
app.register(fastifyRateLimit, {
  max: AUTH_CONFIG.RATE_LIMIT.GLOBAL.max,
  timeWindow: AUTH_CONFIG.RATE_LIMIT.GLOBAL.timeWindow,
  errorResponseBuilder: (req, context) => ({
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: context.after
    }
  })
});

app.register(authRoutes, { prefix: '/' });

(async () => {
  try {
    const address = await app.listen({ host: '0.0.0.0', port: 3001 });
    console.log(`Auth service listening at ${address}`);

    await initAdminUser();
    await initInviteUser();
    logger.info({ event: 'service_ready', message: 'Auth service is ready' });
  } catch (error: any) {
    logger.error({ event: 'service_startup_failed', err: error?.message || error });
    console.error(error);
    (globalThis as any).process?.exit?.(1);
  }
})();
