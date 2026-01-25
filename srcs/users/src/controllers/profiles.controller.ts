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
    const profileSimpleDTO = mappers.mapProfileToDTO(profile);
    return reply.status(201).send(profileSimpleDTO);
  }

  async getProfileByUsername(req: FastifyRequest, reply: FastifyReply) {
    const { username } = req.params as UserNameDTO;
    const xUserName = req.headers['x-user-name'];
    req.log.trace({ event: `${LOG_ACTIONS.READ}_${LOG_RESOURCES.PROFILE}`, param: username });

    const profileSimpleDTO = await profileService.getByUsername(username);

    if (xUserName != username) {
      return reply
        .status(200)
        .send({ username: profileSimpleDTO?.username, avatarUrl: profileSimpleDTO?.avatarUrl });
    }
    return reply.status(200).send(profileSimpleDTO);
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
    const profileSimpleDTO = await profileService.updateAvatar(username, data);
    return reply.status(200).send(profileSimpleDTO);
  }

  async deleteProfile(req: FastifyRequest, reply: FastifyReply) {
    const { username } = req.params as {
      username: usernameDTO;
    };
    req.log.trace({ event: `${LOG_ACTIONS.DELETE}_${LOG_RESOURCES.PROFILE}`, param: username });
    const profileSimpleDTO = await profileService.deleteByUsername(username);
    return reply.status(200).send(profileSimpleDTO);
  }
}

export const profileController = new ProfileController();
