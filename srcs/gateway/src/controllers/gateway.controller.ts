import { FastifyRequest, FastifyReply } from 'fastify';

export async function rootHandler(req: FastifyRequest, reply: FastifyReply) {
  return { message: 'Welcome to the Gateway API, check /help' };
}

export async function helpHandler(req: FastifyRequest, reply: FastifyReply) {
  const routesPublic = {
    '/': 'GET - Welcome message',
    '/help': 'GET - This help message',
    '/healthAll': 'GET - Health check all services',
    '/health/:name': 'GET - Health check service by name',
    '/auth/health': 'GET - Health check auth service',
    '/auth/login': 'POST - User login',
    '/auth/register': 'POST - User registration',
    '/block/health': 'GET - Health check blockchain service',
    '/users/doc': 'GET - User doc',
  };

  const routesPrivateAuth = {
    '/auth/logout': 'POST - User logout',
    '/auth/me': 'GET - Get current user info (DEV ONLY)',
  };

  const routesPrivate = { ...routesPrivateAuth };

  const routes = {
    public: routesPublic,
    private: routesPrivate,
  };

  return { routes };
}
