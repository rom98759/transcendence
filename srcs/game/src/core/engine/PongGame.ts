// ============================================================================
// PongGame — Pure game engine. No I/O, no WebSocket, no DB.
// Manages physics, collision, scoring, and game lifecycle.
// ============================================================================

import {
  GameSettings,
  GameState,
  GameStatus,
  Paddles,
  PaddleSide,
  PaddleDirection,
  Scores,
  DEFAULT_GAME_SETTINGS,
} from '../../types/game.types.js';
import { Vector2 } from './Vector2.js';
import { Ball } from './Ball.js';
import { CosmicNoise } from './CosmicNoise.js';

export class PongGame {
  readonly sessionId: string;
  readonly width: number = 800;
  readonly height: number = 600;

  settings: GameSettings;
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  status: GameStatus;
  time: number;
  serve: number;
  cosmicBackground: CosmicNoise | null;

  private gameLoopInterval: NodeJS.Timeout | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.time = 0;
    this.serve = 1;
    this.settings = { ...DEFAULT_GAME_SETTINGS };

    this.cosmicBackground = new CosmicNoise(this.width, this.height, this.settings.microWaveSize);

    this.ball = new Ball(
      new Vector2(this.width / 2, this.height / 2),
      new Vector2(this.settings.ballSpeed, 0),
      this.settings.ballRadius,
      this.settings.ballSpeed,
      this.settings.ballMass,
    );

    this.paddles = {
      left: { y: this.height / 2 - 50, height: 100, width: 10, speed: 8, moving: 'stop' },
      right: { y: this.height / 2 - 50, height: 100, width: 10, speed: 8, moving: 'stop' },
    };

    this.scores = { left: 0, right: 0 };
    this.status = 'waiting';
  }

  // ---- Settings ----

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  applySettings(newSettings: Partial<GameSettings>): void {
    if (newSettings.ballSpeed !== undefined) {
      const speed = parseInt(String(newSettings.ballSpeed));
      this.ball.speedLimit = speed;
      this.settings.ballSpeed = speed;
    }
    if (newSettings.ballRadius !== undefined) {
      const radius = parseFloat(String(newSettings.ballRadius));
      this.ball.radius = radius;
      this.settings.ballRadius = radius;
    }
    if (newSettings.ballMass !== undefined) {
      const mass = parseFloat(String(newSettings.ballMass));
      this.ball.mass = mass;
      this.settings.ballMass = mass;
    }
    if (newSettings.paddleSpeed !== undefined) {
      const speed = parseFloat(String(newSettings.paddleSpeed));
      this.paddles.right.speed = speed;
      this.paddles.left.speed = speed;
      this.settings.paddleSpeed = speed;
    }
    if (newSettings.microWaveSize !== undefined) {
      const size = parseInt(String(newSettings.microWaveSize));
      this.settings.microWaveSize = size;
      this.cosmicBackground = new CosmicNoise(this.width, this.height, size);
    }
    if (newSettings.maxScore !== undefined) {
      const maxScore = parseInt(String(newSettings.maxScore));
      if (maxScore >= 1 && maxScore <= 50) {
        this.settings.maxScore = maxScore;
      }
    }
  }

  // ---- Paddle control ----

  setPaddleDirection(paddle: PaddleSide, direction: PaddleDirection): void {
    if (this.paddles[paddle]) {
      this.paddles[paddle].moving = direction;
    }
  }

  // ---- Lifecycle ----

  /** Start preview mode: animate background + paddles only (no ball physics) */
  preview(): void {
    if (this.status !== 'waiting') return;
    this.clearLoop();
    this.gameLoopInterval = setInterval(() => {
      this.updateBackground();
      this.updatePaddles();
    }, 1000 / 60);
  }

  /** Start the game: full physics loop at 60 FPS */
  start(): void {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.clearLoop();
    this.gameLoopInterval = setInterval(() => {
      this.update();
    }, 1000 / 60);
  }

  /** Stop the game */
  stop(): void {
    this.clearLoop();
    this.status = 'finished';
  }

  /** True if game is in a terminal state */
  isFinished(): boolean {
    return this.status === 'finished';
  }

  // ---- Physics ----

  update(): void {
    // Cosmic noise force field
    if (this.cosmicBackground) {
      this.cosmicBackground.update(this.time);
      this.cosmicBackground.affectedFrom(this.ball.pos, this.ball.radius, 1.8);
      let force = this.cosmicBackground.getVectorAt(this.ball.pos.x, this.ball.pos.y, this.time);
      force = force.mult(this.serve);
      this.ball.apply(force);
    }

    this.ball.update();
    this.updatePaddles();
    this.handleCollisions();
    this.handleScoring();
    this.checkWinCondition();

    this.time += 0.01;
  }

  private updateBackground(): void {
    if (this.cosmicBackground) {
      this.cosmicBackground.update(this.time);
      this.cosmicBackground.affectedFrom(this.ball.pos, this.ball.radius, 1.8);
    }
    this.time += 0.01;
  }

  private updatePaddles(): void {
    for (const side of ['left', 'right'] as const) {
      const paddle = this.paddles[side];
      if (paddle.moving === 'up') {
        paddle.y -= paddle.speed;
      } else if (paddle.moving === 'down') {
        paddle.y += paddle.speed;
      }
      // Clamp within bounds
      paddle.y = Math.max(0, Math.min(this.height - paddle.height, paddle.y));
    }
  }

  private handleCollisions(): void {
    // Top/bottom wall bounce
    if (this.ball.pos.y - this.ball.radius <= 0) {
      this.ball.pos = this.ball.pos.withY(this.ball.radius);
      this.ball.vel = this.ball.vel.withY(-this.ball.vel.y);
    } else if (this.ball.pos.y + this.ball.radius >= this.height) {
      this.ball.pos = this.ball.pos.withY(this.height - this.ball.radius);
      this.ball.vel = this.ball.vel.withY(-this.ball.vel.y);
    }

    // Left paddle
    if (this.ball.pos.x - this.ball.radius <= 20 + this.paddles.left.width) {
      if (
        this.ball.pos.y >= this.paddles.left.y &&
        this.ball.pos.y <= this.paddles.left.y + this.paddles.left.height
      ) {
        this.ball.vel = this.ball.vel.withX(-this.ball.vel.x);
        this.ball.acc = this.ball.acc.add(new Vector2(5, 0));
        this.serve *= -1;
      }
    }
    // Right paddle
    else if (this.ball.pos.x + this.ball.radius >= this.width - 20 - this.paddles.right.width) {
      if (
        this.ball.pos.y >= this.paddles.right.y &&
        this.ball.pos.y <= this.paddles.right.y + this.paddles.right.height
      ) {
        this.ball.vel = this.ball.vel.withX(-this.ball.vel.x);
        this.ball.acc = this.ball.acc.add(new Vector2(-5, 0));
        this.serve *= -1;
      }
    }
  }

  private handleScoring(): void {
    if (this.ball.pos.x - this.ball.radius <= 20) {
      this.scores.right++;
      this.resetBall();
    } else if (this.ball.pos.x + this.ball.radius >= this.width - 20) {
      this.scores.left++;
      this.resetBall();
    }
  }

  private checkWinCondition(): void {
    if (this.scores.left >= this.settings.maxScore || this.scores.right >= this.settings.maxScore) {
      this.stop();
    }
  }

  resetBall(): void {
    this.ball.pos = new Vector2(this.width / 2, this.height / 2);
    const velX = this.settings.ballSpeed * this.serve;
    this.ball.vel = new Vector2(velX, (Math.random() - 0.5) * 10);
    this.ball.acc = Vector2.zero();
  }

  /**
   * Reset game state for RL/AI use: scores zeroed, status back to 'waiting', ball centered.
   * Encapsulates domain mutations so the controller layer cannot directly
   * write to internal properties.
   */
  reset(): void {
    this.scores.left = 0;
    this.scores.right = 0;
    this.status = 'waiting';
    this.resetBall();
  }

  // ---- Serialization ----

  getState(): GameState {
    return {
      ball: {
        x: this.ball.pos.x,
        y: this.ball.pos.y,
        radius: this.ball.radius,
        vx: this.ball.vel.x,
        vy: this.ball.vel.y,
      },
      paddles: {
        left: { y: this.paddles.left.y, height: this.paddles.left.height },
        right: { y: this.paddles.right.y, height: this.paddles.right.height },
      },
      scores: this.scores,
      status: this.status,
      cosmicBackground: this.cosmicBackground?.forceField ?? null,
    };
  }

  // ---- Internal ----

  private clearLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }
}
