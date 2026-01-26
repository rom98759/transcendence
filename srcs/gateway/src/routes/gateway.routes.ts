import { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from '../controllers/auth.controller.js';
import { registerGameRoutes } from '../controllers/game.controller.js';
import { registerBlockRoutes } from '../controllers/block.controller.js';
import { healthRoutes } from './health.routes.js';
import { rootHandler, helpHandler } from '../controllers/gateway.controller.js';
import { registerUsersRoutes } from '../controllers/um.controller.js';

export async function apiRoutes(app: FastifyInstance) {
  app.register(registerAuthRoutes, { prefix: '/auth' });
  app.register(registerGameRoutes, { prefix: '/game' });
  app.register(registerBlockRoutes, { prefix: '/block' });
  app.register(registerUsersRoutes, { prefix: '/users' });
}

/**
 * @abstract /doc routes are managed directly through nginx
 */
export async function publicRoutes(app: FastifyInstance) {
  app.register(healthRoutes);
  app.get('/', { config: { isPublic: true } }, rootHandler);
  app.get('/help', { config: { isPublic: true } }, helpHandler);
}
