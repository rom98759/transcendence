import { LOG_EVENTS, AppError } from '@transcendence/core';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function errorHandler(
  error: Error,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error instanceof AppError) {
    req.log.error(
      {
        event: error.context.event,
        reason: error.context.reason,
        code: error.code,
        userId: req.user?.id,
        cause: error.cause,
      },
      error.message,
    );

    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      code: error.code,
      message: error.message,
    });
  }

  // should not happen
  req.log.error(
    {
      event: LOG_EVENTS.CRITICAL.PANIC,
    },
    error.message || 'Unexpected error',
  );

  return reply.status(500).send({
    message: 'Unexpected error',
  });
}
