import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export default fp(async (app) => {
  const url = env.REDIS_URL;

  if (!url) {
    app.log.warn('REDIS_URL not set, redis plugin disabled');
    return;
  }
  // conf to avoid infinity loop in test env
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (env.NODE_ENV === 'test') return null;
      return Math.min(times * 50, 2000);
    },
  });

  redis.on('error', (err) => {
    app.log.error(`Redis Error: ${err.message}`);
  });

  redis.on('connect', () => {
    app.log.info('Redis client connected to server');
  });

  redis.on('ready', () => {
    app.log.info('Redis client is ready and authenticated');
  });

  app.decorate('redis', redis);

  app.addHook('onClose', async (instance) => {
    app.log.info('Closing Redis connection...');
    try {
      await Promise.race([
        redis.quit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis quit timeout')), 2000)),
      ]);
    } catch (err) {
      app.log.error('Forcing Redis disconnect');
      redis.disconnect();
    }
  });
});
