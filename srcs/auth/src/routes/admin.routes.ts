import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  listAllUsers,
  updateUserHandler,
  deleteUserHandler,
  adminDisable2FAHandler,
} from '../controllers/admin.controller.js';
import * as authService from '../services/auth.service.js';
import { UserRole, HTTP_STATUS, ERROR_MESSAGES, ERROR_RESPONSE_CODES } from '../utils/constants.js';

/**
 * Pré-handler pour vérifier si l'utilisateur est administrateur
 * Ajoute adminUserId et adminUsername a la requête
 */
export async function verifyAdminRole(req: FastifyRequest, reply: FastifyReply) {
  const idHeader = (req.headers as any)['x-user-id'];
  const userId = idHeader ? Number(idHeader) : null;
  const username = (req.headers as any)['x-user-name'] || null;

  if (!userId || !authService.hasRole(userId, UserRole.ADMIN)) {
    req.log.warn({
      event: 'admin_access_forbidden',
      user: username,
      userId,
    });
    return reply.code(HTTP_STATUS.FORBIDDEN).send({
      error: {
        message: ERROR_MESSAGES.FORBIDDEN,
        code: ERROR_RESPONSE_CODES.FORBIDDEN,
      },
    });
  }

  (req as any).adminUserId = userId;
  (req as any).adminUsername = username;
}

/**
 * Routes d'administration
 * Toutes ces routes nécessitent un rôle admin
 */
export async function adminRoutes(app: FastifyInstance) {
  // Ajout du pré-handler pour toutes les routes admin
  app.addHook('onRequest', verifyAdminRole);

  // Liste tous les utilisateurs
  app.get(
    '/users',
    {
      config: {
        rateLimit: {
          max: 50,
          timeWindow: '1 minute',
        },
      },
    },
    listAllUsers,
  );

  // Mettre à jour un utilisateur
  app.put(
    '/users/:id',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    updateUserHandler,
  );

  // Supprimer un utilisateur
  app.delete(
    '/users/:id',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    deleteUserHandler,
  );

  // Désactiver la 2FA d'un utilisateur
  app.post(
    '/users/:id/disable-2fa',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    adminDisable2FAHandler,
  );
}
