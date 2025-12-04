import { gameSessions } from '../core/game.state.js'
import { FastifyInstance } from "fastify";

export function cleanupConnection(socket: any, sessionId: string) {
  const currentSession = gameSessions.get(sessionId);
  if (!currentSession || !currentSession.players) return;

  currentSession.players.delete(socket);
  if (currentSession.players.size === 0) {
    if (currentSession.interval) {
      clearInterval(currentSession.interval);
      currentSession.interval = null;
    }
    gameSessions.delete(sessionId);
  }
}

export function addPlayerConnection(this: FastifyInstance, socket: any, sessionId: string) {
    const currentSession = gameSessions.get(sessionId);
    if (!currentSession) return;

    currentSession.players.add(socket);
    socket.send(JSON.stringify({"type":"connected","message":"Connected to game session"}))
    this.log.info(`[${sessionId}] Player connected. Total: ${currentSession.players.size}`);
    
    // Handle connection close
    socket.on("close", () => {
      this.log.info(`[${sessionId}] Player disconnected`);
      cleanupConnection(socket, sessionId); 
    });
    
    // Handle errors
    socket.on("error", (err: Error) => {
      console.error(`[${sessionId}] WebSocket error:`, err);
      cleanupConnection(socket, sessionId); 
    });
} 

