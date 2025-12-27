import { Scores, GameState, ServerMessage, ClientMessage, Vector2D } from '../core/types.js'

export interface GameSettings {
  ballRadius: number
  ballSpeed: number
  ballMass: number
  paddleSpeed: number
  microWaveSize: number
}

export class GameDisplay {
  screen: HTMLElement
  main: HTMLElement
  gameState: GameState | null = null
  resultDialog: HTMLElement
  panel: HTMLElement
  gameSessions: HTMLElement
  sessionsInterval: Node.timeout | null = null
  settings: HTMLElement
  gameArena: HTMLElement
  gameLogs: HTMLElement
  sessionId: string | undefined = undefined
  canvas: HTMLCanvasElement | null = null
  context: CanvasRenderingContext2D | null = null
  reconnectAttempts: number = 0
  maxReconnectAttempts: number = 5
  websocket: WebSocket | null = null
  pingInterval: number | null = null
  settingsTimeout: number | null = null

  constructor() {
    this.gameLogs = document.createElement('div')
    this.screen = document.createElement('div')
    this.gameSessions = document.createElement('div')
    this.gameSessions.id = 'game-sessions'
    this.settings = document.createElement('div')
    this.main = document.createElement('div')
    this.gameArena = document.createElement('div')
    this.panel = document.createElement('div')
    this.resultDialog = document.createElement('div')

    // this.sessions.id = 'sessions'
    // this.screen.id = game-container'
    // this.main.id = 'main'
    // this.resultDialog.id = 'game-over-dialog'

    this.gameLogs.className = 'hidden'
    this.settings.className = 'hidden' // 'hidden fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center gap-4 p-4 justify-center z-50'
    this.screen.className = 'hidden fixed inset-0 z-50 bg-black overflow-y-auto'
    this.main.className = 'w-full h-full flex flex-row' // ← HORIZONTAL layout!
    this.panel.className = 'w-1/3 bg-gray-800'
    this.gameArena.className = 'hidden w-2/3 items-center'
    this.resultDialog.className =
      'class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'

    this.buildElements()
  }

  showPanel(panel: 'settings' | 'game-logs' | 'game-sessions') {
    ;['settings', 'game-logs', 'game-sessions'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.classList.toggle('hidden', id !== panel)
      }
    })
    if (panel === 'game-sessions') {
      // this.loadSessions()
      this.sessionsInterval = window.setInterval(() => this.loadSessions(), 2000)
    } else if (this.sessionsInterval) {
      clearInterval(this.sessionsInterval)
      this.sessionsInterval = null
    }
  }

  makeResultDialog() {
    this.resultDialog.innerHTML = `
             <h2 class="text-3xl font-bold text-center mb-6 text-white">Game Over!</h2>
             <!-- Score Display -->
             <div class="mb-6 space-y-3">
                 <div class="flex justify-between items-center bg-gray-700 p-4 rounded">
                     <span class="text-lg text-gray-300">Player 1:</span>
                     <span id="final-score-p1" class="text-2xl font-bold text-blue-400">0</span>
                 </div>
                 <div class="flex justify-between items-center bg-gray-700 p-4 rounded">
                     <span class="text-lg text-gray-300">Player 2:</span>
                     <span id="final-score-p2" class="text-2xl font-bold text-red-400">0</span>
                 </div>
             </div>

             <!-- Winner Message -->
             <p id="winner-message" class="text-center text-xl mb-6 text-yellow-400"></p>
              `
  }

  makePanel() {
    this.panel.id = 'panel'
    this.panel.innerHTML = `
      <!-- Buttons -->
      <div class="flex gap-4">
         <button id="create-game-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition">
             Create simple game !!
         </button>
         <button id="create-tournament-btn" class="flex-1 striped-disabled bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition">
             Create Tournament ??
         </button>
         <button id="exit-btn" class="flex-1 bg-red-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition">
            Exit to main page
         </button>
      </div>
      `
  }

  makeSettings() {
    this.settings.id = 'settings'
    this.settings.innerHTML = `
      <form id="settings-form" class="space-y-4">
        <div>
          <label class="flex justify-between items-center">Ball Max Speed<span id="val-ballSpeed">10</span></label>
          <input type="range" name="ballSpeed" value="5" min="1" max="50" step="1" class="w-full" />
        </div>
        <div>
          <label class="flex justify-between items-center">Ball Radius<span id="val-ballRadius">5</span></label>
          <input type="range" name="ballRadius" value="5" min="1" max="50" step="1" class="w-full" />
        </div>
        <div>
          <label class="flex justify-between items-center">Ball Mass<span id="val-ballMass">1</span></label>
          <input type="range" name="ballMass" value="1" min="0.1" max="10" step="0.1" class="w-full" />
        </div>
        <div>
          <label class="flex justify-between items-center">MicroWave Size<span id="val-microWaveSize">100</span></label>
          <input type="range" name="microWaveSize" value="16" min="8" max="50" step="1" class="w-full" />
        </div>
        <div>
          <label class="flex justify-between items-center">Paddle Speed <span id="val-paddleSpeed">100</span></label>
          <input type="range" name="paddleSpeed" value="8" min="4" max="30" step="1" class="w-full" />
        </div>
      </form>
      <div class="flex gap-2 mt-4">
        <button id="start-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition">
            START LOCAL
        </button>
        <button id="wait-opponent-btn" class="flex-1 striped-disabled bg-grey-600 hover:bg-green-700 text-white rounded transition">
            START REMOTE
        </button>
        <button id="stop-btn" class="flex-1 striped-disabled bg-orange-600 hover:bg-green-700 text-white font-bold rounded transition">
            STOP
        </button>
      <button id="invite-btn" class="flex-1 striped-disabled bg-grey-600 hover:bg-blue-700 text-white font-bold rounded transition">
        Invite Player
      </button>
      <div id="invite-input-container" class="hidden w-full">
          <input 
              id="invite-input" 
              type="text" 
              placeholder="Enter player username..." 
              class="w-full px-4 py-3 rounded border-2 border-blue-500 focus:outline-none focus:border-blue-600"
          />
          <div class="flex gap-2 mt-2">
              <button id="send-invite-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                  Send Invite
              </button>
              <button id="cancel-invite-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition">
                  Cancel
              </button>
          </div>
      </div>
    </div>
      `
  }

  makeGameArena() {
    // this.gameArena.className = 'flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 py-8'
    this.gameArena.innerHTML = `
        <!-- Game Canvas Area -->
          <div class="text-center space-y-6">
            <div class="relative">
              <canvas id="game-canvas" width="800" height="600" class="border-4 border-purple-500 rounded-lg shadow-2xl bg-black"></canvas>
            </div>
      `
  }

  makeGameLogs() {
    this.gameLogs.id = 'game-logs'
    this.gameLogs.innerHTML = `
            <!-- Game Info -->
            <div class="bg-white/10 backdrop-blur-lg rounded-lg p-4 max-w-2xl mx-auto">
              <div class="flex justify-around text-white">
                <div class="text-center">
                  <p class="text-sm text-purple-300">Player 1</p>
                  <p id="player1-score" class="text-3xl font-bold">0</p>
                </div>
                <div class="text-center">
                  <p class="text-sm text-purple-300">Game Status</p>
                  <p id="game-status-text" class="text-xl font-semibold text-yellow-400">Ready</p>
                </div>
                <div class="text-center">
                  <p class="text-sm text-purple-300">Player 2</p>
                  <p id="player2-score" class="text-3xl font-bold">0</p>
                </div>
              </div>
            </div>
            <!-- Controls Info -->
            <div class="bg-white/5 backdrop-blur rounded-lg p-3 max-w-2xl mx-auto">
              <p class="text-gray-300 text-sm">Controls: <span class="text-purple-300 font-mono">W/S</span> for left paddle, <span class="text-purple-300 font-mono">↑/↓</span> for right paddle</span></p>
            </div>

            <!-- Game Log -->
            <div class="bg-white/5 backdrop-blur rounded-lg p-4 max-w-2xl mx-auto">
              <h3 class="text-sm font-semibold text-purple-300 mb-2">Game Log</h3>
              <div id="game-log" class="h-24 overflow-y-auto space-y-1 text-left text-sm font-mono text-gray-300"></div>
            </div>
          </div>
        <button id="stop2-btn" class="flex-1 striped-disabled bg-orange-600 hover:bg-green-700 text-white font-bold rounded transition">
            STOP
        </button>
    `
  }

  buildElements() {
    this.makeResultDialog()
    this.makeSettings()
    this.makeGameArena()
    this.makePanel()
    this.makeGameLogs()
    this.panel.appendChild(this.gameSessions)
    this.panel.appendChild(this.settings)
    this.panel.appendChild(this.gameLogs)
    this.main.appendChild(this.panel)
    this.main.appendChild(this.gameArena)
    // this.main.appendChild(this.settings)
    this.screen.appendChild(this.main)
    document.body.appendChild(this.screen)
    this.setupEventListeners()
    // this.loadSessions()
  }

  async askForGameSession(): Promise<void> {
    if (this.sessionId) return
    try {
      const response = await fetch('/api/game/create-session', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok && data.sessionId) {
        this.gameArena.classList.remove('hidden')
        this.sessionId = data.sessionId
        console.log('Created game session:', this.sessionId)
        console.log('game session result:', data)
        await this.openWebSocket(this.sessionId)
        this.showPanel('settings')
        // this.settings.classList.remove('hidden')
        // this.sessions.classList.add('hidden')
      } else {
        throw new Error(data.message || 'Failed to create game session')
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert('Failed to connect to game service. Please try again.')
      throw error // Re-throw so display() knows it failed
    }
  }

  async joinSession(sessionId: string) {
    if (this.sessionId) return
    try {
      this.sessionId = sessionId
      await this.openWebSocket(this.sessionId)
      this.showPanel('game-logs')
    } catch (error) {
      console.error('Failed to join session (bad session ?):', error)
      this.sessionId = undefined
      throw error
    }
  }

  async loadSessions() {
    try {
      const res = await fetch('/api/game/sessions')
      const data = await res.json() // parse JSON

      // Clear existing children
      this.gameSessions.innerHTML = ''

      if (!data.sessions || data.sessions.length === 0) {
        this.gameSessions.innerHTML = `
                  <div class="text-gray-400 p-2">No active sessions</div>
              `
        return
      }

      // Create a card for each session
      data.sessions.forEach((session: any) => {
        const div = document.createElement('div')

        div.className =
          'p-4 mb-2 bg-gray-800 text-white rounded shadow cursor-pointer hover:bg-gray-700'

        div.innerHTML = `
                  <div class="font-bold text-lg">Session ${session.sessionId}</div>
                  <div class="text-sm text-gray-300">State: ${session.state}</div>
                  <div class="text-sm text-gray-300">Players: ${session.playerCount}</div>
                  <div class="text-sm text-gray-300">Interval running: ${session.hasInterval}</div>
              `

        // Optional: Click to join a session
        div.onclick = () => this.joinSession(session.sessionId)
        this.gameSessions.appendChild(div)
      })
    } catch (err) {
      console.error('Failed to load sessions:', err)
      this.gameSessions.innerHTML = `<div class="text-red-500 p-2">Error loading gameSessions.</div>`
    }
  }

  display() {
    try {
      console.log('game display: showing game UI')

      this.screen.classList.remove('hidden')
      this.main.classList.remove('hidden')
      this.showPanel('game-sessions')
      // this.showSessions()
      document.getElementById('first-screen')?.classList.add('hidden')
      // Initialize canvas
      this.canvas = this.gameArena.querySelector('#game-canvas') as HTMLCanvasElement
      this.context = this.canvas?.getContext('2d') || null

      this.drawWaitingScreen()
    } catch (error) {
      console.error('Failed to create game session in display():', error)
    }
  }

  private setupEventListeners(): void {
    const form = document.getElementById('settings-form') as HTMLFormElement
    if (!form) return

    // Get all range inputs
    const inputs = form.querySelectorAll('input[type="range"]')
    inputs.forEach((input) => {
      const rangeInput = input as HTMLInputElement
      const name = rangeInput.name
      const valueSpan = document.getElementById(`val-${name}`)

      // Update display value and submit on input
      rangeInput.addEventListener('input', async () => {
        // Update the displayed value
        if (valueSpan) {
          valueSpan.textContent = rangeInput.value
        }

        // Submit settings
        await this.submitSettings()
      })

      // Initialize displayed value on load
      if (valueSpan) {
        valueSpan.textContent = rangeInput.value
      }
    })

    // Game button
    const newSessionBtn = document.getElementById('create-session-btn')
    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', () => this.askForGameSession())
    }

    // Click events
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.id === 'create-game-btn') this.askForGameSession()
      if (target.id === 'exit-btn') this.exitGame()
      if (target.id === 'stop-btn' || target.id === 'stop2-btn') {
        this.stopGame()
        this.showPanel('game-sessions')
      }
      if (target.id === 'start-btn' && this.sessionId) this.startGame()
    })

    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    document.addEventListener('keyup', (e) => this.handleKeyUp(e))
  }

  private stopGame(): void {
    this.gameLogs.classList.add('hidden')
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendWebSocketMessage({ type: 'stop' })
    }
    // Close WebSocket
    this.stopPingInterval()
    if (this.websocket) {
      this.websocket.close(1000, 'User exited game')
      this.websocket = null
    }
    this.updateConnectionStatus(false, 'Disconnected')
    this.sessionId = undefined
    this.gameState = null
    this.drawWaitingScreen()
    console.log('Game stoped')
    // this.showSessions()
  }

  private exitGame(): void {
    // Send stop command
    this.stopGame()
    document.getElementById('first-screen')?.classList.remove('hidden')
    this.screen.classList.add('hidden')
    this.addGameLog('Disconnected from game', 'warning')
    console.log('Exited game')
    if (this.sessionsInterval) {
      console.log("clear interval")
      clearInterval(this.sessionsInterval)
      this.sessionsInterval = null;
    }
  }

  private async submitSettings() {
    // Clear previous timeout
    if (this.settingsTimeout) {
      clearTimeout(this.settingsTimeout)
    }

    // Wait 300ms after last change before submitting
    this.settingsTimeout = window.setTimeout(async () => {
      const form = document.getElementById('settings-form') as HTMLFormElement
      try {
        if (form) {
          const formData = new FormData(form)
          const settings: GameSettings = {
            ballRadius: Number(formData.get('ballRadius')),
            ballSpeed: Number(formData.get('ballSpeed')),
            ballMass: Number(formData.get('ballMass')),
            paddleSpeed: Number(formData.get('paddleSpeed')),
            microWaveSize: Number(formData.get('microWaveSize')),
          }

          await fetch('/api/game/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              sessionId: this.sessionId,
              settings: settings,
            }),
          })
          console.log('settings saved !')
        }
      } catch (error) {
        console.error('Failed to save settings:', error)
      }
    }, 300)
  }

  private async startGame(): Promise<void> {
    this.showPanel('game-logs')
    try {
      this.sendWebSocketMessage({ type: 'start' })
      this.addGameLog('Game started!', 'success')
    } catch (error) {
      console.error('Failed to start game:', error)
      this.addGameLog(`Error: ${error}`, 'error')
    }
  }

  private addGameLog(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ): void {
    const logContainer = document.getElementById('game-log')
    if (!logContainer) return

    const colorClass = {
      info: 'text-blue-400',
      success: 'text-green-400',
      error: 'text-red-400',
      warning: 'text-yellow-400',
    }[type]

    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('div')
    logEntry.className = colorClass
    logEntry.textContent = `[${timestamp}] ${message}`
    logContainer.appendChild(logEntry)
    logContainer.scrollTop = logContainer.scrollHeight
  }

  private sendWebSocketMessage(message: ClientMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
      this.addGameLog('Cannot send message - not connected', 'error')
    }
  }

  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      this.sendWebSocketMessage({ type: 'ping' })
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'connected':
        if (message.data) {
          console.log(message)
          this.gameState = message.data
          console.log('Session ID:', message.sessionId)
          this.sessionId = message.sessionId
          this.addGameLog(`Connected to new session: ${this.sessionId}`, 'success')
          if (this.gameState.status === 'waiting') {
            this.drawPreview()
          } else if (this.gameState.status === 'playing') {
            this.updateScores(message.data.scores)
            this.renderGame()
          }
          console.log('URL updated to:', window.location.pathname)
        }
        break

      case 'state':
        if (message.data) {
          this.gameState = message.data
          if (this.gameState.status === 'waiting') {
            this.updateScores({ left: 0, right: 0 })
            this.drawPreview()
            break
          }
          this.updateScores(message.data.scores)
          this.renderGame()

          // Update status text
          const statusText = document.getElementById('game-status-text')
          if (statusText && message.data.status) {
            statusText.textContent =
              message.data.status.charAt(0).toUpperCase() + message.data.status.slice(1)
            statusText.className = `text-xl font-semibold ${
              message.data.status === 'playing'
                ? 'text-green-400'
                : message.data.status === 'finished'
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }`
          }
        }
        break

      case 'gameOver':
        this.addGameLog(`Game Over! ${message.message || ''}`, 'warning')
        const startBtn = document.getElementById('start-game-btn')
        if (startBtn) {
          ;(startBtn as HTMLButtonElement).disabled = false
        }
        if (message.data) {
          this.gameState = message.data
        }
        if (message.data) {
          this.updateScores(message.data.scores)
        }
        this.drawWaitingScreen()
        this.sessionId = undefined

        // this.showGameOverDialog(this.gameState)
        this.gameState = null

        const statusText = document.getElementById('game-status-text')
        if (statusText) {
          statusText.textContent = 'Game Over'
          statusText.className = 'text-xl font-semibold text-red-400'
        }
        break

      case 'error':
        this.addGameLog(`Error: ${message.message}`, 'error')
        break

      case 'pong':
        // Heartbeat response - connection is alive
        break
    }
  }

  private renderNoiseField(noiseField: number[][] | null) {
    if (!this.context || !this.canvas) return

    if (!noiseField) {
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
      return
    }

    const height = noiseField.length // Number of rows (y)
    const width = noiseField[0].length // Number of columns (x)

    const pixelSize = this.canvas.height / height // scale up pixels visually
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = noiseField[y][x]

        // const brightness = Math.floor(value * 255);
        // context.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        const hue = value * 360
        this.context.fillStyle = `hsl(${hue}, 100%, 50%)`

        this.context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
      }
    }
  }

  private renderGame(): void {
    if (!this.context || !this.canvas || !this.gameState) return

    // Clear canvas
    this.context.fillStyle = '#000000'
    this.renderNoiseField(this.gameState.cosmicBackground)
    // this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line
    this.context.strokeStyle = '#444444'
    this.context.setLineDash([10, 10])
    this.context.beginPath()
    this.context.moveTo(this.canvas.width / 2, 0)
    this.context.lineTo(this.canvas.width / 2, this.canvas.height)
    this.context.stroke()
    this.context.setLineDash([])

    // Draw left paddle
    this.context.fillStyle = '#ffffff'
    this.context.fillRect(20, this.gameState.paddles.left.y, 10, this.gameState.paddles.left.height)

    // Draw right paddle
    this.context.fillRect(
      this.canvas.width - 30,
      this.gameState.paddles.right.y,
      10,
      this.gameState.paddles.right.height,
    )

    // Draw ball
    this.context.beginPath()
    this.context.arc(
      this.gameState.ball.x,
      this.gameState.ball.y,
      this.gameState.ball.radius,
      0,
      Math.PI * 2,
    )
    this.context.fill()
  }

  private updateScores(scores: Scores): void {
    const player1Score = document.getElementById('player1-score')
    const player2Score = document.getElementById('player2-score')

    if (player1Score) player1Score.textContent = scores.left.toString()
    if (player2Score) player2Score.textContent = scores.right.toString()
  }

  private async openWebSocket(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine WebSocket URL (assuming same host)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/game/${sessionId}`

      this.addGameLog(`Connecting to ${wsUrl}`, 'info')

      this.websocket = new WebSocket(wsUrl)

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.websocket?.readyState !== WebSocket.OPEN) {
          this.websocket?.close()
          this.addGameLog('Connection timeout', 'error')
          reject(new Error('WebSocket connection timeout'))
        }
      }, 5000) // 5 second timeout

      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout)
        this.addGameLog('WebSocket connected', 'success')
        this.updateConnectionStatus(true, 'Connected (WebSocket)')
        this.reconnectAttempts = 0
        this.startPingInterval()
        resolve()
      }

      this.websocket.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data)
          this.handleServerMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.websocket.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('WebSocket error:', error)
        this.addGameLog('WebSocket error occurred', 'error')
        this.updateConnectionStatus(false, 'Disconnected')
        reject(error)
      }

      this.websocket.onclose = (event) => {
        clearTimeout(connectionTimeout)
        if (event.code !== 1000) {
          // 1000 = normal closure
          this.addGameLog(
            `Connection closed: ${event.code} - ${event.reason || 'Unknown reason'}`,
            'error',
          )

          // Reject if we haven't resolved yet
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            reject(
              new Error(
                `WebSocket closed with code ${event.code}: ${event.reason || 'Connection rejected'}`,
              ),
            )
          }
        } else {
          this.addGameLog('Connection closed normally', 'info')
        }
        this.updateConnectionStatus(false, 'Disconnected')
        this.stopPingInterval()

        // Attempt reconnection if not intentional
        // if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        //   this.reconnectAttempts++
        //   this.addGameLog(`Reconnecting... (attempt ${this.reconnectAttempts})`, 'warning')
        //   setTimeout(() => {
        //     if (this.sessionId) {
        //       this.openWebSocket(this.sessionId)
        //     }
        //   }, 2000)
        // }
      }
    })
  }

  private updateConnectionStatus(connected: boolean, text: string): void {
    const statusDot = document.getElementById('game-connection-status')
    const statusText = document.getElementById('game-connection-text')

    if (statusDot && statusText) {
      if (connected) {
        statusDot.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse'
        statusText.className = 'text-green-400 text-sm'
      } else {
        statusDot.className = 'w-3 h-3 rounded-full bg-red-500'
        statusText.className = 'text-red-400 text-sm'
      }
      statusText.textContent = text
    }
  }

  private drawPreview(): void {
    if (!this.context || !this.canvas || !this.gameState) return

    // Clear canvas
    this.context.fillStyle = '#000000'
    this.renderNoiseField(this.gameState.cosmicBackground)
    // this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line
    this.context.strokeStyle = '#444444'
    this.context.setLineDash([10, 10])
    this.context.beginPath()
    this.context.moveTo(this.canvas.width / 2, 0)
    this.context.lineTo(this.canvas.width / 2, this.canvas.height)
    this.context.stroke()
    this.context.setLineDash([])

    // Draw left paddle
    this.context.fillStyle = '#ffffff'
    this.context.fillRect(20, this.gameState.paddles.left.y, 10, this.gameState.paddles.left.height)

    // Draw right paddle
    this.context.fillRect(
      this.canvas.width - 30,
      this.gameState.paddles.right.y,
      10,
      this.gameState.paddles.right.height,
    )

    // Draw ball
    this.context.beginPath()
    this.context.arc(
      this.gameState.ball.x,
      this.gameState.ball.y,
      this.gameState.ball.radius,
      0,
      Math.PI * 2,
    )
    this.context.fill()
  }

  private drawWaitingScreen(): void {
    if (!this.context || !this.canvas) return

    this.context.fillStyle = '#000000'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw center line
    this.context.strokeStyle = '#ffffff'
    this.context.setLineDash([10, 10])
    this.context.beginPath()
    this.context.moveTo(this.canvas.width / 2, 0)
    this.context.lineTo(this.canvas.width / 2, this.canvas.height)
    this.context.stroke()

    // Draw text
    this.context.fillStyle = '#ffffff'
    this.context.font = '24px Arial'
    this.context.textAlign = 'center'
    this.context.fillText(
      'Press START GAME to begin',
      this.canvas.width / 2,
      this.canvas.height / 2,
    )
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.sessionId || this.gameState?.status !== 'playing') return

    let paddle: 'left' | 'right' | null = null
    let direction: 'up' | 'down' | null = null

    // W/S for left paddle
    if (e.key === 'w' || e.key === 'W') {
      paddle = 'left'
      direction = 'up'
    } else if (e.key === 's' || e.key === 'S') {
      paddle = 'left'
      direction = 'down'
    }
    // Arrow keys for right paddle
    else if (e.key === 'ArrowUp') {
      paddle = 'right'
      direction = 'up'
      e.preventDefault() // Prevent page scroll
    } else if (e.key === 'ArrowDown') {
      paddle = 'right'
      direction = 'down'
      e.preventDefault()
    }

    if (paddle && direction) {
      this.sendWebSocketMessage({
        type: 'paddle',
        paddle,
        direction,
      })
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.sessionId || this.gameState?.status !== 'playing') return

    let paddle: 'left' | 'right' | null = null

    if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
      paddle = 'left'
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      paddle = 'right'
      e.preventDefault()
    }

    if (paddle) {
      this.sendWebSocketMessage({
        type: 'paddle',
        paddle,
        direction: 'stop',
      })
    }
  }
}
