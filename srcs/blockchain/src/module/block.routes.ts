import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { blockIdSchema, blockSchema } from './block.schema.js'
import { addRow, addRowJSON, listRows, listRowsJSON, showRow } from './block.controller.js'

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes, { prefix: '/health' })
  app.register(blockRoutes)
}

async function blockRoutes(app: FastifyInstance) {
  app.get('/', listRows)
  app.get('/list', listRowsJSON)
  app.post('/', { schema: { body: blockSchema } }, addRow)
  app.post('/register', { schema: { body: blockSchema } }, addRowJSON)
  app.get('/row/:tx_id', { schema: { params: blockIdSchema } }, showRow)
}

async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/',
    async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send({ status: 'healthy' })
    },
  )
}
