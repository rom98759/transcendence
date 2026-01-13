// types/fastify.d.ts
import 'fastify';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    closing: boolean;
  }
}
