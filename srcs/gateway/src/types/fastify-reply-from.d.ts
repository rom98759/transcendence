import 'fastify';
import { IncomingMessage } from 'http';

declare module 'fastify' {
  interface FastifyReply {
    from(
      url: string,
      opts?: {
        rewriteRequestHeaders?: (
          request: IncomingMessage,
          headers: Record<string, string>,
        ) => Record<string, string>;
      },
    ): Promise<void>;
  }
}
