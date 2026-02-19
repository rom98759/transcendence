// Message types
export interface GameSettings {
  ballRadius: number;
  ballSpeed: number;
  ballMass: number;
  paddleSpeed: number;
  microWaveSize: number;
}

export interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping';
  paddle?: 'left' | 'right';
  direction?: 'up' | 'down' | 'stop';
}

export interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  message?: string;
}

export interface Paddle {
  y: number;
  height: number;
  width: number;
  speed: number;
  moving: 'up' | 'down' | 'stop';
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

export interface GameState {
  ball: {
    x: number;
    y: number;
    radius: number;
    vx?: number;
    vy?: number;
  };
  paddles: {
    left: {
      y: number;
      height: number;
    };
    right: {
      y: number;
      height: number;
    };
  };
  scores: Scores;
  status: GameStatus;
  cosmicBackground: number[][] | null;
}
