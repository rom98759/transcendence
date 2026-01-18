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
import { pipeline } from 'node:stream/promises';
import fs, { createWriteStream } from 'node:fs';
import path from 'node:path';
import type { MultipartFile } from '@fastify/multipart';
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
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (err: unknown) {
      // or thow non blocking error (in error handler)
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
  async storeOnUploadVolume(file: MultipartFile, uploadPath: string): Promise<void> {
    const writeStream = createWriteStream(uploadPath);
    try {
      console.log('💾 Saving file to:', uploadPath);

      await pipeline(file.file, writeStream);
      const fs = await import('fs/promises');
      const exists = await fs
        .access(uploadPath)
        .then(() => true)
        .catch(() => false);
      console.log('📁 File exists after write:', exists);
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
