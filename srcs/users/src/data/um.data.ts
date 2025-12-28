import { UserProfile } from '@prisma/client';
import { prisma } from './prisma.js';

export async function findProfileByUsername(username: string): Promise<UserProfile | null> {
  return await prisma.userProfile.findUnique({
    where: { username },
  });
}

export async function createProfile(data: {
  authId: number;
  email: string;
  username: string;
}): Promise<UserProfile> {
  return await prisma.userProfile.create({
    data: {
      authId: data.authId,
      email: data.email,
      username: data.username,
      avatarUrl: 'assets/avatars/default.png',
    },
  });
}
