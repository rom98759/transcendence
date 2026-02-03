import { authenv } from '../config/env.js';
import { logger } from '../index.js';
import * as authService from '../services/auth.service.js';
import { UserRole } from './constants.js';

/**
 * Initialise l'utilisateur admin au démarrage du service
 * Credentials par défaut
 */
export async function initAdminUser(): Promise<void> {
  const env = (globalThis as any).process?.env || {};

  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = authService.findByUsername(authenv.ADMIN_USERNAME);

    if (existingAdmin) {
      logger.info({
        event: 'admin_user_exists',
        username: authenv.ADMIN_USERNAME,
        message: 'Admin user already exists, skipping creation',
      });
      return;
    }

    // Créer l'utilisateur admin
    const adminId = await authService.createUser({
      username: authenv.ADMIN_USERNAME,
      email: authenv.ADMIN_EMAIL,
      password: authenv.ADMIN_PASSWORD,
    });

    // Assigner le rôle admin
    authService.updateUserRole(adminId, UserRole.ADMIN);

    logger.info({
      event: 'admin_user_created',
      username: authenv.ADMIN_USERNAME,
      email: authenv.ADMIN_EMAIL,
      id: adminId,
      role: UserRole.ADMIN,
      message: 'Admin user created successfully',
    });

    // Avertissement sécurité si credentials par défaut
    if (authenv.ADMIN_PASSWORD === 'Admin123!') {
      logger.warn({
        event: 'admin_default_password_warning',
        username: authenv.ADMIN_USERNAME,
        message:
          'SECURITY WARNING: Admin user is using default password! Please change ADMIN_PASSWORD environment variable in production',
      });
    }
  } catch (error: any) {
    // Si erreur USER_EXISTS
    if (error?.code === 'USER_EXISTS' || error?.code === 'EMAIL_EXISTS') {
      logger.info({
        event: 'admin_user_exists',
        username: authenv.ADMIN_USERNAME,
        message: 'Admin user already exists',
      });
      return;
    }

    // Autre erreur : log et throw
    logger.error({
      event: 'admin_user_creation_failed',
      username: authenv.ADMIN_USERNAME,
      err: error?.message || error,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Initialise l'utilisateur invité au démarrage du service
 * Credentials par défaut
 */
export async function initInviteUser(): Promise<void> {
  const env = (globalThis as any).process?.env || {};

  try {
    // Vérifier si l'invité existe déjà
    const existingInvite = authService.findByUsername(authenv.INVITE_USERNAME);

    if (existingInvite) {
      logger.info({
        event: 'invite_user_exists',
        username: authenv.INVITE_USERNAME,
        message: 'Invite user already exists, skipping creation',
      });
      return;
    }

    // Créer l'utilisateur invité
    const inviteId = authService.createUser({
      username: authenv.INVITE_USERNAME,
      email: authenv.INVITE_EMAIL,
      password: authenv.INVITE_PASSWORD,
    });

    logger.info({
      event: 'invite_user_created',
      username: authenv.INVITE_USERNAME,
      email: authenv.INVITE_EMAIL,
      id: inviteId,
      message: 'Invite user created successfully',
    });

    // Avertissement sécurité si credentials par défaut
    if (authenv.INVITE_PASSWORD === 'Invite123!') {
      logger.warn({
        event: 'invite_default_password_warning',
        username: authenv.INVITE_USERNAME,
        message:
          'SECURITY WARNING: Invite user is using default password! Please change INVITE_PASSWORD environment variable in production',
      });
    }
  } catch (error: any) {
    // Si erreur USER_EXISTS
    if (error?.code === 'USER_EXISTS' || error?.code === 'EMAIL_EXISTS') {
      logger.info({
        event: 'invite_user_exists',
        username: authenv.INVITE_USERNAME,
        message: 'Invite user already exists',
      });
      return;
    }

    // Autre erreur : log et throw
    logger.error({
      event: 'invite_user_creation_failed',
      username: authenv.INVITE_USERNAME,
      err: error?.message || error,
      code: error?.code,
    });
    throw error;
  }
}
