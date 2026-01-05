import { LOG_EVENTS, AppError } from '@transcendence/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyError } from 'fastify';

export async function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  req.log.error(error);

  if (error.code === 'FST_ERR_VALIDATION') {
    req.log.error({
      event: LOG_EVENTS.APPLICATION.VALIDATION_FAIL,
      userId: req.user?.id,
      message: error.message,
      stack: error.stack,
      originalError: error,
    });

    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: {
        fields: error.validation,
      },
    });
  }

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
      message: error.message,
      details: error.context.details,
    });
  }

  // console.log(error, '🔥 Unexpected error');
  req.log.error(
    {
      event: LOG_EVENTS.CRITICAL.PANIC,
      originalError: error,
    },
    error.message || '🔥 Unexpected error',
  );

  return reply.status(500).send({
    message: 'Unexpected error',
  });
}
