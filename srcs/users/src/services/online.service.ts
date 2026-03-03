import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

/**
 * Online status service for the users microservice.
 * Reads online status directly from the shared Redis instance,
 * using the same key convention as the auth service (online:{userId}).
 *
 * This avoids inter-service HTTP calls — both services share the same Redis.
 */
const ONLINE_KEY_PREFIX = 'online:';

export class OnlineService {
  private redis: Redis | null = null;

  /**
   * Inject the Redis client (called after plugin registration).
   */
  setRedis(redis: Redis): void {
    this.redis = redis;
  }

  /**
   * Check if a single user is online.
   */
  async isUserOnline(authId: number): Promise<boolean> {
    if (!this.redis) {
      logger.warn({ event: 'online_check_no_redis', authId });
      return false;
    }

    try {
      const exists = await this.redis.exists(`${ONLINE_KEY_PREFIX}${authId}`);
      return exists === 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ event: 'online_check_error', authId, error: message });
      return false;
    }
  }

  /**
   * Check online status for multiple users in a single Redis pipeline.
   * Returns a Map<authId, isOnline>.
   */
  async getBulkOnlineStatus(authIds: number[]): Promise<Map<number, boolean>> {
    const statusMap = new Map<number, boolean>();

    if (authIds.length === 0 || !this.redis) {
      return statusMap;
    }

    try {
      const pipeline = this.redis.pipeline();
      for (const authId of authIds) {
        pipeline.exists(`${ONLINE_KEY_PREFIX}${authId}`);
      }
      const results = await pipeline.exec();

      if (results) {
        for (let i = 0; i < authIds.length; i++) {
          const [err, value] = results[i];
          statusMap.set(authIds[i], !err && value === 1);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ event: 'bulk_online_check_error', error: message });
      // Return all false on error — graceful degradation
      for (const authId of authIds) {
        statusMap.set(authId, false);
      }
    }

    return statusMap;
  }
}

export const onlineService = new OnlineService();
