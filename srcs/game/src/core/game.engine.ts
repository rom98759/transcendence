import { GameSettings, GameState, Scores, GameStatus, Paddles } from './game.types.js';
import { Vector2 } from './game.vector.js';
// import { getForceAt2D, getNoiseField} from "./game.perlin.js";
import { CosmicMicroWaveNoise } from './game.noise.js';

class Ball {
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  radius: number;
  speedLimit: number;
  mass: number;

  constructor(pos: Vector2, vel: Vector2, radius: number, maxSpeed: number = 3, mass: number = 10) {
    this.pos = pos;
    this.vel = vel;
    this.acc = new Vector2(0, 0);
    this.radius = radius;
    this.speedLimit = maxSpeed;
    this.mass = mass;
  }

  apply(force: Vector2) {
    // Newton’s second law: F = m * a  →  a = F / m
    // So we add (force / mass) to the acceleration
    const f = force.divVec(this.mass);
    this.acc.add(f);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.speedLimit);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
}

export class PongGame {
  settings: GameSettings = {
    ballRadius: 5,
    ballSpeed: 5,
    ballMass: 1,
    paddleSpeed: 8,
    microWaveSize: 10,
  };
  sessionId: string;
  width: number;
  height: number;
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  status: GameStatus;
  gameLoopInterval: NodeJS.Timeout | null;
  time: number;
  serve: number;
  cosmicBackground: CosmicMicroWaveNoise | null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.width = 800;
    this.height = 600;
    this.time = 0;
    this.serve = 1;
    this.cosmicBackground = new CosmicMicroWaveNoise(this.width, this.height, 10);
    // this.cosmicBackground = null;
    this.ball = new Ball(
      new Vector2(this.width / 2, this.height / 2), // position
      new Vector2(5, 0), // velocity (direction + vitesse)
      this.settings.ballRadius, // size of the ball
      this.settings.ballSpeed, // speed limit
      this.settings.ballMass, // mass -> more the mass is, less it is affected by other forces
    );

    // Paddle state
    this.paddles = {
      left: {
        y: this.height / 2 - 50,
        height: 100,
        width: 10,
        speed: 8,
        moving: 'stop',
      },
      right: {
        y: this.height / 2 - 50,
        height: 100,
        width: 10,
        speed: 8,
        moving: 'stop',
      },
    };

    // Game state
    this.scores = { left: 0, right: 0 };
    this.status = 'waiting';
    this.gameLoopInterval = null;
  }

  getSettings() {
    return { ...this.settings };
  }

  applySettings(newSettings: Partial<GameSettings>): void {
    // Validate and apply each setting
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
      this.cosmicBackground = new CosmicMicroWaveNoise(this.width, this.height, size);
    }
    // Log settings change
    console.log(`[${this.sessionId}] Settings updated:`, this.settings);
  }

  setPaddleDirection(paddle: 'left' | 'right', direction: 'up' | 'down' | 'stop'): void {
    if (this.paddles[paddle]) {
      this.paddles[paddle].moving = direction;
      console.log(`[${this.sessionId}] ${paddle} paddle moving ${direction}`);
    }
  }

  preview(): void {
    if (this.status !== 'waiting') return;

    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    this.gameLoopInterval = setInterval(() => {
      this.updateBackground();
    }, 1000 / 60);
  }

  start(): void {
    if (this.status === 'playing') return;

    this.status = 'playing';
    console.log(`[${this.sessionId}] Game started`);

    // Run game loop at 60 FPS
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    this.gameLoopInterval = setInterval(() => {
      this.update();
    }, 1000 / 60);
  }

  stop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.status = 'finished';
    console.log(`[${this.sessionId}] Game Over`);
  }

  paddleMove() {
    // Move paddles based on player input
    if (this.paddles.left.moving === 'up') {
      this.paddles.left.y -= this.paddles.left.speed;
    } else if (this.paddles.left.moving === 'down') {
      this.paddles.left.y += this.paddles.left.speed;
    }

    if (this.paddles.right.moving === 'up') {
      this.paddles.right.y -= this.paddles.right.speed;
    } else if (this.paddles.right.moving === 'down') {
      this.paddles.right.y += this.paddles.right.speed;
    }

    // Keep paddles within bounds
    this.paddles.left.y = Math.max(
      0,
      Math.min(this.height - this.paddles.left.height, this.paddles.left.y),
    );
    this.paddles.right.y = Math.max(
      0,
      Math.min(this.height - this.paddles.right.height, this.paddles.right.y),
    );
  }

  racketShot() {
    // Ball collision with left paddle
    if (this.ball.pos.x - this.ball.radius <= 20 + this.paddles.left.width) {
      if (
        this.ball.pos.y >= this.paddles.left.y &&
        this.ball.pos.y <= this.paddles.left.y + this.paddles.left.height
      ) {
        this.ball.vel.x = -this.ball.vel.x;
        this.ball.acc.add(new Vector2(5, 0));
        this.serve *= -1;
      }
    } else if (this.ball.pos.x + this.ball.radius >= this.width - 20 - this.paddles.right.width) {
      if (
        this.ball.pos.y >= this.paddles.right.y &&
        this.ball.pos.y <= this.paddles.right.y + this.paddles.right.height
      ) {
        this.ball.vel.x = -this.ball.vel.x;
        this.ball.acc.add(new Vector2(-5, 0));
        this.serve *= -1;
      }
    }
  }

  collision() {
    // Ball collision with top/bottom walls
    if (this.ball.pos.y - this.ball.radius <= 0) {
      this.ball.pos.y = 0 + this.ball.radius;
      this.ball.vel.y = -this.ball.vel.y;
    } else if (this.ball.pos.y + this.ball.radius >= this.height) {
      this.ball.pos.y = this.height - this.ball.radius;
      this.ball.vel.y = -this.ball.vel.y;
    }
    this.racketShot();
  }

  teleport() {
    const epsilon = 2; // 1 pixel tolerance
    if (Math.abs(this.ball.pos.x - this.width / 2) < epsilon) {
      this.ball.pos.y = Math.random() * this.height;
    }
  }

  scoring() {
    // Ball out of bounds - scoring
    if (this.ball.pos.x - this.ball.radius <= 20) {
      // Right player scores
      this.scores.right++;
      this.resetBall();
      console.log(`[${this.sessionId}] Score: ${this.scores.left} - ${this.scores.right}`);
    } else if (this.ball.pos.x + this.ball.radius >= this.width - 20) {
      // Left player scores
      this.scores.left++;
      this.resetBall();
      console.log(`[${this.sessionId}] Score: ${this.scores.left} - ${this.scores.right}`);
    }
  }

  updateBackground(): void {
    if (this.cosmicBackground) {
      this.cosmicBackground.update(this.time);
      this.cosmicBackground.affectedFrom(this.ball.pos, this.ball.radius, 1.8);
    }
    this.time += 0.01;
  }

  update(): void {
    if (this.cosmicBackground) {
      this.cosmicBackground.update(this.time);
      this.cosmicBackground.affectedFrom(this.ball.pos, this.ball.radius, 1.8);
      const force = this.cosmicBackground.getVectorAt(this.ball.pos.x, this.ball.pos.y, this.time);
      force.mult(this.serve);
      this.ball.apply(force);
    }

    this.ball.update();
    this.paddleMove();
    this.collision();
    this.teleport();

    this.scoring();
    this.winConditions();

    // update time to animate forcefield
    this.time += 0.01;
  }

  winConditions() {
    // Check win condition
    if (this.scores.left >= 5 || this.scores.right >= 5) {
      this.stop();
      console.log(
        `[${this.sessionId}] Game finished! Final score: ${this.scores.left} - ${this.scores.right}`,
      );
      // send to blockchain
    }
  }

  resetBall(): void {
    this.ball.pos.x = this.width / 2;
    this.ball.pos.y = this.height / 2;
    // this.ball.vel.x = -this.ball.vel.x;

    var velX = 5 * this.serve;
    this.ball.vel.x = velX;
    this.ball.vel.y = (Math.random() - 0.5) * 10;
  }

  getState(): GameState {
    let field: number[][] | null = null;

    if (this.cosmicBackground) {
      field = this.cosmicBackground.forceField;
    }
    return {
      ball: {
        x: this.ball.pos.x,
        y: this.ball.pos.y,
        radius: this.ball.radius,
        vx: this.ball.vel.x, //LUBA
        vy: this.ball.vel.y, //LUBA
      },
      paddles: {
        left: {
          y: this.paddles.left.y,
          height: this.paddles.left.height,
        },
        right: {
          y: this.paddles.right.y,
          height: this.paddles.right.height,
        },
      },
      scores: this.scores,
      status: this.status,
      // cosmicBackground: this.cosmicBackground.forceField,
      cosmicBackground: field,
    };
  }
}
