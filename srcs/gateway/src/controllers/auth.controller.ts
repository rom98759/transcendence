import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { proxyRequest } from '../utils/proxy.js'
import { logger } from '../utils/logger.js'

const AUTH_SERVICE_URL = 'http://auth-service:3001'

export function registerAuthRoutes(app: FastifyInstance) {
  // Route health spécifique
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.logHealth({ serviceName: 'auth-service' }, 'service_check')
    const res = await proxyRequest(app, request, reply, `${AUTH_SERVICE_URL}/health`)
    return res
  })

  // Proxy toutes les autres requêtes vers le service auth
  app.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (request.params as any)['*']
    const cleanPath = rawPath.replace(/^api\/auth\//, '')
    const url = `${AUTH_SERVICE_URL}/${cleanPath}`
    const queryString = new URL(request.url, 'http://localhost').search
    const fullUrl = `${url}${queryString}`

    const rawUser = request.headers['x-user-name'] as string | string[] | undefined
    const user = Array.isArray(rawUser) ? rawUser[0] : (rawUser ?? null)

    logger.info({
      event: 'auth_proxy_request',
      rawPath,
      method: request.method,
      user,
    })

    const init: RequestInit = {
      method: request.method,
      headers: {},
    }

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      ;(init.headers as Record<string, string>)['content-type'] =
        request.headers['content-type'] || 'application/json'
      init.body = JSON.stringify(request.body)
    }

    const res = await proxyRequest(app, request, reply, fullUrl, init)
    return res
  })
}
