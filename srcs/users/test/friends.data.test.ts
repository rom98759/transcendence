import { friendshipRepository } from '../src/data/friends.data';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockProfileDTO, mockProfileDTO2 } from './fixtures/profiles.fixtures';

vi.mock('../src/utils/decorators.js', () => ({
  Trace: (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

const { dbMocks } = vi.hoisted(() => ({
  dbMocks: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/data/prisma.js', () => ({
  prisma: {
    friendship: {
      create: dbMocks.create,
      findUnique: dbMocks.findUnique,
      findFirst: dbMocks.findFirst,
      findMany: dbMocks.findMany,
      count: dbMocks.count,
      update: dbMocks.update,
      delete: dbMocks.delete,
    },
  },
}));

const mockFriendship = {
  id: 1,
  status: 'ACCEPTED',
  nicknameRequester: 'to',
  nicknameReceiver: 'ta',
  requester: mockProfileDTO,
  receiver: mockProfileDTO2,
};

describe('FriendshipRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFriendship', () => {
    it('creates friendship and returns entity', async () => {
      // arrange
      const userId = 1;
      const targetId = 2;
      dbMocks.create.mockResolvedValue({
        ...mockFriendship,
        createdAt: new Date(),
      });

      // act
      const result = await friendshipRepository.createFriendship(userId, targetId);

      // assert
      expect(result).toMatchObject(mockFriendship);
    });
  });

  describe('findFriendshipBetween', () => {
    it('returns friendship when one exists between users', async () => {
      const userId = 1;
      const targetId = 2;
      dbMocks.findFirst.mockResolvedValue(mockFriendship);

      const result = await friendshipRepository.findFriendshipBetween(userId, targetId);

      expect(dbMocks.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { requesterId: userId, receiverId: targetId },
            { requesterId: targetId, receiverId: userId },
          ],
        },
      });
      expect(result).toEqual(mockFriendship);
    });

    it('bubbles prisma error', async () => {
      const prismaError = new Error('prisma error');
      dbMocks.findFirst.mockRejectedValue(prismaError);

      await expect(friendshipRepository.findFriendshipBetween(1, 2)).rejects.toThrow(
        'prisma error',
      );
    });
  });

  describe('findRequestedFriendships', () => {
    it('returns friendships the user requested', async () => {
      const userId = 1;
      const requests = [{ ...mockFriendship, receiver: mockProfileDTO2 }];
      dbMocks.findMany.mockResolvedValue(requests);

      const result = await friendshipRepository.findRequestedFriendships(userId);

      expect(dbMocks.findMany).toHaveBeenCalledWith({
        where: { requesterId: userId },
        include: { receiver: true },
        omit: { nicknameRequester: true },
      });
      expect(result).toEqual(requests);
    });

    it('bubbles prisma error', async () => {
      dbMocks.findMany.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.findRequestedFriendships(1)).rejects.toThrow('db error');
    });
  });

  describe('findReceivedFriendships', () => {
    it('returns friendships the user received', async () => {
      const userId = 2;
      const requests = [{ ...mockFriendship, requester: mockProfileDTO }];
      dbMocks.findMany.mockResolvedValue(requests);

      const result = await friendshipRepository.findReceivedFriendships(userId);

      expect(dbMocks.findMany).toHaveBeenCalledWith({
        where: { receiverId: userId },
        include: { requester: true },
        omit: { nicknameReceiver: true },
      });
      expect(result).toEqual(requests);
    });

    it('bubbles prisma error', async () => {
      dbMocks.findMany.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.findReceivedFriendships(2)).rejects.toThrow('db error');
    });
  });

  describe('findFriendshipsByUser', () => {
    it('returns all friendships involving the user', async () => {
      const userId = 1;
      const requests = [mockFriendship];
      dbMocks.findMany.mockResolvedValue(requests);

      const result = await friendshipRepository.findFriendshipsByUser(userId);

      expect(dbMocks.findMany).toHaveBeenCalledWith({
        where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
        include: { requester: true, receiver: true },
      });
      expect(result).toEqual(requests);
    });

    it('bubbles prisma error', async () => {
      dbMocks.findMany.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.findFriendshipsByUser(1)).rejects.toThrow('db error');
    });
  });

  describe('countFriendships', () => {
    it('returns number of friendships for user', async () => {
      const userId = 1;
      dbMocks.count.mockResolvedValue(3);

      const result = await friendshipRepository.countFriendships(userId);

      expect(dbMocks.count).toHaveBeenCalledWith({
        where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
      });
      expect(result).toBe(3);
    });

    it('bubbles prisma error', async () => {
      dbMocks.count.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.countFriendships(1)).rejects.toThrow('db error');
    });
  });

  describe('updateFriendshipStatus', () => {
    it('updates status and returns updated entity', async () => {
      const updated = { ...mockFriendship, status: 'REJECTED' };
      dbMocks.update.mockResolvedValue(updated);

      const result = await friendshipRepository.updateFriendshipStatus(1, 'REJECTED');

      expect(dbMocks.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'REJECTED' },
        include: { requester: true, receiver: true },
      });
      expect(result).toEqual(updated);
    });

    it('bubbles prisma error', async () => {
      dbMocks.update.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.updateFriendshipStatus(1, 'REJECTED')).rejects.toThrow(
        'db error',
      );
    });
  });

  describe('updateFriendshipNickname', () => {
    it('updates nicknameRequester and returns updated entity', async () => {
      const updated = { ...mockFriendship, nicknameRequester: 'buddy' };
      dbMocks.update.mockResolvedValue(updated);

      const result = await friendshipRepository.updateFriendshipNicknameRequester(1, 'buddy');

      expect(dbMocks.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nicknameRequester: 'buddy' },
        include: { requester: true, receiver: true },
      });
      expect(result).toEqual(updated);
    });

    it('bubbles prisma error', async () => {
      dbMocks.update.mockRejectedValue(new Error('db error'));

      await expect(
        friendshipRepository.updateFriendshipNicknameRequester(1, 'buddy'),
      ).rejects.toThrow('db error');
    });
  });

  describe('deleteFriendshipById', () => {
    it('deletes friendship and returns deleted entity', async () => {
      dbMocks.delete.mockResolvedValue(mockFriendship);

      const result = await friendshipRepository.deleteFriendshipById(1);

      expect(dbMocks.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { requester: true, receiver: true },
      });
      expect(result).toEqual(mockFriendship);
    });

    it('bubbles prisma error', async () => {
      dbMocks.delete.mockRejectedValue(new Error('db error'));

      await expect(friendshipRepository.deleteFriendshipById(1)).rejects.toThrow('db error');
    });
  });
});
