import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { FastifyInstance } from 'fastify/types/instance.js';
import { mockProfileDTO, mockProfileDTO2 } from './fixtures/profiles.fixtures.js';
import { buildApp } from '../src/app.js';

vi.mock('../src/services/friends.service.js', () => ({
  friendshipService: {
    createFriend: vi.fn(),
    getFriendsByUserId: vi.fn(),
    updateFriendshipNickname: vi.fn(),
    updateFriendshipStatus: vi.fn(),
    removeFriend: vi.fn(),
  },
}));

import { friendshipService } from '../src/services/friends.service.js';
import {
  AppError,
  ERR_DEFS,
  FriendshipFullDTO,
  FriendshipUnifiedDTO,
  LOG_RESOURCES,
} from '@transcendence/core';

describe('Friends Controller unit tests', () => {
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

  // TODO Integration test
  // test('Should allow admin to delete any friendship', async () => {
  //   vi.spyOn(friendshipService, 'removeFriend').mockResolvedValue(mockFriendshipDTO as any);

  //   const response = await app.inject({
  //     method: 'DELETE',
  //     url: '/friends/2',
  //     headers: { 'x-user-id': '15', 'x-user-role': 'ADMIN' },
  //   });

  //   expect(response.statusCode).toBe(200);
  // });

  const mockFriendshipFullDTO = {
    id: 1,
    status: 'ACCEPTED',
    nicknameRequester: 'requesterNick',
    nicknameReceiver: 'receiverNick',
    requester: mockProfileDTO,
    receiver: mockProfileDTO2,
  };

  const mockFriendshipUnifiedDTO = {
    id: 1,
    status: 'ACCEPTED',
    nickname: 'requesterNick',
    friend: mockProfileDTO,
  };

  const generateMockFriendshipUnifiedDTOs = (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      ...mockFriendshipUnifiedDTO,
      id: index + 1,
      nickname: `Nick_${index + 1}`,
      friend: { ...mockProfileDTO, id: 100 + index },
    }));
  };

  const mockManyFriendshipUnifiedDTO = generateMockFriendshipUnifiedDTOs(10);

  describe('POST /users/friends', () => {
    test('Should add friend successfully - 201', async () => {
      vi.spyOn(friendshipService, 'createFriend').mockResolvedValue(
        mockFriendshipFullDTO as FriendshipFullDTO,
      );

      const response = await app.inject({
        method: 'POST',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { id: 2 },
      });

      expect(response.statusCode).toBe(201);
    });

    test('Should return 400 for invalid targetId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { id: -1 },
      });

      expect(response.statusCode).toBe(400);
    });

    test('Should return 404 if target user is not found', async () => {
      vi.spyOn(friendshipService, 'createFriend').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {}),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { id: 999 },
      });

      expect(response.statusCode).toBe(404);
    });

    test('Should return 409 if already friends', async () => {
      vi.spyOn(friendshipService, 'createFriend').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_ALREADY_EXIST, {}),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { id: 2 },
      });

      expect(response.statusCode).toBe(409);
    });

    test('Should return 422 if user adds himself', async () => {
      vi.spyOn(friendshipService, 'createFriend').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_INVALID_STATE, {}),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { id: 1 },
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('DELETE /friends/:id', () => {
    test('Should delete friendship - 200', async () => {
      vi.spyOn(friendshipService, 'removeFriend').mockResolvedValue(
        mockFriendshipFullDTO as FriendshipFullDTO,
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/friends/2',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('Should return 404 if not friends with target', async () => {
      vi.spyOn(friendshipService, 'removeFriend').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
          userId: 1,
          details: {
            resource: LOG_RESOURCES.FRIEND,
            targetId: 2,
          },
        }),
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/friends/3',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(404);
    });

    test('Should return 404 if profile not found', async () => {
      vi.spyOn(friendshipService, 'removeFriend').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {
          userId: 1,
          details: {
            resource: LOG_RESOURCES.PROFILE,
            targetId: 2,
          },
        }),
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/friends/2',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /friends', () => {
    test('Should return friends list - 200', async () => {
      vi.spyOn(friendshipService, 'getFriendsByUserId').mockResolvedValue(
        mockManyFriendshipUnifiedDTO as FriendshipUnifiedDTO[],
      );

      const response = await app.inject({
        method: 'GET',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('Should return 200 if no friends found', async () => {
      vi.spyOn(friendshipService, 'getFriendsByUserId').mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/friends',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PATCH /friends/:id/nickname', () => {
    test('Should update friend nickname - 200', async () => {
      const updatedFriendship = { ...mockFriendshipFullDTO, nickname: 'newNick' };
      vi.mocked(friendshipService.updateFriendshipNickname).mockResolvedValue(
        updatedFriendship as FriendshipFullDTO,
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/friends/2/nickname`,
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { nickname: 'newNick' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('Should return 400 for invalid nickname', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/friends/2/nickname',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { nickname: 'a'.repeat(51) },
      });

      expect(response.statusCode).toBe(400);
    });

    test('Should return 404 if friendship not found', async () => {
      vi.spyOn(friendshipService, 'updateFriendshipNickname').mockRejectedValue(
        new AppError(ERR_DEFS.RESOURCE_NOT_FOUND, {}),
      );

      const response = await app.inject({
        method: 'PATCH',
        url: '/friends/2/nickname',
        headers: { 'x-user-id': '1', 'x-user-name': 'toto' },
        payload: { nickname: 'newNick' },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
