// types/fastify.d.ts
import 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
declare module 'fastify' {
  interface FastifyInstance {
    closing: boolean;
  }
}
