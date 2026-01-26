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

const mockProfile: ProfileDTO = {
  authId: 1,
  username: 'toto',
  avatarUrl: '/uploads/avatar-toto.png',
};

const mockUserProfile: UserProfile = {
  id: 1,
  authId: mockProfile.authId,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  email: 'toto@mail.com',
  username: mockProfile.username,
  avatarUrl: mockProfile.avatarUrl,
};

const createPayload: ProfileCreateInDTO = {
  authId: mockProfile.authId,
  username: mockProfile.username,
  email: 'toto@mail.com',
};

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

  describe('getByUsername', () => {
    it('returns the profile when found', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockProfile);

      const result = await profileService.getByUsername('toto');

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(result).toEqual(mockProfile);
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

  describe('getById', () => {
    it('returns the profile when found', async () => {
      vi.mocked(profileRepository.findProfileById).mockResolvedValue(mockProfile);

      const result = await profileService.getById(mockProfile.authId);

      expect(profileRepository.findProfileById).toHaveBeenCalledWith(mockProfile.authId);
      expect(result).toEqual(mockProfile);
    });

    it('throws AppError when profile id is unknown', async () => {
      vi.mocked(profileRepository.findProfileById).mockResolvedValue(null);

      await expect(profileService.getById(999)).rejects.toMatchObject({
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
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockProfile);
      vi.mocked(profileRepository.storeOnUploadVolume).mockResolvedValue();
      const updated = { ...mockProfile, avatarUrl: '/uploads/new.png' } satisfies ProfileDTO;
      vi.mocked(profileRepository.updateProfileAvatar).mockResolvedValue(updated);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({ ext: 'png', mime: 'image/png' });

      const result = await profileService.updateAvatar('toto', makeFile('image/png'));

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(profileRepository.storeOnUploadVolume).toHaveBeenCalled();
      expect(profileRepository.updateProfileAvatar).toHaveBeenCalledWith(
        mockProfile.authId,
        expect.stringContaining('/uploads/'),
      );
      expect(result).toEqual(updated);
    });

    it('throws on invalid mimetype', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockProfile);
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({ ext: 'txt', mime: 'text/plain' });

      const call = profileService.updateAvatar('toto', makeFile('text/plain'));
      await expect(call).rejects.toMatchObject({
        code: ERR_DEFS.RESSOURCE_INVALID_TYPE.code,
        statusCode: ERR_DEFS.RESSOURCE_INVALID_TYPE.statusCode,
      });
    });
  });

  describe('deleteByUsername', () => {
    it('calls repo for delete when found', async () => {
      vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue(mockProfile);
      vi.mocked(profileRepository.deleteProfile).mockResolvedValue(mockProfile);

      const result = await profileService.deleteByUsername('toto');

      expect(profileRepository.findProfileByUsername).toHaveBeenCalledWith('toto');
      expect(profileRepository.deleteProfile).toHaveBeenCalledWith(mockProfile.authId);
      expect(result).toEqual(mockProfile);
    });
  });
});
