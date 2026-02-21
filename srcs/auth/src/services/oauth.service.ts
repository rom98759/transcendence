/**
 * Service OAuth 2.0 - Orchestration des authentifications externes
 *
 * Approche pragmatique : faire fonctionner d'abord, sécuriser ensuite
 *
 * Responsabilités :
 * - Orchestration du flux OAuth (échange code/token, récupération profil)
 * - Création/liaison des comptes utilisateurs
 * - Intégration avec le service UM pour la synchronisation des profils
 */

import * as db from './database.js';
import { createUserProfile } from './external/um.service.js';
import { googleService } from './providers/google.service.js';
import { school42Service } from './providers/school42.service.js';
import { logger } from '../index.js';
import { EVENTS } from '../utils/constants.js';
import type { OAuthProfile } from '../types/dto.js';
import type { DBUser } from '../types/models.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ============================================
// OAuth Flow - Exchange Code & Get Profile
// ============================================

/**
 * Traite un callback OAuth complet
 * 1. Échange le code contre un access_token
 * 2. Récupère le profil utilisateur
 * 3. Crée ou retrouve l'utilisateur
 * 4. Retourne les informations d'authentification
 */
export async function handleOAuthCallback(
  provider: 'google' | 'school42',
  code: string,
): Promise<{ userId: number; username: string; isNewUser: boolean }> {
  // Step 1: Échanger le code contre l'access token
  logger.info({ event: EVENTS.APPLICATION.OAUTH_EXCHANGE_START, provider });

  let profile: OAuthProfile;

  if (provider === 'google') {
    profile = await googleService.exchangeCodeForProfile(code);
  } else {
    profile = await school42Service.exchangeCodeForProfile(code);
  }

  logger.info({
    event: 'oauth_profile_received',
    provider,
    oauthId: profile.id,
    email: profile.email,
  });

  // Step 2: Trouver ou créer l'utilisateur
  let userId: number;
  let isNewUser = false;

  try {
    // Chercher un utilisateur existant avec cet ID OAuth
    const existingUser = findUserByOAuthId(provider, profile.id);

    if (existingUser) {
      logger.info({
        event: EVENTS.LIFECYCLE.OAUTH_LOGIN_SUCCESS,
        provider,
        userId: existingUser.id,
      });
      userId = existingUser.id;
    } else {
      // Créer un nouvel utilisateur
      const newUser = await createNewOAuthUser(provider, profile);
      userId = newUser.userId;
      isNewUser = true;

      logger.info({
        event: EVENTS.LIFECYCLE.OAUTH_REGISTER_SUCCESS,
        provider,
        userId,
        username: newUser.username,
      });
    }
  } catch (error) {
    logger.error({
      event: EVENTS.DEPENDENCY.FAIL,
      provider,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }

  // Récupérer l'utilisateur complet
  const user = db.findUserById(userId);

  if (!user) {
    throw new Error('User not found after creation');
  }

  return {
    userId,
    username: user.username,
    isNewUser,
  };
}

/**
 * Trouve un utilisateur par son ID OAuth
 */
function findUserByOAuthId(
  provider: 'google' | 'school42',
  oauthId: string,
): { id: number; username: string } | null {
  let user: DBUser | null = null;

  if (provider === 'google') {
    user = db.findUserByGoogleId(oauthId) || null;
  } else {
    user = db.findUserBySchool42Id(oauthId) || null;
  }

  if (!user || !user.id) return null;

  return {
    id: user.id,
    username: user.username,
  };
}

/**
 * Crée un nouvel utilisateur OAuth
 * Génère automatiquement un username unique basé sur le profil
 */
async function createNewOAuthUser(
  provider: 'google' | 'school42',
  profile: OAuthProfile,
): Promise<{ userId: number; username: string }> {
  // Générer un username unique basé sur l'email
  const baseUsername = profile.email.split('@')[0];
  let username = baseUsername;
  let counter = 1;

  // Assurez-vous que le username est unique
  while (db.findUserByUsername(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  logger.info({
    event: 'oauth_generating_username',
    provider,
    baseUsername,
    generatedUsername: username,
  });

  // Mot de passe aléatoire (l'utilisateur se connecte via OAuth, pas besoin de password)
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  // Créer l'utilisateur
  const userId = db.createOAuthUser({
    username,
    email: profile.email,
    password: hashedPassword,
    googleId: provider === 'google' ? profile.id : null,
    school42Id: provider === 'school42' ? profile.id : null,
    oauthEmail: profile.email,
    avatarUrl: profile.avatarUrl || null,
  });

  // Créer le profil dans le service UM
  try {
    await createUserProfile({
      authId: userId,
      email: profile.email,
      username,
    });
  } catch (error) {
    // Rollback: supprimer l'utilisateur de auth DB
    logger.warn({
      event: EVENTS.DEPENDENCY.ROLLBACK,
      userId,
      reason: 'um_service_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    db.deleteUser(userId);
    throw error;
  }

  return {
    userId,
    username,
  };
}
