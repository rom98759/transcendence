import { HealthChecker } from './HealthChecker.js'
import { GameState, ServerMessage, ClientMessage, Vector2D } from '../core/types.js'
import { GameDisplay } from './GameDisplay.js'

export class DisplayProvider {
  private gameScreen: GameDisplay
  private startTime: number
  private healthChecker: HealthChecker
  // private gameContainer: HTMLElement | null = null
  // private sessionsListContainer: HTMLElement | null = null
  // private canvas: HTMLCanvasElement | null = null
  // private ctx: CanvasRenderingContext2D | null = null
  private gameState: GameState | null = null
  private sessionId: string | null = null
  private ws: WebSocket | null = null
  private pingInterval: number | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5

  constructor() {
    console.log('init')
    this.startTime = Date.now()
    this.healthChecker = new HealthChecker()
    this.init()
    this.gameScreen = new GameDisplay()
  }

  private init(): void {
    this.updateTime()
    this.updateUptime()
    this.createParticles()
    this.setupEventListeners()
    // this.createGameContainer()
    // this.createSessionsList()
    // setInterval(() => this.updateTime(), 1000);
    // setInterval(() => this.updateUptime(), 1000);
    // setInterval(() => this.healthChecker.checkHealth(), 1000);
    // this.healthChecker.checkHealth();
  }
  // private renderGame(): void {
  //   if (!this.ctx || !this.canvas || !this.gameState) return
  //
  //   // Clear canvas
  //   this.ctx.fillStyle = '#000000'
  //   this.renderNoiseField(this.canvas, this.ctx, this.gameState.cosmicBackground)
  //   // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  //
  //   // Draw center line
  //   this.ctx.strokeStyle = '#444444'
  //   this.ctx.setLineDash([10, 10])
  //   this.ctx.beginPath()
  //   this.ctx.moveTo(this.canvas.width / 2, 0)
  //   this.ctx.lineTo(this.canvas.width / 2, this.canvas.height)
  //   this.ctx.stroke()
  //   this.ctx.setLineDash([])
  //
  //   // Draw left paddle
  //   this.ctx.fillStyle = '#ffffff'
  //   this.ctx.fillRect(20, this.gameState.paddles.left.y, 10, this.gameState.paddles.left.height)
  //
  //   // Draw right paddle
  //   this.ctx.fillRect(
  //     this.canvas.width - 30,
  //     this.gameState.paddles.right.y,
  //     10,
  //     this.gameState.paddles.right.height,
  //   )
  //
  //   // Draw ball
  //   // this.ctx.beginPath();
  //   // this.ctx.arc(
  //   //     this.gameState.ball.x,
  //   //     this.gameState.ball.y,
  //   //     this.gameState.ball.radius,
  //   //     0,
  //   //     Math.PI * 2
  //   // );
  //   this.ctx.fill()
  // }
  //
  // private exitGame(): void {
  //   // Send stop command
  //   const dialog = document.getElementById('game-over-dialog')
  //   if (dialog) {
  //     dialog.classList.add('hidden')
  //   }
  //
  //   if (this.ws && this.ws.readyState === WebSocket.OPEN) {
  //     this.sendWebSocketMessage({ type: 'stop' })
  //   }
  //
  //   // Close WebSocket
  //   this.stopPingInterval()
  //   if (this.ws) {
  //     this.ws.close(1000, 'User exited game')
  //     this.ws = null
  //   }
  //
  //   if (this.gameContainer) {
  //     this.gameContainer.classList.add('hidden')
  //   }
  //
  //   const mainContent = document.querySelector('.relative.z-10') as HTMLElement
  //   if (mainContent) {
  //     mainContent.classList.remove('hidden')
  //   }
  //
  //   const startBtn = document.getElementById('start-game-btn')
  //   if (startBtn) {
  //     startBtn.textContent = 'PLAY'
  //     ;(startBtn as HTMLButtonElement).disabled = false
  //     startBtn.classList.remove('opacity-50')
  //   }
  //
  //   this.addGameLog('Disconnected from game', 'warning')
  //   this.updateConnectionStatus(false, 'Disconnected')
  //   this.sessionId = null
  //   this.gameState = null
  //   console.log('Exited game')
  // }

  private updateTime(): void {
    const now = new Date()
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const timeElement = document.getElementById('server-time')
    if (timeElement) {
      timeElement.textContent = timeString
    }
  }

  private updateUptime(): void {
    const elapsed = Date.now() - this.startTime
    const hours = Math.floor(elapsed / 3600000)
    const minutes = Math.floor((elapsed % 3600000) / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)

    const uptimeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    const uptimeElement = document.getElementById('uptime')
    if (uptimeElement) {
      uptimeElement.textContent = uptimeString
    }
  }

  private createParticles(): void {
    const container = document.getElementById('particles')
    if (!container) return

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div')
      particle.className = 'absolute w-1 h-1 bg-white rounded-full opacity-30'
      particle.style.left = `${Math.random() * 100}%`
      particle.style.top = `${Math.random() * 100}%`
      particle.style.animation = `float ${3 + Math.random() * 4}s ease-in-out infinite`
      particle.style.animationDelay = `${Math.random() * 2}s`
      container.appendChild(particle)
    }
  }

  private setupEventListeners(): void {
    // Game button
    const gameBtn = document.getElementById('gameBtn')
    if (gameBtn) {
      gameBtn.addEventListener('click', () => this.gameScreen.display())
    }
    // const sessionsListBtn = document.getElementById('sessionsListBtn');
    // if (sessionsListBtn) {
    //   sessionsListBtn.addEventListener('click', () => this.displaySessionsList());
    // }
    // // Click events
    // document.addEventListener('click', (e) => {
    //   const target = e.target as HTMLElement;
    //   if (target.id === 'exit-game-btn') this.exitGame();
    //   if (target.id === 'start-game-btn') {
    //     if (this.sessionId) this.startGameSession();
    //     console.log('start game');
    //   }
    // });

    // Keyboard controls
    // document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    // document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  // private handleKeyDown(e: KeyboardEvent): void {
  //   if (!this.sessionId || this.gameState?.status !== 'playing') return
  //
  //   let paddle: 'left' | 'right' | null = null
  //   let direction: 'up' | 'down' | null = null
  //
  //   // W/S for left paddle
  //   if (e.key === 'w' || e.key === 'W') {
  //     paddle = 'left'
  //     direction = 'up'
  //   } else if (e.key === 's' || e.key === 'S') {
  //     paddle = 'left'
  //     direction = 'down'
  //   }
  //   // Arrow keys for right paddle
  //   else if (e.key === 'ArrowUp') {
  //     paddle = 'right'
  //     direction = 'up'
  //     e.preventDefault() // Prevent page scroll
  //   } else if (e.key === 'ArrowDown') {
  //     paddle = 'right'
  //     direction = 'down'
  //     e.preventDefault()
  //   }
  //
  //   if (paddle && direction) {
  //     this.gameScreen.sendWebSocketMessage({
  //       type: 'paddle',
  //       paddle,
  //       direction,
  //     })
  //   }
  // }
  //
  // private handleKeyUp(e: KeyboardEvent): void {
  //   if (!this.sessionId || this.gameState?.status !== 'playing') return
  //
  //   let paddle: 'left' | 'right' | null = null
  //
  //   if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
  //     paddle = 'left'
  //   } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
  //     paddle = 'right'
  //     e.preventDefault()
  //   }
  //
  //   if (paddle) {
  //     this.sendWebSocketMessage({
  //       type: 'paddle',
  //       paddle,
  //       direction: 'stop',
  //     })
  //   }
  // }
}
