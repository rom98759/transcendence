// ============================================================================
// Database initialization — SQLite setup + schema migrations
// Single responsibility: connection + DDL. No business logic.
// ============================================================================

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { AppError, ERR_DEFS } from '@transcendence/core';

/**
 * Initialize and return a SQLite database instance.
 * Creates the directory and applies the schema.
 */
export function initDb(dbPath: string): Database.Database {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.SERVICE_GENERIC,
      { details: [{ field: 'Failed to ensure DB directory' }] },
      err,
    );
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // ---- Schema ----

  try {
    db.exec(`
CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES player(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament_player (
    tournament_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    final_position INTEGER,
    slot INTEGER,
    FOREIGN KEY (tournament_id) REFERENCES tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, slot),
    PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS match (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    player1 INTEGER NOT NULL,
    player2 INTEGER NOT NULL,
    sessionId TEXT,
    score_player1 INTEGER NOT NULL DEFAULT 0,
    score_player2 INTEGER NOT NULL DEFAULT 0,
    winner_id INTEGER,
    round TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournament(id) ON DELETE CASCADE,
    FOREIGN KEY (player1) REFERENCES player(id) ON DELETE CASCADE,
    FOREIGN KEY (player2) REFERENCES player(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES player(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_tournament ON match(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_tid ON tournament_player(tournament_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_unique_round ON match(tournament_id, round);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_player_limit ON tournament_player(tournament_id, player_id);
  `);
  } catch (err: unknown) {
    throw new AppError(
      ERR_DEFS.SERVICE_GENERIC,
      { details: [{ field: 'Failed to initialize DB schema' }] },
      err,
    );
  }

  return db;
}
