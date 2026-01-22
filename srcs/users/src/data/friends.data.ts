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
    return await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetId },
          { requesterId: targetId, receiverId: userId },
        ],
      },
    });
  }

  async countFriendships(userId: number): Promise<number> {
    return await prisma.friendship.count({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
    });
  }

  async findRequestedFriendships(userId: number): Promise<FriendshipReceiverDTO[]> {
    const requests = await prisma.friendship.findMany({
      where: { requesterId: userId },
      include: { receiver: true },
      omit: { nicknameRequester: true },
    });
    return requests as unknown as FriendshipReceiverDTO[];
  }

  async findReceivedFriendships(userId: number): Promise<FriendshipRequesterDTO[]> {
    const requests = await prisma.friendship.findMany({
      where: { receiverId: userId },
      include: { requester: true },
      omit: { nicknameReceiver: true },
    });
    return requests;
  }

  async findFriendshipsByUser(userId: number): Promise<FriendshipFullDTO[]> {
    const requests = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async createFriendship(userId: number, targetId: number): Promise<FriendshipFullDTO> {
    const requests = await prisma.friendship.create({
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
    friendshipId: number,
    status: statusUpdateDTO,
  ): Promise<FriendshipFullDTO> {
    const requests = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async updateFriendshipNicknameRequester(
    friendshipId: number,
    nicknameRequester: string,
  ): Promise<FriendshipFullDTO> {
    const requests = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { nicknameRequester },
      include: { requester: true, receiver: true },
    });
    return requests;
  }

  async deleteFriendshipById(friendshipId: number): Promise<FriendshipFullDTO> {
    const requests = await prisma.friendship.delete({
      where: { id: friendshipId },
      include: { requester: true, receiver: true },
    });
    return requests;
  }
}

export const friendshipRepository = new FriendshipRepository();
