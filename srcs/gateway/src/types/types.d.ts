import '@fastify/jwt';
import { UserPayload } from './user.types.ts';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyContextConfig {
    isPublic?: boolean;
  }
}
