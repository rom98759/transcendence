import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes.js';
import { initAdminUser, initInviteUser } from './utils/init-users.js';
import { logger } from './utils/logger.js';

const env = (globalThis as any).process?.env || {};
const app = fastify({ logger: { level: env.LOG_LEVEL || 'info'} });

// Register shared plugins once
app.register(fastifyCookie);
app.register(fastifyJwt, { secret: env.JWT_SECRET || 'supersecretkey' });

app.register(authRoutes, { prefix: '/' });

(async () => {
  try {
    const address = await app.listen({ host: '0.0.0.0', port: 3001 });
    console.log(`Auth service listening at ${address}`);

    await initAdminUser();
    await initInviteUser();
    logger.info({ event: 'service_ready', message: '✅ Auth service is ready' });
  } catch (error: any) {
    logger.error({ event: 'service_startup_failed', err: error?.message || error });
    console.error(error);
    (globalThis as any).process?.exit?.(1);
  }
})();