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

