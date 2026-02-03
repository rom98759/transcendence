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
  app.get('/blockchain', listTournamentView);
  app.get('/tournaments', listTournament);
  app.post('/tournaments', { schema: { body: blockSchema } }, addTournament);
  app.get('/tournaments/:tour_id', { schema: { params: blockIdSchema } }, getTournamentView);
  app.post('/tournamentspub', async (req, _reply) => {
    await app.redis.xadd('tournament.results', '*', 'data', JSON.stringify(req.body));
    return { status: 'published' };
  });
}

async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/',
    async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send({ status: 'healthy' });
    },
  );
}
