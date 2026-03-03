import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { gameRoutes } from './routes/game.routes.js';
import { gameSessions, SESSION_TTL_MS } from './core/game.state.js';
import type { PongGame } from './core/game.engine.js';
import fs from 'fs';
import { env } from './config/env.js';
import redisPlugin from './plugins/ioredis.plugin.js';
import { startGameConsumer } from './core/game.consumer.js';
import recoveryHeaders from './plugins/headers.plugins.js';
import { cleanupConnection } from './service/game.connections.js';

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

fastify.addHook('onReady', async () => {
  startGameConsumer(fastify);
});

// Prehandlher for request route
fastify.register(redisPlugin);
fastify.register(recoveryHeaders);

// Register WebSocket support
// @ts-ignore - Fastify WebSocket plugin types are incompatible with Fastify v5 but work at runtime
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

// ============================================================================
// SESSION TTL CLEANUP — garbage-collect orphan sessions stuck in 'waiting'
// ============================================================================
const SESSION_CLEANUP_INTERVAL_MS = 60_000; // check every 60s

const sessionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of gameSessions.entries()) {
    if (session.game.status === 'waiting' && now - session.createdAt > SESSION_TTL_MS) {
      fastify.log.warn({ event: 'session_ttl_expired', sessionId, age: now - session.createdAt });
      session.game.stop();
      cleanupConnection(null, sessionId, 4002, 'Session expired');
      if (session.interval) {
        clearInterval(session.interval);
        session.interval = null;
      }
      gameSessions.delete(sessionId);
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: env.GAME_SERVICE_PORT, host: '0.0.0.0' });
    fastify.log.info('WebSocket Pong server running on port 3003');
    fastify.log.info('Connect to: wss://localhost:3003/game/{sessionId}');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down game service...');
  clearInterval(sessionCleanupTimer);
  gameSessions.forEach((session) => {
    session.game.stop();
    if (session.interval) {
      clearInterval(session.interval);
      session.interval = null;
    }
    session.players.forEach((role, ws) => ws.close(1001, 'Server shutting down'));
    session.players.clear();
  });
  gameSessions.clear();
  process.exit(0);
});
