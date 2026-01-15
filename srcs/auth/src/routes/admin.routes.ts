import { FastifyInstance } from 'fastify';
import {
  listAllUsers,
  updateUserHandler,
  deleteUserHandler,
  adminDisable2FAHandler,
} from '../controllers/admin.controller.js';

/**
 * Routes d'administration
 * Toutes ces routes nécessitent un rôle admin
 */
export async function adminRoutes(app: FastifyInstance) {
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
