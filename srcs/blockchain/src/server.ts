import { buildApp } from './app.js';
import { env } from './config/env.js';

// Fonction de démarrage
const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: env.BK_SERVICE_PORT, host: '0.0.0.0' });
    app.log.info('Blockchain service running on http://localhost:3005');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
