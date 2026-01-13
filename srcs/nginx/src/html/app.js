(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../usr/share/nginx/src/service/HealthChecker.ts
  var HealthChecker = class {
    // Update status style
    async updateStatus(dot, label, isOnline, onlineText = "Ready", offlineText = "Offline") {
      var _a;
      if (!dot || !label) return;
      dot.className = `w-3 h-3 rounded-full bg-${isOnline ? "green" : "red"}-400 ${isOnline ? "animate-pulse" : ""}`;
      label.textContent = isOnline ? onlineText : offlineText;
      label.className = `text-${isOnline ? "green" : "red"}-400 text-sm font-mono`;
      const parent = (_a = dot.closest(".flex")) == null ? void 0 : _a.parentElement;
      if (parent) {
        if (isOnline) {
          parent.classList.remove("opacity-50");
        } else {
          parent.classList.add("opacity-50");
        }
      }
    }
    async checkNginx() {
      var _a;
      const nginxDot = document.getElementById("nginx-status");
      const nginxLabel = (_a = nginxDot == null ? void 0 : nginxDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/health");
        if (response.ok) {
          await this.updateStatus(nginxDot, nginxLabel, true);
          return true;
        } else {
          throw new Error("Nginx offline");
        }
      } catch (error) {
        console.warn("Nginx check failed:", error);
        await this.updateStatus(nginxDot, nginxLabel, false);
        return false;
      }
    }
    async checkUsers() {
      var _a;
      const usersDot = document.getElementById("users-status");
      const usersLabel = (_a = usersDot == null ? void 0 : usersDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/api/users");
        const data = await response.json();
        if (response.ok && usersDot) {
          await this.updateStatus(usersDot, usersLabel, true);
          return true;
        } else {
          throw new Error("users offline");
        }
      } catch (error) {
        console.warn("users check failed:", error);
        await this.updateStatus(usersDot, usersLabel, false);
        return false;
      }
    }
    async checkRedis() {
      var _a;
      const redisDot = document.getElementById("redis-status");
      const redisLabel = (_a = redisDot == null ? void 0 : redisDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/api/redis");
        const data = await response.json();
        if (response.ok && redisDot) {
          await this.updateStatus(redisDot, redisLabel, true);
          return true;
        } else {
          throw new Error("Redis offline");
        }
      } catch (error) {
        console.warn("Redis check failed:", error);
        await this.updateStatus(redisDot, redisLabel, false);
        return false;
      }
    }
    async checkAPI() {
      var _a;
      const apiDot = document.getElementById("api-status");
      const apiLabel = (_a = apiDot == null ? void 0 : apiDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        if (response.ok) {
          await this.updateStatus(apiDot, apiLabel, true);
          return true;
        } else {
          throw new Error("API offline");
        }
      } catch (error) {
        console.warn("API check failed:", error);
        await this.updateStatus(apiDot, apiLabel, false);
        return false;
      }
    }
    async checkGame() {
      var _a;
      const gameDot = document.getElementById("game-status");
      const gameLabel = (_a = gameDot == null ? void 0 : gameDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/api/game/health");
        const data = await response.json();
        if (response.ok) {
          await this.updateStatus(gameDot, gameLabel, true);
          return true;
        } else {
          throw new Error("Game-service offline");
        }
      } catch (error) {
        console.warn("Game check failed:", error);
        await this.updateStatus(gameDot, gameLabel, false);
        return false;
      }
    }
    async checkBlockchain() {
      var _a;
      const blockDot = document.getElementById("game-status");
      const blockLabel = (_a = blockDot == null ? void 0 : blockDot.nextElementSibling) == null ? void 0 : _a.nextElementSibling;
      try {
        const response = await fetch("/api/block/health");
        const data = await response.json();
        if (response.ok) {
          await this.updateStatus(blockDot, blockLabel, true);
          return true;
        } else {
          throw new Error("Blockchain-service offline");
        }
      } catch (error) {
        console.warn("Blockchain check failed:", error);
        await this.updateStatus(blockDot, blockLabel, false);
        return false;
      }
    }
    async checkAllServices() {
      const statusElement = document.getElementById("status");
      const nginxOnline = await this.checkNginx();
      const apiOnline = await this.checkAPI();
      const usersOnline = await this.checkUsers();
      const redisOnline = await this.checkRedis();
      const gameOnline = await this.checkGame();
      const blockchainOnline = await this.checkBlockchain();
      if (statusElement) {
        if (nginxOnline && apiOnline && redisOnline && usersOnline && gameOnline && blockchainOnline) {
          statusElement.textContent = "Online";
          statusElement.className = "px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white";
        } else {
          statusElement.textContent = "\u2717 Offline";
          statusElement.className = "px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white";
        }
      }
    }
    async checkHealth() {
      await this.checkAllServices();
    }
  };

  // ../usr/share/nginx/src/service/GameDisplay.ts
  var GameDisplay = class {
    constructor() {
      __publicField(this, "screen");
      __publicField(this, "main");
      __publicField(this, "gameState", null);
      __publicField(this, "resultDialog");
      __publicField(this, "panel");
      __publicField(this, "gameSessions");
      __publicField(this, "sessionsInterval", null);
      __publicField(this, "settings");
      __publicField(this, "gameArena");
      __publicField(this, "gameLogs");
      __publicField(this, "sessionId");
      __publicField(this, "canvas", null);
      __publicField(this, "context", null);
      __publicField(this, "reconnectAttempts", 0);
      __publicField(this, "maxReconnectAttempts", 5);
      __publicField(this, "websocket", null);
      __publicField(this, "pingInterval", null);
      __publicField(this, "settingsTimeout", null);
      this.gameLogs = document.createElement("div");
      this.screen = document.createElement("div");
      this.gameSessions = document.createElement("div");
      this.gameSessions.id = "game-sessions";
      this.settings = document.createElement("div");
      this.main = document.createElement("div");
      this.gameArena = document.createElement("div");
      this.panel = document.createElement("div");
      this.resultDialog = document.createElement("div");
      this.gameLogs.className = "hidden";
      this.settings.className = "hidden";
      this.screen.className = "hidden fixed inset-0 z-50 bg-black overflow-y-auto";
      this.main.className = "w-full h-full flex flex-row";
      this.panel.className = "w-1/3 bg-gray-800";
      this.gameArena.className = "hidden w-2/3 items-center";
      this.resultDialog.className = 'class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
      this.buildElements();
    }
    showPanel(panel) {
      ["settings", "game-logs", "game-sessions"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.toggle("hidden", id !== panel);
        }
      });
      if (panel === "game-sessions") {
        this.sessionsInterval = window.setInterval(() => this.loadSessions(), 2e3);
      } else if (this.sessionsInterval) {
        clearInterval(this.sessionsInterval);
        this.sessionsInterval = null;
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
              `;
    }
    makePanel() {
      this.panel.id = "panel";
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
      `;
    }
    makeSettings() {
      this.settings.id = "settings";
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
      `;
    }
    makeGameArena() {
      this.gameArena.innerHTML = `
        <!-- Game Canvas Area -->
          <div class="text-center space-y-6">
            <div class="relative">
              <canvas id="game-canvas" width="800" height="600" class="border-4 border-purple-500 rounded-lg shadow-2xl bg-black"></canvas>
            </div>
      `;
    }
    makeGameLogs() {
      this.gameLogs.id = "game-logs";
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
              <p class="text-gray-300 text-sm">Controls: <span class="text-purple-300 font-mono">W/S</span> for left paddle, <span class="text-purple-300 font-mono">\u2191/\u2193</span> for right paddle</span></p>
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
    `;
    }
    buildElements() {
      this.makeResultDialog();
      this.makeSettings();
      this.makeGameArena();
      this.makePanel();
      this.makeGameLogs();
      this.panel.appendChild(this.gameSessions);
      this.panel.appendChild(this.settings);
      this.panel.appendChild(this.gameLogs);
      this.main.appendChild(this.panel);
      this.main.appendChild(this.gameArena);
      this.screen.appendChild(this.main);
      document.body.appendChild(this.screen);
      this.setupEventListeners();
    }
    async askForGameSession() {
      if (this.sessionId) return;
      try {
        const response = await fetch("/api/game/create-session", {
          method: "POST",
          credentials: "include"
        });
        const data = await response.json();
        if (response.ok && data.sessionId) {
          this.gameArena.classList.remove("hidden");
          this.sessionId = data.sessionId;
          console.log("Created game session:", this.sessionId);
          console.log("game session result:", data);
          await this.openWebSocket(this.sessionId);
          this.showPanel("settings");
        } else {
          throw new Error(data.message || "Failed to create game session");
        }
      } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect to game service. Please try again.");
        throw error;
      }
    }
    async joinSession(sessionId) {
      if (this.sessionId) return;
      try {
        this.sessionId = sessionId;
        await this.openWebSocket(this.sessionId);
        this.showPanel("game-logs");
      } catch (error) {
        console.error("Failed to join session (bad session ?):", error);
        this.sessionId = void 0;
        throw error;
      }
    }
    async loadSessions() {
      try {
        const res = await fetch("/api/game/sessions");
        const data = await res.json();
        this.gameSessions.innerHTML = "";
        if (!data.sessions || data.sessions.length === 0) {
          this.gameSessions.innerHTML = `
                  <div class="text-gray-400 p-2">No active sessions</div>
              `;
          return;
        }
        data.sessions.forEach((session) => {
          const div = document.createElement("div");
          div.className = "p-4 mb-2 bg-gray-800 text-white rounded shadow cursor-pointer hover:bg-gray-700";
          div.innerHTML = `
                  <div class="font-bold text-lg">Session ${session.sessionId}</div>
                  <div class="text-sm text-gray-300">State: ${session.state}</div>
                  <div class="text-sm text-gray-300">Players: ${session.playerCount}</div>
                  <div class="text-sm text-gray-300">Interval running: ${session.hasInterval}</div>
              `;
          div.onclick = () => this.joinSession(session.sessionId);
          this.gameSessions.appendChild(div);
        });
      } catch (err) {
        console.error("Failed to load sessions:", err);
        this.gameSessions.innerHTML = `<div class="text-red-500 p-2">Error loading gameSessions.</div>`;
      }
    }
    display() {
      var _a, _b;
      try {
        console.log("game display: showing game UI");
        this.screen.classList.remove("hidden");
        this.main.classList.remove("hidden");
        this.showPanel("game-sessions");
        (_a = document.getElementById("first-screen")) == null ? void 0 : _a.classList.add("hidden");
        this.canvas = this.gameArena.querySelector("#game-canvas");
        this.context = ((_b = this.canvas) == null ? void 0 : _b.getContext("2d")) || null;
        this.drawWaitingScreen();
      } catch (error) {
        console.error("Failed to create game session in display():", error);
      }
    }
    setupEventListeners() {
      const form = document.getElementById("settings-form");
      if (!form) return;
      const inputs = form.querySelectorAll('input[type="range"]');
      inputs.forEach((input) => {
        const rangeInput = input;
        const name = rangeInput.name;
        const valueSpan = document.getElementById(`val-${name}`);
        rangeInput.addEventListener("input", async () => {
          if (valueSpan) {
            valueSpan.textContent = rangeInput.value;
          }
          await this.submitSettings();
        });
        if (valueSpan) {
          valueSpan.textContent = rangeInput.value;
        }
      });
      const newSessionBtn = document.getElementById("create-session-btn");
      if (newSessionBtn) {
        newSessionBtn.addEventListener("click", () => this.askForGameSession());
      }
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (target.id === "create-game-btn") this.askForGameSession();
        if (target.id === "exit-btn") this.exitGame();
        if (target.id === "stop-btn" || target.id === "stop2-btn") {
          this.stopGame();
          this.showPanel("game-sessions");
        }
        if (target.id === "start-btn" && this.sessionId) this.startGame();
      });
      document.addEventListener("keydown", (e) => this.handleKeyDown(e));
      document.addEventListener("keyup", (e) => this.handleKeyUp(e));
    }
    stopGame() {
      this.gameLogs.classList.add("hidden");
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage({ type: "stop" });
      }
      this.stopPingInterval();
      if (this.websocket) {
        this.websocket.close(1e3, "User exited game");
        this.websocket = null;
      }
      this.updateConnectionStatus(false, "Disconnected");
      this.sessionId = void 0;
      this.gameState = null;
      this.drawWaitingScreen();
      console.log("Game stoped");
    }
    exitGame() {
      var _a;
      this.stopGame();
      (_a = document.getElementById("first-screen")) == null ? void 0 : _a.classList.remove("hidden");
      this.screen.classList.add("hidden");
      this.addGameLog("Disconnected from game", "warning");
      console.log("Exited game");
      if (this.sessionsInterval) {
        console.log("clear interval");
        clearInterval(this.sessionsInterval);
        this.sessionsInterval = null;
      }
    }
    async submitSettings() {
      if (this.settingsTimeout) {
        clearTimeout(this.settingsTimeout);
      }
      this.settingsTimeout = window.setTimeout(async () => {
        const form = document.getElementById("settings-form");
        try {
          if (form) {
            const formData = new FormData(form);
            const settings = {
              ballRadius: Number(formData.get("ballRadius")),
              ballSpeed: Number(formData.get("ballSpeed")),
              ballMass: Number(formData.get("ballMass")),
              paddleSpeed: Number(formData.get("paddleSpeed")),
              microWaveSize: Number(formData.get("microWaveSize"))
            };
            await fetch("/api/game/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                sessionId: this.sessionId,
                settings
              })
            });
            console.log("settings saved !");
          }
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      }, 300);
    }
    async startGame() {
      this.showPanel("game-logs");
      try {
        this.sendWebSocketMessage({ type: "start" });
        this.addGameLog("Game started!", "success");
      } catch (error) {
        console.error("Failed to start game:", error);
        this.addGameLog(`Error: ${error}`, "error");
      }
    }
    addGameLog(message, type = "info") {
      const logContainer = document.getElementById("game-log");
      if (!logContainer) return;
      const colorClass = {
        info: "text-blue-400",
        success: "text-green-400",
        error: "text-red-400",
        warning: "text-yellow-400"
      }[type];
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const logEntry = document.createElement("div");
      logEntry.className = colorClass;
      logEntry.textContent = `[${timestamp}] ${message}`;
      logContainer.appendChild(logEntry);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
    sendWebSocketMessage(message) {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(message));
      } else {
        console.warn("WebSocket not connected, cannot send message");
        this.addGameLog("Cannot send message - not connected", "error");
      }
    }
    startPingInterval() {
      this.pingInterval = window.setInterval(() => {
        this.sendWebSocketMessage({ type: "ping" });
      }, 3e4);
    }
    stopPingInterval() {
      if (this.pingInterval !== null) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    }
    handleServerMessage(message) {
      switch (message.type) {
        case "connected":
          if (message.data) {
            console.log(message);
            this.gameState = message.data;
            console.log("Session ID:", message.sessionId);
            this.sessionId = message.sessionId;
            this.addGameLog(`Connected to new session: ${this.sessionId}`, "success");
            if (this.gameState.status === "waiting") {
              this.drawPreview();
            } else if (this.gameState.status === "playing") {
              this.updateScores(message.data.scores);
              this.renderGame();
            }
            console.log("URL updated to:", window.location.pathname);
          }
          break;
        case "state":
          if (message.data) {
            this.gameState = message.data;
            if (this.gameState.status === "waiting") {
              this.updateScores({ left: 0, right: 0 });
              this.drawPreview();
              break;
            }
            this.updateScores(message.data.scores);
            this.renderGame();
            const statusText2 = document.getElementById("game-status-text");
            if (statusText2 && message.data.status) {
              statusText2.textContent = message.data.status.charAt(0).toUpperCase() + message.data.status.slice(1);
              statusText2.className = `text-xl font-semibold ${message.data.status === "playing" ? "text-green-400" : message.data.status === "finished" ? "text-red-400" : "text-yellow-400"}`;
            }
          }
          break;
        case "gameOver":
          this.addGameLog(`Game Over! ${message.message || ""}`, "warning");
          const startBtn = document.getElementById("start-game-btn");
          if (startBtn) {
            startBtn.disabled = false;
          }
          if (message.data) {
            this.gameState = message.data;
          }
          if (message.data) {
            this.updateScores(message.data.scores);
          }
          this.drawWaitingScreen();
          this.sessionId = void 0;
          this.gameState = null;
          const statusText = document.getElementById("game-status-text");
          if (statusText) {
            statusText.textContent = "Game Over";
            statusText.className = "text-xl font-semibold text-red-400";
          }
          break;
        case "error":
          this.addGameLog(`Error: ${message.message}`, "error");
          break;
        case "pong":
          break;
      }
    }
    renderNoiseField(noiseField) {
      if (!this.context || !this.canvas) return;
      if (!noiseField) {
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        return;
      }
      const height = noiseField.length;
      const width = noiseField[0].length;
      const pixelSize = this.canvas.height / height;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = noiseField[y][x];
          const hue = value * 360;
          this.context.fillStyle = `hsl(${hue}, 100%, 50%)`;
          this.context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    renderGame() {
      if (!this.context || !this.canvas || !this.gameState) return;
      this.context.fillStyle = "#000000";
      this.renderNoiseField(this.gameState.cosmicBackground);
      this.context.strokeStyle = "#444444";
      this.context.setLineDash([10, 10]);
      this.context.beginPath();
      this.context.moveTo(this.canvas.width / 2, 0);
      this.context.lineTo(this.canvas.width / 2, this.canvas.height);
      this.context.stroke();
      this.context.setLineDash([]);
      this.context.fillStyle = "#ffffff";
      this.context.fillRect(
        20,
        this.gameState.paddles.left.y,
        10,
        this.gameState.paddles.left.height
      );
      this.context.fillRect(
        this.canvas.width - 30,
        this.gameState.paddles.right.y,
        10,
        this.gameState.paddles.right.height
      );
      this.context.beginPath();
      this.context.arc(
        this.gameState.ball.x,
        this.gameState.ball.y,
        this.gameState.ball.radius,
        0,
        Math.PI * 2
      );
      this.context.fill();
    }
    updateScores(scores) {
      const player1Score = document.getElementById("player1-score");
      const player2Score = document.getElementById("player2-score");
      if (player1Score) player1Score.textContent = scores.left.toString();
      if (player2Score) player2Score.textContent = scores.right.toString();
    }
    async openWebSocket(sessionId) {
      return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/game/${sessionId}`;
        this.addGameLog(`Connecting to ${wsUrl}`, "info");
        this.websocket = new WebSocket(wsUrl);
        const connectionTimeout = setTimeout(() => {
          var _a, _b;
          if (((_a = this.websocket) == null ? void 0 : _a.readyState) !== WebSocket.OPEN) {
            (_b = this.websocket) == null ? void 0 : _b.close();
            this.addGameLog("Connection timeout", "error");
            reject(new Error("WebSocket connection timeout"));
          }
        }, 5e3);
        this.websocket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.addGameLog("WebSocket connected", "success");
          this.updateConnectionStatus(true, "Connected (WebSocket)");
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve();
        };
        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };
        this.websocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket error:", error);
          this.addGameLog("WebSocket error occurred", "error");
          this.updateConnectionStatus(false, "Disconnected");
          reject(error);
        };
        this.websocket.onclose = (event) => {
          var _a;
          clearTimeout(connectionTimeout);
          if (event.code !== 1e3) {
            this.addGameLog(
              `Connection closed: ${event.code} - ${event.reason || "Unknown reason"}`,
              "error"
            );
            if (((_a = this.websocket) == null ? void 0 : _a.readyState) !== WebSocket.OPEN) {
              reject(
                new Error(
                  `WebSocket closed with code ${event.code}: ${event.reason || "Connection rejected"}`
                )
              );
            }
          } else {
            this.addGameLog("Connection closed normally", "info");
          }
          this.updateConnectionStatus(false, "Disconnected");
          this.stopPingInterval();
        };
      });
    }
    updateConnectionStatus(connected, text) {
      const statusDot = document.getElementById("game-connection-status");
      const statusText = document.getElementById("game-connection-text");
      if (statusDot && statusText) {
        if (connected) {
          statusDot.className = "w-3 h-3 rounded-full bg-green-500 animate-pulse";
          statusText.className = "text-green-400 text-sm";
        } else {
          statusDot.className = "w-3 h-3 rounded-full bg-red-500";
          statusText.className = "text-red-400 text-sm";
        }
        statusText.textContent = text;
      }
    }
    drawPreview() {
      if (!this.context || !this.canvas || !this.gameState) return;
      this.context.fillStyle = "#000000";
      this.renderNoiseField(this.gameState.cosmicBackground);
      this.context.strokeStyle = "#444444";
      this.context.setLineDash([10, 10]);
      this.context.beginPath();
      this.context.moveTo(this.canvas.width / 2, 0);
      this.context.lineTo(this.canvas.width / 2, this.canvas.height);
      this.context.stroke();
      this.context.setLineDash([]);
      this.context.fillStyle = "#ffffff";
      this.context.fillRect(
        20,
        this.gameState.paddles.left.y,
        10,
        this.gameState.paddles.left.height
      );
      this.context.fillRect(
        this.canvas.width - 30,
        this.gameState.paddles.right.y,
        10,
        this.gameState.paddles.right.height
      );
      this.context.beginPath();
      this.context.arc(
        this.gameState.ball.x,
        this.gameState.ball.y,
        this.gameState.ball.radius,
        0,
        Math.PI * 2
      );
      this.context.fill();
    }
    drawWaitingScreen() {
      if (!this.context || !this.canvas) return;
      this.context.fillStyle = "#000000";
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.strokeStyle = "#ffffff";
      this.context.setLineDash([10, 10]);
      this.context.beginPath();
      this.context.moveTo(this.canvas.width / 2, 0);
      this.context.lineTo(this.canvas.width / 2, this.canvas.height);
      this.context.stroke();
      this.context.fillStyle = "#ffffff";
      this.context.font = "24px Arial";
      this.context.textAlign = "center";
      this.context.fillText(
        "Press START GAME to begin",
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }
    handleKeyDown(e) {
      var _a;
      if (!this.sessionId || ((_a = this.gameState) == null ? void 0 : _a.status) !== "playing") return;
      let paddle = null;
      let direction = null;
      if (e.key === "w" || e.key === "W") {
        paddle = "left";
        direction = "up";
      } else if (e.key === "s" || e.key === "S") {
        paddle = "left";
        direction = "down";
      } else if (e.key === "ArrowUp") {
        paddle = "right";
        direction = "up";
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        paddle = "right";
        direction = "down";
        e.preventDefault();
      }
      if (paddle && direction) {
        this.sendWebSocketMessage({
          type: "paddle",
          paddle,
          direction
        });
      }
    }
    handleKeyUp(e) {
      var _a;
      if (!this.sessionId || ((_a = this.gameState) == null ? void 0 : _a.status) !== "playing") return;
      let paddle = null;
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        paddle = "left";
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        paddle = "right";
        e.preventDefault();
      }
      if (paddle) {
        this.sendWebSocketMessage({
          type: "paddle",
          paddle,
          direction: "stop"
        });
      }
    }
  };

  // ../usr/share/nginx/src/service/DisplayProvider.ts
  var DisplayProvider = class {
    constructor() {
      __publicField(this, "gameScreen");
      __publicField(this, "startTime");
      __publicField(this, "healthChecker");
      // private gameContainer: HTMLElement | null = null
      // private sessionsListContainer: HTMLElement | null = null
      // private canvas: HTMLCanvasElement | null = null
      // private ctx: CanvasRenderingContext2D | null = null
      __publicField(this, "gameState", null);
      __publicField(this, "sessionId", null);
      __publicField(this, "ws", null);
      __publicField(this, "pingInterval", null);
      __publicField(this, "reconnectAttempts", 0);
      __publicField(this, "maxReconnectAttempts", 5);
      console.log("init");
      this.startTime = Date.now();
      this.healthChecker = new HealthChecker();
      this.init();
      this.gameScreen = new GameDisplay();
    }
    init() {
      this.updateTime();
      this.updateUptime();
      this.createParticles();
      this.setupEventListeners();
    }
    updateTime() {
      const now = /* @__PURE__ */ new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const timeElement = document.getElementById("server-time");
      if (timeElement) {
        timeElement.textContent = timeString;
      }
    }
    updateUptime() {
      const elapsed = Date.now() - this.startTime;
      const hours = Math.floor(elapsed / 36e5);
      const minutes = Math.floor(elapsed % 36e5 / 6e4);
      const seconds = Math.floor(elapsed % 6e4 / 1e3);
      const uptimeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      const uptimeElement = document.getElementById("uptime");
      if (uptimeElement) {
        uptimeElement.textContent = uptimeString;
      }
    }
    createParticles() {
      const container = document.getElementById("particles");
      if (!container) return;
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement("div");
        particle.className = "absolute w-1 h-1 bg-white rounded-full opacity-30";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animation = `float ${3 + Math.random() * 4}s ease-in-out infinite`;
        particle.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(particle);
      }
    }
    setupEventListeners() {
      const gameBtn = document.getElementById("gameBtn");
      if (gameBtn) {
        gameBtn.addEventListener("click", () => this.gameScreen.display());
      }
    }
  };

  // ../usr/share/nginx/src/index.ts
  document.addEventListener("DOMContentLoaded", () => {
    new DisplayProvider();
  });
})();
