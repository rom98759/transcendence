import { createProfile, getProfileByUsername } from '../controllers/um.controller.js'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export async function umRoutes(app: FastifyInstance) {
  app.get('/', async function (this: FastifyInstance) {
    return { message: 'User management service is running' }
  })

  app.get('/health', async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({ status: "healthy new" })
  })

  app.get('/users/:username', getProfileByUsername);

  app.post('/users', createProfile);
}
