import { UserProfile } from '@prisma/client';
import { FriendshipFullDTO, FriendshipUnifiedDTO, ProfileDTO } from '@transcendence/core';

export function mapProfileToDTO(profile: UserProfile): ProfileDTO {
  return {
    authId: profile.authId,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
  };
}

export function mapFriendshipToDTO(
  friendship: FriendshipFullDTO,
  currentUserId: number,
): FriendshipUnifiedDTO {
  const friendProfile =
    friendship.receiver.authId === currentUserId ? friendship.requester : friendship.receiver;
  return {
    id: friendship.id,
    status: friendship.status,
    nickname: friendship.nickname,
    friend: friendProfile,
  };
}
