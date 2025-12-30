import { FastifyInstance } from 'fastify';
import { logger } from '../index.js';

export interface JWTPayload {
  sub: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Génère un JWT pour un utilisateur
 * @param fastify Instance Fastify avec le plugin JWT enregistré
 * @param userId ID de l'utilisateur
 * @param username Nom d'utilisateur
 * @param role Rôle de l'utilisateur (user | admin)
 * @param expiresIn Durée de validité (ex: '1h', '15m')
 * @returns Token JWT signé
 */
export function generateJWT(
  fastify: FastifyInstance,
  userId: number,
  username: string,
  role: string,
  expiresIn: string = '1h',
): string {
  const payload: JWTPayload = {
    sub: userId,
    username: username,
    role: role,
  };

  const token = fastify.jwt.sign(payload, { expiresIn });
  logger.info({
    event: 'jwt_generated',
    userId,
    username,
    expiresIn,
  });

  return token;
}
