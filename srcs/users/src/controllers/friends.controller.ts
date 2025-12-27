import { FastifyReply, FastifyRequest } from 'fastify';
import * as friendsService from '../services/friends.service.js';
import { ValidationSchemas } from '../schemas/schemas.js';
import z from 'zod';
import { API_ERRORS, LOG_EVENTS } from '../utils/messages.js';

function handleInvalidRequest<T>(
  req: FastifyRequest,
  reply: FastifyReply,
  validation: z.ZodSafeParseError<T>,
) {
  req.log.warn({ event: LOG_EVENTS.INVALID_REQUEST, request: req });
  return reply.status(400).send({
    error: API_ERRORS.USER.INVALID_FORMAT,
    details: z.treeifyError(validation.error),
  });
}

// GET /users/friends/
export async function getFriendsByUserId(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  req.log.info({ event: LOG_EVENTS.GET_FRIENDS, userId });

  const validation = ValidationSchemas['FriendGet'].safeParse({
    idUser: userId,
  });
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation);
  }

  try {
    const friends = await friendsService.getFriendsByUserId(userId);
    if (!friends || friends.length === 0) {
      return reply.status(404).send({ message: 'User not found or has no friends' });
    }
    return reply.status(200).send(friends);
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ message: API_ERRORS.UNKNOWN });
  }
}

// POST /users/friends
export async function addFriend(
  req: FastifyRequest<{
    Body: { targetId: number };
  }>,
  reply: FastifyReply,
) {
  const { targetId } = req.body;
  const userId = (req as any).user?.id;

  if (!userId) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  if (userId === targetId) {
    return reply.status(400).send({ message: 'Cannot add yourself as friend' });
  }

  req.log.info({ event: LOG_EVENTS.ADD_FRIEND, userId, targetId });

  const validation = ValidationSchemas['FriendAdd'].safeParse({
    targetId,
  });
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation);
  }

  try {
    const friendship = await friendsService.addFriend(userId, targetId);
    return reply.status(201).send({
      relationId: friendship.id,
      user1Id: friendship.userId,
      user2Id: friendship.friendId,
    });
  } catch (error: unknown) {
    req.log.error(error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('do not exist')) {
      return reply.status(400).send({ message: 'One or both users do not exist' });
    }
    if (errorMsg.includes('already exist')) {
      return reply.status(409).send({ message: API_ERRORS.USER.FRIEND.ALREADY_FRIENDS });
    }
    if (errorMsg.includes('Friend limit reached')) {
      return reply.status(400).send({ message: 'Maximum 10 friends allowed' });
    }
    return reply.status(500).send({ message: API_ERRORS.USER.FRIEND.ADD_FAILED });
  }
}

// DELETE /users/friends/:targetId
export async function removeFriend(
  req: FastifyRequest<{ Params: { targetId: string } }>,
  reply: FastifyReply,
) {
  const targetId = parseInt(req.params.targetId, 10);
  const userId = (req as any).user?.id;

  if (!userId) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  req.log.info({ event: LOG_EVENTS.REMOVE_FRIEND, userId, targetId });

  const validation = ValidationSchemas['FriendDelete'].safeParse({ targetId });
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation);
  }

  try {
    const result = await friendsService.removeFriend(userId, targetId);
    if (!result) {
      return reply.status(404).send({ message: API_ERRORS.USER.FRIEND.NOT_FRIENDS });
    }
    return reply.status(200).send({ message: 'Friend removed successfully' });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ message: API_ERRORS.USER.FRIEND.DELETE_FAILED });
  }
}

// PUT /users/friends/:targetId
export async function updateFriend(
  req: FastifyRequest<{
    Params: { targetId: string };
    Body: { nickname: string };
  }>,
  reply: FastifyReply,
) {
  const targetId = parseInt(req.params.targetId, 10);
  const userId = (req as any).user?.id;
  const { nickname } = req.body;
  const validation = ValidationSchemas['FriendUpdate'].safeParse({ nickname });
  if (!userId) return reply.status(401).send({ message: 'Unauthorized' });
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation);
  }
  try {
    const result = await friendsService.updateFriend(userId, targetId, nickname);
    if (!result) return reply.status(404).send({ message: API_ERRORS.USER.FRIEND.NOT_FRIENDS });
    req.log.info({ event: LOG_EVENTS.UPDATE_FRIEND, userId, targetId });
    return reply.status(200).send({
      relationId: result.id,
      user1Id: result.userId,
      user2Id: result.friendId,
      nickname: result.nickname,
    });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ message: API_ERRORS.USER.INVALID_FORMAT });
  }
}
