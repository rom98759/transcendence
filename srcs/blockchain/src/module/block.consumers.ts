import { FastifyInstance } from 'fastify';
import { BlockTournamentInput } from './block.type.js';
import { errorEventMap } from '../core/error.js';
import {
  addTournamentBlockchain,
  addTournamentSnapDB,
  updateTournamentSnapDB,
} from './block.service.js';
import { AppLogger } from '../core/logger.js';

export async function startTournamentConsumer(app: FastifyInstance) {
  if (!app.redis) {
    app.log.warn('Redis not available, tournament consumer disabled');
    return;
  }
  const redis = app.redis;

  try {
    await redis.xgroup('CREATE', 'tournament.results', 'blockchain-group', '$', 'MKSTREAM');
  } catch (e) {
    // group already exists → OK
  }

  const consume = async () => {
    while (!app.closing) {
      try {
        const streams = await redis.xreadgroup(
          'GROUP',
          'blockchain-group',
          'blockchain-1',
          'BLOCK',
          5000,
          'COUNT',
          1,
          'STREAMS',
          'tournament.results',
          '>',
        );

        if (!streams) continue;

        const [[, messages]] = streams;
        for (const [id, fields] of messages) {
          const payload = JSON.parse(fields[1]);
          app.log.info(
            {
              event: 'tournament.received',
              stream: 'tournament.results',
              streamId: id,
              tourId: payload.tour_id,
            },
            'Tournament event received from Redis',
          );

          // 1. validation
          // 2. écriture blockchain
          // 3. ack
          await redis.xack('tournament.results', 'blockchain-group', id);
          const tournoi: BlockTournamentInput = {
            tour_id: payload.tour_id,
            player1: payload.player1,
            player2: payload.player2,
            player3: payload.player3,
            player4: payload.player4,
          };
          app.log.info(
            {
              event: 'tournament.acknowledged',
              streamId: id,
              tournament: tournoi,
            },
            'Tournament event acknowledged',
          );
          await addSubTournament(app.log, tournoi);
        }
      } catch (err: any) {
        // Avoid unhandled promise rejections from redis connection errors.
        app.log.warn({ err }, 'Tournament consumer encountered an error, will retry');
        // If the app is closing, break the loop to allow clean shutdown
        if (app.closing) break;
        // Backoff before retrying to avoid tight error loops
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
    }
  };

  consume().catch((err: any) => app.log.error({ err }, 'Tournament consumer fatal error'));
}

async function addSubTournament(logger: AppLogger, tournament: BlockTournamentInput) {
  try {
    const rowSnapId = addTournamentSnapDB(logger, tournament);
    const blockchainReady = process.env.BLOCKCHAIN_READY === 'true';
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
