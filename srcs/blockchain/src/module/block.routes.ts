import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { blockIdSchema, blockSchema } from './block.schema.js';
import {
  addTournament,
  getTournamentView,
  listTournament,
  listTournamentView,
} from './block.controller.js';

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes, { prefix: '/health' });
  app.register(blockRoutes);
}

async function blockRoutes(app: FastifyInstance) {
  app.get('/', listTournamentView);
  app.get('/tournaments', listTournament);
  app.post('/tournaments', { schema: { body: blockSchema } }, addTournament);
  app.get('/tournaments/:id', { schema: { params: blockIdSchema } }, getTournamentView);
}

async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/',
    async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send({ status: 'healthy', hotReload: 'ok fdac!' });
    },
  );
}
