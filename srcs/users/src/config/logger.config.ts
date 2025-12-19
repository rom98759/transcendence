import { FastifyRequest, FastifyError } from 'fastify';
import { IncomingMessage } from 'node:http';
import { hostname } from 'os';
import { appenv } from './env';
import { PinoLoggerOptions } from 'fastify/types/logger';
import serializer from 'pino-std-serializers/index.js';


const isDev = appenv.NODE_ENV !== 'production';

function isFastifyRequest(req: IncomingMessage | FastifyRequest): req is FastifyRequest {
  return 'raw' in req && 'id' in req;
}

function isFastifyError(err: Error | unknown): err is FastifyError {
  return err instanceof Error && ('code' in err || 'statusCode' in err);
}

/**
 * @abstract configure logging to facilitate future compatibility with ELK
 * @todo check if logging of all headers (except for authorization as of now) is necessary 
 */
export const loggerConfig: PinoLoggerOptions = {
    redact: ['req.headers.authorization'],
    level: appenv.LOG_LEVEL || 'info',
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    base: {
        env: appenv.NODE_ENV,
        service: appenv.UM_SERVICE_NAME,
        pid: process.pid,
        hostname: hostname()
    },
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    serializers: {
        req (request: FastifyRequest | IncomingMessage) {
            const rawReq = isFastifyRequest(request) ? request.raw : request;
            const serialized = serializer.req(rawReq as IncomingMessage);
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
        err (err: unknown) {
            if (err instanceof Error) {
                const serialized = serializer.err(err);

                if (isFastifyError(err)) {
                    return {
                        ...serialized,
                        code: err.code,
                        statusCode: err.statusCode
                    };
                }
                return serialized;
            }
            return {
                type: 'UnknownError',
                message: String(err)
            };
        }
    },
    ...(isDev && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                },
            }
        }
    ),
}