import { FastifyReply, FastifyRequest } from 'fastify';
import { profileService } from '../services/profiles.service.js';
import * as mappers from '../utils/mappers.js';
import {
  AppError,
  ERR_DEFS,
  LOG_ACTIONS,
  LOG_RESOURCES,
  ProfileCreateInDTO,
  usernameDTO,
  UserNameDTO,
} from '@transcendence/core';
import { MultipartFile } from '@fastify/multipart';

export class ProfileController {
  async createProfile(req: FastifyRequest, reply: FastifyReply) {
    req.log.trace({ event: `${LOG_ACTIONS.CREATE}_${LOG_RESOURCES.PROFILE}`, payload: req.body });

    const profile = await profileService.createProfile(req.body as ProfileCreateInDTO);
    const profileDTO = mappers.mapProfileToDTO(profile);
    return reply.status(201).send(profileDTO);
  }

  async getProfileByUsername(req: FastifyRequest, reply: FastifyReply) {
    const { username } = req.params as UserNameDTO;
    req.log.trace({ event: `${LOG_ACTIONS.READ}_${LOG_RESOURCES.PROFILE}`, param: username });

    const profileDTO = await profileService.getByUsername(username);
    return reply.status(200).send(profileDTO);
  }

  async updateProfileAvatar(req: FastifyRequest, reply: FastifyReply) {
    const data = (await req.file()) as MultipartFile;
    const { username } = req.params as {
      username: usernameDTO;
    };

    if (!data) {
      throw new AppError(ERR_DEFS.RESSOURCE_INVALID_TYPE, { field: 'multipart body' });
    }

    req.log.trace({
      event: `${LOG_ACTIONS.UPDATE}_${LOG_RESOURCES.PROFILE}`,
      param: username,
    });
    const profileDTO = await profileService.updateAvatar(username, data);
    return reply.status(200).send(profileDTO);
  }

  async deleteProfile(req: FastifyRequest, reply: FastifyReply) {
    const { username } = req.params as {
      username: usernameDTO;
    };
    req.log.trace({ event: `${LOG_ACTIONS.DELETE}_${LOG_RESOURCES.PROFILE}`, param: username });
    const profileDTO = await profileService.deleteByUsername(username);
    return reply.status(200).send(profileDTO);
  }
}

export const profileController = new ProfileController();
