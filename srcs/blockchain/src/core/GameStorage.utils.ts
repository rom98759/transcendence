import { ContractTransactionReceipt, LogDescription } from 'ethers';
import { keccak256, AbiCoder } from 'ethers';
import { TournamentStoredEvent } from '../module/block.type.js';
import { Contract } from 'ethers';
import { AppLogger } from './logger.js';

const abi = AbiCoder.defaultAbiCoder();

export function computeSnapshotHash(
  tour_id: number,
  p1: number,
  p2: number,
  p3: number,
  p4: number,
  ts: number,
): string {
  return keccak256(
    abi.encode(
      ['uint32', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
      [tour_id, p1, p2, p3, p4, ts],
    ),
  );
}

export function extractTournamentStoredEvent(
  logger: AppLogger,
  receipt: ContractTransactionReceipt,
  gameStorage: Contract,
): TournamentStoredEvent {
  logger.info({
    event: 'tx_receipt_debug',
    txHash: receipt.hash,
    logsCount: receipt.logs.length,
    logs: receipt.logs.map((l) => ({
      address: l.address,
      topics: l.topics,
    })),
  });
  for (const log of receipt.logs) {
    let parsed: LogDescription | null = null;

    try {
      parsed = gameStorage.interface.parseLog(log);
    } catch {
      continue;
    }

    if (!parsed || parsed.name !== 'TournamentStored') continue;

    const args = parsed.args;

    return {
      tour_id: Number(args.tour_id),
      player1: Number(args.player1),
      player2: Number(args.player2),
      player3: Number(args.player3),
      player4: Number(args.player4),
      ts: Number(args.ts),
      snapshotHash: args.snapshotHash as string,
    };
  }

  throw new Error('TournamentStored event not found in transaction receipt');
}
