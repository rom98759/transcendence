import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes.js'
import { registerGameRoutes } from '../controllers/game.controller.js' // Passer par routes puis controller

import { healthRoutes } from './health.routes.js'
import { rootHandler, helpHandler } from '../controllers/gateway.controller.js'
import { registerBlockRoutes } from '../controllers/block.controller.js'

export async function apiRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/auth' })
  app.register(registerGameRoutes, { prefix: '/game' })
  app.register(registerBlockRoutes, { prefix: '/block' })
}

export async function publicRoutes(app: FastifyInstance) {
  app.register(healthRoutes)
  app.get('/', rootHandler)
  app.get('/help', helpHandler)
}
