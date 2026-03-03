import { profileController } from '../controllers/profiles.controller.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  UserNameSchema,
  ProfileCreateInSchema,
  DetailedErrorSchema,
  ValidationErrorSchema,
  ProfileSimpleSchema,
  usernameSchema,
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

const getProfilesbyUsernameQuerySchema = {
  tags: ['users'],
  summary: 'Find profiles matching query',
  description:
    'Returns a list of profiles containing query string in username. Returns an empty list if no result',
  querystring: z.object({
    query: z.string().min(2).describe('pattern to look at in usernames'),
  }),
  headers: z.object({
    'x-user-name': z.string().optional(),
  }),
  response: {
    200: z.array(ProfileSimpleSchema),
    400: ValidationErrorSchema,
  },
} as const;

const updateProfileUsernameSchema = {
  tags: ['users'],
  summary: 'Update profile username',
  description: 'Update profile username',
  params: UserNameSchema,
  body: z.object({ newUsername: usernameSchema }),
  response: {
    200: ProfileSimpleSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema,
    409: DetailedErrorSchema,
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

const deleteProfileByIdSchema = {
  tags: ['users'],
  summary: 'Delete a profile by user ID',
  description: 'Delete a profile by user ID (internal service use)',
  params: z.object({
    userId: z.coerce.number(),
  }),
  response: {
    204: z.void(),
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

  app.get(
    '/',
    { schema: getProfilesbyUsernameQuerySchema },
    profileController.getProfilesbyUsernameQuery,
  );

  app.patch(
    '/:username/username',
    { schema: updateProfileUsernameSchema },
    profileController.updateProfileUsername,
  );

  app.patch(
    '/:username/avatar',
    { schema: updateProfileAvatarSchema },
    profileController.updateProfileAvatar,
  );

  app.delete(
    '/username/:username',
    { schema: deleteProfileSchema },
    profileController.deleteProfile,
  );

  app.delete(
    '/users/:userId',
    { schema: deleteProfileByIdSchema },
    profileController.deleteProfileById,
  );
};
