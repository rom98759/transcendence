import { computeSnapshotHash } from './GameStorage.utils.js';

export type VerificationResult =
  | { status: 'OK'; localHash: string }
  | { status: 'MISMATCH'; localHash: string };

export function verifyTournamentSnapshot(
  snapshot: {
    tour_id: number;
    player1: number;
    player2: number;
    player3: number;
    player4: number;
    block_timestamp: number;
  },
  eventSnapshotHash: string,
): VerificationResult {
  const localHash = computeSnapshotHash(
    snapshot.tour_id,
    snapshot.player1,
    snapshot.player2,
    snapshot.player3,
    snapshot.player4,
    snapshot.block_timestamp,
  );

  if (localHash.toLowerCase() === eventSnapshotHash.toLowerCase()) {
    return { status: 'OK', localHash };
  }

  return { status: 'MISMATCH', localHash };
}
