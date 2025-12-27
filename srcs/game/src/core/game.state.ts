import type { PongGame } from './game.engine.ts' // Game state storage

// export const gameSessions = new Map<string, PongGame>();
// export const playerConnections = new Map<string, Set<WebSocket>>();
export const gameSessions = new Map<
  string,
  {
    id: string
    game: PongGame
    interval: NodeJS.Timeout | null
    players: Set<any> // sockets
  }
>()
