import { FastifyReply, FastifyRequest } from 'fastify';
import { friendshipService } from '../services/friends.service.js';
import {
  FriendshipUpdateNicknameDTO,
  FriendshipUpdateStatusDTO,
  IdDTO,
  LOG_ACTIONS,
  LOG_RESOURCES,
} from '@transcendence/core';

export class FriendshipController {
  // GET /users/friends/
  async getFriendsByUserId(req: FastifyRequest, reply: FastifyReply) {
    const userId = req?.user?.id;
    req.log.info({ event: `${LOG_ACTIONS.READ}_${LOG_RESOURCES.FRIEND}`, userId });

    const friends = await friendshipService.getFriendsByUserId(userId);
    return reply.status(200).send(friends);
  }

  // POST /users/friends
  async createFriend(req: FastifyRequest<{ Body: IdDTO }>, reply: FastifyReply) {
    const { id: targetId } = req?.body;
    const userId = req?.user?.id;
    req.log.info({
      event: `${LOG_ACTIONS.CREATE}_${LOG_RESOURCES.FRIEND}`,
      userId,
      body: req.body,
    });

    const friendship = await friendshipService.createFriend(userId, targetId);
    return reply.status(201).send(friendship);
  }

  // DELETE /users/friends/:id
  async removeFriend(req: FastifyRequest<{ Params: { targetId: number } }>, reply: FastifyReply) {
    const { targetId } = req?.params;
    const userId = req?.user?.id;
    req.log.info({
      event: `${LOG_ACTIONS.DELETE}_${LOG_RESOURCES.FRIEND}`,
      userId,
      param: targetId,
      body: req.body,
    });

    const removedFriendship = await friendshipService.removeFriend(userId, targetId);
    return reply.status(200).send(removedFriendship);
  }

  // PATCH /users/friends/:id/status
  async updateFriendStatus(
    req: FastifyRequest<{
      Params: IdDTO;
      Body: FriendshipUpdateStatusDTO;
    }>,
    reply: FastifyReply,
  ) {
    const targetId = req?.params?.id;
    const userId = req?.user?.id;
    const { status } = req?.body;
    req.log.info({
      event: `${LOG_ACTIONS.UPDATE}_${LOG_RESOURCES.FRIEND}`,
      userId,
      param: req.params,
      body: req.body,
    });

    const updatedFriendship = await friendshipService.updateFriendshipStatus(
      userId,
      targetId,
      status,
    );
    return reply.status(200).send(updatedFriendship);
  }

  // PATCH /users/friends/:id/nickname
  async updateFriendNickname(
    req: FastifyRequest<{
      Params: IdDTO;
      Body: FriendshipUpdateNicknameDTO;
    }>,
    reply: FastifyReply,
  ) {
    const targetId = req?.params?.id;
    const userId = req?.user?.id;
    const { nickname } = req?.body;
    req.log.info({
      event: `${LOG_ACTIONS.UPDATE}_${LOG_RESOURCES.FRIEND}`,
      userId,
      param: req.params,
      body: req.body,
    });

    const updatedFriendship = await friendshipService.updateFriendshipNickname(
      userId,
      targetId,
      nickname,
    );
    return reply.status(200).send(updatedFriendship);
  }
}

export const friendshipController = new FriendshipController();
