import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

export interface JWTPayload {
  sub: number;
  username: string;
}

/**
 * Génère un JWT pour un utilisateur
 * @param fastify Instance Fastify avec le plugin JWT enregistré
 * @param userId ID de l'utilisateur
 * @param username Nom d'utilisateur
 * @param expiresIn Durée de validité (ex: '1h', '15m')
 * @returns Token JWT signé
 */
export function generateJWT(
  fastify: FastifyInstance,
  userId: number,
  username: string,
  expiresIn: string = '1h'
): string {
  const payload: JWTPayload = {
    sub: userId,
    username: username,
  };

  const token = fastify.jwt.sign(payload, { expiresIn });
  logger.info({
    event: 'jwt_generated',
    userId,
    username,
    expiresIn
  });

  return token;
}
