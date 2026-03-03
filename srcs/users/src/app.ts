import fastify, { FastifyServerOptions } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import fs from 'fs';
import multipart from '@fastify/multipart';

import { umRoutes } from './routes/profiles.routes.js';
import { errorHandler } from './utils/error-handler.js';
import { appenv } from './config/env.js';
import { friendsRoutes } from './routes/friends.routes.js';
import { loggerConfig } from './config/logger.config.js';
import redisPlugin from './plugins/ioredis.plugins.js';
import { initRedisSubscriber } from './events/redis.subscriber.js';
import { logger } from './utils/logger.js';

export async function buildApp() {
  const isTest = appenv.NODE_ENV === 'test';

  const options: FastifyServerOptions = {
    logger: loggerConfig,
    disableRequestLogging: false,
    ...(isTest
      ? {}
      : {
          https: {
            key: fs.readFileSync('/etc/certs/user-service.key'),
            cert: fs.readFileSync('/etc/certs/user-service.crt'),
            ca: fs.readFileSync('/etc/ca/ca.crt'),
            requestCert: true,
            rejectUnauthorized: false,
          },
        }),
  };
  const app = fastify(options).withTypeProvider<ZodTypeProvider>();
  await app.register(redisPlugin);

  app.addHook('onRequest', (request, reply, done) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = request.raw.socket as any;
    if (socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1') {
      return done();
    }
    const cert = socket.getPeerCertificate();
    if (!cert || !cert.subject) {
      reply.code(401).send({ error: 'Client certificate required' });
      return;
    }
    done();
  });

  app.addHook('preHandler', async (req, reply) => {
    const userIdHeader = req.headers['x-user-id'];
    const usernameHeader = req.headers['x-user-name'];
    req.log.info({ userIdHeader, usernameHeader }, 'prehandler Header');
    if (req.routeOptions.config.skipAuth) {
      return;
    }

    // If no auth headers are present, leave req.user undefined (public route or unauthenticated request)
    if (typeof userIdHeader === 'undefined' && typeof usernameHeader === 'undefined') {
      return;
    }
    // If some auth headers are present but not all required ones, treat as invalid
    if (typeof userIdHeader === 'undefined' || typeof usernameHeader === 'undefined') {
      logger.warn(`invalid auth header`);

      reply.code(400).send({ error: 'Invalid authentication headers' });
      return;
    }
    const id = Number(userIdHeader);
    if (!Number.isFinite(id)) {
      logger.warn(`invalid auth header - no finite number`);

      reply.code(400).send({ error: 'Invalid authentication headers' });
      return;
    }
    req.user = {
      id,
      username: String(usernameHeader),
    };
  });

  await app.setValidatorCompiler(validatorCompiler);
  await app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler(errorHandler);

  app.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1, // Only 1 file at a time
      headerPairs: 2000,
    },
    attachFieldsToBody: false, // Keep files separate from body
  });

  if (appenv.NODE_ENV !== 'test') {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'User API documentation',
          description: 'User API',
          version: '0.0.1',
        },
        servers: [{ url: `http://localhost:8080` }],
      },
      transform: jsonSchemaTransform,
    });

    await app.register(ScalarApiReference, {
      routePrefix: '/doc',
      configuration: {
        theme: 'purple',
        baseServerURL: '/doc/users',
      },
    });
  }
  app.register(umRoutes, { prefix: '' });
  app.register(friendsRoutes, { prefix: '/friends' });
  app.ready(() => {
    initRedisSubscriber(app);
  });

  return app;
}
