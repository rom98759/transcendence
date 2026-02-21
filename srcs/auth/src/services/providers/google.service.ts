/**
 * Google OAuth 2.0 Provider
 *
 * Approche pragmatique: faire fonctionner d'abord
 * Flow supporté: Authorization Code Flow (client-side initiation)
 */

import { logger } from '../../index.js';
import type { OAuthProfile } from '../../types/dto.js';
import { authenv } from '../../config/env.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PROFILE_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Interfaces pour les APIs Google
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface GoogleErrorResponse {
  error: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture?: string;
}

/**
 * Classe d'erreur OAuth spécifique
 */
export class GoogleOAuthError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

/**
 * Parse et mappe les erreurs Google avec des messages explicites
 */
function parseGoogleError(errorResponse: GoogleErrorResponse): GoogleOAuthError {
  const errorCode = errorResponse.error;
  const description = errorResponse.error_description || '';

  switch (errorCode) {
    case 'invalid_grant':
      return new GoogleOAuthError(
        'INVALID_GRANT',
        'Authorization code is invalid or expired. Please try logging in again. (Code may have been: expired after ~10min, already used, or redirect_uri mismatch)',
        400,
      );

    case 'invalid_client':
      return new GoogleOAuthError(
        'INVALID_CLIENT_CREDENTIALS',
        'Google client ID or secret is incorrect. Check your OAuth configuration.',
        401,
      );

    case 'unauthorized_client':
      return new GoogleOAuthError(
        'UNAUTHORIZED_CLIENT',
        'Google OAuth client is not authorized. Check Google Cloud Console configuration.',
        403,
      );

    case 'invalid_scope':
      return new GoogleOAuthError(
        'INVALID_SCOPE',
        'Requested scopes are invalid. Check OAuth configuration.',
        400,
      );

    case 'server_error':
      return new GoogleOAuthError(
        'GOOGLE_SERVER_ERROR',
        'Google OAuth service is temporarily unavailable. Please try again later.',
        503,
      );

    default:
      return new GoogleOAuthError(
        'GOOGLE_OAUTH_ERROR',
        `OAuth error from Google: ${errorCode}. ${description}`,
        400,
      );
  }
}

/**
 * Service Google OAuth
 */
export const googleService = {
  /**
   * Échange un authorization code contre un profile utilisateur
   */
  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    try {
      // Step 1: Échanger code contre access_token
      logger.info({ event: 'google_token_exchange_start' });

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: authenv.GOOGLE_CLIENT_ID,
          client_secret: authenv.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${authenv.OAUTH_BASE_URL}/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();

        logger.error({
          event: 'google_token_exchange_failed',
          status: tokenResponse.status,
          errorText,
        });

        // Tenter de parser la réponse JSON si c'est une erreur OAuth
        try {
          const errorData: GoogleErrorResponse = JSON.parse(errorText);
          const oauthError = parseGoogleError(errorData);
          logger.warn({
            event: 'google_token_exchange_oauth_error',
            errorCode: oauthError.code,
            message: oauthError.message,
          });
          throw oauthError;
        } catch {
          // Si ce n'est pas du JSON valide, retourner une erreur générique
          throw new GoogleOAuthError(
            'TOKEN_EXCHANGE_FAILED',
            `Failed to exchange authorization code with Google (HTTP ${tokenResponse.status}). This usually means the code is invalid, expired, or already used.`,
            400,
          );
        }
      }

      const tokenData: GoogleTokenResponse = await tokenResponse.json();

      logger.info({ event: 'google_token_exchange_success' });

      // Step 2: Récupérer le profil utilisateur
      logger.info({ event: 'google_profile_fetch_start' });

      const profileResponse = await fetch(GOOGLE_PROFILE_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        logger.error({
          event: 'google_profile_fetch_failed',
          status: profileResponse.status,
          errorText,
        });

        throw new GoogleOAuthError(
          'PROFILE_FETCH_FAILED',
          `Failed to fetch user profile from Google (HTTP ${profileResponse.status}). Token may be invalid or expired.`,
          400,
        );
      }

      const googleProfile: GoogleUserInfo = await profileResponse.json();

      // Validation minimale
      if (!googleProfile.sub || !googleProfile.email) {
        logger.warn({
          event: 'google_invalid_profile',
          sub: googleProfile.sub,
          email: googleProfile.email,
        });

        throw new GoogleOAuthError(
          'INVALID_PROFILE',
          'Google profile is missing required fields (sub or email)',
          400,
        );
      }

      logger.info({
        event: 'google_profile_fetch_success',
        email: googleProfile.email,
      });

      return {
        id: googleProfile.sub,
        email: googleProfile.email,
        name: googleProfile.name,
        avatarUrl: googleProfile.picture || undefined,
        provider: 'google',
      };
    } catch (error) {
      // Si c'est déjà une GoogleOAuthError, relancer
      if (error instanceof GoogleOAuthError) {
        throw error;
      }

      logger.error({
        event: 'google_oauth_unexpected_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new GoogleOAuthError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'Unknown error during Google OAuth',
        500,
      );
    }
  },
};
