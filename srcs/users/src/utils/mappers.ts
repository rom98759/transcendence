import type { UserProfile } from '@prisma/client';
import { ProfileDTO } from '@transcendence/core';

export function mapUserProfileToDTO(model: UserProfile): ProfileDTO {
  return {
    username: model.username,
    avatarUrl: model.avatarUrl,
  };
}
