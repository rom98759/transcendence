import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { AppError, ERR_DEFS, LOG_RESOURCES, ProfileDTO } from '@transcendence/core';
import { FastifyInstance } from 'fastify';
import { mockProfileDTO, mockProfileDTOUpdatedAvatar } from './fixtures/profiles.fixtures.js';
import { buildApp } from '../src/app.js';

vi.mock('../src/services/profiles.service.js', () => ({
  profileService: {
    getByUsername: vi.fn(),
    createProfile: vi.fn(),
    updateAvatar: vi.fn(),
    deleteByUsername: vi.fn(),
  },
}));

vi.mock('../src/utils/mappers.js', () => ({
  mapProfileToDTO: vi.fn(),
}));

const authHeaders = { 'x-user-id': '1', 'x-user-name': 'Toto' };

const mockUserProfile = {
  id: 1,
  authId: 1,
  createdAt: new Date(),
  email: 'toto@mail.com',
  username: 'Toto',
};

const mockProfileCreateIn = {
  authId: mockUserProfile.authId,
  email: mockUserProfile.email,
  username: mockUserProfile.username,
};

const mockProfileCreateInIncomplete = {
  email: mockUserProfile.email,
  username: mockUserProfile.username,
};

import { profileService } from '../src/services/profiles.service.js';
import { mapProfileToDTO } from '../src/utils/mappers.js';
import { UserProfile } from '@prisma/client';

describe('Profile Controller unit tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const makeMultipart = (
    fieldName: string,
    fileName: string,
    content: string,
    contentType: string,
  ) => {
    const boundary = '----VitestBoundary';
    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--\r\n`,
      'utf8',
    );
    return { body, boundary };
  };

  describe('POST /', () => {
    test('Should add profile successfully - 201', async () => {
      vi.spyOn(profileService, 'createProfile').mockResolvedValue(mockUserProfile as UserProfile);
      vi.mocked(mapProfileToDTO).mockReturnValue(mockProfileDTO as ProfileDTO);

      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: authHeaders,
        payload: mockProfileCreateIn,
      });

      expect(response.statusCode).toBe(201);
    });

    test('Should return 400 if missing authId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: authHeaders,
        payload: mockProfileCreateInIncomplete,
      });

      expect(response.statusCode).toBe(400);
    });

    test('Should return 409 if profile exists', async () => {
      vi.spyOn(profileService, 'createProfile').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_ALREADY_EXIST, {}),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: authHeaders,
        payload: mockProfileCreateIn,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /username/:username', () => {
    test('Should return user profile - 200', async () => {
      vi.spyOn(profileService, 'getByUsername').mockResolvedValue(mockProfileDTO as ProfileDTO);

      const response = await app.inject({
        method: 'GET',
        headers: authHeaders,
        url: '/username/toto',
      });

      expect(profileService.getByUsername).toHaveBeenCalledWith('toto');
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockProfileDTO);
    });

    test('Should return 400 and reject admin as username', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/username/admin',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(400);
    });

    test('Should return 404 if not found', async () => {
      vi.spyOn(profileService, 'getByUsername').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
          details: {
            resource: LOG_RESOURCES.PROFILE,
            username: 'unknown',
          },
        }),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/username/unknown',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });

    test('Should return 500 if service throws server side error', async () => {
      vi.spyOn(profileService, 'getByUsername').mockRejectedValue(
        new AppError(ERR_DEFS.SERVICE_GENERIC, {}),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/username/toto',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('PATCH /username/:username/avatar', () => {
    test('Should return 200 if updated', async () => {
      vi.spyOn(profileService, 'updateAvatar').mockResolvedValue(
        mockProfileDTOUpdatedAvatar as ProfileDTO,
      );

      const { body, boundary } = makeMultipart('', 'avatar.jpg', 'xxxxxxxxxxxxx', 'image/jpeg');
      const response = await app.inject({
        method: 'PATCH',
        url: '/username/Toto/avatar',
        headers: {
          'x-user-id': '1',
          'x-user-name': 'toto',
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      expect(response.statusCode).toBe(200);
    });

    test('Should return 400 if no data', async () => {
      vi.spyOn(profileService, 'updateAvatar').mockResolvedValue(
        mockProfileDTOUpdatedAvatar as ProfileDTO,
      );

      const response = await app.inject({
        method: 'PATCH',
        url: '/username/Toto/avatar',
        headers: {
          'x-user-id': '1',
          'x-user-name': 'toto',
          'content-type': `multipart/form-data; boundary=----VitestBoundary`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /username/:username', () => {
    test('Should return 200 if no service error', async () => {
      vi.spyOn(profileService, 'deleteByUsername').mockResolvedValue(mockProfileDTO as ProfileDTO);
      const response = await app.inject({
        method: 'DELETE',
        url: '/username/Toto',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
    });

    test('Should return 404 if not found', async () => {
      vi.spyOn(profileService, 'deleteByUsername').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
          details: {
            resource: LOG_RESOURCES.PROFILE,
            username: 'unknown',
          },
        }),
      );
      const response = await app.inject({
        method: 'DELETE',
        url: '/username/Toto',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
