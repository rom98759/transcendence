import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG, ERR_DEFS } from '@transcendence/core';

vi.mock('../src/utils/decorators.js', () => ({
  Trace: (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

const repoMocks = vi.hoisted(() => ({
  findFriendshipBetween: vi.fn(),
  countFriendships: vi.fn(),
  createFriendship: vi.fn(),
  findFriendshipsByUser: vi.fn(),
  updateFriendshipNicknameRequester: vi.fn(),
  updateFriendshipStatus: vi.fn(),
  deleteFriendshipById: vi.fn(),
}));

vi.mock('../src/data/friends.data.js', () => ({
  friendshipRepository: repoMocks,
}));

const profileServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
}));

vi.mock('../src/services/profiles.service.js', () => ({
  profileService: profileServiceMock,
}));

import {
  checkFriendshipAbsence,
  checkFriendshipExistence,
  friendshipService,
} from '../src/services/friends.service.js';

const baseFriendship = {
  id: 42,
  status: 'ACCEPTED',
  nicknameRequester: 'fromRequester',
  nicknameReceiver: 'fromReceiver',
  requester: { authId: 1, username: 'alice', avatarUrl: null },
  receiver: { authId: 2, username: 'bob', avatarUrl: null },
};

describe('FriendshipService guards', () => {
  it('checkFriendshipAbsence throws when relation exists', () => {
    expect(() => checkFriendshipAbsence(baseFriendship as never, 1, 2)).toThrowError(
      expect.objectContaining({
        code: ERR_DEFS.RESOURCE_ALREADY_EXIST.code,
        statusCode: ERR_DEFS.RESOURCE_ALREADY_EXIST.statusCode,
      }),
    );
  });

  it('checkFriendshipAbsence passes when relation absent', () => {
    expect(() => checkFriendshipAbsence(null, 1, 2)).not.toThrow();
  });

  it('checkFriendshipExistence throws when relation missing', () => {
    expect(() => checkFriendshipExistence(null, 1, 2)).toThrowError(
      expect.objectContaining({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
        statusCode: ERR_DEFS.RESOURCE_NOT_FOUND.statusCode,
      }),
    );
  });

  it('checkFriendshipExistence passes when relation present', () => {
    expect(() => checkFriendshipExistence(baseFriendship as never, 1, 2)).not.toThrow();
  });
});

describe('FriendshipService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileServiceMock.getById.mockResolvedValue({});
  });

  describe('createFriend', () => {
    it('rejects self relation', async () => {
      await expect(friendshipService.createFriend(1, 1)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_INVALID_STATE.code,
        statusCode: ERR_DEFS.RESOURCE_INVALID_STATE.statusCode,
      });
    });

    it('rejects when friendship already exists', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(baseFriendship);

      await expect(friendshipService.createFriend(1, 2)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_ALREADY_EXIST.code,
      });
      expect(repoMocks.createFriendship).not.toHaveBeenCalled();
    });

    it('rejects when max friends reached', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(null);
      repoMocks.countFriendships.mockResolvedValue(CONFIG.MAX_FRIENDS);

      await expect(friendshipService.createFriend(1, 2)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_LIMIT_REACHED.code,
      });
      expect(repoMocks.createFriendship).not.toHaveBeenCalled();
    });

    it('creates friendship when checks pass', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(null);
      repoMocks.countFriendships.mockResolvedValue(1);
      repoMocks.createFriendship.mockResolvedValue(baseFriendship);

      const result = await friendshipService.createFriend(1, 2);

      expect(profileServiceMock.getById).toHaveBeenCalledWith(1);
      expect(profileServiceMock.getById).toHaveBeenCalledWith(2);
      expect(repoMocks.createFriendship).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual(baseFriendship);
    });
  });

  describe('getFriendsByUserId', () => {
    it('maps friendships to unified view', async () => {
      const incomingFriendship = {
        ...baseFriendship,
        id: 99,
        receiver: { authId: 1, username: 'alice', avatarUrl: null },
        requester: { authId: 3, username: 'charlie', avatarUrl: null },
        nicknameRequester: 'nickFromAlice',
        nicknameReceiver: 'nickFromCharlie',
      };
      repoMocks.findFriendshipsByUser.mockResolvedValue([baseFriendship, incomingFriendship]);

      const result = await friendshipService.getFriendsByUserId(1);

      expect(repoMocks.findFriendshipsByUser).toHaveBeenCalledWith(1);
      expect(result).toEqual([
        {
          id: baseFriendship.id,
          status: baseFriendship.status,
          nickname: baseFriendship.nicknameReceiver,
          friend: baseFriendship.receiver,
        },
        {
          id: incomingFriendship.id,
          status: incomingFriendship.status,
          nickname: incomingFriendship.nicknameRequester,
          friend: incomingFriendship.requester,
        },
      ]);
    });
  });

  describe('updateFriendshipNickname', () => {
    it('throws when friendship missing', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(null);

      await expect(friendshipService.updateFriendshipNickname(1, 2, 'buddy')).rejects.toMatchObject(
        {
          code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
        },
      );
    });

    it('updates nickname when friendship exists', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(baseFriendship);
      const updated = { ...baseFriendship, nicknameRequester: 'buddy' };
      repoMocks.updateFriendshipNicknameRequester.mockResolvedValue(updated);

      const result = await friendshipService.updateFriendshipNickname(1, 2, 'buddy');

      expect(repoMocks.updateFriendshipNicknameRequester).toHaveBeenCalledWith(
        baseFriendship.id,
        'buddy',
      );
      expect(result).toEqual(updated);
    });
  });

  describe('updateFriendshipStatus', () => {
    it('throws when friendship missing', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(null);

      await expect(
        friendshipService.updateFriendshipStatus(1, 2, 'REJECTED'),
      ).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
      });
    });

    it('updates status when friendship exists', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(baseFriendship);
      const updated = { ...baseFriendship, status: 'REJECTED' };
      repoMocks.updateFriendshipStatus.mockResolvedValue(updated);

      const result = await friendshipService.updateFriendshipStatus(1, 2, 'REJECTED');

      expect(repoMocks.updateFriendshipStatus).toHaveBeenCalledWith(baseFriendship.id, 'REJECTED');
      expect(result).toEqual(updated);
    });
  });

  describe('removeFriend', () => {
    it('throws when friendship missing', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(null);

      await expect(friendshipService.removeFriend(1, 2)).rejects.toMatchObject({
        code: ERR_DEFS.RESOURCE_NOT_FOUND.code,
      });
    });

    it('removes friendship when it exists', async () => {
      repoMocks.findFriendshipBetween.mockResolvedValue(baseFriendship);
      repoMocks.deleteFriendshipById.mockResolvedValue(baseFriendship);

      const result = await friendshipService.removeFriend(1, 2);

      expect(repoMocks.deleteFriendshipById).toHaveBeenCalledWith(baseFriendship.id);
      expect(result).toEqual(baseFriendship);
    });
  });
});
