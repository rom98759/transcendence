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
import { logger } from '../utils/logger.js';
import { FriendshipWithProfiles } from 'src/types/friend.js';

export function checkFriendshipAbsence(
  friendship: Friendship | null,
  userId: number,
  targetId: number,
) {
  if (friendship) {
    throw new AppError(ERR_DEFS.RESOURCE_ALREADY_EXIST, {
      userId: userId,
      details: [{ resource: LOG_RESOURCES.FRIEND }],
      meta: {
        friendshipId: String(friendship.id),
        status: friendship.status,
        targetId: String(targetId),
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
      details: [{ resource: LOG_RESOURCES.FRIEND }],
      meta: { targetId: String(targetId) },
    });
  }
}
export class FriendshipService {
  async createFriend(
    username: string,
    userId: number,
    targetUsername: string,
  ): Promise<FriendshipFullDTO> {
    if (username === targetUsername) {
      throw new AppError(ERR_DEFS.RESOURCE_INVALID_STATE, {
        details: [{ resource: LOG_RESOURCES.FRIEND }],
        meta: { username, targetUsername },
      });
    }

    await profileService.getProfileByIdOrThrow(userId);
    const fullTarget = await profileService.getByUsernameRaw(targetUsername);

    const existingFriendship = await friendshipRepository.findFriendshipBetween(
      userId,
      fullTarget.authId,
    );
    checkFriendshipAbsence(existingFriendship, userId, fullTarget.authId);

    const friendCount = await friendshipRepository.countFriendships(userId);
    if (friendCount >= CONFIG.MAX_FRIENDS) {
      throw new AppError(ERR_DEFS.RESOURCE_LIMIT_REACHED, {
        details: [{ resource: LOG_RESOURCES.FRIEND }],
        meta: { max: String(CONFIG.MAX_FRIENDS) },
      });
    }
    logger.info({ userId, targetAuthId: fullTarget.authId });

    return await friendshipRepository.createFriendship(userId, fullTarget.authId);
  }

  async getFriendsByUserId(userId: number): Promise<FriendshipUnifiedDTO[]> {
    const friendships = await friendshipRepository.findFriendshipsByUser(userId);
    return friendships.map((f: FriendshipWithProfiles) => {
      return mapFriendshipToDTO(f, userId);
    });
  }

  async updateFriendshipNickname(
    userId: number,
    targetUsername: string,
    nickname: string,
  ): Promise<FriendshipFullDTO | null> {
    const fullTarget = await profileService.getByUsernameRaw(targetUsername);
    const friendship = await friendshipRepository.findFriendshipBetween(userId, fullTarget.authId);
    checkFriendshipExistence(friendship, userId, fullTarget.authId);
    return await friendshipRepository.updateFriendshipNicknameRequester(friendship.id, nickname);
  }

  async updateFriendshipStatus(
    userId: number,
    targetUsername: string,
    status: statusUpdateDTO,
  ): Promise<FriendshipFullDTO | null> {
    const fullTarget = await profileService.getByUsernameRaw(targetUsername);
    const friendship = await friendshipRepository.findFriendshipBetween(userId, fullTarget.authId);
    checkFriendshipExistence(friendship, userId, fullTarget.authId);
    return await friendshipRepository.updateFriendshipStatus(friendship.id, status);
  }

  async removeFriend(userId: number, targetUsername: string): Promise<FriendshipFullDTO> {
    const fullTarget = await profileService.getByUsernameRaw(targetUsername);
    const friendship = await friendshipRepository.findFriendshipBetween(userId, fullTarget.authId);
    checkFriendshipExistence(friendship, userId, fullTarget.authId);
    return await friendshipRepository.deleteFriendshipById(friendship.id);
  }
}

export const friendshipService = new FriendshipService();
