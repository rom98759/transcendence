import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { friendshipController } from '../controllers/friends.controller.js';
import {
  FriendshipFullSchema as FriendshipFullSchema,
  SimpleErrorWithMessageSchema,
  ValidationErrorSchema,
  FriendshipUnifiedSchema,
  FriendshipUpdateStatusSchema,
  DetailedErrorSchema,
  FriendshipUpdateNicknameSchema,
  IdSchema,
} from '@transcendence/core';
import z from 'zod';

export const getFriendsByUserIdSchema = {
  tags: ['friends'],
  summary: "Get a user's friends",
  description: 'Returns all friends for the given user id',
  response: {
    200: z.array(FriendshipUnifiedSchema),
    400: ValidationErrorSchema,
  },
} as const;

export const createFriendSchema = {
  tags: ['friends'],
  summary: 'Create a friend',
  description:
    'Register a new friendship associating current user as requester and target user as receiver',
  body: IdSchema,
  response: {
    201: FriendshipFullSchema,
    400: ValidationErrorSchema,
    409: DetailedErrorSchema.describe('Users are already friends'),
    422: SimpleErrorWithMessageSchema.describe('You cannot add yourself as a friend'),
  },
} as const;

export const removeFriendSchema = {
  tags: ['friends'],
  summary: 'Remove a friend',
  description: 'Remove a friendship associating current user and an user identified by target id',
  params: IdSchema,
  response: {
    200: FriendshipFullSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema.describe('Users are not friends'),
  },
} as const;

export const updateFriendStatusSchema = {
  tags: ['friends'],
  summary: 'Update friendship status',
  description: 'Update friendship status between current user and an user identified by target id',
  params: IdSchema,
  body: FriendshipUpdateStatusSchema,
  response: {
    200: FriendshipFullSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema.describe('Users are not friends'),
  },
} as const;

export const updateFriendNicknameSchema = {
  tags: ['friends'],
  summary: 'Update friend nickname',
  description: 'Update nickname given by current user to an user identified by target id',
  params: IdSchema,
  body: FriendshipUpdateNicknameSchema,
  response: {
    200: FriendshipFullSchema,
    400: ValidationErrorSchema,
    404: DetailedErrorSchema.describe('Users are not friends'),
  },
} as const;

export const friendsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('', { schema: getFriendsByUserIdSchema }, friendshipController.getFriendsByUserId);
  app.post('', { schema: createFriendSchema }, friendshipController.createFriend);
  app.delete('/:id', { schema: removeFriendSchema }, friendshipController.removeFriend);
  app.patch(
    '/:id/status',
    { schema: updateFriendStatusSchema },
    friendshipController.updateFriendStatus,
  );
  app.patch(
    '/:id/nickname',
    { schema: updateFriendNicknameSchema },
    friendshipController.updateFriendNickname,
  );
};
