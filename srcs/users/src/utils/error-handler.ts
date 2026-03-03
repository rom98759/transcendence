import { LOG_EVENTS, AppError, ERROR_CODES, LOG_REASONS } from '@transcendence/core';
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
      reason: LOG_REASONS.VALIDATION.INVALID_FORMAT,
      userId: req.user?.id,
      message: error.message,
      stack: error.stack,
      originalError: error,
    });

    return reply.status(400).send({
      statusCode: 400,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.validation?.map((v) => ({
        reason: v.keyword ?? LOG_REASONS.VALIDATION.INVALID_FORMAT,
        field: v.instancePath || 'unknown',
        message: v.message,
      })),
    });
  }

  if (error instanceof AppError) {
    req.log.error(
      {
        event: error.context.event,
        reason: error.context.reason,
        errorCode: error.code,
        userId: req.user?.id,
        cause: error.cause,
      },
      error.message,
    );

    if (error.statusCode == 400) {
      return reply.status(400).send({
        statusCode: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.context?.details,
      });
    } else {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        errorCode: error.code,
        message: error.message,
        details: error.context?.details,
      });
    }
  }

  req.log.error(
    {
      event: LOG_EVENTS.CRITICAL.PANIC,
      originalError: error,
    },
    error.message || 'Unexpected error',
  );

  return reply.status(500).send({
    statusCode: 500,
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    message: 'Unexpected error',
  });
}
