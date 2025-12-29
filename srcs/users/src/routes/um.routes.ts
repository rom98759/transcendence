// import { OpenAPISchema } from 'src/types/swagger.js'
import { createProfile, getProfileByUsername } from '../controllers/um.controller.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { UsernameParams, Profile, ProfileCreateIn } from '@transcendence/core';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const umRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send({ status: 'healthy new' });
    },
  );

  app.get(
    '/:username',
    {
      schema: {
        tags: ['users'],
        summary: 'Get user profile by username',
        description: 'Returns the profile of a user for the given username',
        params: UsernameParams,
        response: {
          200: Profile,
          400: z
            .object({
              message: z.string(),
            })
            .describe('Validation error'),
          404: z
            .object({
              message: z.string(),
            })
            .describe('Profile not found'),
        },
      },
    },
    getProfileByUsername,
  );

  app.post(
    '/',
    {
      schema: {
        tags: ['users'],
        summary: 'Create user profile',
        description: 'Creates a new user profile linked to an authId',
        body: ProfileCreateIn,
        response: {
          201: Profile,
          400: z
            .object({
              message: z.string(),
            })
            .describe('Validation error'),
          409: z
            .object({
              message: z.string(),
            })
            .describe('User already exists'),
        },
      },
    },
    createProfile,
  );
};
