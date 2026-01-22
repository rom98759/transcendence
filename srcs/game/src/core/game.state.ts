import type { PongGame } from './game.engine.ts'; // Game state storage

// export const gameSessions = new Map<string, PongGame>();
// export const playerConnections = new Map<string, Set<WebSocket>>();
export const gameSessions = new Map<
  string,
  {
    id: string;
    game: PongGame;
    interval: NodeJS.Timeout | null;
    players: Map<any, 'A' | 'B'>; // sockets
  }
>();

export const WS_CLOSE = {
  GAME_OVER: 4001,
  PLAYER_QUIT: 4002,
  SESSION_FULL: 4003,
};
