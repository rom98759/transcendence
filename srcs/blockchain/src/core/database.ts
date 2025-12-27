import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data')
const DB_PATH = process.env.BLOCK_DB_PATH || path.join(DEFAULT_DIR, 'blockchain.db')

// Check dir
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
} catch (err) {
  const e: any = new Error(`Failed to ensure DB directory: ${(err as any)?.message || String(err)}`)
  throw e
}

export const db = new Database(DB_PATH)
console.log('Using SQLite file:', DB_PATH)

// Create table
try {
  db.exec(`
CREATE TABLE IF NOT EXISTS snapshot(
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE,
    date_confirmed TEXT,
    match_id INTEGER UNIQUE,
    player1_id INTEGER,
    player2_id INTEGER,
    player1_score INTEGER,
    player2_score INTEGER,
    winner_id INTEGER
    );
  `)
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  )
  throw e
}
