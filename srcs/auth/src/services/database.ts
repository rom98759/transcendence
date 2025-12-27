import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { DataError } from '../types/errors.js'
import { DATA_ERROR } from '../utils/constants.js'
import { DBUser } from '../types/models.js'
import crypto from 'crypto'
import { AUTH_CONFIG } from '../utils/constants.js'

// DB path
const DEFAULT_DIR = path.join(process.cwd(), 'data')
const DB_PATH = process.env.AUTH_DB_PATH || path.join(DEFAULT_DIR, 'auth.db')

// Check dir
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
} catch (err:any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `Failed to ensure DB directory`, err);
}

// Open/create database
const db = new Database(DB_PATH)

// Create table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      is_2fa_enabled INTEGER DEFAULT 0,
      totp_secret TEXT
    );
  `)
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  )
  throw e
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
		`)
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  )
  throw e
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_token_attempts (
      token TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      FOREIGN KEY(token) REFERENCES login_tokens(token) ON DELETE CASCADE
    );
		`)
} catch (err) {
  const e: any = new Error(
    `Failed to initialize DB schema: ${(err as any)?.message || String(err)}`,
  )
  throw e
}

// Table pour stocker temporairement les secrets TOTP pendant le setup
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS totp_setup_secrets (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      secret TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
		`)
} catch (err) {
  const e: any = new Error(
    `Failed to initialize TOTP setup secrets table: ${(err as any)?.message || String(err)}`,
  )
  throw e
}

// Prepare statements
const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?')
const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?')
const findByIdentifierStmt = db.prepare(
  'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
)
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?')
const insertUserStmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?')

// 2FA statements
const is2FAEnabledStmt = db.prepare('SELECT is_2fa_enabled FROM users WHERE id = ?')
const getTotpSecretStmt = db.prepare('SELECT totp_secret FROM users WHERE id = ?')
const enable2FAStmt = db.prepare(
  'UPDATE users SET is_2fa_enabled = 1, totp_secret = ? WHERE id = ?',
)
const disable2FAStmt = db.prepare(
  'UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL WHERE id = ?',
)

// Login token statements
const insertLoginTokenStmt = db.prepare(
  'INSERT INTO login_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
)
const findLoginTokenStmt = db.prepare(
  'SELECT user_id, expires_at FROM login_tokens WHERE token = ?',
)
const deleteLoginTokenStmt = db.prepare('DELETE FROM login_tokens WHERE token = ?')
const cleanExpiredTokensStmt = db.prepare(
  "DELETE FROM login_tokens WHERE expires_at < datetime('now')",
)

// Login token attempts statements
const insertLoginTokenAttemptStmt = db.prepare(
  'INSERT OR IGNORE INTO login_token_attempts (token, attempts) VALUES (?, 0)',
)
const getLoginTokenAttemptsStmt = db.prepare(
  'SELECT attempts FROM login_token_attempts WHERE token = ?',
)
const incrementLoginTokenAttemptsStmt = db.prepare(
  'UPDATE login_token_attempts SET attempts = attempts + 1 WHERE token = ?',
)
const deleteLoginTokenAttemptStmt = db.prepare('DELETE FROM login_token_attempts WHERE token = ?')

// Role management statements
const getUserRoleStmt = db.prepare('SELECT role FROM users WHERE id = ?')
const updateUserRoleStmt = db.prepare('UPDATE users SET role = ? WHERE id = ?')

// TOTP setup secrets statements
const insertTotpSetupSecretStmt = db.prepare(
  'INSERT INTO totp_setup_secrets (token, user_id, secret, expires_at) VALUES (?, ?, ?, ?)',
)
const getTotpSetupSecretStmt = db.prepare(
  'SELECT secret, user_id, expires_at FROM totp_setup_secrets WHERE token = ?',
)
const deleteTotpSetupSecretStmt = db.prepare('DELETE FROM totp_setup_secrets WHERE token = ?')
const cleanExpiredTotpSecretsStmt = db.prepare(
  "DELETE FROM totp_setup_secrets WHERE expires_at < datetime('now')",
)

export function findUserByUsername(username: string): DBUser | null {
  try {
    const user = findByUsernameStmt.get(username)
    return (user as DBUser) || null
  } catch (err: any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
  }
}

export function findUserByEmail(email: string): DBUser | null {
  try {
    const user = findByEmailStmt.get(email)
    return (user as DBUser) || null
  } catch (err: any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
  }
}

export function findUserByIdentifier(identifier: string): DBUser | null {
  try {
    const user = findByIdentifierStmt.get(identifier, identifier)
    return (user as DBUser) || null
  } catch (err: any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
  }
}

export function findUserById(id: number): DBUser | null {
  try {
    const user = findByIdStmt.get(id)
    return (user as DBUser) || null
  } catch (err) {
    const error: any = new Error(
      `Error during user lookup by ID: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_FIND_USER_BY_ID_ERROR'
    throw error
  }
}

// Create user + return inserted id
export function createUser(user: { username: string; email?: string | null; password: string }) {
  try {
    const info = insertUserStmt.run(user.username, user.email || null, user.password)
    if (info.changes === 0) {
      throw new DataError(DATA_ERROR.INTERNAL_ERROR, 'No rows changed');
    }
    if (!info.lastInsertRowid) {
      throw new DataError(DATA_ERROR.INTERNAL_ERROR, 'No ID returned');
    }
    return Number(info.lastInsertRowid);
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('username')) {
        throw new DataError(DATA_ERROR.DUPLICATE, 'Username taken', err, { field: 'username', value: user.username });
      } else if (msg.includes('email')) {
        throw new DataError(DATA_ERROR.DUPLICATE, 'Email taken', err, { field: 'email', value: user.email });
      } else {
        throw new DataError(DATA_ERROR.DUPLICATE, 'Unique constraint violated', err);
      }
    }
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
  }
}

export function deleteUser(userId:number): void {
    try {
        const info = deleteUserStmt.run(userId);
        if (info.changes === 0)
            throw new DataError(DATA_ERROR.NOT_FOUND, 'User not found for deletion');
    } catch (err: any) {
        if (err instanceof DataError) throw err;
        throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
    }
}

export function closeDatabase() {
  try {
    db.close()
  } catch (err: any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `Unable to close DB ${err.message}`, err);
  }
}

export function getDatabasePath() {
  return DB_PATH
}

/**
 * @todo dev only - delete before prod
 */
export function listUsers(): DBUser[] {
  try {
    const stmt = db.prepare('SELECT * FROM users')
    const users = stmt.all() as DBUser[]
    return users
  } catch (err: any) {
    throw new DataError(DATA_ERROR.INTERNAL_ERROR, `DB Error ${err.message}`, err);
  }
}

// ============================================
// 2FA Functions
// ============================================

/**
 * Vérifie si la 2FA est activée pour un utilisateur
 */
export function is2FAEnabled(userId: number): boolean {
  try {
    const result = is2FAEnabledStmt.get(userId) as { is_2fa_enabled: number } | undefined
    return result ? result.is_2fa_enabled === 1 : false
  } catch (err) {
    const error: any = new Error(
      `Error checking 2FA status: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_CHECK_2FA_ERROR'
    throw error
  }
}

/**
 * Récupère le secret TOTP d'un utilisateur
 */
export function getTotpSecret(userId: number): string | null {
  try {
    const result = getTotpSecretStmt.get(userId) as { totp_secret: string | null } | undefined
    return result?.totp_secret || null
  } catch (err) {
    const error: any = new Error(
      `Error retrieving TOTP secret: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_GET_TOTP_SECRET_ERROR'
    throw error
  }
}

/**
 * Active la 2FA et sauvegarde le secret TOTP
 */
export function enable2FA(userId: number, secret: string): void {
  try {
    enable2FAStmt.run(secret, userId)
  } catch (err) {
    const error: any = new Error(`Error enabling 2FA: ${(err as any)?.message || String(err)}`)
    error.code = 'DB_ENABLE_2FA_ERROR'
    throw error
  }
}

/**
 * Désactive la 2FA pour un utilisateur
 */
export function disable2FA(userId: number): void {
  try {
    disable2FAStmt.run(userId)
  } catch (err) {
    const error: any = new Error(`Error disabling 2FA: ${(err as any)?.message || String(err)}`)
    error.code = 'DB_DISABLE_2FA_ERROR'
    throw error
  }
}

// ============================================
// Login Token Functions
// ============================================

/**
 * Crée un token de connexion temporaire
 * @param userId ID de l'utilisateur
 * @param expiresInSeconds Durée de validité en secondes
 * @returns Le token généré
 */
export function createLoginToken(userId: number, expiresInSeconds: number = 120): string {
  try {
    // Générer un token aléatoire sécurisé
    const token = crypto.randomBytes(32).toString('hex')

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    insertLoginTokenStmt.run(token, userId, expiresAt)
    return token
  } catch (err) {
    const error: any = new Error(
      `Error creating login token: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_CREATE_LOGIN_TOKEN_ERROR'
    throw error
  }
}

/**
 * Valide un token de connexion et retourne l'ID utilisateur avec le nombre de tentatives
 * @param token Token à valider
 * @returns L'ID utilisateur et le nombre de tentatives si valide, null sinon
 */
export function validateLoginToken(token: string): { userId: number; attempts: number } | null {
  try {
    const result = findLoginTokenStmt.get(token) as
      | { user_id: number; expires_at: string }
      | undefined

    if (!result) {
      return null
    }

    // Vérifier si le token n'est pas expiré
    const expiresAt = new Date(result.expires_at)
    if (expiresAt < new Date()) {
      // Token expiré, le supprimer
      deleteLoginTokenStmt.run(token)
      return null
    }

    // Récupérer le nombre de tentatives
    const attemptsResult = getLoginTokenAttemptsStmt.get(token) as { attempts: number } | undefined
    const attempts = attemptsResult?.attempts || 0

    // Vérifier si le nombre maximal de tentatives est atteint
    if (attempts >= AUTH_CONFIG.MAX_LOGIN_TOKEN_ATTEMPTS) {
      // Trop de tentatives, supprimer le token
      deleteLoginTokenStmt.run(token)
      return null
    }

    // Token valide, retourner l'ID et le nombre de tentatives
    return { userId: result.user_id, attempts }
  } catch (err) {
    const error: any = new Error(
      `Error validating login token: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_VALIDATE_LOGIN_TOKEN_ERROR'
    throw error
  }
}

/**
 * Supprime un login token après utilisation réussie
 */
export function deleteLoginToken(token: string): void {
  try {
    deleteLoginTokenStmt.run(token)
  } catch (err) {
    const error: any = new Error(
      `Error deleting login token: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_DELETE_LOGIN_TOKEN_ERROR'
    throw error
  }
}

/**
 * Incrémente le nombre de tentatives pour un login token
 * @param token Token pour lequel incrémenter les tentatives
 */
export function incrementLoginTokenAttempts(token: string): void {
  try {
    // Créer l'entrée si elle n'existe pas
    insertLoginTokenAttemptStmt.run(token)
    // Incrémenter
    incrementLoginTokenAttemptsStmt.run(token)
  } catch (err) {
    const error: any = new Error(
      `Error incrementing login token attempts: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_INCREMENT_LOGIN_TOKEN_ATTEMPTS_ERROR'
    throw error
  }
}

/**
 * Récupère le nombre de tentatives pour un login token
 * @param token Token pour lequel récupérer les tentatives
 * @returns Le nombre de tentatives
 */
export function getLoginTokenAttempts(token: string): number {
  try {
    const result = getLoginTokenAttemptsStmt.get(token) as { attempts: number } | undefined
    return result?.attempts || 0
  } catch (err) {
    const error: any = new Error(
      `Error getting login token attempts: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_GET_LOGIN_TOKEN_ATTEMPTS_ERROR'
    throw error
  }
}

/**
 * Nettoie les tokens expirés (maintenance)
 */
export function cleanExpiredTokens(): void {
  try {
    const result = cleanExpiredTokensStmt.run()
    if (result.changes > 0) {
      console.log(`Cleaned ${result.changes} expired login tokens`)
    }
  } catch (err) {
    const error: any = new Error(
      `Error cleaning expired tokens: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_CLEAN_EXPIRED_TOKENS_ERROR'
    throw error
  }
}

// ============================================
// Role Management Functions
// ============================================

/**
 * Récupère le rôle d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Le rôle de l'utilisateur
 */
export function getUserRole(userId: number): string {
  try {
    const result = getUserRoleStmt.get(userId) as { role: string } | undefined
    return result?.role || 'user'
  } catch (err) {
    const error: any = new Error(`Error getting user role: ${(err as any)?.message || String(err)}`)
    error.code = 'DB_GET_USER_ROLE_ERROR'
    throw error
  }
}

/**
 * Met à jour le rôle d'un utilisateur
 * @param userId ID de l'utilisateur
 * @param role Nouveau rôle
 */
export function updateUserRole(userId: number, role: string): void {
  try {
    updateUserRoleStmt.run(role, userId)
  } catch (err) {
    const error: any = new Error(
      `Error updating user role: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_UPDATE_USER_ROLE_ERROR'
    throw error
  }
}

// ============================================
// TOTP Setup Secrets Functions
// ============================================

/**
 * Stocke temporairement un secret TOTP pendant le setup
 * @param token Token associé au setup
 * @param userId ID de l'utilisateur
 * @param secret Secret TOTP à stocker
 * @param expiresInSeconds Durée de validité en secondes (défaut: 120)
 */
export function storeTotpSetupSecret(
  token: string,
  userId: number,
  secret: string,
  expiresInSeconds: number = AUTH_CONFIG.TOTP_SETUP_EXPIRATION_SECONDS,
): void {
  try {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    insertTotpSetupSecretStmt.run(token, userId, secret, expiresAt)
  } catch (err) {
    const error: any = new Error(
      `Error storing TOTP setup secret: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_STORE_TOTP_SETUP_SECRET_ERROR'
    throw error
  }
}

/**
 * Récupère un secret TOTP temporaire
 * @param token Token associé au setup
 * @returns Le secret et l'ID utilisateur si valide, null sinon
 */
export function getTotpSetupSecret(token: string): { secret: string; userId: number } | null {
  try {
    const result = getTotpSetupSecretStmt.get(token) as
      | { secret: string; user_id: number; expires_at: string }
      | undefined

    if (!result) {
      return null
    }

    // Vérifier si le secret n'est pas expiré
    const expiresAt = new Date(result.expires_at)
    if (expiresAt < new Date()) {
      // Secret expiré, le supprimer
      deleteTotpSetupSecretStmt.run(token)
      return null
    }

    return { secret: result.secret, userId: result.user_id }
  } catch (err) {
    const error: any = new Error(
      `Error getting TOTP setup secret: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_GET_TOTP_SETUP_SECRET_ERROR'
    throw error
  }
}

/**
 * Supprime un secret TOTP temporaire
 * @param token Token associé au setup
 */
export function deleteTotpSetupSecret(token: string): void {
  try {
    deleteTotpSetupSecretStmt.run(token)
  } catch (err) {
    const error: any = new Error(
      `Error deleting TOTP setup secret: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_DELETE_TOTP_SETUP_SECRET_ERROR'
    throw error
  }
}

/**
 * Nettoie les secrets TOTP expirés (maintenance)
 */
export function cleanExpiredTotpSecrets(): void {
  try {
    const result = cleanExpiredTotpSecretsStmt.run()
    if (result.changes > 0) {
      console.log(`Cleaned ${result.changes} expired TOTP setup secrets`)
    }
  } catch (err) {
    const error: any = new Error(
      `Error cleaning expired TOTP secrets: ${(err as any)?.message || String(err)}`,
    )
    error.code = 'DB_CLEAN_EXPIRED_TOTP_SECRETS_ERROR'
    throw error
  }
}
