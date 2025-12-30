import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BlockTournamentInput } from '../module/block.schema.js';

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.BLOCK_DB_PATH || path.join(DEFAULT_DIR, 'blockchain.db');

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
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE,
    date_confirmed TEXT,
    tour_id INTEGER UNIQUE,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    player3_id INTEGER NOT NULL,
    player4_id INTEGER NOT NULL
    );
  `);
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  );
  throw e;
}

const insertSnapTournamentStmt = db.prepare(
  `INSERT INTO snapshot(tx_id,tour_id,player1_id,player2_id,player3_id,player4_id) VALUES (?,?,?,?,?,?)`,
);
const listSnapStmt = db.prepare(`SELECT * FROM snapshot`);
const getSnapTournamentStmt = db.prepare(`SELECT * FROM snapshot WHERE tx_id = ?`);
const updateTournamentStmt = db.prepare(
  `UPDATE snapshot SET tx_hash = ?, date_confirmed = ? WHERE tx_id = ?`,
);
const truncateSnapshotStmt = db.prepare(`DELETE FROM snapshot`);

export function insertSnapTournament(block: BlockTournamentInput): number {
  try {
    const idb = insertSnapTournamentStmt.run(
      block.tx_id,
      block.tour_id,
      block.player1_id,
      block.player2_id,
      block.player3_id,
      block.player4_id,
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

export function getSnapTournament(tx_id: number): BlockTournamentInput | null {
  try {
    const match = getSnapTournamentStmt.get(tx_id);
    return (match as BlockTournamentInput) || null;
  } catch (err) {
    const error: any = new Error(
      `Error during BlockTournamentInput lookup by ID: ${(err as any)?.message || String(err)}`,
    );
    error.code = 'DB_FIND_MATCH_BY_ID_ERROR';
    throw error;
  }
}

export function updateTournament(tx_id: number, tx_hash: string, date: string) {
  try {
    updateTournamentStmt.run(tx_hash, date, tx_id);
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
