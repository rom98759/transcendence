import bcrypt from 'bcrypt';
import * as db from './database.js';
import {
  createUserProfile,
  deleteUserProfile,
  updateProfileUsername,
} from './external/um.service.js';
import { DataError, ServiceError } from '../types/errors.js';
import { APP_ERRORS } from '../utils/error-catalog.js';
import { EVENTS, REASONS, UserRole } from '../utils/constants.js';
import { logger } from '../index.js';
import {
  AppError,
  ERR_DEFS,
  ERROR_CODES,
  LOG_REASONS,
  UserDTO,
  UserFullDTO,
} from '@transcendence/core';
import * as onlineService from './online.service.js';
import { toFullUserDTO, toUserDTO } from '../utils/mapper.js';
import { DBUser } from 'src/types/models.js';

const SALT_ROUNDS = 10;

export function findUser(identifier: string) {
  return db.findUserByIdentifier(identifier);
}

export function findByUsername(username: string) {
  return db.findUserByUsername(username);
}

export function findByEmail(email: string) {
  return db.findUserByEmail(email);
}

export function findUserById(id: number): UserFullDTO | null {
  const userRow = db.findUserById(id);
  if (!userRow) return null;
  return toFullUserDTO(userRow);
}

export async function findUserByIdOrThrow(id: number): Promise<UserRow> {
  const userRow = await db.findUserByIdOrThrow(id);
  return userRow;
}

export async function createUser(user: {
  username: string;
  email?: string | null;
  password: string;
}): Promise<number> {
  const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
  let userId: number;

  try {
    userId = db.createUser({ username: user.username, email: user.email || null, password: hash });
  } catch (err: unknown) {
    if (err instanceof DataError) {
      if (err.meta?.field === 'email') {
        throw new AppError(ERR_DEFS.REG_EMAIL_EXISTS, { field: 'email' });
      }
      if (err.meta?.field === 'username') {
        throw new AppError(ERR_DEFS.REG_USERNAME_TAKEN, { field: 'username' });
      }
    }
    throw err;
  }

  logger.info('created in auth DB');
  try {
    await createUserProfile({
      authId: userId,
      username: user.username,
    });
    return userId;
  } catch (error) {
    logger.warn({
      event: EVENTS.DEPENDENCY.ROLLBACK,
      userId,
      reason: REASONS.NETWORK.UPSTREAM_ERROR,
    });
    db.deleteUser(userId);
    throw new ServiceError(APP_ERRORS.SERVICE_GENERIC, {
      details: 'um-service',
      originalError: error,
    });
  }
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

// ============================================
// Admin User Management Functions
// ============================================

export function listUsers() {
  return db.listUsers();
}

export function updateUserAsAdmin(
  userId: number,
  userData: { username: string; email: string; role: string },
) {
  try {
    db.updateUser(userId, userData);
  } catch (err: unknown) {
    if (err instanceof DataError) {
      if (err.meta?.field === 'email') {
        throw new ServiceError(APP_ERRORS.REG_EMAIL_EXISTS, { details: userData.email });
      }
      if (err.meta?.field === 'username') {
        throw new ServiceError(APP_ERRORS.REG_USERNAME_TAKEN, { details: userData.username });
      }
    }
    throw err;
  }
}

export function adminDisable2FA(userId: number) {
  try {
    db.disable2FA(userId);
  } catch (err: unknown) {
    throw err;
  }
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>;

// ============================================
// Login Token Functions
// ============================================

/**
 * Crée un token de connexion temporaire (valide 2 minutes)
 * @param userId ID de l'utilisateur
 * @returns Le token généré
 */
export function createLoginToken(userId: number): string {
  return db.createLoginToken(userId, 120); // 120 secondes = 2 minutes
}

/**
 * Valide un token de connexion et retourne l'ID utilisateur avec les tentatives
 * @param token Token à valider
 * @returns L'ID utilisateur et tentatives si valide, null sinon
 */
export function validateLoginToken(token: string): { userId: number; attempts: number } | null {
  return db.validateLoginToken(token);
}

/**
 * Incrémente le nombre de tentatives pour un login token
 * @param token Token pour lequel incrémenter les tentatives
 */
export function incrementLoginTokenAttempts(token: string): void {
  db.incrementLoginTokenAttempts(token);
}

/**
 * Récupère le nombre de tentatives pour un login token
 * @param token Token à vérifier
 * @returns Nombre de tentatives
 */
export function getLoginTokenAttempts(token: string): number {
  return db.getLoginTokenAttempts(token);
}

/**
 * Supprime un token de connexion
 * @param token Token à supprimer
 */
export function deleteLoginToken(token: string): void {
  db.deleteLoginToken(token);
}

/**
 * Nettoie les tokens expirés
 */
export function cleanExpiredLoginTokens(): void {
  db.cleanExpiredTokens();
}

// ============================================
// Role-Based Access Control (RBAC) Functions
// ============================================

/**
 * Récupère le rôle d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Le rôle de l'utilisateur
 */
export function getUserRole(userId: number): string {
  return db.getUserRole(userId);
}

/**
 * Met à jour le rôle d'un utilisateur
 * @param userId ID de l'utilisateur
 * @param role Nouveau rôle
 */
export function updateUserRole(userId: number, role: UserRole): void {
  db.updateUserRole(userId, role);
}

/**
 * Updates an user's username
 * @param userId User ID
 * @param username User Username
 * @param newEmail New Username
 */
export async function updateUserUsernameAndFetch(
  userId: number,
  username: string,
  newUsername: string,
): Promise<DBUser> {
  logger.info({ username, newUsername }, 'update username');
  await db.updateUserUsername(userId, newUsername);
  try {
    await updateProfileUsername(userId, username, newUsername);
  } catch (error: any) {
    await db.updateUserUsername(userId, username);
    throw new ServiceError(
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to sync username with profile service',
        event: EVENTS.CRITICAL.BUG,
        reason: LOG_REASONS.NETWORK.UPSTREAM_ERROR,
        statusCode: 503,
      },
      {
        originalError: error?.message,
        userId,
      },
    );
  }
  const updatedUser = await db.findUserByIdOrThrow(userId);
  return updatedUser;
}

/**
 * Updates an user's email
 * @param userId User ID
 * @param username User Username
 * @param newEmail New Email
 */
export async function updateUserEmailAndFetch(
  userId: number,
  username: string,
  newEmail: string,
): Promise<UserDTO> {
  await db.updateUserEmail(userId, newEmail);
  const user = await db.findUserByIdOrThrow(userId);
  return toUserDTO(user);
}

/**
 * Vérifie si un utilisateur possède un rôle requis ou supérieur
 * @param userId ID de l'utilisateur
 * @param requiredRole Rôle minimum requis
 * @returns true si l'utilisateur a le rôle requis ou supérieur
 */
export function hasRole(userId: number, requiredRole: UserRole): boolean {
  try {
    const userRole = getUserRole(userId);

    // Hiérarchie des rôles : user < moderator < admin
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.MODERATOR]: 1,
      [UserRole.ADMIN]: 2,
    };

    const userRoleLevel = roleHierarchy[userRole as UserRole] ?? 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  } catch (err: unknown) {
    // En cas d'erreur, refuser l'accès par défaut
    logger.error(err);
    return false;
  }
}

/**
 * Supprime un utilisateur et toutes ses données
 * Suppression entre les services auth et users
 */
export async function deleteUser(userId: number): Promise<void> {
  logger.info({ event: 'delete_user_start', userId });

  try {
    // Supp user profile UM service
    const user = await db.findUserByIdOrThrow(userId);
    await deleteUserProfile(userId, user.username);
    // Supp user Redis online
    await onlineService.removeUserFromRedis(userId);

    // Supp user from auth DB
    db.deleteUser(userId);

    logger.info({ event: 'delete_user_completed', userId });
  } catch (error: unknown) {
    logger.error({ event: 'delete_user_failed', userId, error: (error as Error)?.message });

    if (error instanceof DataError) {
      throw error;
    }

    throw new ServiceError(ERR_DEFS.DB_DELETE_ERROR, { userId });
  }
}
