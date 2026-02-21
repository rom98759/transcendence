/**
 * 42 School OAuth 2.0 Provider
 *
 * Approche pragmatique: faire fonctionner d'abord
 * Flow supporté: Authorization Code Flow (client-side initiation)
 */

import { logger } from '../../index.js';
import type { OAuthProfile } from '../../types/dto.js';
import { authenv } from '../../config/env.js';

const SCHOOL42_TOKEN_URL = 'https://api.intra.42.fr/oauth/token';
const SCHOOL42_PROFILE_URL = 'https://api.intra.42.fr/v2/me';

/**
 * Interfaces pour les APIs 42
 */
interface School42TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface School42ErrorResponse {
  error: string;
  error_description?: string;
}

interface School42UserInfo {
  id: number;
  email: string;
  login: string;
  first_name: string;
  last_name: string;
  usual_full_name: string;
  image_url: string;
}

/**
 * Classe d'erreur OAuth spécifique
 */
export class School42OAuthError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'School42OAuthError';
  }
}

/**
 * Parse et mappe les erreurs 42 avec des messages explicites
 */
function parseSchool42Error(errorResponse: School42ErrorResponse): School42OAuthError {
  const errorCode = errorResponse.error;
  const description = errorResponse.error_description || '';

  switch (errorCode) {
    case 'invalid_grant':
      return new School42OAuthError(
        'INVALID_GRANT',
        'Authorization code is invalid or expired. Please try logging in again. (Code may have been: expired after ~10min, already used, or redirect_uri mismatch)',
        400,
      );

    case 'invalid_client':
      return new School42OAuthError(
        'INVALID_CLIENT_CREDENTIALS',
        '42 School client ID or secret is incorrect. Check your OAuth configuration.',
        401,
      );

    case 'unauthorized_client':
      return new School42OAuthError(
        'UNAUTHORIZED_CLIENT',
        '42 School OAuth client is not authorized. Check your app registration on intra.42.fr.',
        403,
      );

    case 'invalid_scope':
      return new School42OAuthError(
        'INVALID_SCOPE',
        'Requested scopes are invalid for 42 School OAuth. Verify your scope settings.',
        400,
      );

    case 'server_error':
      return new School42OAuthError(
        'SCHOOL42_SERVER_ERROR',
        '42 School API is temporarily unavailable. Please try again later.',
        503,
      );

    default:
      return new School42OAuthError(
        'SCHOOL42_OAUTH_ERROR',
        `OAuth error from 42 School: ${errorCode}. ${description}`,
        400,
      );
  }
}

/**
 * Service 42 School OAuth
 */
export const school42Service = {
  /**
   * Échange un authorization code contre un profile utilisateur
   */
  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    try {
      // Step 1: Échanger code contre access_token
      logger.info({ event: 'school42_token_exchange_start' });

      const tokenResponse = await fetch(SCHOOL42_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: authenv.SCHOOL42_CLIENT_ID,
          client_secret: authenv.SCHOOL42_CLIENT_SECRET,
          redirect_uri: `${authenv.OAUTH_BASE_URL}/auth/oauth/school42/callback`,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();

        logger.error({
          event: 'school42_token_exchange_failed',
          status: tokenResponse.status,
          errorText,
        });

        // Tenter de parser la réponse JSON si c'est une erreur OAuth
        try {
          const errorData: School42ErrorResponse = JSON.parse(errorText);
          const oauthError = parseSchool42Error(errorData);
          logger.warn({
            event: 'school42_token_exchange_oauth_error',
            errorCode: oauthError.code,
            message: oauthError.message,
          });
          throw oauthError;
        } catch {
          // Si ce n'est pas du JSON valide, retourner une erreur générique
          throw new School42OAuthError(
            'TOKEN_EXCHANGE_FAILED',
            `Failed to exchange authorization code with 42 School (HTTP ${tokenResponse.status}). This usually means the code is invalid, expired, or already used.`,
            400,
          );
        }
      }

      const tokenData: School42TokenResponse = await tokenResponse.json();

      logger.info({ event: 'school42_token_exchange_success' });

      // Step 2: Récupérer le profil utilisateur
      logger.info({ event: 'school42_profile_fetch_start' });

      const profileResponse = await fetch(SCHOOL42_PROFILE_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        logger.error({
          event: 'school42_profile_fetch_failed',
          status: profileResponse.status,
          errorText,
        });

        throw new School42OAuthError(
          'PROFILE_FETCH_FAILED',
          `Failed to fetch user profile from 42 School (HTTP ${profileResponse.status}). Token may be invalid or expired.`,
          400,
        );
      }

      const school42Profile: School42UserInfo = await profileResponse.json();

      // Validation minimale
      if (!school42Profile.id || !school42Profile.email || !school42Profile.login) {
        logger.warn({
          event: 'school42_invalid_profile',
          id: school42Profile.id,
          email: school42Profile.email,
          login: school42Profile.login,
        });

        throw new School42OAuthError(
          'INVALID_PROFILE',
          '42 School profile is missing required fields (id, email, or login)',
          400,
        );
      }

      logger.info({
        event: 'school42_profile_fetch_success',
        email: school42Profile.email,
        login: school42Profile.login,
      });

      return {
        id: String(school42Profile.id),
        email: school42Profile.email,
        name: school42Profile.usual_full_name,
        avatarUrl: school42Profile.image_url || undefined,
        provider: 'school42',
      };
    } catch (error) {
      // Si c'est déjà une School42OAuthError, relancer
      if (error instanceof School42OAuthError) {
        throw error;
      }

      logger.error({
        event: 'school42_oauth_unexpected_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new School42OAuthError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'Unknown error during 42 School OAuth',
        500,
      );
    }
  },
};
