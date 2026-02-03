import { FastifyInstance } from 'fastify';
import { BlockTournamentInput } from './block.type.js';
import { errorEventMap } from '../core/error.js';
import {
  addTournamentBlockchain,
  addTournamentSnapDB,
  updateTournamentSnapDB,
} from './block.service.js';
import { AppLogger } from '../core/logger.js';
import { env } from '../config/env.js';
import type { Redis } from 'ioredis';

const STREAM = 'tournament.results';
const GROUP = 'blockchain-group';
const CONSUMER = 'blockchain-1';

const PENDING_IDLE_MS = 30_000; // 30s avant reclaim
const RECOVERY_INTERVAL = 10; // toutes les 10 itérations

export async function startTournamentConsumer(app: FastifyInstance) {
  if (!app.redis) {
    app.log.warn('Redis not available, tournament consumer disabled');
    return;
  }

  const redis = app.redis;

  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
  } catch {
    // group already exists
  }

  consumeLoop(app, redis).catch((err) => app.log.error({ err }, 'Tournament consumer fatal error'));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function consumeLoop(app: FastifyInstance, redis: any): Promise<void> {
  let loopCount = 0;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (!app.closing) {
    try {
      loopCount++;

      if (loopCount % RECOVERY_INTERVAL === 0) {
        await recoverPending(app, redis);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Redis Streams: ioredis typings do not support BLOCK + COUNT.
      const streams = await redis.xreadgroup(
        'GROUP',
        GROUP,
        CONSUMER,
        'BLOCK',
        5000,
        'COUNT',
        1,
        'STREAMS',
        STREAM,
        '>',
      );

      if (!streams) continue;

      const [[, messages]] = streams;
      for (const [id, fields] of messages) {
        await processMessage(app, redis, id, fields);
      }
    } catch (err) {
      app.log.warn({ err }, 'Consumer loop error');
      if (app.closing) break;
      await sleep(500);
    }
  }
}

async function processMessage(
  app: FastifyInstance,
  redis: Redis,
  id: string,
  fields: string[],
): Promise<void> {
  const payload = JSON.parse(fields[1]);

  const tournoi: BlockTournamentInput = {
    tour_id: payload.tour_id,
    player1: payload.player1,
    player2: payload.player2,
    player3: payload.player3,
    player4: payload.player4,
  };

  app.log.info(
    {
      event: 'tournament_received',
      streamId: id,
      tourId: tournoi.tour_id,
    },
    'Tournament event received',
  );

  try {
    await addSubTournament(app.log, tournoi);
    await redis.xack(STREAM, GROUP, id);
    app.log.info(
      {
        event: 'tournament_acknowledged',
        streamId: id,
        tourId: tournoi.tour_id,
      },
      'Tournament processed and acknowledged',
    );
  } catch (err: any) {
    if (err?.code === 'TOURNAMENT_EXIST') {
      app.log.info(
        {
          event: 'tournament.already_exists',
          streamId: id,
          tourId: tournoi.tour_id,
        },
        'Tournament already exists, acknowledging',
      );
      await redis.xack(STREAM, GROUP, id);
    } else {
      app.log.error(
        { err, streamId: id, tourId: tournoi.tour_id },
        'Tournament processing failed, will retry',
      );
      // pas d’ACK → message reste pending
      throw err;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recoverPending(app: FastifyInstance, redis: any): Promise<void> {
  const pending = await redis.xpending(STREAM, GROUP, '-', '+', 10);

  if (!pending || pending.length === 0) return;

  for (const [id, consumer, idle] of pending) {
    if (idle < PENDING_IDLE_MS) continue;

    app.log.warn(
      {
        event: 'tournament_reclaim',
        streamId: id,
        idleMs: idle,
        previousConsumer: consumer,
      },
      'Reclaiming pending tournament message',
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claimed = await redis.xclaim(STREAM, GROUP, CONSUMER, PENDING_IDLE_MS, id);

    for (const [, messages] of claimed) {
      for (const [msgId, fields] of messages) {
        await processMessage(app, redis, msgId, fields);
      }
    }
  }
}

async function addSubTournament(logger: AppLogger, tournament: BlockTournamentInput) {
  try {
    const rowSnapId = addTournamentSnapDB(logger, tournament);
    const blockchainReady = env.BLOCKCHAIN_READY;
    if (blockchainReady) {
      const dataStored = await addTournamentBlockchain(logger, tournament, rowSnapId);
      updateTournamentSnapDB(logger, dataStored);
    }
  } catch (err: any) {
    const event = errorEventMap[err.code];
    if (event) {
      logger.error({ event, err });
    } else {
      logger.error({ event: 'unknown_error', err });
    }
    logger.error({ tournament: tournament.tour_id, err: err?.message || err });
  }
}
