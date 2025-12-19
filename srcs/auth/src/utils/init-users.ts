import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, INVITE_EMAIL, INVITE_PASSWORD, INVITE_USERNAME } from '../config/env.js'
import * as authService from '../services/auth.service.js'
import { logger } from './logger.js'
import { UserRole } from './constants.js'

/**
 * Initialise l'utilisateur admin au démarrage du service
 * Credentials par défaut
 */
export async function initAdminUser(): Promise<void> {
  const env = (globalThis as any).process?.env || {}


  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = authService.findByUsername(ADMIN_USERNAME)

    if (existingAdmin) {
      logger.info({
        event: 'admin_user_exists',
        username: ADMIN_USERNAME,
        message: 'Admin user already exists, skipping creation',
      })
      return
    }

    // Créer l'utilisateur admin
    const adminId = await authService.createUser({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })

    // Assigner le rôle admin
    authService.updateUserRole(adminId, UserRole.ADMIN)

    logger.info({
      event: 'admin_user_created',
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      id: adminId,
      role: UserRole.ADMIN,
      message: 'Admin user created successfully',
    })

    // Avertissement sécurité si credentials par défaut
    if (ADMIN_PASSWORD === 'Admin123!') {
      logger.warn({
        event: 'admin_default_password_warning',
        username: ADMIN_USERNAME,
        message:
          'SECURITY WARNING: Admin user is using default password! Please change ADMIN_PASSWORD environment variable in production',
      })
    }
  } catch (error: any) {
    // Si erreur USER_EXISTS
    if (error?.code === 'USER_EXISTS' || error?.code === 'EMAIL_EXISTS') {
      logger.info({
        event: 'admin_user_exists',
        username: ADMIN_USERNAME,
        message: 'Admin user already exists',
      })
      return
    }

    // Autre erreur : log et throw
    logger.error({
      event: 'admin_user_creation_failed',
      username: ADMIN_USERNAME,
      err: error?.message || error,
      code: error?.code,
    })
    throw error
  }
}

/**
 * Initialise l'utilisateur invité au démarrage du service
 * Credentials par défaut
 */
export async function initInviteUser(): Promise<void> {
  const env = (globalThis as any).process?.env || {}


  try {
    // Vérifier si l'invité existe déjà
    const existingInvite = authService.findByUsername(INVITE_USERNAME)

    if (existingInvite) {
      logger.info({
        event: 'invite_user_exists',
        username: INVITE_USERNAME,
        message: 'Invite user already exists, skipping creation',
      })
      return
    }

    // Créer l'utilisateur invité
    const inviteId = authService.createUser({
      username: INVITE_USERNAME,
      email: INVITE_EMAIL,
      password: INVITE_PASSWORD,
    })

    logger.info({
      event: 'invite_user_created',
      username: INVITE_USERNAME,
      email: INVITE_EMAIL,
      id: inviteId,
      message: 'Invite user created successfully',
    })

    // Avertissement sécurité si credentials par défaut
    if (INVITE_PASSWORD === 'Invite123!') {
      logger.warn({
        event: 'invite_default_password_warning',
        username: INVITE_USERNAME,
        message:
          'SECURITY WARNING: Invite user is using default password! Please change INVITE_PASSWORD environment variable in production',
      })
    }
  } catch (error: any) {
    // Si erreur USER_EXISTS
    if (error?.code === 'USER_EXISTS' || error?.code === 'EMAIL_EXISTS') {
      logger.info({
        event: 'invite_user_exists',
        username: INVITE_USERNAME,
        message: 'Invite user already exists',
      })
      return
    }

    // Autre erreur : log et throw
    logger.error({
      event: 'invite_user_creation_failed',
      username: INVITE_USERNAME,
      err: error?.message || error,
      code: error?.code,
    })
    throw error
  }
}
