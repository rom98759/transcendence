import '@fastify/jwt';
// import { UserPayload } from './user.types.ts';

/**
 * sub is used by JWT as number
 */
export interface UserPayload {
  username: string;
  sub: string | number;
  id?: string;
  role?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

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
