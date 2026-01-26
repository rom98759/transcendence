// Game state interface matching server updates
export interface Vector2D {
  x: number;
  y: number;
}

export interface Scores {
  left: number;
  right: number;
}
export interface GameState {
  ball: { x: number; y: number; radius: number };
  paddles: {
    left: { y: number; height: number };
    right: { y: number; height: number };
  };
  scores: { left: number; right: number };
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  cosmicBackground: number[][] | null;
}

// WebSocket message types
export interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  message?: string;
}

export interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping';
  paddle?: 'left' | 'right';
  direction?: 'up' | 'down' | 'stop';
}
