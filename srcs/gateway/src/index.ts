import fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import websocketPlugin from '@fastify/websocket'
import { apiRoutes, publicRoutes } from './routes/gateway.routes.js'
import { logger, optimizeErrorHandler } from './utils/logger.js'

const PUBLIC_HEALTH_ROUTES = ['/api/auth/health', '/api/game/health', '/api/block/health']
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/game/sessions',
  ...PUBLIC_HEALTH_ROUTES,
]

const app = fastify({
  logger: false, // Utiliser notre logger
  disableRequestLogging: true, // Désactiver les logs automatiques
})

// Register fastify-cookie
app.register(fastifyCookie)

// Register fastify-jwt
app.register(fastifyJwt, {
  secret: (globalThis as any).process?.env?.JWT_SECRET || 'supersecretkey', // USE Hashicorp Vault ------------------------------------
})

app.register(websocketPlugin)
// Hook verify JWT routes `/api` sauf les routes PUBLIC_ROUTES
app.addHook('onRequest', async (request: any, reply: any) => {
  const url = request.url || request.raw?.url || ''

  // Routes public non `/api` : on ne fait rien
  if (!url.startsWith('/api')) return

  // Routes publiques juste `/api/auth/login` et `/api/auth/register` (pas de cookie nécessaire)
  if (PUBLIC_ROUTES.includes(url)) {
    logger.logAuth({ url, user: request.user?.username }, true)
    return
  }

  const token = request.cookies && (request.cookies.token as string | undefined)

  // No token present
  if (!token) {
    logger.logAuth({ url: request.url, token: false }, false)
    return reply.code(401).send({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } })
  }

  // Verify JWT token
  try {
    const decoded = app.jwt.verify(token)
    request.user = decoded // injecte user dans la requête (username, id, etc.)
    logger.logAuth({ url: request.url, user: request.user.username }, true)
  } catch (err: any) {
    logger.logAuth(
      {
        url: request.url,
        token: true,
        jwtError: err?.message,
      },
      false,
    )
    return reply.code(401).send({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } })
  }
})

// Décorateur requêtes internes : ajoute automatiquement
// header `x-user-name` + `x-user-id` + cookies de fetchInternal dans proxyRequest
app.decorate('fetchInternal', async (request: any, url: string, init: any = {}) => {
  const userName = request.user?.username || request.headers['x-user-name'] || ''
  const userId = request.user?.sub || request.user?.id || request.headers['x-user-id'] || ''

  const headers = Object.assign({}, init.headers || {}, {
    'x-user-name': userName,
    'x-user-id': String(userId),
    cookie: request.headers?.cookie || '',
  })

  return fetch(url, Object.assign({}, init, { headers }))
})

// Log request end
app.addHook('onResponse', async (request: any, reply: any) => {
  logger.logRequest(
    {
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      user: request.user?.username || null,
    },
    'end',
  )
})

// Central error handler: structured errors
app.setErrorHandler((error: any, request: any, reply: any) => {
  logger.error({
    event: 'unhandled_error',
    method: request?.method,
    url: request?.url,
    user: request?.user?.username || null,
    err: error?.message,
    stack: error?.stack,
  })

  const status = error?.statusCode || 500
  const isDev = (globalThis as any).process?.env?.NODE_ENV === 'development'
  const errorResponse = optimizeErrorHandler(error, isDev)

  reply.code(status).send({ error: errorResponse })
})

app.register(fastifyCors, {
  origin: [
    'http://localhost:80', // Dev
    'https://localhost:443', // Dev HTTPS
  ],
  credentials: true,
})

// Register routes
app.register(apiRoutes, { prefix: '/api' })
app.register(publicRoutes)

// Start the server
app.listen({ host: '0.0.0.0', port: 3000 }, (err: Error | null, address: string) => {
  if (err) {
    logger.error({
      event: 'server_startup_failed',
      err: err.message,
      stack: err.stack,
    })
    ;(globalThis as any).process?.exit?.(1)
  }

  logger.info({
    event: 'server_started',
    address,
    port: 3000,
    environment: (globalThis as any).process?.env?.NODE_ENV || 'unknown',
  })
})
