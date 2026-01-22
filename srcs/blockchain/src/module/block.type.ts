/* ===========================
 * INPUT (provenant du Game Service)
 * =========================== */
export interface BlockTournamentInput {
  tour_id: number;
  player1: number;
  player2: number;
  player3: number;
  player4: number;
}

/* ===========================
 * SNAPSHOT DB (source off-chain)
 * =========================== */
export interface SnapshotRow {
  id: number;

  tour_id: number;
  player1: number;
  player2: number;
  player3: number;
  player4: number;

  tx_hash: string | null;
  snapshot_hash: string | null;
  block_number: number | null;
  block_timestamp: number | null;
  verify_status: SnapshotVerifyStatus;
  verified_at: number | null;
}

/* ===========================
 * VERIFICATION STATUS
 * =========================== */
export type SnapshotVerifyStatus = 'PENDING' | 'OK' | 'MISMATCH';

/* ===========================
 * EVENT ON-CHAIN
 * =========================== */
/**
 * Event TournamentStored tel que décodé depuis ethers.
 * STRICTEMENT aligné avec le smart contract.
 */
export interface TournamentStoredEvent {
  tour_id: number;
  player1: number;
  player2: number;
  player3: number;
  player4: number;
  ts: number;
  snapshotHash: string; // respect camelCase Solidity/ethers conventions
}

/* ===========================
 * VERIFICATION RESULT
 * =========================== */
/**
 * Résultat déterministe de la vérification.
 * Ne dépend que des données + event.
 */
export interface SnapshotVerificationResult {
  status: SnapshotVerifyStatus;
  localHash: string;
}
