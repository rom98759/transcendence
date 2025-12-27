import bcrypt from 'bcrypt'
import * as db from './database.js'
import { createUserProfile } from './external/um.service.js'
import { DataError, ServiceError } from '../types/errors.js'
import { APP_ERRORS } from '../utils/error-catalog.js'
import { EVENTS, REASONS, UserRole } from '../utils/constants.js'
import { ADMIN_USERNAME, INVITE_USERNAME } from '../config/env.js'
import { logger } from '../index.js'

const SALT_ROUNDS = 10

export function findUser(identifier: string) {
  return db.findUserByIdentifier(identifier)
}

export function findByUsername(username: string) {
  return db.findUserByUsername(username)
}

export function findByEmail(email: string) {
  return db.findUserByEmail(email)
}

export function findUserById(id: number) {
  return db.findUserById(id)
}

export async function createUser(user: { username: string; email?: string | null; password: string }): Promise<number> {
  const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
  let userId: number;

  try {
      userId = db.createUser({ username: user.username, email: user.email || null, password: hash });
  } catch (err: any) {
    if (err instanceof DataError) {
        if (err.meta?.field === 'email') {
            throw new ServiceError(APP_ERRORS.REG_EMAIL_EXISTS, { details: user.email });
        }
        if (err.meta?.field === 'username') {
            throw new ServiceError(APP_ERRORS.REG_USERNAME_TAKEN, { details: user.username });
        }
    }
    throw err;
  }
  
  if ([ADMIN_USERNAME, INVITE_USERNAME].includes(user.username))
    return userId;

  logger.info("created in auth DB");
  try {
    await createUserProfile({
        authId: userId,
        email: user.email || "",
        username: user.username
    });
    return userId;
  } catch (error) {
    logger.warn({event: EVENTS.DEPENDENCY.ROLLBACK, userId, reason: REASONS.NETWORK.UPSTREAM_ERROR });
    db.deleteUser(userId);
    throw error;
  }
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier)
  if (!user) return false
  return bcrypt.compareSync(password, user.password)
}

// DEV ONLY - À supprimer en production
export function listUsers() {
  return db.listUsers()
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>

// ============================================
// Login Token Functions
// ============================================

/**
 * Crée un token de connexion temporaire (valide 2 minutes)
 * @param userId ID de l'utilisateur
 * @returns Le token généré
 */
export function createLoginToken(userId: number): string {
  return db.createLoginToken(userId, 120) // 120 secondes = 2 minutes
}

/**
 * Valide un token de connexion et retourne l'ID utilisateur avec les tentatives
 * @param token Token à valider
 * @returns L'ID utilisateur et tentatives si valide, null sinon
 */
export function validateLoginToken(token: string): { userId: number; attempts: number } | null {
  return db.validateLoginToken(token)
}

/**
 * Incrémente le nombre de tentatives pour un login token
 * @param token Token pour lequel incrémenter les tentatives
 */
export function incrementLoginTokenAttempts(token: string): void {
  db.incrementLoginTokenAttempts(token)
}

/**
 * Récupère le nombre de tentatives pour un login token
 * @param token Token à vérifier
 * @returns Nombre de tentatives
 */
export function getLoginTokenAttempts(token: string): number {
  return db.getLoginTokenAttempts(token)
}

/**
 * Supprime un token de connexion
 * @param token Token à supprimer
 */
export function deleteLoginToken(token: string): void {
  db.deleteLoginToken(token)
}

/**
 * Nettoie les tokens expirés
 */
export function cleanExpiredLoginTokens(): void {
  db.cleanExpiredTokens()
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
  return db.getUserRole(userId)
}

/**
 * Met à jour le rôle d'un utilisateur
 * @param userId ID de l'utilisateur
 * @param role Nouveau rôle
 */
export function updateUserRole(userId: number, role: UserRole): void {
  db.updateUserRole(userId, role)
}

/**
 * Vérifie si un utilisateur possède un rôle requis ou supérieur
 * @param userId ID de l'utilisateur
 * @param requiredRole Rôle minimum requis
 * @returns true si l'utilisateur a le rôle requis ou supérieur
 */
export function hasRole(userId: number, requiredRole: UserRole): boolean {
  try {
    const userRole = getUserRole(userId)

    // Hiérarchie des rôles : user < admin
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.ADMIN]: 1,
    }

    const userRoleLevel = roleHierarchy[userRole as UserRole] ?? 0
    const requiredRoleLevel = roleHierarchy[requiredRole]

    return userRoleLevel >= requiredRoleLevel
  } catch (err) {
    // En cas d'erreur, refuser l'accès par défaut
    return false
  }
}
