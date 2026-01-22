import { getGameStorage } from '../core/GameStorage.client.js';
import type { AppLogger } from '../core/logger.js';
import { extractTournamentStoredEvent } from '../core/GameStorage.utils.js';
import * as db from '../core/database.js';
import { BlockTournamentInput, SnapshotRow } from './block.type.js';
import { verifyTournamentSnapshot } from '../core/Gamestorage.verification.js';
import { env } from '../config/env.js';

export async function storeTournament(
  logger: AppLogger,
  tournament: BlockTournamentInput,
  rowSnapId: number,
): Promise<SnapshotRow> {
  logger.info({
    event: 'blockchain_env_check',
    BLOCKCHAIN_READY: env.BLOCKCHAIN_READY,
    GAME_STORAGE_ADDRESS: !!env.GAME_STORAGE_ADDRESS,
    AVALANCHE_RPC_URL: !!env.AVALANCHE_RPC_URL,
  });

  const gamestorage = getGameStorage(logger);
  if (!gamestorage) {
    const error: any = new Error(
      `Error during Tournament Blockchain storage: Smart Contract don't exist`,
    );
    error.code = 'BLOCKCHAIN_NO_SMART_CONTRACT_ERR';
    throw error;
  }
  try {
    const tx = await gamestorage.storeTournament(
      tournament.tour_id,
      tournament.player1,
      tournament.player2,
      tournament.player3,
      tournament.player4,
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt missing');
    }
    const event = extractTournamentStoredEvent(logger, receipt, gamestorage);
    if (!event) {
      throw new Error('TournamentStored event not found');
    }

    const verification = verifyTournamentSnapshot(
      {
        tour_id: event.tour_id,
        player1: event.player1,
        player2: event.player2,
        player3: event.player3,
        player4: event.player4,
        block_timestamp: event.ts,
      },
      event.snapshotHash,
    );

    if (verification.status !== 'OK') {
      throw new Error('Business hash mismatch — integrity violation');
    }
    return {
      ...tournament,
      id: rowSnapId,
      tx_hash: receipt.hash,
      snapshot_hash: event.snapshotHash,
      block_number: receipt.blockNumber,
      block_timestamp: event.ts,
      verify_status: verification.status,
      verified_at: Date.now(),
    };
  } catch (err: any) {
    const error: any = new Error(
      `Error during Tournament Blockchain storage: ${err?.message || err}`,
    );
    error.code = 'BLOCKCHAIN_INSERT_TOURNAMENT_ERR';
    throw error;
  }
}

export function addTournamentSnapDB(logger: AppLogger, data: BlockTournamentInput): number {
  logger.info({ event: 'snapshot_register_attempt', tournament: data });
  const rowSnapId = db.insertSnapTournament(data);
  logger.info({ event: 'snapshot_register_success', tournament: data });
  return Number(rowSnapId);
}

export async function addTournamentBlockchain(
  logger: AppLogger,
  data: BlockTournamentInput,
  rowSnapId: number,
): Promise<SnapshotRow> {
  logger.info({
    event: 'blockchain_register_attempt',
    data,
  });
  const tournament: SnapshotRow = await storeTournament(logger, data, rowSnapId);
  logger.info({ event: 'blockchain_register_success', tournament: tournament });
  return tournament;
}

export function updateTournamentSnapDB(logger: AppLogger, data: SnapshotRow) {
  logger.info({ event: 'snapshot_update_attempt', tournament: data });
  const rowBlockId = db.updateTournament(data);
  logger.info({ event: 'snapshot_update_success', tournament: data, rowBlockId });
}
