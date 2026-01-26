import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export default fp(async (app) => {
  const url = env.REDIS_URL;

  if (!url) {
    app.log.warn('REDIS_URL not set, redis plugin disabled');
    return;
  }
  app.log.info('REDIS_URL is set, redis plugin unabled');
  const redis = new Redis(url);

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
});
