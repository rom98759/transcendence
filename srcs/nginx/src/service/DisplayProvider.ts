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
  }
}
