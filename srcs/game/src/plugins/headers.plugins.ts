import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { UserRepository } from '../repositories/UserRepository.js';
import { AppError } from '@transcendence/core';

/**
 * Plugin that validates x-user-id / x-user-name headers from the gateway.
 * Requires the UserRepository to be passed as an option.
 */
export default fp(async function (app, opts: { userRepo: UserRepository }) {
  const { userRepo } = opts;

  app.decorate('recoveryHeaders', async function (req: FastifyRequest, reply: FastifyReply) {
    const idHeader = req.headers['x-user-id'];
    const usernameHeader = req.headers['x-user-name'];
    const userId = idHeader ? Number(idHeader) : null;
    if (!userId || !Number.isFinite(userId)) {
      app.log.warn(`invalid auth header - user id missing`);
      return reply.code(400).send({ code: 'NOT_VALID_USER', message: "This user doesn't exist" });
    }
    try {
      userRepo.getUser(userId);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        app.log.warn(`invalid auth header - user not found`);
        return reply.code(400).send({ code: 'NOT_VALID_USER', message: "This user doesn't exist" });
      }
      throw err;
    }
    req.user = {
      id: userId,
      username: String(usernameHeader ?? 'anonymous'),
    };
  });
});
