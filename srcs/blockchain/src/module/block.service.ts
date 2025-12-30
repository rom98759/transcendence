import { getGameStorage } from "../core/GameStorage.client.js";
import { BlockTournamentInput, BlockTournamentStored } from "./block.schema.js";
import { FastifyInstance } from "fastify";
import type { AppLogger } from "../core/logger.js";

export async function storeTournament(logger: AppLogger, tournament: BlockTournamentInput): Promise<BlockTournamentStored> {
  logger.info({
    event: "blockchain_env_check",
    BLOCKCHAIN_READY: process.env.BLOCKCHAIN_READY,
    GAME_STORAGE_ADDRESS: !!process.env.GAME_STORAGE_ADDRESS,
    AVALANCHE_RPC_URL: !!process.env.AVALANCHE_RPC_URL,
  });

  const gamestorage = getGameStorage(logger);
  if (!gamestorage) {
    const error: any = new Error(`Error during Tournament Blockchain storage: Smart Contract don't exist`);
    error.code = 'BLOCKCHAIN_NO_SMART_CONTRACT_ERR';
    throw error;
  }

  try {
    const tx = await gamestorage.storeTournament(
      tournament.tx_id,
      tournament.player1_id,
      tournament.player2_id,
      tournament.player3_id,
      tournament.player4_id
    );

    const receipt = await tx.wait();
    return {
      ...tournament,
      tx_hash: receipt.hash,
      date_confirmed: new Date().toISOString(),
    };
  } catch (err: any) {
    const error: any = new Error(`Error during Tournament Blockchain storage: ${err?.message || err}`);
    error.code = 'BLOCKCHAIN_INSERT_TOURNAMENT_ERR';
    throw error;
  }
}

// export async function listBlockchainTournaments(): Promise<map<string, string>> {
//
// }



