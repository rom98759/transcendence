import { UserRequestDTO } from '@transcendence/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';

const authPluginCallback: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url === '/health') {
      return;
    }
    const userIdRaw = req.headers['x-user-id'] as string;
    const username = req.headers['x-user-name'] as string;
    const role = (req.headers['x-user-role'] as string) || 'USER';
    if (!userIdRaw || !username) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const userDto: UserRequestDTO = {
      id: Number(userIdRaw),
      username: username,
      role: role,
    };

    if (isNaN(userDto.id)) {
      req.log.error(`Invalid User ID received from Gateway: ${userIdRaw}`);
      return reply.status(400).send({ message: 'Invalid User Context' });
    }
    req.user = userDto;
  });
};

export const authPlugin = fp(authPluginCallback, {
  name: 'auth-plugin',
});
