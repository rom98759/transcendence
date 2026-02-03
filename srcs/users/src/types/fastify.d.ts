import { FastifyRequest } from 'fastify';
import { UserRequestDTO } from '@transcendence/core';
import { MultipartFile } from '@fastify/multipart';

declare module 'fastify' {
  interface FastifyRequest {
    user: UserRequest;
    file(): Promise<MultipartFile | undefined>;
  }

  interface FastifyContextConfig {
    skipAuth?: boolean;
  }
}
