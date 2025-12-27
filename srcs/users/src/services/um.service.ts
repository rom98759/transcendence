import { UserProfile } from '@prisma/client'
import * as data from '../data/um.data.js'
import { ProfileCreateInDTO, ProfileDTO } from "@transcendence/core";
import { logger } from '../index.js';

export async function findByUsername(username: string): Promise<ProfileDTO | null> {
  logger.info({msg: "find profile in service", payload: username });
  return await data.findProfileByUsername(username)
}

export async function createProfile(payload: ProfileCreateInDTO): Promise<UserProfile> {
  logger.info({msg: "create profile in service", payload: payload });
  return await data.createProfile(payload);
}
