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
import path from 'node:path';
import type { MultipartFile } from '@fastify/multipart';
import { mkdir } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';

async function getProfileOrThrow(username: string): Promise<ProfileDTO> {
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

export class ProfileService {
  @Trace
  async createProfile(payload: ProfileCreateInDTO): Promise<UserProfile> {
    return await profileRepository.createProfile(payload);
  }

  @Trace
  async getByUsername(username: string): Promise<ProfileDTO | null> {
    const profile = await getProfileOrThrow(username);
    return profile;
  }

  @Trace
  async getById(authId: number): Promise<ProfileDTO | null> {
    const profile = await profileRepository.findProfileById(authId);
    if (!profile) {
      throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
        details: {
          resource: LOG_RESOURCES.PROFILE,
          id: authId,
        },
      });
    }
    return profile;
  }

  @Trace
  async updateAvatar(username: string, file: MultipartFile): Promise<ProfileDTO> {
    const profile = await getProfileOrThrow(username);

    const data = await file.toBuffer();

    const type = await fileTypeFromBuffer(data);
    const allowedTypes = ['image/png', 'image/jpeg'];
    const isValidType = type && allowedTypes.includes(type.mime);
    if (!isValidType) {
      throw new AppError(ERR_DEFS.RESSOURCE_INVALID_TYPE, { details: 'Invalid file type' });
    }

    const uniqueName = `avatar-${username}-${Date.now()}.${type.ext}`;
    const uploadDir = '/app/uploads';
    const uploadPath = path.join(uploadDir, uniqueName);
    const publicUrl = `/uploads/${uniqueName}`;
    await mkdir(uploadDir, { recursive: true });
    await profileRepository.storeOnUploadVolume(data, uploadPath);

    const updatedProfile = await profileRepository.updateProfileAvatar(profile.authId, publicUrl);
    return updatedProfile;
  }

  async deleteByUsername(username: string): Promise<ProfileDTO> {
    const profile = await getProfileOrThrow(username);
    const deletedProfile = await profileRepository.deleteProfile(profile.authId);
    return deletedProfile;
  }
}

export const profileService = new ProfileService();
