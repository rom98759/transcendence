import {
  ERR_DEFS,
  LOG_RESOURCES,
  AppError,
  CONFIG,
  FriendshipFullDTO,
  FriendshipUnifiedDTO,
  statusUpdateDTO,
} from '@transcendence/core';
import { friendshipRepository } from '../data/friends.data.js';
import { profileService } from './profiles.service.js';
import { Friendship } from '@prisma/client';
import { mapFriendshipToDTO } from '../utils/mappers.js';

export function checkFriendshipAbsence(
  friendship: Friendship | null,
  userId: number,
  targetId: number,
) {
  if (friendship) {
    throw new AppError(ERR_DEFS.RESOURCE_ALREADY_EXIST, {
      userId: userId,
      details: {
        resource: LOG_RESOURCES.FRIEND,
        id: friendship.id,
        status: friendship.status,
        targetId: targetId,
      },
    });
  }
}

export function checkFriendshipExistence(
  friendship: Friendship | null,
  userId: number,
  targetId: number,
): asserts friendship is Friendship {
  if (!friendship) {
    throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
      userId: userId,
      details: {
        resource: LOG_RESOURCES.FRIEND,
        targetId: targetId,
      },
    });
  }
}
export class FriendshipService {
  async createFriend(userId: number, targetId: number): Promise<FriendshipFullDTO> {
    if (userId === targetId) {
      throw new AppError(ERR_DEFS.RESOURCE_INVALID_STATE, {
        details: {
          resource: LOG_RESOURCES.FRIEND,
          issue: 'self binding relation',
          userId,
          targetId,
        },
      });
    }

    await profileService.getById(userId);
    await profileService.getById(targetId);

    const existingFriendship = await friendshipRepository.findFriendshipBetween(userId, targetId);
    checkFriendshipAbsence(existingFriendship, userId, targetId);

    const friendCount = await friendshipRepository.countFriendships(userId);
    if (friendCount >= CONFIG.MAX_FRIENDS) {
      throw new AppError(ERR_DEFS.RESOURCE_LIMIT_REACHED, {
        details: { resource: LOG_RESOURCES.FRIEND, max: CONFIG.MAX_FRIENDS },
      });
    }

    return await friendshipRepository.createFriendship(userId, targetId);
  }

  async getFriendsByUserId(userId: number): Promise<FriendshipUnifiedDTO[]> {
    const friendships = await friendshipRepository.findFriendshipsByUser(userId);
    return friendships.map((f: FriendshipFullDTO) => {
      return mapFriendshipToDTO(f, userId);
    });
  }

  async updateFriendshipNickname(
    userId: number,
    targetId: number,
    nickname: string,
  ): Promise<FriendshipFullDTO | null> {
    const friendship = await friendshipRepository.findFriendshipBetween(userId, targetId);
    checkFriendshipExistence(friendship, userId, targetId);
    return await friendshipRepository.updateFriendshipNicknameRequester(friendship.id, nickname);
  }

  async updateFriendshipStatus(
    userId: number,
    targetId: number,
    status: statusUpdateDTO,
  ): Promise<FriendshipFullDTO | null> {
    const friendship = await friendshipRepository.findFriendshipBetween(userId, targetId);
    checkFriendshipExistence(friendship, userId, targetId);
    return await friendshipRepository.updateFriendshipStatus(friendship.id, status);
  }

  async removeFriend(userId: number, targetId: number): Promise<FriendshipFullDTO> {
    const friendship = await friendshipRepository.findFriendshipBetween(userId, targetId);
    checkFriendshipExistence(friendship, userId, targetId);
    return await friendshipRepository.deleteFriendshipById(friendship.id);
  }
}

export const friendshipService = new FriendshipService();
