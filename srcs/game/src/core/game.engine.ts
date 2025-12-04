import {
  GameState,
  Scores,
  GameStatus,
  Paddles
} from "./game.types.js";
import { Vector2 } from "./game.vector.js";
// import { getForceAt2D, getNoiseField} from "./game.perlin.js";
import { CosmicMicroWaveNoise } from './game.noise.js';

class Ball {
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  radius: number;
  speedLimit: number;
  mass: number;

  constructor(
    pos: Vector2,
    vel: Vector2,
    radius: number,
    maxSpeed: number = 3,
    mass: number = 10,
  ) {
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
  cosmicBackground: CosmicMicroWaveNoise;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.width = 800;
    this.height = 600;
    this.time = 0;
    this.serve = 1;
    this.cosmicBackground = new CosmicMicroWaveNoise(this.width, this.height, 10);
    this.ball = new Ball(
      new Vector2(this.width / 2, this.height / 2), // position
      new Vector2(0, 0),  // velocity (direction + vitesse)
      10, // size of the ball
      5, // speed limit
      1, // mass -> more the mass is, less it is affected by other forces
    );

    // Paddle state
    this.paddles = {
      left: {
        y: this.height / 2 - 50,
        height: 100,
        width: 10,
        speed: 8,
        moving: "stop",
      },
      right: {
        y: this.height / 2 - 50,
        height: 100,
        width: 10,
        speed: 8,
        moving: "stop",
      },
    };

    // Game state
    this.scores = { left: 0, right: 0 };
    this.status = "waiting";
    this.gameLoopInterval = null;
  }

  setPaddleDirection(
    paddle: "left" | "right",
    direction: "up" | "down" | "stop",
  ): void {
    if (this.paddles[paddle]) {
      this.paddles[paddle].moving = direction;
      console.log(`[${this.sessionId}] ${paddle} paddle moving ${direction}`);
    }
  }

  start(): void {
    if (this.status === "playing") return;

    this.status = "playing";
    console.log(`[${this.sessionId}] Game started`);

    // Run game loop at 60 FPS
    this.gameLoopInterval = setInterval(() => {
      this.update();
    }, 1000 / 60);
  }

  stop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.status = "finished";
    console.log(`[${this.sessionId}] Game Over`);
  }

  paddleMove() {
    // Move paddles based on player input
    if (this.paddles.left.moving === "up") {
      this.paddles.left.y -= this.paddles.left.speed;
    } else if (this.paddles.left.moving === "down") {
      this.paddles.left.y += this.paddles.left.speed;
    }

    if (this.paddles.right.moving === "up") {
      this.paddles.right.y -= this.paddles.right.speed;
    } else if (this.paddles.right.moving === "down") {
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
        this.ball.acc.add(new Vector2(15, 0));
        this.serve *= -1;
      }
    }

    // Ball collision with right paddle
    if (
      this.ball.pos.x + this.ball.radius >=
      this.width - 20 - this.paddles.right.width
    ) {
      if (
        this.ball.pos.y >= this.paddles.right.y &&
        this.ball.pos.y <= this.paddles.right.y + this.paddles.right.height
      ) {
        this.ball.vel.x = -this.ball.vel.x;
        this.ball.acc.add(new Vector2(-15, 0));
        this.serve *= -1;
      }
    }
  }

  collision() {
    var bounce = false;
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

  update(): void {
    // Get force from noise field
    // const force = this.cosmicBackground.getForceAt2D(
    //   this.ball.pos.x,
    //   this.ball.pos.y,
    //   0.01,  // Small scale = smooth forces
    //   0.5,   // Moderate strength
    //   this.time
    // );

    this.cosmicBackground.update(this.time);

    this.cosmicBackground.affectedFrom(this.ball.pos, 5, 1);

    const force = this.cosmicBackground.getVectorAt(
      this.ball.pos.x,
      this.ball.pos.y,
      this.time,
    )

    // const noiseAtPosition = this.cosmicBackground.getNoiseFrom(this.ball.pos);

    // inverse the forcefield each time the ball hit a paddle
    force.mult(this.serve);
    this.ball.apply(force);
    this.ball.update(); 

    this.paddleMove();
    this.collision();

     const epsilon = 2;// 1 pixel tolerance

    if (Math.abs(this.ball.pos.x - this.width / 2) < epsilon) {
          this.ball.pos.y = Math.random() * this.height;
    }
    // Ball out of bounds - scoring
    if (this.ball.pos.x - this.ball.radius <= 0) {
      // Right player scores
      this.scores.right++;
      this.resetBall();
      console.log(
        `[${this.sessionId}] Score: ${this.scores.left} - ${this.scores.right}`,
      );
    } else if (this.ball.pos.x + this.ball.radius >= this.width) {
      // Left player scores
      this.scores.left++;
      this.resetBall();
      console.log(
        `[${this.sessionId}] Score: ${this.scores.left} - ${this.scores.right}`,
      );
    }



    // Check win condition
    if (this.scores.left >= 5 || this.scores.right >= 5) {
      this.status = "finished";
      this.stop();
      console.log(
        `[${this.sessionId}] Game finished! Final score: ${this.scores.left} - ${this.scores.right}`,
      );
      // send to blockchain
      // -->
    }

    // update time to animate forcefield
    this.time += 0.01;
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
    return {
      ball: {
        x: this.ball.pos.x,
        y: this.ball.pos.y,
        radius: this.ball.radius,
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
      cosmicBackground: this.cosmicBackground.forceField,
    };
  }
}
