import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { gameRoutes } from './routes/game.routes.js';
import { gameSessions } from './core/game.state.js';
import type { PongGame } from './core/game.engine.js';
import fs from 'fs';

const fastify = Fastify({
  https: {
    key: fs.readFileSync('/etc/certs/game-service.key'),
    cert: fs.readFileSync('/etc/certs/game-service.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'),

    requestCert: true,
    rejectUnauthorized: false,
  },

  logger: true,
});

// Register WebSocket support
await fastify.register(fastifyWebsocket);

// WebSocket game endpoint
fastify.register(gameRoutes);

// 404 handler
fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
  reply.code(404).send({
    status: 'error',
    message: 'Endpoint not found',
    method: request.method,
    path: request.url,
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3003, host: '0.0.0.0' });
    fastify.log.info('WebSocket Pong server running on port 3003');
    fastify.log.info('Connect to: ws://localhost:3003/game/{sessionId}');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down game service...');
  gameSessions.forEach((session: any) => session.game.stop());
  gameSessions.forEach((session: any) => session.players.clear());
  gameSessions.clear();
  process.exit(0);
});
