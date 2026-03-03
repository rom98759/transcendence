import type { PongGame } from './game.engine.ts'; // Game state storage

/** Max time a session can stay in 'waiting' before being garbage-collected */
export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface SessionData {
  id: string;
  game: PongGame;
  interval: NodeJS.Timeout | null;
  players: Map<any, 'A' | 'B'>; // WebSocket → role
  /** Maps role ('A' = left, 'B' = right) to actual DB userId */
  playerUserIds: { A: number | null; B: number | null };
  gameMode: string;
  tournamentId: number | null;
  createdAt: number;
  /** Guards against double-persist on game finish */
  persisted: boolean;
}

export const gameSessions = new Map<string, SessionData>();

export const WS_CLOSE = {
  GAME_OVER: 4001,
  PLAYER_QUIT: 4002,
  SESSION_FULL: 4003,
};
