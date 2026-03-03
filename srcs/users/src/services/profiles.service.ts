import { UserProfile } from '@prisma/client';
import {
  ERR_DEFS,
  LOG_RESOURCES,
  type ProfileCreateInDTO,
  type ProfileSimpleDTO,
  type ProfileDTO,
  AppError,
} from '@transcendence/core';
import { Trace } from '../utils/decorators.js';
import { profileRepository } from '../data/profiles.data.js';
import path from 'node:path';
import type { MultipartFile } from '@fastify/multipart';
import { mkdir } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { mapProfileToDTO, mapProfileToIdDTO } from '../utils/mappers.js';

async function getProfileOrThrow(username: string): Promise<UserProfile> {
  const profile = await profileRepository.findProfileByUsername(username);
  if (!profile) {
    throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
      details: [
        {
          resource: LOG_RESOURCES.PROFILE,
          value: username,
        },
      ],
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
  async getByUsername(username: string): Promise<ProfileSimpleDTO> {
    const profileData = await getProfileOrThrow(username);
    return mapProfileToDTO(profileData);
  }

  async getByUsernameRaw(username: string): Promise<UserProfile> {
    const profileData = await getProfileOrThrow(username);
    return profileData;
  }

  @Trace
  async getByUsernameQuery(query: string): Promise<ProfileSimpleDTO[] | null> {
    const rawProfiles = await profileRepository.findProfilesByUsernameQuery(query);
    return rawProfiles?.map((p) => mapProfileToDTO(p));
  }

  @Trace
  async getProfileByUsername(username: string): Promise<ProfileDTO | null> {
    const profileData = await getProfileOrThrow(username);
    return mapProfileToIdDTO(profileData);
  }

  @Trace
  async getById(authId: number): Promise<ProfileSimpleDTO | null> {
    const profile = await profileRepository.findProfileById(authId);
    if (!profile) {
      throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
        details: [
          {
            resource: LOG_RESOURCES.PROFILE,
            value: String(authId),
          },
        ],
      });
    }
    return profile;
  }

  @Trace
  async updateUsername(username: string, newUsername: string): Promise<ProfileSimpleDTO> {
    const profile = await getProfileOrThrow(username);
    if (username === newUsername) return profile;
    const conflictingProfile = await profileRepository.findProfileByUsername(newUsername);
    if (conflictingProfile) {
      throw new AppError(ERR_DEFS.RESOURCE_CONFLICT, {
        details: [
          {
            field: 'username',
            value: newUsername,
          },
        ],
      });
    }
    const updatedProfile = await profileRepository.updateProfileUsername(
      profile.authId,
      newUsername,
    );
    return updatedProfile;
  }

  @Trace
  async updateAvatar(username: string, file: MultipartFile): Promise<ProfileSimpleDTO> {
    const profile = await getProfileOrThrow(username);

    const data = await file.toBuffer();

    const type = await fileTypeFromBuffer(data);
    const allowedTypes = ['image/png', 'image/jpeg'];
    const isValidType = type && allowedTypes.includes(type.mime);
    if (!isValidType) {
      throw new AppError(ERR_DEFS.RESSOURCE_INVALID_TYPE, { details: [{ field: 'file' }] });
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

  async deleteByUsername(username: string): Promise<ProfileSimpleDTO> {
    const profile = await getProfileOrThrow(username);
    const deletedProfile = await profileRepository.deleteProfile(profile.authId);
    return deletedProfile;
  }

  @Trace
  async deleteById(authId: number): Promise<void> {
    const profile = await profileRepository.findProfileById(authId);
    if (!profile) {
      throw new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
        details: [
          {
            resource: LOG_RESOURCES.PROFILE,
            value: String(authId),
          },
        ],
      });
    }
    await profileRepository.deleteProfile(authId);
  }
}

export const profileService = new ProfileService();
