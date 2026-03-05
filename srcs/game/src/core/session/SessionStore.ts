// ============================================================================
// SessionStore — Encapsulated session map, injectable and mockable
// Replaces the global `gameSessions` Map from game.state.ts
// ============================================================================

import { Session } from './Session.js';
import { SESSION_TTL_MS, PLAYING_TTL_MS } from '../../types/game.types.js';

export class SessionStore {
  private sessions = new Map<string, Session>();

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  set(id: string, session: Session): void {
    this.sessions.set(id, session);
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  get size(): number {
    return this.sessions.size;
  }

  values(): IterableIterator<Session> {
    return this.sessions.values();
  }

  entries(): IterableIterator<[string, Session]> {
    return this.sessions.entries();
  }

  /** Destroy and remove all sessions */
  clear(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }
    this.sessions.clear();
  }

  /** Garbage-collect orphan sessions: 'waiting' past 5 min TTL or 'playing' past 30 min TTL */
  cleanupExpired(logger?: {
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
  }): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.createdAt;
      const isExpiredWaiting = session.game.status === 'waiting' && age > SESSION_TTL_MS;
      const isExpiredPlaying = session.game.status === 'playing' && age > PLAYING_TTL_MS;
      if (isExpiredWaiting || isExpiredPlaying) {
        logger?.warn({
          event: 'session_ttl_expired',
          sessionId: id,
          status: session.game.status,
          age,
        });
        session.destroy();
        this.sessions.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  /** List sessions filtered by game mode (for the sessions list endpoint) */
  listByMode(mode: string): Session[] {
    const result: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.gameMode === mode) result.push(session);
    }
    return result;
  }
}
