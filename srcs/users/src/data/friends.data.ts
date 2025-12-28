import { prisma } from './prisma.js';

export async function findUserById(id: number) {
  return prisma.userProfile.findUnique({ where: { id } });
}

export async function findFriendship(userId: number, friendId: number) {
  return prisma.friendship.findUnique({
    where: { userId_friendId: { userId, friendId } },
  });
}

export async function countFriends(userId: number) {
  return prisma.friendship.count({ where: { userId } });
}

export async function createFriendship(userId: number, friendId: number) {
  return prisma.friendship.create({ data: { userId, friendId } });
}

export async function findFriendshipsByUser(userId: number) {
  return prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    include: { user: true, friend: true },
  });
}

export async function findFriendshipAnyDirection(userId: number, targetId: number) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetId },
        { userId: targetId, friendId: userId },
      ],
    },
  });
}

export async function deleteFriendshipById(id: number) {
  return prisma.friendship.delete({ where: { id } });
}

export async function updateFriendshipNickname(id: number, nickname: string) {
  return prisma.friendship.update({
    where: { id },
    data: { nickname },
  });
}
