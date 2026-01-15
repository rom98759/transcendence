import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/auth.service.js';
import * as totpService from '../services/totp.service.js';
import { UserRole, HTTP_STATUS, ERROR_MESSAGES, ERROR_RESPONSE_CODES } from '../utils/constants.js';
import { ServiceError } from '../types/errors.js';
import { logger } from '../index.js';
import { DBUser } from '../types/models.js';

/**
 * ADMIN ONLY - Liste tous les utilisateurs avec leurs informations complètes
 */
export async function listAllUsers(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const userId = idHeader ? Number(idHeader) : null;
  const username = (req.headers as any)['x-user-name'] || null;

  logger.info({ event: 'list_all_users_attempt', user: username, userId });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!userId || !authService.hasRole(userId, UserRole.ADMIN)) {
    logger.warn({ event: 'list_all_users_forbidden', user: username, userId });
    return reply.code(HTTP_STATUS.FORBIDDEN).send({
      error: {
        message: ERROR_MESSAGES.FORBIDDEN,
        code: ERROR_RESPONSE_CODES.FORBIDDEN,
      },
    });
  }

  try {
    const users = authService.listUsers();

    // Enrichir avec l'état 2FA
    const enrichedUsers = users.map((user: DBUser) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is2FAEnabled: totpService.isTOTPEnabled(user.id!),
    }));

    logger.info({ event: 'list_all_users_success', user: username, count: enrichedUsers.length });

    return reply.code(HTTP_STATUS.OK).send({
      users: enrichedUsers,
    });
  } catch (err: any) {
    logger.error({ event: 'list_all_users_error', user: username, err: err?.message || err });
    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_RESPONSE_CODES.INTERNAL_SERVER_ERROR,
      },
    });
  }
}

/**
 * ADMIN ONLY - Mettre à jour un utilisateur
 */
export async function updateUserHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const adminUserId = idHeader ? Number(idHeader) : null;
  const adminUsername = (req.headers as any)['x-user-name'] || null;
  const targetUserId = Number((req.params as any).id);

  logger.info({
    event: 'admin_update_user_attempt',
    admin: adminUsername,
    adminUserId,
    targetUserId,
  });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!adminUserId || !authService.hasRole(adminUserId, UserRole.ADMIN)) {
    logger.warn({
      event: 'admin_update_user_forbidden',
      admin: adminUsername,
      adminUserId,
      targetUserId,
    });
    return reply.code(HTTP_STATUS.FORBIDDEN).send({
      error: {
        message: ERROR_MESSAGES.FORBIDDEN,
        code: ERROR_RESPONSE_CODES.FORBIDDEN,
      },
    });
  }

  if (!targetUserId || isNaN(targetUserId)) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
      },
    });
  }

  // Validation des données
  const { username: newUsername, email, role } = req.body as any;

  if (!newUsername || !email || !role) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: ERROR_MESSAGES.MISSING_FIELDS,
        code: ERROR_RESPONSE_CODES.MISSING_FIELDS,
      },
    });
  }

  if (role !== UserRole.USER && role !== UserRole.ADMIN) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: ERROR_MESSAGES.INVALID_ROLE,
        code: ERROR_RESPONSE_CODES.INVALID_ROLE,
      },
    });
  }

  try {
    // Vérifier que l'utilisateur existe
    const targetUser = authService.findUserById(targetUserId);
    if (!targetUser) {
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    authService.updateUserAsAdmin(targetUserId, {
      username: newUsername,
      email,
      role,
    });

    // Récupérer les informations mises à jour
    const updatedUser = authService.findUserById(targetUserId);
    const has2FA = totpService.isTOTPEnabled(targetUserId);

    logger.info({
      event: 'admin_update_user_success',
      admin: adminUsername,
      targetUserId,
      newUsername: newUsername,
    });

    return reply.code(HTTP_STATUS.OK).send({
      user: {
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        role: updatedUser!.role,
        is2FAEnabled: has2FA,
      },
    });
  } catch (err: any) {
    logger.error({
      event: 'admin_update_user_error',
      admin: adminUsername,
      targetUserId,
      err: err?.message || err,
    });

    if (err instanceof ServiceError) {
      if (err.definition.code === 'CONFLICT') {
        // C'est probablement une erreur d'email ou username existant
        if (err.message.toLowerCase().includes('email')) {
          return reply.code(HTTP_STATUS.CONFLICT).send({
            error: {
              message: ERROR_MESSAGES.EMAIL_EXISTS,
              code: ERROR_RESPONSE_CODES.EMAIL_EXISTS,
              field: 'email',
            },
          });
        } else if (err.message.toLowerCase().includes('username')) {
          return reply.code(HTTP_STATUS.CONFLICT).send({
            error: {
              message: ERROR_MESSAGES.USERNAME_EXISTS,
              code: ERROR_RESPONSE_CODES.USERNAME_EXISTS,
              field: 'username',
            },
          });
        }
      }
    }

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_RESPONSE_CODES.INTERNAL_SERVER_ERROR,
      },
    });
  }
}

/**
 * ADMIN ONLY - Supprimer un utilisateur
 */
export async function deleteUserHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const adminUserId = idHeader ? Number(idHeader) : null;
  const adminUsername = (req.headers as any)['x-user-name'] || null;
  const targetUserId = Number((req.params as any).id);

  logger.info({
    event: 'admin_delete_user_attempt',
    admin: adminUsername,
    adminUserId,
    targetUserId,
  });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!adminUserId || !authService.hasRole(adminUserId, UserRole.ADMIN)) {
    logger.warn({
      event: 'admin_delete_user_forbidden',
      admin: adminUsername,
      adminUserId,
      targetUserId,
    });
    return reply.code(HTTP_STATUS.FORBIDDEN).send({
      error: {
        message: ERROR_MESSAGES.FORBIDDEN,
        code: ERROR_RESPONSE_CODES.FORBIDDEN,
      },
    });
  }

  if (!targetUserId || isNaN(targetUserId)) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: ERROR_MESSAGES.INVALID_USER_ID,
        code: ERROR_RESPONSE_CODES.INVALID_USER_ID,
      },
    });
  }

  // Empêcher l'auto-suppression
  if (targetUserId === adminUserId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: ERROR_MESSAGES.SELF_DELETION_FORBIDDEN,
        code: ERROR_RESPONSE_CODES.SELF_DELETION_FORBIDDEN,
      },
    });
  }

  try {
    // Vérifier que l'utilisateur existe avant de le supprimer
    const targetUser = authService.findUserById(targetUserId);
    if (!targetUser) {
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
        error: {
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: ERROR_RESPONSE_CODES.USER_NOT_FOUND,
        },
      });
    }

    const targetUsername = targetUser.username;
    authService.deleteUserAsAdmin(targetUserId);

    logger.info({
      event: 'admin_delete_user_success',
      admin: adminUsername,
      targetUserId,
      targetUsername,
    });

    return reply.code(HTTP_STATUS.OK).send({
      message: 'User deleted successfully',
    });
  } catch (err: any) {
    logger.error({
      event: 'admin_delete_user_error',
      admin: adminUsername,
      targetUserId,
      err: err?.message || err,
    });

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_RESPONSE_CODES.INTERNAL_SERVER_ERROR,
      },
    });
  }
}

/**
 * ADMIN ONLY - Désactiver la 2FA d'un utilisateur
 */
export async function adminDisable2FAHandler(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const idHeader = (req.headers as any)['x-user-id'];
  const adminUserId = idHeader ? Number(idHeader) : null;
  const adminUsername = (req.headers as any)['x-user-name'] || null;
  const targetUserId = Number((req.params as any).id);

  logger.info({
    event: 'admin_disable_2fa_attempt',
    admin: adminUsername,
    adminUserId,
    targetUserId,
  });

  // Vérifier que l'utilisateur existe et a le rôle admin
  if (!adminUserId || !authService.hasRole(adminUserId, UserRole.ADMIN)) {
    logger.warn({
      event: 'admin_disable_2fa_forbidden',
      admin: adminUsername,
      adminUserId,
      targetUserId,
    });
    return reply.code(HTTP_STATUS.FORBIDDEN).send({
      error: {
        message: ERROR_MESSAGES.FORBIDDEN,
        code: ERROR_RESPONSE_CODES.FORBIDDEN,
      },
    });
  }

  if (!targetUserId || isNaN(targetUserId)) {
    return reply.code(HTTP_STATUS.BAD_REQUEST).send({
      error: {
        message: ERROR_MESSAGES.INVALID_USER_ID,
        code: ERROR_RESPONSE_CODES.INVALID_USER_ID,
      },
    });
  }

  try {
    // Vérifier que l'utilisateur existe
    const targetUser = authService.findUserById(targetUserId);
    if (!targetUser) {
      return reply.code(HTTP_STATUS.NOT_FOUND).send({
        error: {
          message: ERROR_MESSAGES.USER_NOT_FOUND,
          code: ERROR_RESPONSE_CODES.USER_NOT_FOUND,
        },
      });
    }

    // Vérifier si la 2FA est activée
    const has2FA = totpService.isTOTPEnabled(targetUserId);
    if (!has2FA) {
      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
        error: {
          message: ERROR_MESSAGES.TWO_FA_NOT_ENABLED,
          code: ERROR_RESPONSE_CODES.TWO_FA_NOT_ENABLED,
        },
      });
    }

    authService.adminDisable2FA(targetUserId);

    logger.info({
      event: 'admin_disable_2fa_success',
      admin: adminUsername,
      targetUserId,
      targetUsername: targetUser.username,
    });

    return reply.code(HTTP_STATUS.OK).send({
      message: '2FA disabled successfully',
    });
  } catch (err: any) {
    logger.error({
      event: 'admin_disable_2fa_error',
      admin: adminUsername,
      targetUserId,
      err: err?.message || err,
    });

    return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_RESPONSE_CODES.INTERNAL_SERVER_ERROR,
      },
    });
  }
}
