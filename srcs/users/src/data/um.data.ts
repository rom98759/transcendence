import { Prisma, UserProfile } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  ERR_DEFS,
  AppError,
  type ProfileCreateInDTO,
  type ProfileDTO,
  LOG_RESOURCES,
} from '@transcendence/core';
import { logger } from '../index.js';
import { Trace } from '../utils/decorators.js';

export class ProfileRepository {
  async findProfileByUsername(username: string): Promise<ProfileDTO | null> {
    const found = await prisma.userProfile.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });
    logger.info({ msg: 'found profile in data', found: found });
    return found;
  }

  async findProfileById(id: number): Promise<ProfileDTO | null> {
    return prisma.userProfile.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  @Trace
  async createProfile(payload: ProfileCreateInDTO): Promise<UserProfile> {
    try {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code == 'P2002') {
          throw new AppError(
            ERR_DEFS.RESOURCE_ALREADY_EXIST,
            { details: { resource: LOG_RESOURCES.PROFILE, authId: payload.authId } },
            error,
          );
        }
      }
      throw error;
    }
  }
}

export const profileRepository = new ProfileRepository();
