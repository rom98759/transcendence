import { profileController } from '../controllers/profiles.controller.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  UserNameSchema,
  ProfileSchema,
  ProfileCreateInSchema,
  DetailedErrorSchema,
  ValidationErrorSchema,
} from '@transcendence/core';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const healthCheckSchema = {
  tags: ['health'],
  summary: 'Health check endpoint',
  description: 'Returns the health status of the service',
  response: {
    200: z.object({
      status: z.string(),
    }),
  },
} as const;

const getProfileByUsernameSchema = {
  tags: ['users'],
  summary: 'Get user profile by username',
  description: 'Returns the profile of a user for the given username',
  params: UserNameSchema,
  response: {
    200: ProfileSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema,
  },
} as const;

export const createProfileSchema = {
  tags: ['users'],
  summary: 'Create user profile',
  description: 'Creates a new user profile linked to an authId',
  body: ProfileCreateInSchema,
  response: {
    201: ProfileSchema,
    400: ValidationErrorSchema,
    409: DetailedErrorSchema,
  },
} as const;

export const umRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      config: { skipAuth: true },
      schema: healthCheckSchema,
    },
    async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
      return reply.code(200).send({ status: 'healthy new' });
    },
  );

  app.get(
    '/:username',
    { schema: getProfileByUsernameSchema },
    profileController.getProfileByUsername,
  );

  app.post('/', { schema: createProfileSchema }, profileController.createProfile);
};
