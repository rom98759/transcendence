import fastify from 'fastify';
import ScalarApiReference from '@scalar/fastify-api-reference';
import { umRoutes } from './routes/um.routes.js';
import { appenv } from './config/env.js';
import { loggerConfig } from './config/logger.config.js';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';

export async function buildApp() {
  const app = fastify({
    logger: loggerConfig,
    disableRequestLogging: false,
  }).withTypeProvider<ZodTypeProvider>();

  await app.setValidatorCompiler(validatorCompiler);
  await app.setSerializerCompiler(serializerCompiler);

  if (appenv.NODE_ENV !== 'test') {
    await app.register(fastifySwagger as any, {
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

    // app.get('/doc/json', (req, reply) => {
    //   reply.send(app.swagger());
    // });

    await app.register(ScalarApiReference as any, {
      routePrefix: '/doc',
      configuration: {
        theme: 'purple',
      },
    });
  }

  await app.register(umRoutes);

  return app;
}

const app = await buildApp();

export const logger = app.log;

app.listen(
  { host: '0.0.0.0', port: appenv.UM_SERVICE_PORT },
  (err: Error | null, address: string) => {
    if (err) {
      app.log.error({ message: err.message });
      process.exit(1);
    }
    app.log.info({ message: `User Management service listening at ${address}` });
  },
);
