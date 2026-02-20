import { Redis } from 'ioredis';
import { logger } from '../index.js';
import { authenv } from '../config/env.js';

// Constantes pour le statut en ligne
const ONLINE_TTL = 45; // secondes - temps avant qu'un utilisateur soit considéré offline
const ONLINE_KEY_PREFIX = 'online:';
const ONLINE_USERS_SET = 'online_users';

// Client Redis singleton
let redisClient: Redis | null = null;

/**
 * Initialise le client Redis
 */
export function initRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: authenv.REDIS_HOST,
    port: authenv.REDIS_PORT,
    password: authenv.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => {
    logger.info({ event: 'redis_connected', host: authenv.REDIS_HOST, port: authenv.REDIS_PORT });
  });

  redisClient.on('error', (err: Error) => {
    logger.error({ event: 'redis_error', error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn({ event: 'redis_disconnected' });
  });

  return redisClient;
}

/**
 * Obtient le client Redis (l'initialise si nécessaire)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initRedisClient();
  }
  return redisClient;
}

/**
 * Enregistre un heartbeat pour un utilisateur
 * Met à jour le statut en ligne et ajoute l'utilisateur au SET des utilisateurs en ligne
 */
export async function recordHeartbeat(userId: number): Promise<void> {
  const redis = getRedisClient();
  const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;
  const timestamp = Date.now();

  try {
    // Pipeline pour exécuter les deux commandes atomiquement
    const pipeline = redis.pipeline();

    // 1. Mettre à jour le statut en ligne avec TTL
    pipeline.setex(onlineKey, ONLINE_TTL, timestamp.toString());

    // 2. Ajouter l'utilisateur au SET des utilisateurs en ligne
    pipeline.sadd(ONLINE_USERS_SET, userId.toString());

    await pipeline.exec();

    logger.debug({
      event: 'heartbeat_recorded',
      userId,
      timestamp,
    });
  } catch (error: any) {
    logger.error({
      event: 'heartbeat_record_error',
      userId,
      error: error?.message,
    });
    throw error;
  }
}

/**
 * Vérifie si un utilisateur est en ligne
 */
export async function isUserOnline(userId: number): Promise<boolean> {
  const redis = getRedisClient();
  const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;

  try {
    const exists = await redis.exists(onlineKey);
    return exists === 1;
  } catch (error: any) {
    logger.error({
      event: 'check_online_error',
      userId,
      error: error?.message,
    });
    return false;
  }
}

/**
 * Obtient tous les IDs des utilisateurs en ligne
 */
export async function getOnlineUserIds(): Promise<number[]> {
  const redis = getRedisClient();

  try {
    const userIds = await redis.smembers(ONLINE_USERS_SET);
    return userIds.map((id: string) => parseInt(id, 10));
  } catch (error: any) {
    logger.error({
      event: 'get_online_users_error',
      error: error?.message,
    });
    return [];
  }
}

/**
 * Obtient le statut online de plusieurs utilisateurs en une seule requête
 * Optimisé pour éviter de faire N requêtes
 */
export async function getBulkOnlineStatus(userIds: number[]): Promise<Map<number, boolean>> {
  const redis = getRedisClient();
  const statusMap = new Map<number, boolean>();

  if (userIds.length === 0) {
    return statusMap;
  }

  try {
    // Utiliser pipeline pour vérifier l'existence de toutes les clés en une seule fois
    const pipeline = redis.pipeline();

    userIds.forEach((userId) => {
      const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;
      pipeline.exists(onlineKey);
    });

    const results = await pipeline.exec();

    if (results) {
      userIds.forEach((userId: number, index: number) => {
        const [err, exists] = results[index];
        statusMap.set(userId, !err && exists === 1);
      });
    }
  } catch (error: any) {
    logger.error({
      event: 'bulk_online_status_error',
      userIds: userIds.slice(0, 5), // Log seulement les 5 premiers pour éviter spam
      error: error?.message,
    });

    // Fallback: tous offline si erreur
    userIds.forEach((userId) => statusMap.set(userId, false));
  }

  return statusMap;
}

/**
 * Marque un utilisateur comme en ligne
 */
export async function setUserOnline(userId: number): Promise<void> {
  const redis = getRedisClient();
  const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;

  try {
    // Définir la clé avec TTL
    await redis.setex(onlineKey, ONLINE_TTL, Date.now().toString());

    // Ajouter au set des utilisateurs en ligne
    await redis.sadd(ONLINE_USERS_SET, userId.toString());

    logger.debug({
      event: 'user_set_online',
      userId,
    });
  } catch (error: any) {
    logger.error({
      event: 'set_user_online_error',
      userId,
      error: error?.message,
    });
    throw error;
  }
}

/**
 * Marque un utilisateur comme hors ligne
 */
export async function setUserOffline(userId: number, lastSeen?: Date): Promise<void> {
  const redis = getRedisClient();
  const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;

  try {
    // Supprimer la clé online
    await redis.del(onlineKey);

    // Retirer du set des utilisateurs en ligne
    await redis.srem(ONLINE_USERS_SET, userId.toString());

    logger.debug({
      event: 'user_set_offline',
      userId,
      lastSeen: lastSeen?.toISOString(),
    });
  } catch (error: any) {
    logger.error({
      event: 'set_user_offline_error',
      userId,
      error: error?.message,
    });
    throw error;
  }
}

/**
 * Met à jour le statut en ligne d'un utilisateur
 * Fonction principale utilisée par les controllers
 */
export async function updateOnlineStatus(
  userId: number,
  isOnline: boolean,
  lastSeen?: Date,
): Promise<void> {
  try {
    if (isOnline) {
      await setUserOnline(userId);
    } else {
      await setUserOffline(userId, lastSeen);
    }

    logger.info({
      event: 'online_status_updated',
      userId,
      isOnline,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      event: 'update_online_status_failed',
      userId,
      isOnline,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Nettoie les utilisateurs qui ne sont plus en ligne du SET
 * À appeler périodiquement (ex: toutes les 60 secondes)
 */
export async function cleanupOfflineUsers(): Promise<void> {
  const redis = getRedisClient();

  try {
    const userIds = await redis.smembers(ONLINE_USERS_SET);

    if (userIds.length === 0) {
      return;
    }

    // Vérifier quels utilisateurs ne sont plus en ligne
    const pipeline = redis.pipeline();

    userIds.forEach((userId: string) => {
      const onlineKey = `${ONLINE_KEY_PREFIX}${userId}`;
      pipeline.exists(onlineKey);
    });

    const results = await pipeline.exec();
    const offlineUserIds: string[] = [];

    if (results) {
      userIds.forEach((userId: string, index: number) => {
        const [err, exists] = results[index];
        if (!err && exists === 0) {
          offlineUserIds.push(userId);
        }
      });
    }

    // Retirer les utilisateurs offline du SET
    if (offlineUserIds.length > 0) {
      await redis.srem(ONLINE_USERS_SET, ...offlineUserIds);
      logger.debug({
        event: 'cleanup_offline_users',
        count: offlineUserIds.length,
      });
    }
  } catch (error: any) {
    logger.error({
      event: 'cleanup_error',
      error: error?.message,
    });
  }
}

/**
 * Démarre un job de nettoyage périodique
 */
export function startCleanupJob(intervalMs: number = 60000): NodeJS.Timeout {
  logger.info({
    event: 'cleanup_job_started',
    interval: `${intervalMs}ms`,
  });

  return setInterval(async () => {
    await cleanupOfflineUsers();
  }, intervalMs);
}

/**
 * Ferme proprement la connexion Redis
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info({ event: 'redis_connection_closed' });
  }
}

/**
 * Supprime toutes les données Redis d'un utilisateur
 */
export async function removeUserFromRedis(userId: number): Promise<void> {
  try {
    const client = getRedisClient();
    const userKey = `${ONLINE_KEY_PREFIX}${userId}`;

    // Supp user online key
    await client.del(userKey);

    // Supp user du set des utilisateurs en ligne
    await client.srem(ONLINE_USERS_SET, userId.toString());

    logger.info({
      event: 'user_redis_cleanup',
      userId,
      message: 'User data removed from Redis',
    });
  } catch (error) {
    logger.error({
      event: 'user_redis_cleanup_error',
      userId,
      error: (error as Error)?.message,
    });
    throw error;
  }
}
