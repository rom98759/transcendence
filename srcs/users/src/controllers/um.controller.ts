import { FastifyReply, FastifyRequest } from 'fastify'
import * as umService from '../services/um.service.js'
import { ValidationSchemas } from '../schemas/schemas.js'
import z from 'zod'
import { API_ERRORS, LOG_EVENTS } from '../utils/messages.js'
import { mapProfileToDTO } from '../utils/mappers.js'

function handleInvalidRequest<T>(
  req: FastifyRequest,
  reply: FastifyReply,
  validation: z.ZodSafeParseError<T>
) {
  req.log.warn({ event: LOG_EVENTS.INVALID_REQUEST, request: req })
  return reply.status(400).send({
    error: API_ERRORS.USER.INVALID_FORMAT,
    details: z.treeifyError(validation.error),
  })
}

export async function getProfileByUsername(
  req: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = req.params
  req.log.info({ event: LOG_EVENTS.GET_PROFILE_BY_USERNAME, username })

  const validation = ValidationSchemas['Username'].safeParse({ username })
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation)
  }

  const profile = await umService.findByUsername(username)
  if (!profile) {
    return reply.status(404).send({ message: API_ERRORS.USER.NOT_FOUND })
  }
  const profileDTO = mapProfileToDTO(profile);
  return reply.status(200).send({profile: profileDTO});
}

export async function createProfile(
  req: FastifyRequest<{
    Body: { authId: number; email: string; username: string }
  }>,
  reply: FastifyReply
) {
  const { authId, email, username } = req.body
  req.log.info({ event: LOG_EVENTS.CREATE_PROFILE, request: req })

  const validation = ValidationSchemas['UserCreate'].safeParse({
    authId,
    email,
    username,
  })
  if (!validation.success) {
    return handleInvalidRequest(req, reply, validation)
  }

  try {
    const profile = await umService.createProfile(authId, email, username)
    return reply.status(201).send(profile)
  } catch (error) {
    req.log.error(error)
    return reply
      .status(409)
      .send({
        message: API_ERRORS.USER.CREATE_FAILED,
      })
  }
}
