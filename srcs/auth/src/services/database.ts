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
      password TEXT,
      twofa_enabled INTEGER DEFAULT 0,
      twofa_code TEXT,
      twofa_code_expires INTEGER
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
  twofa_enabled?: number;
  twofa_code?: string | null;
  twofa_code_expires?: number | null;
}

// Prepare statements
const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdentifierStmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1');
const insertUserStmt = db.prepare('INSERT INTO users (username, email, password, twofa_enabled) VALUES (?, ?, ?, 0)');
const update2FACodeStmt = db.prepare('UPDATE users SET twofa_code = ?, twofa_code_expires = ? WHERE id = ?');
const clear2FACodeStmt = db.prepare('UPDATE users SET twofa_code = NULL, twofa_code_expires = NULL WHERE id = ?');
const toggle2FAStmt = db.prepare('UPDATE users SET twofa_enabled = ? WHERE id = ?');

export function findUserByUsername(username: string): DBUser | null {
  try {
    const user = findByUsernameStmt.get(username);
    return (user as DBUser) || null;
  } catch (err) {
    const error: any = new Error(`Error during user lookup by username: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_FIND_USER_BY_USERNAME_ERROR';
    throw error;
  }
}

export function findUserByEmail(email: string): DBUser | null {
  try {
    const user = findByEmailStmt.get(email);
    return (user as DBUser) || null;
  } catch (err) {
    const error: any = new Error(`Error during user lookup by email: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_FIND_USER_BY_EMAIL_ERROR';
    throw error;
  }
}

export function findUserByIdentifier(identifier: string): DBUser | null {
  try {
    const user = findByIdentifierStmt.get(identifier, identifier);
    return (user as DBUser) || null;
  } catch (err) {
    const error: any = new Error(`Error during user lookup by identifier: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_FIND_USER_BY_IDENTIFIER_ERROR';
    throw error;
  }
}

// Create user + return inserted id
export function createUser(user: { username: string; email?: string | null; password: string }) {
  try {
    const info = insertUserStmt.run(user.username, user.email || null, user.password);
    return Number(info.lastInsertRowid);
  } catch (err: any) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('username')) {
        const error: any = new Error(`Username '${user.username}' is already taken`);
        error.code = 'USER_EXISTS';
        throw error;
      } else if (msg.includes('email')) {
        const error: any = new Error(`Email address '${user.email}' is already in use`);
        error.code = 'EMAIL_EXISTS';
        throw error;
      } else {
        const error: any = new Error('Uniqueness constraint violated in database');
        error.code = 'UNIQUE_VIOLATION';
        throw error;
      }
    }
    const error: any = new Error(`Error during user creation: ${err?.message || err}`);
    error.code = 'DB_CREATE_USER_ERROR';
    throw error;
  }
}

export function closeDatabase() {
  try {
    db.close();
  } catch (err) {
    const error: any = new Error(`Unable to close database: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_CLOSE_ERROR';
    throw error;
  }
}

export function getDatabasePath() {
  return DB_PATH;
}

// Update 2FA code
export function update2FACode(userId: number, code: string, expiresAt: number) {
  try {
    update2FACodeStmt.run(code, expiresAt, userId);
  } catch (err) {
    const error: any = new Error(`Error updating 2FA code: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_UPDATE_2FA_CODE_ERROR';
    throw error;
  }
}

// Clear 2FA code
export function clear2FACode(userId: number) {
  try {
    clear2FACodeStmt.run(userId);
  } catch (err) {
    const error: any = new Error(`Error clearing 2FA code: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_CLEAR_2FA_CODE_ERROR';
    throw error;
  }
}

// Toggle 2FA enabled/disabled
export function toggle2FA(userId: number, enabled: boolean) {
  try {
    toggle2FAStmt.run(enabled ? 1 : 0, userId);
  } catch (err) {
    const error: any = new Error(`Error toggling 2FA: ${((err as any)?.message) || String(err)}`);
    error.code = 'DB_TOGGLE_2FA_ERROR';
    throw error;
  }
}

// DEV ONLY - À supprimer en production
export function listUsers(): DBUser[] {
  try {
	const stmt = db.prepare('SELECT * FROM users');
	const users = stmt.all() as DBUser[];
	return users;
  } catch (err) {
	const error: any = new Error(`Error during listing users: ${((err as any)?.message) || String(err)}`);
	error.code = 'DB_LIST_USERS_ERROR';
	throw error;
  }
}