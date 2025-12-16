/**
 * Service de vérification JWT côté gateway
 * Permet de valider les tokens directement dans la gateway sans appel au service auth
 * Améliore les performances en évitant un round-trip réseau
 * Utilise @fastify/jwt pour la vérification des tokens
 */

import { FastifyRequest } from 'fastify'
import { logger } from './logger.js'
import { ERROR_CODES } from './constants.js'

export interface JWTPayload {
  sub: number
  username: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Extrait le token JWT depuis les cookies de la requête
 */
export function extractTokenFromCookies(request: FastifyRequest): string | null {
  const cookies = (request as any).cookies
  const token = cookies?.token

  if (!token) {
    return null
  }

  return token
}

/**
 * Vérifie et décode un token JWT en utilisant l'instance fastify
 * @param app Instance Fastify avec le plugin JWT enregistré
 * @param token Le token JWT à vérifier
 * @returns Le payload décodé si valide, null sinon
 */
export function verifyJWT(app: any, token: string): JWTPayload | null {
  try {
    const decoded = app.jwt.verify(token) as JWTPayload

    // Vérification basique du payload
    if (!decoded.sub || !decoded.username) {
      logger.warn({
        event: 'jwt_invalid_payload',
        reason: 'missing_required_fields',
      })
      return null
    }

    return decoded
  } catch (err: any) {
    // Gestion des différents types d'erreurs JWT
    if (err.message?.includes('expired')) {
      logger.warn({
        event: 'jwt_verification_failed',
        reason: 'token_expired',
        error: err.message,
      })
    } else if (err.message?.includes('invalid')) {
      logger.warn({
        event: 'jwt_verification_failed',
        reason: 'invalid_token',
        error: err.message,
      })
    } else {
      logger.error({
        event: 'jwt_verification_error',
        error: err?.message || String(err),
      })
    }

    return null
  }
}

/**
 * Middleware pour vérifier le JWT dans les requêtes
 * Extrait le token des cookies, le vérifie et attache les données utilisateur à la requête
 */
export function verifyRequestJWT(
  app: any,
  request: FastifyRequest,
): {
  valid: boolean
  user?: JWTPayload
  errorCode?: string
  errorMessage?: string
} {
  const token = extractTokenFromCookies(request)

  if (!token) {
    return {
      valid: false,
      errorCode: ERROR_CODES.TOKEN_MISSING,
      errorMessage: 'Authentication token is missing',
    }
  }

  const payload = verifyJWT(app, token)

  if (!payload) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      errorMessage: 'Invalid or expired token',
    }
  }

  return {
    valid: true,
    user: payload,
  }
}
