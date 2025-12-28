import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { proxyRequest, webSocketProxyRequest } from '../utils/proxy.js';

const USERS_SERVICE_URL = "http://users-service:3004";

export function registerFriendsRoutes(app: FastifyInstance) {
  app.all("/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (request.params as any)['*'];
    const url = `${USERS_SERVICE_URL}/users/friends/${rawPath}`;
    return proxyRequest(app, request, reply, url);
  });
}
