import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { umRoutes } from './routes/profiles.routes.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { errorHandler } from './utils/error-handler.js';
import { appenv } from './config/env.js';
import { friendsRoutes } from './routes/friends.routes.js';
import { loggerConfig } from './config/logger.config.js';

export async function buildApp() {
  const app = fastify({
    logger: loggerConfig,
    disableRequestLogging: false,
  }).withTypeProvider<ZodTypeProvider>();

  await app.setValidatorCompiler(validatorCompiler);
  await app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler(errorHandler);

  await app.register(authPlugin);

  if (appenv.NODE_ENV !== 'test') {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'User API documentation',
          description: 'User API',
          version: '0.0.1',
        },
        servers: [{ url: `http://localhost:8080/users` }],
      },
      transform: jsonSchemaTransform,
    });

    await app.register(ScalarApiReference, {
      routePrefix: '/doc',
      configuration: {
        theme: 'purple',
      },
    });
  }

  app.register(umRoutes, { prefix: '' });
  app.register(friendsRoutes, { prefix: '/friends' });

  return app;
}
