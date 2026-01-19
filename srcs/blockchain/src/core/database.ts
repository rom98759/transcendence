import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BlockTournamentInput, SnapshotRow } from '../module/block.type.js';
import { env } from '../config/env.js';

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data');
const DB_PATH = env.BLOCK_DB_PATH || path.join(DEFAULT_DIR, 'blockchain.db');

// Check dir
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (err) {
  const e: any = new Error(
    `Failed to ensure DB directory: ${(err as any)?.message || String(err)}`,
  );
  throw e;
}

export const db = new Database(DB_PATH);
console.log('Using SQLite file:', DB_PATH);

// Create table
try {
  db.exec(`
CREATE TABLE IF NOT EXISTS snapshot(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE,
    snapshot_hash TEXT UNIQUE,
    block_timestamp INTEGER,
    tour_id INTEGER UNIQUE,
    player1 INTEGER NOT NULL,
    player2 INTEGER NOT NULL,
    player3 INTEGER NOT NULL,
    player4 INTEGER NOT NULL,
    block_number INTEGER,
    verify_status TEXT NOT NULL DEFAULT 'PENDING',
    verified_at INTEGER
    );
CREATE INDEX IF NOT EXISTS idx_snapshot_tour_id ON snapshot(tour_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_block_timestamp ON snapshot(block_timestamp);
  `);
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  );
  throw e;
}

const insertSnapTournamentStmt = db.prepare(
  `INSERT INTO snapshot(tour_id,player1,player2,player3,player4) VALUES (?,?,?,?,?)`,
);
const listSnapStmt = db.prepare(`SELECT * FROM snapshot`);
const getSnapTournamentStmt = db.prepare(`SELECT * FROM snapshot WHERE tour_id = ?`);
const truncateSnapshotStmt = db.prepare(`DELETE FROM snapshot`);

const updateTournamentStmt = db.prepare(`
UPDATE snapshot
SET
  tx_hash = ?,
  verify_status = ?,
  snapshot_hash = ?,
  block_number = ?,
  block_timestamp = ?,
  verified_at = ?
WHERE id = ?
`);

export function insertSnapTournament(block: BlockTournamentInput): number {
  try {
    const idb = insertSnapTournamentStmt.run(
      block.tour_id,
      block.player1,
      block.player2,
      block.player3,
      block.player4,
    );
    return Number(idb.lastInsertRowid);
  } catch (err: any) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('tour_id')) {
        const error: any = new Error(`Tournament '${block.tour_id}' is already taken`);
        error.code = 'TOURNAMENT_EXISTS';
        throw error;
      }
    }
    const error: any = new Error(`Error during Tournament storage: ${err?.message || err}`);
    error.code = 'DB_INSERT_TOURNAMENT_ERR';
    throw error;
  }
}

export function listSnap(): BlockTournamentInput[] {
  try {
    const info = listSnapStmt.all() as BlockTournamentInput[];
    return info;
  } catch (err: any) {
    throw new Error(`DATA_ERROR.INTERNAL_ERROR: Snapshot DB Error ${err.message}`);
  }
}

export function getSnapTournament(tour_id: number): SnapshotRow | null {
  try {
    const tour = getSnapTournamentStmt.get(tour_id);
    return (tour as SnapshotRow) || null;
  } catch (err) {
    const error: any = new Error(
      `Error during BlockTournamentInput lookup by ID: ${(err as any)?.message || String(err)}`,
    );
    error.code = 'DB_FIND_MATCH_BY_ID_ERROR';
    throw error;
  }
}

export function updateTournament(data: SnapshotRow) {
  try {
    updateTournamentStmt.run(
      data.tx_hash,
      data.verify_status,
      data.snapshot_hash,
      data.block_number,
      data.block_timestamp,
      data.verified_at,
      data.id,
    );
  } catch (err) {
    const error: any = new Error(
      `Error storing tx_hash in DB: ${(err as any)?.message || String(err)}`,
    );
    error.code = 'DB_REGISTER_HASH_ERROR';
    throw error;
  }
}

export function truncateSnapshot(): void {
  try {
    truncateSnapshotStmt.run();
  } catch (err) {
    const error: any = new Error(
      `Error truncating Snapshot Table: ${(err as any)?.message || String(err)}`,
    );
    error.code = 'DB_TRUNCATE_ERROR';
    throw error;
  }
}
