// ============================================================================
// server.ts — Application entry point
//
// Instantiates all dependencies (repositories, stores) and wires them together.
// No business logic lives here — only composition and lifecycle management.
// ============================================================================

import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fs from 'fs';

import { env } from './config/env.js';
import redisPlugin from './plugins/ioredis.plugin.js';
import recoveryHeaders from './plugins/headers.plugins.js';

import { initDb } from './repositories/db.js';
import { UserRepository } from './repositories/UserRepository.js';
import { MatchRepository } from './repositories/MatchRepository.js';
import { TournamentRepository } from './repositories/TournamentRepository.js';
import { SessionStore } from './core/session/SessionStore.js';
import { gameRoutes } from './routes/GameRoutes.js';
import { startGameConsumer } from './consumers/GameConsumer.js';

// ── 1. Database & Repositories ──────────────────────────────────────────────
const db = initDb(env.GAME_DB_PATH);
const userRepo = new UserRepository(db);
const matchRepo = new MatchRepository(db);
const tournamentRepo = new TournamentRepository(db);

// ── 2. Session Store ────────────────────────────────────────────────────────
const sessionStore = new SessionStore();

// ── 3. Fastify Instance ─────────────────────────────────────────────────────
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

// ── 4. Plugins ──────────────────────────────────────────────────────────────
fastify.register(redisPlugin);
fastify.register(recoveryHeaders, { userRepo });

// @ts-ignore - Fastify WebSocket plugin types are incompatible with Fastify v5 but work at runtime
await fastify.register(fastifyWebsocket);

// ── 5. Redis Consumer (user.events stream) ──────────────────────────────────
fastify.addHook('onReady', async () => {
  startGameConsumer(fastify, userRepo);
});

// ── 6. Routes — inject all dependencies ─────────────────────────────────────
fastify.register(gameRoutes, {
  sessionStore,
  matchRepo,
  tournamentRepo,
  userRepo,
});

// ── 7. 404 Handler ──────────────────────────────────────────────────────────
fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
  reply.code(404).send({
    status: 'error',
    message: 'Endpoint not found',
    method: request.method,
    path: request.url,
  });
});

// ── 8. Session TTL Cleanup ──────────────────────────────────────────────────
const SESSION_CLEANUP_INTERVAL_MS = 60_000;

const sessionCleanupTimer = setInterval(() => {
  const cleaned = sessionStore.cleanupExpired(fastify.log);
  if (cleaned > 0) {
    fastify.log.info({ event: 'session_cleanup', cleaned });
  }
}, SESSION_CLEANUP_INTERVAL_MS);

// ── 9. Start Server ─────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: env.GAME_SERVICE_PORT, host: '0.0.0.0' });
    fastify.log.info(`WebSocket Pong server running on port ${env.GAME_SERVICE_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// ── 10. Graceful Shutdown ───────────────────────────────────────────────────
process.on('SIGTERM', () => {
  fastify.log.info('Shutting down game service...');
  clearInterval(sessionCleanupTimer);

  for (const [, session] of sessionStore.entries()) {
    session.destroy();
  }
  sessionStore.clear();

  fastify.close().then(() => process.exit(0));
});
