import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PongGame } from '../core/game.engine.js';
import { randomUUID } from 'crypto';
import { gameSessions, playerConnections } from '../core/game.state.js'
import { ServerMessage, ClientMessage } from '../core/game.types.js'

  export async function newGameSession(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = randomUUID();
    const game = new PongGame(sessionId);

    gameSessions.set(sessionId, game);
    playerConnections.set(sessionId, new Set());
    
    request.log.info(`[${sessionId}] New game session created`);

    return {
      status: 'success',
      message: 'Game session created',
      sessionId,
      wsUrl: `/game/${sessionId}`
    };
  }

  export async function healthCheck(request: FastifyRequest, reply: FastifyReply) {
    return {
      status: 'healthy',
      service: 'websocket-game-service',
      activeSessions: gameSessions.size,
      activeConnections: Array.from(playerConnections.values())
        .reduce((sum, conns) => sum + conns.size, 0),
      timestamp: new Date().toISOString()
    };
  }

// Remove closed connections
function cleanupConnection(app: FastifyInstance, sessionId: string, ws: WebSocket) {
  const connections = playerConnections.get(sessionId);
  console.log(connections);
  if (connections) {
    // connections.delete(ws);
    if (connections.size === 0) {
      playerConnections.delete(sessionId);
      // Stop game if no players connected
      const game = gameSessions.get(sessionId);
      if (game) {
        game.stop();
        gameSessions.delete(sessionId);
        app.log.info(`[${sessionId}] Game stopped - no players connected`);
      }
    }
  }
}

// Broadcast state to all clients in a session
function broadcastToSession(sessionId: string, message: ServerMessage) {
  const connections = playerConnections.get(sessionId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  connections.forEach(ws => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    } catch (err) {
      console.error('Failed to send to client:', err);
    }
  });
}


export async function listGameSessions(request: FastifyRequest, reply: FastifyReply) {
    const sessions = Array.from(gameSessions.entries()).map(([id, game]) => ({
      sessionId: id,
      state: game.getState(),
      playerCount: playerConnections.get(id)?.size || 0
    }));

    return {
      status: 'success',
      count: sessions.length,
      sessions
    };
}

function handleIncomingMessage(this: FastifyInstance, ws: any, game: PongGame | undefined, sessionId: any)
{
      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          switch (message.type) {
            case 'start':
              if (game) {
                game.start();
                broadcastToSession(sessionId, {type: 'state', message: 'Game started', data: game.getState()});
                this.log.info(`[${sessionId}] Game started`);
              } else {
                // should create New Game
              }
              break;
            case 'stop': // Should be 'quit'
              if (game) {
                game.stop();
                broadcastToSession(sessionId, {
                  // type: 'state',
                  type: 'gameOver',
                  message: 'Game stopped',
                  data: game.getState()
                });
                this.log.info(`[${sessionId}] Game stopped`);
              }
              break;
            case 'paddle':
              if (game && message.paddle && message.direction) {
                game.setPaddleDirection(message.paddle, message.direction);
              }
              break;
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' } as ServerMessage));
              break;
            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
              } as ServerMessage));
          }
        } catch (err: unknown) {
          console.error(`[${sessionId}] Error processing message:`, err);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          } as ServerMessage));
        }
      });
      
      // Handle connection close
      ws.on('close', () => {
        this.log.info(`[${sessionId}] Player disconnected`);
        clearInterval(stateInterval);
        cleanupConnection(this, sessionId, ws);
      });
      
      // Handle errors
      ws.on('error', (err: Error) => {
        console.error(`[${sessionId}] WebSocket error:`, err);
        clearInterval(stateInterval);
        cleanupConnection(this, sessionId, ws);
      });
}

function joinGame(this: FastifyInstance, sessionId: any, socket: any): PongGame {
      // Get or create game session
      let game: PongGame | undefined = gameSessions.get(sessionId);
      if (!game) {
        game = new PongGame(sessionId);
        gameSessions.set(sessionId, game);
        playerConnections.set(sessionId, new Set());
        this.log.info(`[${sessionId}] Game session created via WebSocket`);
      }
      
      // Add connection to session
      const connections = playerConnections.get(sessionId);
      if (connections) {
        connections.add(socket);
      }
      this.log.info(`[${sessionId}] Player connected (${connections?.size} total)`);
      
      // Send initial connection confirmation
      socket.send(JSON.stringify({
        type: 'newSession',
        sessionId,
        message: 'Connected to game session',
        data: game.getState()
      } as ServerMessage));
      return game;
}

export async function handleWebSocketConnection(this: FastifyInstance, socket: any, req: FastifyRequest) {
      console.log("get to the sessions id by WS");
      const params = req.params as { sessionId: string };
      const sessionId = params.sessionId;
      
      let game: PongGame | undefined = joinGame.call(this, sessionId, socket);

      // broadcast gameState at 60FPS to very client in the session
      const stateInterval = setInterval(() => {
        if (!game) return;

        const current_status = game.getState().status;

        if (current_status === 'playing') {
          broadcastToSession(sessionId, {type: 'state', data: game.getState()})
        } else if (current_status === 'finished') {
          broadcastToSession(sessionId, {type: 'gameOver', data: game.getState()});
          this.log.info(`[${sessionId}] Game finished`);
          gameSessions.delete(sessionId);
          playerConnections.delete(sessionId);
          clearInterval(stateInterval);
          game = undefined;
        }
      }, 16); // ~60 FPS
      handleIncomingMessage.call(this, socket, game, sessionId);
};
  

