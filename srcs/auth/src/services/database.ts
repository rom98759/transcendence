import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.AUTH_DB_PATH || path.join(DEFAULT_DIR, 'auth.db');

// Check dir
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (err) {
  // If we cannot create the directory, rethrow with clearer message
  const e: any = new Error(`Failed to ensure DB directory: ${((err as any)?.message) || String(err)}`);
  throw e;
}

// Open/create database
const db = new Database(DB_PATH);

// Create table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT
    );
  `);
} catch (err) {
  const e: any = new Error(`Failed to initialize DB schema: ${((err as any)?.message) || String(err)}`);
  throw e;
}

export interface DBUser {
  id?: number;
  username: string;
  email?: string | null;
  password: string;
}

// Prepare statements
const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdentifierStmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1');
const insertUserStmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');

export function findUserByUsername(username: string): DBUser | null {
  try {
    const user = findByUsernameStmt.get(username);
    return (user as DBUser) || null;
  } catch (err) {
    throw new Error(`DB error (findUserByUsername): ${((err as any)?.message) || String(err)}`);
  }
}

export function findUserByEmail(email: string): DBUser | null {
  try {
    const user = findByEmailStmt.get(email);
    return (user as DBUser) || null;
  } catch (err) {
    throw new Error(`DB error (findUserByEmail): ${((err as any)?.message) || String(err)}`);
  }
}

export function findUserByIdentifier(identifier: string): DBUser | null {
  try {
    const user = findByIdentifierStmt.get(identifier, identifier);
    return (user as DBUser) || null;
  } catch (err) {
    throw new Error(`DB error (findUserByIdentifier): ${((err as any)?.message) || String(err)}`);
  }
}

// Create user and return inserted id. Throws an Error with `.code` set when unique constraint fails.
export function createUser(user: { username: string; email?: string | null; password: string }) {
  try {
    const info = insertUserStmt.run(user.username, user.email || null, user.password);
    return Number(info.lastInsertRowid);
  } catch (err: any) {
    // better-sqlite3 throws SqliteError with `code` and `message` properties
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Try to detect which column caused the conflict
      const msg = (err.message || '').toLowerCase();
      const e: any = new Error('Unique constraint violated');
      if (msg.includes('username')) e.code = 'USER_EXISTS';
      else if (msg.includes('email')) e.code = 'EMAIL_EXISTS';
      else e.code = 'UNIQUE_VIOLATION';
      throw e;
    }
    throw new Error(`DB error (createUser): ${err?.message || err}`);
  }
}

export function closeDatabase() {
  try {
    db.close();
  } catch (err) {
    // Non-fatal; log or rethrow depending on your needs
    throw new Error(`Failed to close DB: ${((err as any)?.message) || String(err)}`);
  }
}

export function getDatabasePath() {
  return DB_PATH;
}
