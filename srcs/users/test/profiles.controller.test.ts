import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { afterEach } from 'node:test';
import { AppError, ERR_DEFS, LOG_RESOURCES, ProfileDTO } from '@transcendence/core';
import { FastifyInstance } from 'fastify';
import { mockProfileDTO } from './fixtures/profiles.fixtures.js';
import { buildApp } from '../src/app.js';

vi.mock('../src/services/um.service.js', () => ({
  profileService: {
    getByUsername: vi.fn(),
    getById: vi.fn(),
    createProfile: vi.fn(),
  },
}));

vi.mock('../src/utils/mappers.js', () => ({
  mapUserProfileToDTO: vi.fn(),
}));

import { profileService } from '../src/services/profiles.service.js';

describe('Profile Controller unit tests', () => {
  let app: FastifyInstance;

  describe('GET /:username', () => {
    beforeAll(async () => {
      process.env['NODE_ENV'] = 'test';
      app = await buildApp();
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    test('Should return user profile', async () => {
      vi.spyOn(profileService, 'getByUsername').mockResolvedValue(mockProfileDTO as ProfileDTO);

      const response = await app.inject({
        method: 'GET',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        url: '/toto',
      });

      expect(profileService.getByUsername).toHaveBeenCalledWith('toto');
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockProfileDTO);
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
        url: '/unknown',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(404);
    });

    test('Should reject admin as username', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('Should return 500 if service throws server side error', async () => {
      vi.spyOn(profileService, 'getByUsername').mockRejectedValue(
        new AppError(ERR_DEFS.SERVICE_GENERIC, {}),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/unknown',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
