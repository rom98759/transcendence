import { FastifyInstance } from 'fastify'
import {
  healthHandler,
  healthByNameHandler,
  healthAllHandler,
} from '../controllers/health.controller.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', healthHandler)
  app.get('/health/:name', healthByNameHandler)
  app.get('/healthAll', healthAllHandler)
}
