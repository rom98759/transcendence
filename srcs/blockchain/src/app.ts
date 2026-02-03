import Fastify from 'fastify';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './module/block.routes.js';
import { registerErrorHandler } from './core/error-handler.js';
import { startTournamentConsumer } from './module/block.consumers.js';
import fs from 'fs';

export async function buildApp() {
  const app = Fastify({
    https: {
      key: fs.readFileSync('/etc/certs/blockchain-service.key'),
      cert: fs.readFileSync('/etc/certs/blockchain-service.crt'),
      ca: fs.readFileSync('/etc/ca/ca.crt'),

      requestCert: true,
      rejectUnauthorized: false,
    },
    logger: true,
  });

  app.addHook('onReady', async () => {
    startTournamentConsumer(app);
  });

  app.decorate('closing', false);

  app.addHook('onClose', async () => {
    app.closing = true;
  });

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

  await registerPlugins(app);
  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
