import { FastifyRequest, FastifyError } from 'fastify';
import { IncomingMessage } from 'node:http';
import { LoggerOptions, stdSerializers } from 'pino';
import { hostname } from 'os';
import { REDACT_PATHS } from '../utils/constants.js';
import { authenv } from './env.js';

const isDev = authenv.NODE_ENV !== 'production';

function isFastifyRequest(req: IncomingMessage | FastifyRequest): req is FastifyRequest {
  return 'raw' in req && 'id' in req;
}

function isFastifyError(err: Error | unknown): err is FastifyError {
  return err instanceof Error && ('code' in err || 'statusCode' in err);
}

/**
 * @abstract configure logging to facilitate future compatibility with ELK
 */
export const loggerConfig: LoggerOptions = {
  redact: [...REDACT_PATHS],
  level: authenv.LOG_LEVEL,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    env: authenv.NODE_ENV,
    service: authenv.AUTH_SERVICE_NAME,
    pid: process.pid,
    hostname: hostname(),
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    req(request: FastifyRequest | IncomingMessage) {
      const rawReq = isFastifyRequest(request) ? request.raw : request;
      const serialized = stdSerializers.req(rawReq);
      if (isFastifyRequest(request)) {
        return {
          ...serialized,
          remoteAddress: request.ip,
          hostname: request.hostname,
          traceId: request.id,
        };
      }
      return serialized;
    },
    err(err: unknown) {
      if (err instanceof Error) {
        const serialized = stdSerializers.err(err);

        if (isFastifyError(err)) {
          return {
            ...serialized,
            code: err.code,
            statusCode: err.statusCode,
          };
        }
        return serialized;
      }
      return {
        type: 'UnknownError',
        message: String(err),
      };
    },
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
};
