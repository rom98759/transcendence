import { Prisma, UserProfile } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  ERR_DEFS,
  AppError,
  type ProfileCreateInDTO,
  type ProfileDTO,
  LOG_RESOURCES,
  LOG_EVENTS,
  LOG_REASONS,
} from '@transcendence/core';
import { Trace } from '../utils/decorators.js';
import { logger } from '../utils/logger.js';
import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
export class ProfileRepository {
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

  async findProfileByUsername(username: string): Promise<ProfileDTO | null> {
    const found = await prisma.userProfile.findUnique({
      where: { username },
      select: {
        authId: true,
        username: true,
        avatarUrl: true,
      },
    });
    logger.info({ msg: 'found profile in data', found: found });
    return found;
  }

  async findProfileById(id: number): Promise<ProfileDTO | null> {
    return await prisma.userProfile.findUnique({
      where: { authId: id },
      select: {
        authId: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  async updateProfileAvatar(id: number, newAvatarUrl: string): Promise<ProfileDTO> {
    return await prisma.userProfile.update({
      where: { authId: id },
      data: { avatarUrl: newAvatarUrl },
      select: {
        authId: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  async deleteOldFile(publicUrl: string): Promise<void> {
    const fileName = publicUrl.replace('/uploads/', '');
    const fullPath = path.join('/app/uploads', fileName);
    console.log(`${fullPath} : full path`);
    try {
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch (err: unknown) {
      // TODO throw non blocking error (in error handler)
      logger.error(
        {
          event: LOG_EVENTS.APPLICATION.DATA_FAIL,
          reason: LOG_REASONS.INFRA.FILE_WRITE_ERROR,
          originalError: err,
        },
        `Failed to delete old avatar: ${fullPath}`,
      );
    }
  }

  @Trace
  async storeOnUploadVolume(buffer: Buffer, uploadPath: string): Promise<void> {
    try {
      await writeFile(uploadPath, buffer);
    } catch (err: unknown) {
      throw new AppError(ERR_DEFS.SERVICE_GENERIC, { details: 'Disk storage error' }, err);
    }
  }

  async deleteProfile(id: number): Promise<ProfileDTO> {
    return await prisma.userProfile.delete({
      where: { authId: id },
    });
  }
}

export const profileRepository = new ProfileRepository();
