class HealthChecker {
    // Update status style
    private async updateStatus(
        dot: HTMLElement | null,
        label: HTMLElement | null,
        isOnline: boolean,
        onlineText = 'Ready',
        offlineText = 'Offline'
    ) {
        if (!dot || !label) return;

        dot.className = `w-3 h-3 rounded-full bg-${isOnline ? 'green' : 'red'}-400 ${isOnline ? 'animate-pulse' : ''}`;
        label.textContent = isOnline ? onlineText : offlineText;
        label.className = `text-${isOnline ? 'green' : 'red'}-400 text-sm font-mono`;

        const parent = dot.closest('.flex')?.parentElement;
        if (parent) {
            if (isOnline) {
                parent.classList.remove('opacity-50');
            } else {
                parent.classList.add('opacity-50');
            }
        }
    }

    private async checkNginx(): Promise<boolean> {
        const nginxDot = document.getElementById('nginx-status');
        const nginxLabel = nginxDot?.nextElementSibling?.nextElementSibling as HTMLElement;

        try {
            const response = await fetch('/health');
            if (response.ok) {
                await this.updateStatus(nginxDot, nginxLabel, true);
                return true;
            } else {
                throw new Error('Nginx offline');
            }
        } catch (error) {
            console.warn('Nginx check failed:', error);
            await this.updateStatus(nginxDot, nginxLabel, false);
            return false;
        }
    }

    private async checkUsers(): Promise<boolean> {
        const usersDot = document.getElementById('users-status');
        const usersLabel = usersDot?.nextElementSibling?.nextElementSibling as HTMLElement;
        try {
            const response = await fetch('/api/users');
            const data = await response.json();

            if (response.ok && usersDot) {
                await this.updateStatus(usersDot, usersLabel, true);
                return true;
            } else {
                throw new Error('users offline');
            }
        } catch (error) {
            console.warn('users check failed:', error);
            await this.updateStatus(usersDot, usersLabel, false);
            return false;
        }
    }

    private async checkRedis(): Promise<boolean> {
        const redisDot = document.getElementById('redis-status');
        const redisLabel = redisDot?.nextElementSibling?.nextElementSibling as HTMLElement;
        try {
            const response = await fetch('/api/redis');
            const data = await response.json();

            if (response.ok && redisDot) {
                await this.updateStatus(redisDot, redisLabel, true);
                return true;
            } else {
                throw new Error('Redis offline');
            }
        } catch (error) {
            console.warn('Redis check failed:', error);
            await this.updateStatus(redisDot, redisLabel, false);
            return false;
        }
    }

    private async checkAPI(): Promise<boolean> {
        const apiDot = document.getElementById('api-status');
        const apiLabel = apiDot?.nextElementSibling?.nextElementSibling as HTMLElement;

        try {
            const response = await fetch('/api/health');
            const data = await response.json();

            if (response.ok) {
                await this.updateStatus(apiDot, apiLabel, true);
                return true;
            } else {
                throw new Error('API offline');
            }
        } catch (error) {
            console.warn('API check failed:', error);
            await this.updateStatus(apiDot, apiLabel, false);
            return false;
        }
    }

    private async checkGame(): Promise<boolean> {
        const gameDot = document.getElementById('game-status');
        const gameLabel = gameDot?.nextElementSibling?.nextElementSibling as HTMLElement;

        try {
            const response = await fetch('/api/game/health');
            const data = await response.json();

            if (response.ok) {
                await this.updateStatus(gameDot, gameLabel, true);
                return true;
            } else {
                throw new Error('Game-service offline');
            }
        } catch (error) {
            console.warn('Game check failed:', error);
            await this.updateStatus(gameDot, gameLabel, false);
            return false;
        }
    }

    private async checkAllServices(): Promise<void> {
        const statusElement = document.getElementById('status');
        const nginxOnline = await this.checkNginx();
        const apiOnline = await this.checkAPI();
        const usersOnline = await this.checkUsers();
        const redisOnline = await this.checkRedis();
        const gameOnline = await this.checkGame();

        if (statusElement) {
            if (nginxOnline && apiOnline && redisOnline && usersOnline && gameOnline) {
                statusElement.textContent = 'Online';
                statusElement.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white';
            } else {
                statusElement.textContent = '✗ Offline';
                statusElement.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white';
            }
        }
    }

    public async checkHealth(): Promise<void> {
        await this.checkAllServices();
    }
}

// Game state interface matching server updates

interface GameState {
    ball: { x: number; y: number; radius: number };
    paddles: {
        left: { y: number; height: number };
        right: { y: number; height: number };
    };
    scores: { left: number; right: number };
    status: 'waiting' | 'playing' | 'paused' | 'finished';
}

// WebSocket message types
interface ServerMessage {
    type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
    sessionId?: string;
    data?: GameState;
    message?: string;
}

interface ClientMessage {
    type: 'paddle' | 'start' | 'stop' | 'ping';
    paddle?: 'left' | 'right';
    direction?: 'up' | 'down' | 'stop';
}

class TranscendenceApp {
    private startTime: number;
    private healthChecker: HealthChecker;
    private gameContainer: HTMLElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private gameState: GameState | null = null;
    private sessionId: string | null = null;
    private ws: WebSocket | null = null;
    private pingInterval: number | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        this.startTime = Date.now();
        this.healthChecker = new HealthChecker();
        this.init();
    }

    private init(): void {
        this.updateTime();
        this.updateUptime();
        this.createParticles();
        this.setupEventListeners();
        this.createGameContainer();

        // setInterval(() => this.updateTime(), 1000);
        // setInterval(() => this.updateUptime(), 1000);
        // setInterval(() => this.healthChecker.checkHealth(), 1000);
        // this.healthChecker.checkHealth();
    }
private createGameContainer(): void {
    this.gameContainer = document.createElement('div');
    this.gameContainer.id = 'game-container';
    this.gameContainer.className = 'hidden fixed inset-0 z-50 bg-black overflow-y-auto'; // overflow-y-auto added
    this.gameContainer.innerHTML = `
        <div class="relative w-full flex flex-col"> <!-- Removed h-full -->
            <!-- Game Header -->
            <div class="bg-gradient-to-r from-purple-900 to-blue-900 p-4 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <h2 class="text-2xl font-bold text-white">Transcendence - Pong</h2>
                    <div class="flex items-center space-x-2">
                        <div id="game-connection-status" class="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span id="game-connection-text" class="text-yellow-400 text-sm">Connecting...</span>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <button id="start-game-btn" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        START GAME
                    </button>
                    <button id="exit-game-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all">
                        Exit
                    </button>
                </div>
            </div>
            <!-- Game Over dial box -->
            <div id="game-over-dialog" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-blue-500">
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
                    
                    <!-- Buttons -->
                    <div class="flex gap-4">
                        <button id="new-game-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition">
                            New Game
                        </button>
                        <button id="close-dialog-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition">
                            Close
                        </button>
                    </div>
                </div>
            </div>
            <!-- Game Canvas Area -->
            <div class="flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 py-8"> <!-- Removed flex-1, added py-8 -->
                <div class="text-center space-y-6">
                    <div class="relative">
                        <canvas id="game-canvas" width="800" height="600" class="border-4 border-purple-500 rounded-lg shadow-2xl bg-black"></canvas>
                    </div>
                    
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
                        <p class="text-gray-300 text-sm">
                            Controls: <span class="text-purple-300 font-mono">W/S</span> for left paddle, 
                            <span class="text-purple-300 font-mono">↑/↓</span> for right paddle
                        </p>
                    </div>

                    <!-- Game Log -->
                    <div class="bg-white/5 backdrop-blur rounded-lg p-4 max-w-2xl mx-auto">
                        <h3 class="text-sm font-semibold text-purple-300 mb-2">Game Log</h3>
                        <div id="game-log" class="h-24 overflow-y-auto space-y-1 text-left text-sm font-mono text-gray-300">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(this.gameContainer);
}
    private showGameOverDialog(gameData: GameState) {
        const dialog = document.getElementById('game-over-dialog');
        const scoreP1 = document.getElementById('final-score-p1');
        const scoreP2 = document.getElementById('final-score-p2');
        const winnerMsg = document.getElementById('winner-message');
        
        if (!dialog) return;
        
        // Update scores
        if (gameData && gameData.scores) {
            if (scoreP1) scoreP1.textContent = gameData.scores.left || 0;
            if (scoreP2) scoreP2.textContent = gameData.scores.right || 0;
            
            // Determine winner
            if (winnerMsg) {
                if (gameData.scores.player1 > gameData.scores.player2) {
                    winnerMsg.textContent = '🎉 Player 1 Wins!';
                } else if (gameData.scores.player2 > gameData.scores.player1) {
                    winnerMsg.textContent = '🎉 Player 2 Wins!';
                } else {
                    winnerMsg.textContent = "It's a Tie!";
                }
            }
        }
        
        // Show dialog
        dialog.classList.remove('hidden');
        
        // Setup button handlers
        const newGameBtn = document.getElementById('new-game-btn');
        const closeBtn = document.getElementById('close-dialog-btn');
        
        if (newGameBtn) {
            newGameBtn.onclick = () => {
                dialog.classList.add('hidden');
                this.loadGame(true); // recreate WebSocket connection --> redondant, to be avoided
            };
        }
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                dialog.classList.add('hidden');
                this.drawWaitingScreen();
            };
        }
    }

    private addGameLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        const logContainer = document.getElementById('game-log');
        if (!logContainer) return;

        const colorClass = {
            'info': 'text-blue-400',
            'success': 'text-green-400',
            'error': 'text-red-400',
            'warning': 'text-yellow-400'
        }[type];

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = colorClass;
        logEntry.textContent = `[${timestamp}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    private updateConnectionStatus(connected: boolean, text: string): void {
        const statusDot = document.getElementById('game-connection-status');
        const statusText = document.getElementById('game-connection-text');
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
                statusText.className = 'text-green-400 text-sm';
            } else {
                statusDot.className = 'w-3 h-3 rounded-full bg-red-500';
                statusText.className = 'text-red-400 text-sm';
            }
            statusText.textContent = text;
        }
    }

    private async createWebSocketConnection(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Determine WebSocket URL (assuming same host)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/game/${sessionId}`;
            
            this.addGameLog(`Connecting to ${wsUrl}`, 'info');
            
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.addGameLog('WebSocket connected', 'success');
                this.updateConnectionStatus(true, 'Connected (WebSocket)');
                this.reconnectAttempts = 0;
                
                // Start ping interval to keep connection alive
                this.startPingInterval();
                
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: ServerMessage = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.addGameLog('WebSocket error occurred', 'error');
                reject(error);
            };

            this.ws.onclose = (event) => {
                this.addGameLog(`WebSocket closed (code: ${event.code})`, 'warning');
                this.updateConnectionStatus(false, 'Disconnected');
                this.stopPingInterval();
                
                // Attempt reconnection if not intentional
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    this.addGameLog(`Reconnecting... (attempt ${this.reconnectAttempts})`, 'warning');
                    setTimeout(() => {
                        if (this.sessionId) {
                            this.createWebSocketConnection(this.sessionId);
                        }
                    }, 2000);
                }
            };

            // Timeout for connection
            setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    private handleServerMessage(message: ServerMessage): void {
        switch (message.type) {
            case 'newSession':
               if (message.data) {
                    console.log(message);
                    this.gameState = message.data;
                    console.log('Session ID:', message.sessionId);
                    this.sessionId = message.sessionId;
                    this.addGameLog(`Connected to new session: ${this.sessionId}`, 'success');
                    if (this.gameState.status === 'waiting') {
                      this.drawWaitingScreen();
                    } else if (this.gameState.status === 'playing') {
                      this.updateScores(message.data.scores);
                      this.renderGame();
                    }
                    console.log('URL updated to:', window.location.pathname); // Verify it changed
                }
                break;

            case 'state':
                if (message.data) {
                    this.gameState = message.data;
                    this.updateScores(message.data.scores);
                    this.renderGame();
                    
                    // Update status text
                    const statusText = document.getElementById('game-status-text');
                    if (statusText && message.data.status) {
                        statusText.textContent = message.data.status.charAt(0).toUpperCase() + message.data.status.slice(1);
                        statusText.className = `text-xl font-semibold ${
                            message.data.status === 'playing' ? 'text-green-400' : 
                            message.data.status === 'finished' ? 'text-red-400' : 
                            'text-yellow-400'
                        }`;
                    }
                }
                break;

            case 'gameOver':
                this.addGameLog(`Game Over! ${message.message || ''}`, 'warning');
                const startBtn = document.getElementById('start-game-btn');
                if (startBtn) {
                  (startBtn as HTMLButtonElement).disabled = false;
                }
                this.drawWaitingScreen();
                this.sessionId = null;

                this.showGameOverDialog(this.gameState);
                this.gameState = null;


                const statusText = document.getElementById('game-status-text');
                if (statusText) {
                    statusText.textContent = 'Game Over';
                    statusText.className = 'text-xl font-semibold text-red-400';
                }
                break;

            case 'error':
                this.addGameLog(`Error: ${message.message}`, 'error');
                break;

            case 'pong':
                // Heartbeat response - connection is alive
                break;
        }
    }

    private sendWebSocketMessage(message: ClientMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, cannot send message');
            this.addGameLog('Cannot send message - not connected', 'error');
        }
    }

    private startPingInterval(): void {
        this.pingInterval = window.setInterval(() => {
            this.sendWebSocketMessage({ type: 'ping' });
        }, 30000); // Ping every 30 seconds
    }

    private stopPingInterval(): void {
        if (this.pingInterval !== null) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private async loadGame(createSocket: boolean): Promise<void> {
        try {
            const gameBtn = document.getElementById('gameBtn');
            if (gameBtn) {
                gameBtn.textContent = 'Connecting...';
                gameBtn.classList.add('opacity-50');
            }

            // Create game session via HTTP first
            const response = await fetch('/api/game/create-session', {
                method: 'POST',
						    credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.sessionId) {
                this.sessionId = data.sessionId;
                console.log('Created game session:', this.sessionId);
                
                // Hide main content
                const mainContent = document.querySelector('.relative.z-10') as HTMLElement;
                if (mainContent) {
                    mainContent.classList.add('hidden');
                }

                // Show game container
                if (this.gameContainer) {
                    this.gameContainer.classList.remove('hidden');
                }

                // Initialize canvas
                this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                this.ctx = this.canvas?.getContext('2d') || null;

                // Connect via WebSocket
                if (createSocket)
                  await this.createWebSocketConnection(this.sessionId);
                
                this.addGameLog('Ready to play! Press START GAME', 'info');
                this.drawWaitingScreen();

            } else {
                throw new Error(data.message || 'Failed to create game session');
            }
        } catch (error) {
            console.error('Connection error:', error);
            alert('Failed to connect to game service. Please try again.');
            // console.log(data);
            const gameBtn = document.getElementById('gameBtn');
            if (gameBtn) {
                gameBtn.textContent = 'start again';
                gameBtn.classList.remove('opacity-50');
            }
        }
    }

    private async startGameSession(): Promise<void> {
        try {
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn) {
                startBtn.textContent = 'Starting...';
                (startBtn as HTMLButtonElement).disabled = true;
            }

            // Send start command via WebSocket
            this.sendWebSocketMessage({ type: 'start' });
            this.addGameLog('Game started!', 'success');
            if (startBtn) {
                startBtn.textContent = 'Running';
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            this.addGameLog(`Error: ${error}`, 'error');
            
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn) {
                startBtn.textContent = 'START GAME';
                (startBtn as HTMLButtonElement).disabled = false;
            }
        }
    }

    private updateScores(scores: Scores): void {
        const player1Score = document.getElementById('player1-score');
        const player2Score = document.getElementById('player2-score');
        
        if (player1Score) player1Score.textContent = scores.left.toString();
        if (player2Score) player2Score.textContent = scores.right.toString();
    }

    private drawWaitingScreen(): void {
        if (!this.ctx || !this.canvas) return;

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press START GAME to begin', this.canvas.width / 2, this.canvas.height / 2);
    }

    private renderGame(): void {
        if (!this.ctx || !this.canvas || !this.gameState) return;

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = '#444444';
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw left paddle
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(
            20, 
            this.gameState.paddles.left.y, 
            10, 
            this.gameState.paddles.left.height
        );

        // Draw right paddle
        this.ctx.fillRect(
            this.canvas.width - 30, 
            this.gameState.paddles.right.y, 
            10, 
            this.gameState.paddles.right.height
        );

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.ball.x, 
            this.gameState.ball.y, 
            this.gameState.ball.radius, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
    }

    private exitGame(): void {
        // Send stop command
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendWebSocketMessage({ type: 'stop' });
        }

        // Close WebSocket
        this.stopPingInterval();
        if (this.ws) {
            this.ws.close(1000, 'User exited game');
            this.ws = null;
        }
        
        if (this.gameContainer) {
            this.gameContainer.classList.add('hidden');
        }

        const mainContent = document.querySelector('.relative.z-10') as HTMLElement;
        if (mainContent) {
            mainContent.classList.remove('hidden');
        }

        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.textContent = 'PLAY';
            (startBtn as HTMLButtonElement).disabled = false;
            startBtn.classList.remove('opacity-50');
        }

        this.addGameLog('Disconnected from game', 'warning');
        this.updateConnectionStatus(false, 'Disconnected');
        this.sessionId = null;
        this.gameState = null;
        console.log('Exited game');
    }

    private updateTime(): void {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const timeElement = document.getElementById('server-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    private updateUptime(): void {
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        const uptimeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            uptimeElement.textContent = uptimeString;
        }
    }

    private createParticles(): void {
        const container = document.getElementById('particles');
        if (!container) return;

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'absolute w-1 h-1 bg-white rounded-full opacity-30';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animation = `float ${3 + Math.random() * 4}s ease-in-out infinite`;
            particle.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(particle);
        }
    }

    private setupEventListeners(): void {

        const gameBtn = document.getElementById('gameBtn');
        if (gameBtn) {
            gameBtn.addEventListener('click', () => this.loadGame(true));
        }

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.id === 'exit-game-btn') {
                this.exitGame();
            }
            if (target.id === 'start-game-btn') {
                if (this.sessionId) {
                  this.startGameSession();
                }
                console.log("start game");
            }
        });

        // Keyboard controls for paddles
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.sessionId || this.gameState?.status !== 'playing') return;

        let paddle: 'left' | 'right' | null = null;
        let direction: 'up' | 'down' | null = null;

        // W/S for left paddle
        if (e.key === 'w' || e.key === 'W') {
            paddle = 'left';
            direction = 'up';
        } else if (e.key === 's' || e.key === 'S') {
            paddle = 'left';
            direction = 'down';
        }
        // Arrow keys for right paddle
        else if (e.key === 'ArrowUp') {
            paddle = 'right';
            direction = 'up';
            e.preventDefault(); // Prevent page scroll
        } else if (e.key === 'ArrowDown') {
            paddle = 'right';
            direction = 'down';
            e.preventDefault();
        }

        if (paddle && direction) {
            this.sendWebSocketMessage({ 
                type: 'paddle', 
                paddle, 
                direction 
            });
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (!this.sessionId || this.gameState?.status !== 'playing') return;

        let paddle: 'left' | 'right' | null = null;

        if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
            paddle = 'left';
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            paddle = 'right';
            e.preventDefault();
        }

        if (paddle) {
            this.sendWebSocketMessage({ 
                type: 'paddle', 
                paddle, 
                direction: 'stop' 
            });
        }
    }

    private animateRefresh(button: HTMLElement): void {
        button.classList.add('rotate-180');
        button.textContent = '↻ Refreshing...';

        setTimeout(() => {
            button.classList.remove('rotate-180');
            button.textContent = 'Refresh Status';
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TranscendenceApp();
});
