/**
 * Service OAuth 2.0 - Orchestration des authentifications externes
 *
 * Responsabilités :
 * - Orchestration du flux OAuth (échange code/token, récupération profil)
 * - Création/liaison des comptes utilisateurs
 * - Intégration avec le service UM pour la synchronisation des profils
 * - Gestion des erreurs et validation des données OAuth
 *
 * Architecture :
 * - Utilise des providers spécifiques (Google, School42) pour les détails d'implémentation
 * - Suit les patterns existants du projet (gestion erreurs, logs, validation)
 * - Integration avec auth.service.ts pour la logique métier auth
 */

import * as db from './database.js';
import { createUserProfile } from './external/um.service.js';
import { generateJWT } from './jwt.service.js';
import { AUTH_CONFIG } from '../utils/constants.js';
import { authenv } from '../config/env.js';
import { logger } from '../index.js';
import { ServiceError, DataError } from '../types/errors.js';
import { APP_ERRORS } from '../utils/error-catalog.js';
import { OAuthProfile, OAuthUserData, CreateProfileDTO } from '../types/dto.js';
import { GoogleOAuthProvider } from './providers/google.service.js';
import { School42OAuthProvider } from './providers/school42.service.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { AppError, ERR_DEFS } from '@transcendence/core';

// ============================================
// Provider Registry
// ============================================

const providers = {
  google: new GoogleOAuthProvider(),
  school42: new School42OAuthProvider(),
} as const;

type OAuthProvider = 'google' | 'school42';

// ============================================
// OAuth Flow - Exchange Code & Get Profile
// ============================================

/**
 * Échange un code d'autorisation contre un token d'accès et récupère le profil utilisateur
 * @param provider Provider OAuth (google|school42)
 * @param authCode Code d'autorisation reçu du provider
 * @returns Profil utilisateur normalisé
 */
export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  authCode: string,
): Promise<OAuthProfile> {
  const oauthProvider = providers[provider];
  if (!oauthProvider) {
    throw new ServiceError(APP_ERRORS.OAUTH_INVALID_PROVIDER, { provider });
  }

  try {
    logger.info({ event: 'oauth_exchange_start', provider });

    // Étape 1: Échanger code contre token
    const tokenResponse = await oauthProvider.exchangeCodeForToken(authCode);

    // Étape 2: Récupérer le profil utilisateur
    const userProfile = await oauthProvider.getUserProfile(tokenResponse.access_token);

    logger.info({
      event: 'oauth_exchange_success',
      provider,
      userId: userProfile.id,
      email: userProfile.email,
    });

    return userProfile;
  } catch (error) {
    logger.error({
      event: 'oauth_exchange_failed',
      provider,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ServiceError) throw error;
    throw new ServiceError(APP_ERRORS.OAUTH_EXCHANGE_FAILED, {
      provider,
      originalError: error,
    });
  }
}

// ============================================
// User Management - Find or Create
// ============================================

/**
 * Trouve un utilisateur existant par ses identifiants OAuth ou crée un nouveau compte
 * @param profile Profil utilisateur OAuth normalisé
 * @returns ID utilisateur et informations de création
 */
export async function findOrCreateOAuthUser(
  profile: OAuthProfile,
): Promise<{ userId: number; username: string; isNewUser: boolean }> {
  try {
    // Vérifier si l'utilisateur existe déjà via OAuth ID
    let existingUser: any = null;

    if (profile.provider === 'google') {
      existingUser = db.findUserByGoogleId(profile.id);
    } else if (profile.provider === 'school42') {
      existingUser = db.findUserBySchool42Id(profile.id);
    }

    if (existingUser) {
      logger.info({
        event: 'oauth_user_found',
        provider: profile.provider,
        userId: existingUser.id,
        username: existingUser.username,
      });

      return {
        userId: existingUser.id,
        username: existingUser.username,
        isNewUser: false,
      };
    }

    // Vérifier si l'email existe déjà (liaison possible)
    const userByEmail = db.findUserByEmail(profile.email);
    if (userByEmail) {
      // Lier le compte OAuth au compte existant
      await linkOAuthToExistingUser(userByEmail.id as number, profile);

      logger.info({
        event: 'oauth_account_linked',
        provider: profile.provider,
        userId: userByEmail.id,
        email: profile.email,
      });

      return {
        userId: userByEmail.id as number,
        username: userByEmail.username,
        isNewUser: false,
      };
    }

    // Créer un nouveau compte
    const newUser = await createNewOAuthUser(profile);

    logger.info({
      event: 'oauth_user_created',
      provider: profile.provider,
      userId: newUser.userId,
      username: newUser.username,
    });

    return {
      userId: newUser.userId,
      username: newUser.username,
      isNewUser: true,
    };
  } catch (error) {
    logger.error({
      event: 'oauth_user_management_failed',
      provider: profile.provider,
      email: profile.email,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ServiceError || error instanceof DataError) throw error;
    throw new ServiceError(APP_ERRORS.SERVICE_GENERIC, {
      details: 'OAuth user management',
      originalError: error,
    });
  }
}

// ============================================
// Private Helper Functions
// ============================================

/**
 * Lie un compte OAuth à un utilisateur existant
 */
async function linkOAuthToExistingUser(userId: number, profile: OAuthProfile): Promise<void> {
  const oauthData: any = {
    oauthEmail: profile.email,
    avatarUrl: profile.avatarUrl,
  };

  if (profile.provider === 'google') {
    oauthData.googleId = profile.id;
  } else if (profile.provider === 'school42') {
    oauthData.school42Id = profile.id;
  }

  db.updateOAuthData(userId, oauthData);
}

/**
 * Crée un nouveau compte utilisateur OAuth
 */
async function createNewOAuthUser(
  profile: OAuthProfile,
): Promise<{ userId: number; username: string }> {
  // Générer un username unique basé sur le profil
  const baseUsername = generateUsernameFromProfile(profile);
  const username = await ensureUniqueUsername(baseUsername);

  // Générer un mot de passe aléatoire (compte OAuth, pas de login par mot de passe)
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const oauthUserData = {
    username,
    email: profile.email,
    password: hashedPassword,
    googleId: profile.provider === 'google' ? profile.id : null,
    school42Id: profile.provider === 'school42' ? profile.id : null,
    oauthEmail: profile.email,
    avatarUrl: profile.avatarUrl || null,
  };

  // Créer l'utilisateur dans auth DB
  const userId = db.createOAuthUser(oauthUserData);

  // Créer le profil dans UM service
  try {
    const createProfilePayload: CreateProfileDTO = {
      authId: userId,
      email: profile.email,
      username,
    };

    await createUserProfile(createProfilePayload);
  } catch (error) {
    // Rollback: supprimer l'utilisateur de auth DB
    logger.warn({
      event: 'oauth_rollback',
      userId,
      reason: 'um_service_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    db.deleteUser(userId);
    throw new ServiceError(APP_ERRORS.SERVICE_GENERIC, {
      details: 'UM service unavailable during OAuth user creation',
      originalError: error,
    });
  }

  return { userId, username };
}

/**
 * Génère un username à partir du profil OAuth
 */
function generateUsernameFromProfile(profile: OAuthProfile): string {
  // Priorité: username/login 42 > nom nettoyé > fallback
  if (profile.provider === 'school42' && (profile.username || profile.login)) {
    return profile.username || profile.login!;
  }

  // Nettoyer le nom pour créer un username valide
  const cleanName = profile.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);

  return cleanName || 'oauthuser';
}

/**
 * S'assure que le username est unique en ajoutant un suffixe si nécessaire
 */
async function ensureUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let attempt = 0;

  while (db.findUserByUsername(username)) {
    attempt++;
    username = `${baseUsername}${attempt}`;

    // Protection contre boucle infinie
    if (attempt > 999) {
      username = `${baseUsername}_${crypto.randomBytes(4).toString('hex')}`;
      break;
    }
  }

  return username;
}

// ============================================
// JWT Generation for OAuth Users
// ============================================

/**
 * Génère un JWT pour un utilisateur OAuth authentifié
 */
export function generateOAuthJWT(
  fastify: FastifyInstance,
  userId: number,
  username: string,
): string {
  // Utiliser le même rôle par défaut que les utilisateurs normaux
  const userRole = 'user';

  return generateJWT(fastify, userId, username, userRole, AUTH_CONFIG.JWT_EXPIRATION);
}
