import Fastify from 'fastify';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './module/block.routes.js';
import { registerErrorHandler } from './core/error-handler.js';
import { startTournamentConsumer } from './module/block.consumers.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.addHook('onReady', async () => {
    startTournamentConsumer(app);
  });

  app.decorate('closing', false);

  app.addHook('onClose', async () => {
    app.closing = true;
  });

  await registerPlugins(app);
  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
