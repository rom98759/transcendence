// ============================================================================
// UserRepository — CRUD for the local player replica (synced via Redis Streams)
// ============================================================================

import Database from 'better-sqlite3';
import { UserEvent, AppError, ERR_DEFS } from '@transcendence/core';
import { GUEST_USER_ID } from '../types/game.types.js';

/** Shape of a player row as stored in the local SQLite replica. */
export interface PlayerRecord {
  id: number;
  username: string;
  avatar: string | null;
  updated_at: number;
}

export class UserRepository {
  private upsertUserStmt;
  private deleteUserStmt;
  private getUserStmt;
  private getPlayerStatsStmt;
  private ensureGuestPlayerStmt;

  constructor(db: Database.Database) {
    this.upsertUserStmt = db.prepare(`
      INSERT INTO player (id, username, avatar, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        username = excluded.username,
        avatar = excluded.avatar,
        updated_at = excluded.updated_at
    `);
    this.deleteUserStmt = db.prepare(`DELETE FROM player WHERE id = ?`);
    this.getUserStmt = db.prepare(`SELECT * FROM player WHERE id = ?`);
    this.getPlayerStatsStmt = db.prepare(`SELECT * FROM match WHERE player1 = ? OR player2 = ?`);
    this.ensureGuestPlayerStmt = db.prepare(`
      INSERT OR IGNORE INTO player (id, username, avatar, updated_at)
      VALUES (?, 'Guest', NULL, ?)
    `);
  }

  upsertUser(user: UserEvent): void {
    try {
      this.upsertUserStmt.run(user.id, user.username, user.avatar, user.timestamp);
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_UPDATE_ERROR,
        { details: [{ field: `upsertUser ${user.id}` }] },
        err,
      );
    }
  }

  deleteUser(id: number): void {
    try {
      this.deleteUserStmt.run(id);
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_DELETE_ERROR,
        { details: [{ field: `deleteUser ${id}` }] },
        err,
      );
    }
  }

  getUser(id: number): PlayerRecord {
    try {
      const result = this.getUserStmt.get(id) as PlayerRecord | undefined;
      if (!result) {
        throw new AppError(ERR_DEFS.USER_NOTFOUND_ERRORS, { userId: id });
      }
      return result;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError(ERR_DEFS.DB_SELECT_ERROR, { details: [{ field: `getUser ${id}` }] }, err);
    }
  }

  getPlayerStats(playerId: number): any[] {
    try {
      return this.getPlayerStatsStmt.all(playerId, playerId) as any[];
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_SELECT_ERROR,
        { details: [{ field: `getPlayerStats ${playerId}` }] },
        err,
      );
    }
  }

  ensureGuestPlayer(): void {
    try {
      this.ensureGuestPlayerStmt.run(GUEST_USER_ID, Date.now());
    } catch (err: unknown) {
      throw new AppError(
        ERR_DEFS.DB_INSERT_ERROR,
        { details: [{ field: 'ensureGuestPlayer' }] },
        err,
      );
    }
  }
}
