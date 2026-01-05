import { UserProfile } from '@prisma/client';
import {
  ERR_DEFS,
  LOG_RESOURCES,
  type ProfileCreateInDTO,
  type ProfileDTO,
  AppError,
} from '@transcendence/core';
import { Trace } from '../utils/decorators.js';
import { profileRepository } from '../data/profiles.data.js';

export class ProfileService {
  @Trace
  async getByUsername(username: string): Promise<ProfileDTO | null> {
    const profile = await profileRepository.findProfileByUsername(username);
    if (!profile) {
      throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
        details: {
          resource: LOG_RESOURCES.PROFILE,
          username: username,
        },
      });
    }
    return profile;
  }

  @Trace
  async getById(userId: number): Promise<ProfileDTO | null> {
    const profile = await profileRepository.findProfileById(userId);
    if (!profile) {
      throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
        details: {
          resource: LOG_RESOURCES.PROFILE,
          id: userId,
        },
      });
    }
    return profile;
  }

  @Trace
  async createProfile(payload: ProfileCreateInDTO): Promise<UserProfile> {
    return await profileRepository.createProfile(payload);
  }
}

export const profileService = new ProfileService();
