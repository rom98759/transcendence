import { FastifyReply, FastifyRequest } from 'fastify'
import * as umService from '../services/um.service.js'
import { ValidationSchemas } from '../validation/validation.js'
import z from 'zod'
import { API_ERRORS, LOG_EVENTS } from '../utils/messages.js'

function handleInvalidRequest<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  validation: z.ZodSafeParseError<T>
) {
  request.log.warn({ event: LOG_EVENTS.INVALID_REQUEST, request: request })
  return reply.status(400).send({
    error: API_ERRORS.USER.INVALID_FORMAT,
    details: z.treeifyError(validation.error),
  })
}

export async function getProfileByUsername(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = request.params
  request.log.info({ event: LOG_EVENTS.GET_PROFILE_BY_USERNAME, username })

  const validation = ValidationSchemas['Username'].safeParse({ username })
  if (!validation.success) {
    return handleInvalidRequest(request, reply, validation)
  }

  const profile = await umService.findByUsername(username)
  if (!profile) {
    return reply.status(404).send({ message: API_ERRORS.USER.NOT_FOUND })
  }

  return reply.status(200).send({profile: profile});
}

export async function createProfile(
  request: FastifyRequest<{
    Body: { authId: number; email: string; username: string }
  }>,
  reply: FastifyReply
) {
  const { authId, email, username } = request.body
  request.log.info({ event: LOG_EVENTS.CREATE_PROFILE, request })

  const validation = ValidationSchemas['UserCreate'].safeParse({
    authId,
    email,
    username,
  })
  if (!validation.success) {
    return handleInvalidRequest(request, reply, validation)
  }

  try {
    const profile = await umService.createProfile(authId, email, username)
    return reply.status(201).send(profile)
  } catch (error) {
    request.log.error(error)
    return reply
      .status(409)
      .send({
        message: API_ERRORS.USER.CREATE_FAILED,
      })
  }
}
