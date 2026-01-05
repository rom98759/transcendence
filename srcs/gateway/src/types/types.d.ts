/**
 * sub is used by JWT as number
 */
export interface UserPayload {
  username: string;
  sub: string | number;
  id?: string;
  role?: string;
  [key: string]: any;
}

declare module 'fastify' {
  interface FastifyContextConfig {
    isPublic?: boolean;
  }
  interface FastifyRequest {
    user?: UserPayload;
  }
}
