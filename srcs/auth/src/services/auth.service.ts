import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import * as db from './database.js';
import { AUTH_CONFIG, UserRole } from '../utils/constants.js';

export function findUser(identifier: string) {
  return db.findUserByIdentifier(identifier);
}

export function findByUsername(username: string) {
  return db.findUserByUsername(username);
}

export function findByEmail(email: string) {
  return db.findUserByEmail(email);
}

export function findUserById(id: number) {
  return db.findUserById(id);
}

export function createUser(user: { username: string; email?: string | null; password: string }) {
  const hash = bcrypt.hashSync(user.password, AUTH_CONFIG.BCRYPT_ROUNDS);
  return db.createUser({ username: user.username, email: user.email || null, password: hash });
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

// DEV ONLY - À supprimer en production
export function listUsers() {
  return db.listUsers();
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>;

// ============================================
// 2FA Functions
// ============================================

/**
 * Génère un secret TOTP et l'URL pour le QR code
 * @param username Nom d'utilisateur pour identifier le compte dans l'app
 * @returns Le secret et l'URL otpauth
 */
export function generate2FASecret(username: string): { secret: string; otpauthUrl: string } {
  // Générer un secret unique
  const secret = authenticator.generateSecret();

  // Créer l'URL otpauth pour Google Authenticator
  const issuer = process.env.APP_NAME || 'Transcendence';
  const otpauthUrl = authenticator.keyuri(username, issuer, secret);

  return { secret, otpauthUrl };
}

/**
 * Génère un QR code en base64 à partir d'une URL otpauth
 * @param otpauthUrl URL otpauth://
 * @returns QR code en data URL (base64)
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (err) {
    const error: any = new Error(`Failed to generate QR code: ${((err as any)?.message) || String(err)}`);
    error.code = 'QR_CODE_GENERATION_ERROR';
    throw error;
  }
}

/**
 * Vérifie un code TOTP pour un utilisateur
 * @param userId ID de l'utilisateur
 * @param code Code à 6 chiffres saisi par l'utilisateur
 * @returns true si le code est valide
 */
export function verify2FACode(userId: number, code: string): boolean {
  try {
    const secret = db.getTotpSecret(userId);

    if (!secret) {
      return false;
    }

    // Valider le code TOTP avec une fenêtre de tolérance (30 secondes avant/après)
    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    });

    return isValid;
  } catch (err) {
    const error: any = new Error(`Failed to verify 2FA code: ${((err as any)?.message) || String(err)}`);
    error.code = 'VERIFY_2FA_CODE_ERROR';
    throw error;
  }
}

/**
 * Active la 2FA pour un utilisateur
 * @param userId ID de l'utilisateur
 * @param secret Secret TOTP à sauvegarder
 */
export function enable2FA(userId: number, secret: string): void {
  db.enable2FA(userId, secret);
}

/**
 * Désactive la 2FA pour un utilisateur
 * @param userId ID de l'utilisateur
 */
export function disable2FA(userId: number): void {
  db.disable2FA(userId);
}

/**
 * Vérifie si la 2FA est activée pour un utilisateur
 * @param userId ID de l'utilisateur
 * @returns true si la 2FA est activée
 */
export function is2FAEnabled(userId: number): boolean {
  return db.is2FAEnabled(userId);
}

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
 * Vérifie si un utilisateur possède un rôle requis ou supérieur
 * @param userId ID de l'utilisateur
 * @param requiredRole Rôle minimum requis
 * @returns true si l'utilisateur a le rôle requis ou supérieur
 */
export function hasRole(userId: number, requiredRole: UserRole): boolean {
  try {
    const userRole = getUserRole(userId);

    // Hiérarchie des rôles : user < admin
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.ADMIN]: 1
    };

    const userRoleLevel = roleHierarchy[userRole as UserRole] ?? 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  } catch (err) {
    // En cas d'erreur, refuser l'accès par défaut
    return false;
  }
}
