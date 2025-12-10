import { FastifyInstance } from 'fastify'
import {
  authRootHandler,
  authHealthHandler,
  meHandler,
  loginHandler,
  registerHandler,
  logoutHandler,
  listHandler,
} from '../controllers/auth.controller.js'

export async function authRoutes(app: FastifyInstance) {
  app.get('/', authRootHandler)
  app.get('/health', authHealthHandler)
  app.get('/me', meHandler) // DEV ONLY - À supprimer en production
  app.post('/login', loginHandler)
  app.post('/register', registerHandler)
  app.post('/logout', logoutHandler)
  app.get('/list', listHandler) // DEV ONLY - À supprimer en production
}
