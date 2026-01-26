import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError, ERR_DEFS, type ProfileCreateInDTO, type ProfileDTO } from '@transcendence/core';

vi.mock('../src/utils/decorators.js', () => ({
  Trace: (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

const { dbMocks, fsMocks, streamMocks } = vi.hoisted(() => ({
  dbMocks: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  fsMocks: {
    createWriteStream: vi.fn(),
    existsSync: vi.fn(),
    unlink: vi.fn(),
    writeFile: vi.fn(),
  },
  streamMocks: {
    pipeline: vi.fn(),
  },
}));

vi.mock('../src/data/prisma.js', () => ({
  prisma: {
    userProfile: {
      create: dbMocks.create,
      findUnique: dbMocks.findUnique,
      update: dbMocks.update,
      delete: dbMocks.delete,
    },
  },
}));

vi.mock('node:fs', () => ({
  createWriteStream: fsMocks.createWriteStream,
  existsSync: fsMocks.existsSync,
  promises: { unlink: fsMocks.unlink },
}));

vi.mock('node:fs/promises', () => ({
  unlink: fsMocks.unlink,
  writeFile: fsMocks.writeFile,
}));

vi.mock('node:stream/promises', () => ({
  pipeline: streamMocks.pipeline,
}));

import { profileRepository } from '../src/data/profiles.data.js';

const mockProfile: ProfileDTO = {
  authId: 1,
  username: 'toto',
  avatarUrl: '/uploads/avatar.png',
};

const createPayload: ProfileCreateInDTO = {
  authId: 1,
  username: 'toto',
  email: 'toto@mail.com',
};

const mockBuffer = Buffer.from('fake-image-data');

describe('ProfileRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProfile', () => {
    it('creates profile and returns entity', async () => {
      dbMocks.create.mockResolvedValue({
        id: 10,
        ...createPayload,
        createdAt: new Date(),
        avatarUrl: null,
      });

      const result = await profileRepository.createProfile(createPayload);

      expect(dbMocks.create).toHaveBeenCalledWith({
        data: {
          authId: createPayload.authId,
          username: createPayload.username,
          email: createPayload.email,
          avatarUrl: null,
        },
      });
      expect(result).toMatchObject({
        authId: createPayload.authId,
        username: createPayload.username,
      });
    });

    it('throws AppError on unique constraint', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: 'username' },
      });
      dbMocks.create.mockRejectedValue(prismaError);

      await expect(profileRepository.createProfile(createPayload)).rejects.toBeInstanceOf(AppError);
      await expect(profileRepository.createProfile(createPayload)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_ALREADY_EXIST.code,
        statusCode: ERR_DEFS.RESOURCE_ALREADY_EXIST.statusCode,
      });
    });
  });

  describe('findProfileByUsername', () => {
    it('returns profile DTO when found', async () => {
      dbMocks.findUnique.mockResolvedValue(mockProfile);

      const result = await profileRepository.findProfileByUsername('toto');

      expect(dbMocks.findUnique).toHaveBeenCalledWith({
        where: { username: 'toto' },
        select: { authId: true, username: true, avatarUrl: true },
      });
      expect(result).toEqual(mockProfile);
    });

    it('returns null when not found', async () => {
      dbMocks.findUnique.mockResolvedValue(null);

      const result = await profileRepository.findProfileByUsername('ghost');

      expect(result).toBeNull();
    });
  });

  describe('findProfileById', () => {
    it('returns profile DTO when found', async () => {
      dbMocks.findUnique.mockResolvedValue(mockProfile);

      const result = await profileRepository.findProfileById(1);

      expect(dbMocks.findUnique).toHaveBeenCalledWith({
        where: { authId: 1 },
        select: { authId: true, username: true, avatarUrl: true },
      });
      expect(result).toEqual(mockProfile);
    });
  });

  describe('deleteOldFile', () => {
    it('removes file when it exists', async () => {
      fsMocks.existsSync.mockReturnValue(true);

      await profileRepository.deleteOldFile('/uploads/avatar.png');

      // console.log(`mock calls delete - ${fsMocks.unlink.mock.calls}`);
      expect(fsMocks.existsSync).toHaveBeenCalled();
      expect(fsMocks.unlink).toHaveBeenCalled();
    });

    it('skips removal when file missing', async () => {
      fsMocks.existsSync.mockReturnValue(false);

      await profileRepository.deleteOldFile('/uploads/avatar.png');

      expect(fsMocks.unlink).not.toHaveBeenCalled();
    });
  });

  describe('storeOnUploadVolume', () => {
    const mockPath = '/app/uploads/avatar.png';
    it('calls pipeline to store file', async () => {
      fsMocks.writeFile.mockResolvedValue(undefined);

      await profileRepository.storeOnUploadVolume(mockBuffer, mockPath);

      expect(fsMocks.writeFile).toHaveBeenCalledWith(mockPath, mockBuffer);
      expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
    });

    it('wraps errors into AppError', async () => {
      fsMocks.writeFile.mockRejectedValue(new Error('disk error'));

      const call = profileRepository.storeOnUploadVolume(mockBuffer, mockPath);

      await expect(call).rejects.toMatchObject({ code: ERR_DEFS.SERVICE_GENERIC.code });
    });
  });

  describe('deleteProfile', () => {
    it('calls prisma delete', async () => {
      dbMocks.delete.mockResolvedValue(mockProfile);

      const result = await profileRepository.deleteProfile(1);

      expect(dbMocks.delete).toHaveBeenCalledWith({ where: { authId: 1 } });
      expect(result).toEqual(mockProfile);
    });
  });
});
