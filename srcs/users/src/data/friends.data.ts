import {
  FriendshipFullDTO,
  FriendshipReceiverDTO,
  FriendshipRequesterDTO,
  statusUpdateDTO,
} from '@transcendence/core';
import { Friendship } from '@prisma/client';
import { prisma } from './prisma.js';

export class FriendshipRepository {
  async findFriendshipBetween(userId: number, targetId: number): Promise<Friendship | null> {
    return prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetId },
          { requesterId: targetId, receiverId: userId },
        ],
      },
    });
  }

  async countFriendships(userId: number): Promise<number> {
    return prisma.friendship.count({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
    });
  }

  async findRequestedFriendships(userId: number): Promise<FriendshipReceiverDTO[]> {
    const requests = prisma.friendship.findMany({
      where: { requesterId: userId },
      include: { receiver: true },
    });
    return requests as unknown as FriendshipReceiverDTO[];
  }

  async findReceivedFriendships(userId: number): Promise<FriendshipRequesterDTO[]> {
    const requests = prisma.friendship.findMany({
      where: { receiverId: userId },
      include: { requester: true },
    });
    return requests;
  }

  async findFriendshipsByUser(userId: number): Promise<FriendshipFullDTO[]> {
    const requests = prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async createFriendship(userId: number, targetId: number): Promise<FriendshipFullDTO> {
    const requests = prisma.friendship.create({
      data: {
        requesterId: userId,
        receiverId: targetId,
        status: 'ACCEPTED',
      },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async updateFriendshipStatus(
    friendshpId: number,
    status: statusUpdateDTO,
  ): Promise<FriendshipFullDTO> {
    const requests = prisma.friendship.update({
      where: { id: friendshpId },
      data: { status },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async updateFriendshipNickname(
    friendshpId: number,
    nickname: string,
  ): Promise<FriendshipFullDTO> {
    const requests = prisma.friendship.update({
      where: { id: friendshpId },
      data: { nickname },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async deleteFriendshipById(friendshipId: number): Promise<FriendshipFullDTO> {
    const requests = prisma.friendship.delete({
      where: { id: friendshipId },
      include: { requester: true, receiver: true },
    });
    return requests;
  }
}

export const friendshipRepository = new FriendshipRepository();
