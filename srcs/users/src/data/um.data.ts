import { UserProfile } from '@prisma/client';
import { prisma } from './prisma.js';
import { ProfileCreateInDTO, ProfileDTO } from '@transcendence/core';
import { logger } from '../index.js';

export async function findProfileByUsername(username: string): Promise<ProfileDTO | null> {
  const found = await prisma.userProfile.findUnique({
    where: { username },
    select: {
      username: true,
      avatarUrl: true,
    },
  });
  logger.info({ msg: 'found profile in data', found: found });
  return found;
}

export async function createProfile(payload: ProfileCreateInDTO): Promise<UserProfile> {
  logger.info({ msg: 'create profile in data', payload: payload });

  const created = await prisma.userProfile.create({
    data: {
      authId: payload.authId,
      username: payload.username,
      email: payload.email ?? null,
      avatarUrl: payload.avatarUrl ?? null,
    },
  });
  logger.info({ msg: 'created profile in data', created: created });

  return created;
}
