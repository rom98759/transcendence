import { logger } from '../index.js';
import { appenv } from '../config/env.js';
import { API_ERRORS, LOG_EVENTS } from '../utils/messages.js';
import { Redis } from 'ioredis';

const REDIS_HOST = appenv.REDIS_SERVICE_NAME;

export class RedisManager {
  private static instance: RedisManager;
  public pub: Redis;
  public sub: Redis;

  private constructor() {
    this.pub = new Redis({ host: REDIS_HOST, lazyConnect: true });
    this.sub = new Redis({ host: REDIS_HOST, lazyConnect: true });
    this.setupErrorHandling(this.pub, 'PUB');
    this.setupErrorHandling(this.sub, 'SUB');
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  // TODO use env or config file for retries and delay
  public async connect(retries = 5, delay = 2000) {
    for (let r = 0; r < retries; r++) {
      try {
        await this.pub.connect();
        await this.sub.connect();
        logger.info({ event: LOG_EVENTS.REDIS_CONNECT });
        return;
      } catch (error) {
        logger.warn({ event: API_ERRORS.REDIS.CONNECT_RETRY, error });
        if (r === retries - 1) {
          break;
        }
        await new Promise((redis) => setTimeout(redis, delay));
      }
    }
    logger.error({ event: API_ERRORS.REDIS.CONNECT });
  }

  private setupErrorHandling(client: Redis, name: string) {
    client.on('error', (err: Error) =>
      logger.error({ event: API_ERRORS.REDIS.BASE.concat(` ${name}`), err }),
    );
  }
}
