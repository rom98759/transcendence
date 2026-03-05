// ============================================================================
// GAME TYPES — Single source of truth for all game-related types
// ============================================================================

import { WebSocket } from 'ws';

// ---- Game Settings ----

export interface GameSettings {
  ballRadius: number;
  ballSpeed: number;
  ballMass: number;
  paddleSpeed: number;
  microWaveSize: number;
  maxScore: number;
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  ballRadius: 5,
  ballSpeed: 5,
  ballMass: 1,
  paddleSpeed: 8,
  microWaveSize: 10,
  maxScore: 5,
};

// ---- Paddle / Scores / Status ----

export type PaddleDirection = 'up' | 'down' | 'stop';
export type PaddleSide = 'left' | 'right';

export interface Paddle {
  y: number;
  height: number;
  width: number;
  speed: number;
  moving: PaddleDirection;
}

export interface Paddles {
  left: Paddle;
  right: Paddle;
}

export interface Scores {
  left: number;
  right: number;
}

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

// ---- Game State (serializable snapshot) ----

export interface GameState {
  ball: {
    x: number;
    y: number;
    radius: number;
    vx?: number;
    vy?: number;
  };
  paddles: {
    left: { y: number; height: number };
    right: { y: number; height: number };
  };
  scores: Scores;
  status: GameStatus;
  cosmicBackground: number[][] | null;
}

// ---- WebSocket Protocol ----

export interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping';
  paddle?: PaddleSide;
  direction?: PaddleDirection;
}

export interface GameOverData {
  scores: Scores;
  winner: 'left' | 'right';
  winnerUserId: number | null;
  status: GameStatus;
}

export interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  gameOverData?: GameOverData;
  message?: string;
}

// ---- Game Mode ----

export type GameMode = 'local' | 'remote' | 'tournament' | 'ai';

// ---- Player ----

export type PlayerType = 'human' | 'guest' | 'ai';
export type PlayerRole = 'A' | 'B';

export interface Player {
  role: PlayerRole;
  type: PlayerType;
  userId: number | null;
  ws: WebSocket | null;
}

// ---- Session ----

export interface SessionConfig {
  id: string;
  gameMode: GameMode;
  tournamentId: number | null;
  creatorUserId: number | null;
}

// ---- Match DTO (single definition — replaces data.d.ts and game.dto.ts) ----

export interface MatchDTO {
  id: number;
  tournament_id: number | null;
  player1: number;
  player2: number;
  sessionId: string | null;
  score_player1: number;
  score_player2: number;
  winner_id: number | null;
  round: string | null;
  created_at: number;
}

// ---- DB helper types (moved from data.d.ts) ----

export type CountResult = { count: number };

export type MatchRoundResult = {
  player1: number;
  player2: number;
  winner_id: number | null;
};

export type TournamentParams = { id: string };

// ---- WS Close Codes ----

export const WS_CLOSE = {
  GAME_OVER: 4001,
  PLAYER_QUIT: 4002,
  SESSION_FULL: 4003,
} as const;

// ---- Session TTL ----

export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes (waiting sessions)
export const PLAYING_TTL_MS = 30 * 60 * 1000; // 30 minutes (stuck playing sessions)

// ---- Guest User ----

export const GUEST_USER_ID = 2;
export const AI_USER_ID = 3;
