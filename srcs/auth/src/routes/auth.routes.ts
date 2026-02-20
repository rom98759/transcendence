import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HTTP_STATUS } from '../utils/constants.js';
import {
  meHandler,
  loginHandler,
  registerHandler,
  logoutHandler,
  verifyHandler,
  notFoundHandler,
  setup2FAHandler,
  verify2FASetupHandler,
  verify2FAHandler,
  disable2FAHandler,
  heartbeatHandler,
  isUserOnlineHandler,
  deleteUserHandler,
  oauthCallbackHandler,
} from '../controllers/auth.controller.js';
import { AUTH_CONFIG } from '../utils/constants.js';

export async function authRoutes(app: FastifyInstance) {
  app.get(
    '/',
    async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return { message: 'Auth service is running' };
    },
  );

  app.get(
    '/health',
    async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
      return reply.code(HTTP_STATUS.OK).send({ status: 'healthy' });
    },
  );

  // Register avec rate limiting strict
  app.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.REGISTER.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.REGISTER.timeWindow,
        },
      },
    },
    registerHandler,
  );

  // Login avec rate limiting strict
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.LOGIN.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.LOGIN.timeWindow,
        },
      },
    },
    loginHandler,
  );

  app.post('/logout', logoutHandler);

  app.get('/verify', verifyHandler);

  // DEV ONLY - À supprimer en production
  app.get('/me', meHandler);

  // Heartbeat endpoint - pour tracker les statuts en ligne
  app.post(
    '/heartbeat',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 seconds',
        },
      },
    },
    heartbeatHandler,
  );

  // Routes 2FA avec rate limiting
  app.post(
    '/2fa/setup',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.TWO_FA_SETUP.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.TWO_FA_SETUP.timeWindow,
        },
      },
    },
    setup2FAHandler,
  );

  app.post(
    '/2fa/setup/verify',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.TWO_FA_VERIFY.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.TWO_FA_VERIFY.timeWindow,
        },
      },
    },
    verify2FASetupHandler,
  );

  app.post(
    '/2fa/verify',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.TWO_FA_VERIFY.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.TWO_FA_VERIFY.timeWindow,
        },
      },
    },
    verify2FAHandler,
  );

  app.post('/2fa/disable', disable2FAHandler);

  // Suppression du compte utilisateur
  app.delete(
    '/user/delete',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.DELETE_USER.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.DELETE_USER.timeWindow,
        },
      },
    },
    deleteUserHandler,
  );

  app.get(
    '/is-online/:name',
    {
      config: {
        rateLimit: {
          max: AUTH_CONFIG.RATE_LIMIT.IS_USER_ONLINE.max,
          timeWindow: AUTH_CONFIG.RATE_LIMIT.IS_USER_ONLINE.timeWindow,
        },
      },
    },
    isUserOnlineHandler,
  );

  // Callback OAuth pour Google et 42 School
  app.get('/oauth/:provider/callback', oauthCallbackHandler);

  // Gestion des routes inconnues (doit être en dernier)
  app.all('/*', notFoundHandler);
}
