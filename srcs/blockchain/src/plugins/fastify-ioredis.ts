import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
// import { REDIS_URL } from '../core/config.js';

export default fp(async (app) => {
  const url = process.env.REDIS_URL;

  if (!url) {
    app.log.warn('REDIS_URL not set, redis plugin disabled');
    return;
  }
  const redis = new Redis(url);

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
});
