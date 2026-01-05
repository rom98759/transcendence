import { FastifyRequest } from 'fastify';
import { UserRequestDTO } from '@transcendence/core';

declare module 'fastify' {
  interface FastifyRequest {
    user: UserRequest;
  }

  interface FastifyContextConfig {
    skipAuth?: boolean;
  }
}
