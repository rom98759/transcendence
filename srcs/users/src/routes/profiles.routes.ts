import { profileController } from '../controllers/profiles.controller.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  UserNameSchema,
  ProfileCreateInSchema,
  DetailedErrorSchema,
  ValidationErrorSchema,
  ProfileSimpleSchema,
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

export const createProfileSchema = {
  tags: ['users'],
  summary: 'Create user profile',
  description: 'Creates a new user profile linked to an authId',
  body: ProfileCreateInSchema,
  response: {
    201: ProfileSimpleSchema,
    400: ValidationErrorSchema,
    409: DetailedErrorSchema,
  },
} as const;

const getProfileByUsernameSchema = {
  tags: ['users'],
  summary: 'Get user profile by username',
  description: 'Returns a full profile if requested by the owner, or a simple one otherwise',
  params: UserNameSchema,
  headers: z.object({
    'x-user-name': z.string().optional(),
  }),
  response: {
    200: ProfileSimpleSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema,
  },
} as const;

const updateProfileAvatarSchema = {
  tags: ['users'],
  summary: 'Update profile avatar',
  consumes: ['multipart/form-data'],
  description: 'Stores the avatar in uploads, updates profile with new url',
  params: UserNameSchema,
  response: {
    200: ProfileSimpleSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema,
  },
} as const;

const deleteProfileSchema = {
  tags: ['users'],
  summary: 'Delete a profile',
  description: 'Delete a profile',
  params: UserNameSchema,
  response: {
    200: ProfileSimpleSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema,
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
      return reply.code(200).send({ status: 'healthy' });
    },
  );

  app.post('/', { schema: createProfileSchema }, profileController.createProfile);

  app.get(
    '/username/:username',
    { schema: getProfileByUsernameSchema },
    profileController.getProfileByUsername,
  );

  app.patch(
    '/username/:username/avatar',
    { schema: updateProfileAvatarSchema },
    profileController.updateProfileAvatar,
  );

  app.delete(
    '/username/:username',
    { schema: deleteProfileSchema },
    profileController.deleteProfile,
  );
};
