import { FastifyReply, FastifyRequest } from 'fastify';
import { profileService } from '../services/profiles.service.js';
import * as mappers from '../utils/mappers.js';
import { LOG_ACTIONS, LOG_RESOURCES, ProfileCreateInDTO, UserNameDTO } from '@transcendence/core';

export class ProfileController {
  async getProfileByUsername(
    req: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply,
  ) {
    const { username } = req.params as UserNameDTO;
    req.log.trace({ event: `${LOG_ACTIONS.READ}_${LOG_RESOURCES.PROFILE}`, param: username });

    const profileDTO = await profileService.getByUsername(username);
    return reply.status(200).send(profileDTO);
  }

  async createProfile(req: FastifyRequest, reply: FastifyReply) {
    req.log.trace({ event: `${LOG_ACTIONS.CREATE}_${LOG_RESOURCES.PROFILE}`, payload: req.body });

    const profile = await profileService.createProfile(req.body as ProfileCreateInDTO);
    const profileDTO = mappers.mapProfileToDTO(profile);
    return reply.status(201).send(profileDTO);
  }
}

export const profileController = new ProfileController();
