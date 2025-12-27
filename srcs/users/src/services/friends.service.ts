import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env['DATABASE_URL'] ?? 'file:./data/um.db',
});
const prisma = new PrismaClient({ adapter });

export async function addFriend(userId: number, friendId: number) {
  const userExists = await prisma.userProfile.findUnique({
    where: { id: userId },
  });
  const friendExists = await prisma.userProfile.findUnique({
    where: { id: friendId },
  });

  if (!userExists || !friendExists) {
    throw new Error('One or both users do not exist');
  }

  const existingFriendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId, friendId } },
  });

  if (existingFriendship) {
    throw new Error('Friendship already exists');
  }

  const friendCount = await prisma.friendship.count({
    where: { userId },
  });

  if (friendCount >= 10) {
    throw new Error('Friend limit reached');
  }

  return await prisma.friendship.create({
    data: { userId, friendId },
  });
}

export async function getFriendsByUserId(userId: number) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
    },
    include: {
      user: true,
      friend: true,
    },
  });

  return friendships.map((f) => {
    const friendProfile = f.userId === userId ? f.friend : f.user;
    return {
      id: f.id,
      userId: friendProfile.id,
      username: friendProfile.username,
      avatar_url: friendProfile.avatarUrl,
      createdAt: f.createdAt,
      nickname: f.nickname,
    };
  });
}

export async function removeFriend(userId: number, targetId: number) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetId },
        { userId: targetId, friendId: userId },
      ],
    },
  });

  if (!friendship) {
    return null;
  }

  return await prisma.friendship.delete({
    where: { id: friendship.id },
  });
}

export async function updateFriend(userId: number, targetId: number, _nickname: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetId },
        { userId: targetId, friendId: userId },
      ],
    },
  });
  if (!friendship) {
    return null;
  }

  return friendship;
}
