import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { proxyRequest } from '../utils/proxy.js'
import { logger, logUtils } from '../utils/logger.js'

const AUTH_SERVICE_URL = 'http://auth-service:3001'

export async function authRootHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/`)
}

export async function authHealthHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  logger.logHealth({ serviceName: 'auth-service' }, 'service_check')
  return proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/health`)
}

export async function loginHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const startTime = Date.now()
  const username = (request.body as any)?.username || (request.body as any)?.email || 'unknown'
  const sanitizedBody = logUtils.sanitizeForLog(request.body)

  logger.info({
    event: 'auth_login_attempt',
    username,
    body: sanitizedBody,
  })

  const res = await proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  })

  logger.info({
    event: 'auth_login_result',
    status: reply.statusCode,
    username,
    success: reply.statusCode === 200,
    duration: Date.now() - startTime,
  })

  return res
}

export async function registerHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const startTime = Date.now()
  const { username = 'unknown', email = 'unknown' } = request.body as any
  const sanitizedBody = logUtils.sanitizeForLog(request.body)

  logger.info({
    event: 'auth_register_attempt',
    username,
    email,
    body: sanitizedBody,
  })

  const res = await proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  })

  logger.info({
    event: 'auth_register_result',
    status: reply.statusCode,
    username,
    email,
    success: reply.statusCode === 201,
    duration: Date.now() - startTime,
  })

  return res
}

export async function logoutHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request.headers as any)['x-user-name'] || null

  logger.info({
    event: 'auth_logout',
    user,
  })

  const res = await proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/logout`, {
    method: 'POST',
  })

  logger.info({
    event: 'auth_logout_result',
    status: reply.statusCode,
    user,
    success: reply.statusCode === 200,
  })

  return res
}

// DEV ONLY - À supprimer en production
export async function meHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Route DEV ONLY - À supprimer en production
  logger.warn({
    event: 'dev_route_accessed',
    route: '/api/auth/me',
    user: (request.headers as any)['x-user-name'] || null,
    warning: 'This route exposes internal headers and should be removed in production',
  })

  return proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/me`)
}

export async function listHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request.headers as any)['x-user-name'] || null

  logger.info({
    event: 'auth_list_users_attempt',
    user,
  })

  const res = await proxyRequest(this, request, reply, `${AUTH_SERVICE_URL}/list`, {
    method: 'GET',
  })

  logger.info({
    event: 'auth_list_users_result',
    status: reply.statusCode,
    user,
    success: reply.statusCode === 200,
  })

  return res
}
