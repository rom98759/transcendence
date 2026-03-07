import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ERR_DEFS, type ProfileCreateInDTO, type ProfileDTO } from '@transcendence/core';
import { UserProfile } from '@prisma/client';

vi.mock('../src/utils/decorators.js', () => ({
  Trace: (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

vi.mock('../src/data/profiles.data.js', () => ({
  profileRepository: {
    createProfile: vi.fn(),
    findProfileByUsername: vi.fn(),
    findProfileById: vi.fn(),
    updateProfileAvatar: vi.fn(),
    storeOnUploadVolume: vi.fn(),
    deleteProfile: vi.fn(),
  },
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
}));

import { profileRepository } from '../src/data/profiles.data.js';
import { profileService } from '../src/services/profiles.service.js';
import { MultipartFile } from '@fastify/multipart';
import { PassThrough } from 'stream';
import { fileTypeFromBuffer } from 'file-type';
import {
  createPayload,
  mockUserProfile,
  mockProfileDTO as mockSimpleProfileDTO,
  mockFullProfileDTO1,
} from './fixtures/profiles.fixtures.js';

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProfile', () => {
    it('creates a profile through the repository', async () => {
      vi.mocked(profileRepository.createProfile).mockResolvedValue(mockUserProfile);

      const result = await profileService.createProfile(createPayload);

      expect(profileRepository.createProfile).toHaveBeenCalledWith(createPayload);
      expect(result).toEqual(mockUserProfile);
    });
  });

  describe('getProfileByUsername', () => {
    it('returns the profile when found', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockUserProfile);

      const result = await profileService.getByUsername('toto');

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(result).toEqual(mockSimpleProfileDTO);
    });

    it('throws AppError when profile does not exist', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(null);

      await expect(profileService.getByUsername('unknown')).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
        statusCode: ERR_DEFS.RESOURCE_NOT_FOUND.statusCode,
      });
      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('unknown');
    });
  });

  describe('getProfileWithIdByUsername', () => {
    it('returns the whole profile when found', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockUserProfile);

      const result = await profileService.getProfileWithIdByUsername('toto');

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(result).toEqual(mockFullProfileDTO1);
    });

    it('throws AppError when profile does not exist', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(null);

      await expect(profileService.getProfileWithIdByUsername('unknown')).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
        statusCode: ERR_DEFS.RESOURCE_NOT_FOUND.statusCode,
      });
      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('unknown');
    });
  });

  describe('getProfileById', () => {
    it('returns the profile when found', async () => {
      vi.mocked(profileRepository.findProfileById).mockResolvedValue(mockUserProfile);

      const result = await profileService.getProfileByIdOrThrow(mockUserProfile.authId);

      expect(profileRepository.findProfileById).toHaveBeenCalledWith(mockUserProfile.authId);
      expect(result).toEqual(mockUserProfile);
    });

    it('throws AppError when profile id is unknown', async () => {
      vi.mocked(profileRepository.findProfileById).mockResolvedValue(null);

      await expect(profileService.getProfileByIdOrThrow(999)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
        statusCode: ERR_DEFS.RESOURCE_NOT_FOUND.statusCode,
      });
      expect(profileRepository.findProfileById).toHaveBeenCalledWith(999);
    });
  });

  describe('updateAvatar', () => {
    const makeFile = (mimetype: string): MultipartFile => {
      const passThrough = new PassThrough();
      passThrough.end('avatar-bytes');
      const stream = Object.assign(passThrough, {
        truncated: false,
        bytesRead: 12,
      }) as unknown as MultipartFile['file'];
      return {
        file: stream,
        filename: 'avatar.png',
        encoding: '7bit',
        fieldname: 'file',
        mimetype,
        type: 'file',
        toBuffer: async () => Buffer.from('avatar-bytes'),
        fields: {},
      } satisfies MultipartFile;
    };

    it('uploads avatar and updates profile', async () => {
      vi.spyOn(profileService, 'getProfileByIdOrThrow').mockResolvedValue(
        mockUserProfile as UserProfile,
      );
      vi.mocked(profileRepository.storeOnUploadVolume).mockResolvedValue();
      const updated = { ...mockUserProfile, avatarUrl: '/uploads/new.png' } satisfies ProfileDTO;
      vi.mocked(profileRepository.updateProfileAvatar).mockResolvedValue(updated);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({ ext: 'png', mime: 'image/png' });

      const result = await profileService.updateAvatar(1, makeFile('image/png'));

      expect(profileRepository.storeOnUploadVolume).toHaveBeenCalled();
      expect(profileRepository.updateProfileAvatar).toHaveBeenCalledWith(
        mockUserProfile.authId,
        expect.stringContaining('/uploads/'),
      );
      expect(result).toEqual(updated);
    });

    it('throws on invalid mimetype', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockUserProfile);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({ ext: 'txt', mime: 'text/plain' });

      const call = profileService.updateAvatar(1, makeFile('text/plain'));
      await expect(call).rejects.toMatchObject({
        code: ERR_DEFS.RESSOURCE_INVALID_TYPE.code,
        statusCode: ERR_DEFS.RESSOURCE_INVALID_TYPE.statusCode,
      });
    });
  });

  describe('deleteByUsername', () => {
    it('calls repo for delete when found', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockUserProfile);
      vi.mocked(profileRepository.deleteProfile).mockResolvedValue(mockUserProfile);

      const result = await profileService.deleteByUsername('toto');

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(profileRepository.deleteProfile).toHaveBeenCalledWith(mockUserProfile.authId);
      expect(result).toEqual(mockUserProfile);
    });
  });
});
