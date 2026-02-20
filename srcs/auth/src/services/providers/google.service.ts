/**
 * Google OAuth 2.0 Provider
 *
 * Implémentation spécifique pour l'authentification Google OAuth 2.0
 * Suit les spécifications: https://developers.google.com/identity/protocols/oauth2
 *
 * Flow supporté: Authorization Code Flow (client-side initiation)
 * Scopes demandés: openid, profile, email
 */

import { OAuthProfile, OAuthTokenResponse } from '../../types/dto.js';
import { AUTH_CONFIG, EVENTS, REASONS } from '../../utils/constants.js';
import { authenv } from '../../config/env.js';
import { logger } from '../../index.js';
import { ServiceError } from '../../types/errors.js';
import { APP_ERRORS } from '../../utils/error-catalog.js';

/**
 * Interface pour les réponses de l'API Google
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  locale?: string;
}

/**
 * Provider Google OAuth 2.0
 */
export class GoogleOAuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = authenv.GOOGLE_CLIENT_ID;
    this.clientSecret = authenv.GOOGLE_CLIENT_SECRET;
    this.redirectUri = `${authenv.OAUTH_BASE_URL}/auth/oauth/google/callback`;
  }

  /**
   * Échange un code d'autorisation contre un token d'accès
   * @param authCode Code reçu de Google après autorisation utilisateur
   * @returns Token d'accès et métadonnées
   */
  async exchangeCodeForToken(authCode: string): Promise<OAuthTokenResponse> {
    const tokenUrl = AUTH_CONFIG.OAUTH.GOOGLE.TOKEN_URL;

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    try {
      logger.info({ event: 'google_token_exchange_start', code_length: authCode.length });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(AUTH_CONFIG.OAUTH.TOKEN_EXCHANGE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          event: 'google_token_exchange_failed',
          status: response.status,
          error: errorText,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_TOKEN_EXCHANGE_FAILED, {
          provider: 'google',
          status: response.status,
          details: errorText,
        });
      }

      const tokenData: GoogleTokenResponse = await response.json();

      logger.info({
        event: 'google_token_exchange_success',
        expires_in: tokenData.expires_in,
        has_refresh_token: !!tokenData.refresh_token,
      });

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error({
        event: 'google_token_exchange_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ServiceError(APP_ERRORS.OAUTH_NETWORK_ERROR, {
        provider: 'google',
        operation: 'token_exchange',
        originalError: error,
      });
    }
  }

  /**
   * Récupère le profil utilisateur via l'API Google
   * @param accessToken Token d'accès valide
   * @returns Profil utilisateur normalisé
   */
  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const userInfoUrl = AUTH_CONFIG.OAUTH.GOOGLE.USER_INFO_URL;

    try {
      logger.info({ event: 'google_user_profile_start' });

      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(AUTH_CONFIG.OAUTH.USER_PROFILE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          event: 'google_user_profile_failed',
          status: response.status,
          error: errorText,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_PROFILE_FETCH_FAILED, {
          provider: 'google',
          status: response.status,
          details: errorText,
        });
      }

      const userData: GoogleUserInfo = await response.json();

      // Validation des données essentielles
      if (!userData.id || !userData.email || !userData.verified_email) {
        logger.error({
          event: 'google_invalid_profile',
          has_id: !!userData.id,
          has_email: !!userData.email,
          email_verified: userData.verified_email,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_INVALID_PROFILE, {
          provider: 'google',
          reason: 'missing_required_fields',
        });
      }

      logger.info({
        event: 'google_user_profile_success',
        user_id: userData.id,
        email: userData.email,
        has_picture: !!userData.picture,
      });

      // Normaliser vers notre format standard
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
        provider: 'google',
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error({
        event: 'google_user_profile_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ServiceError(APP_ERRORS.OAUTH_NETWORK_ERROR, {
        provider: 'google',
        operation: 'user_profile',
        originalError: error,
      });
    }
  }

  /**
   * Génère l'URL d'autorisation Google (pour information)
   * Note: Dans notre architecture client-side, le frontend génère cette URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: AUTH_CONFIG.OAUTH.GOOGLE.SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.set('state', state);
    }

    return `${AUTH_CONFIG.OAUTH.GOOGLE.AUTHORIZATION_URL}?${params.toString()}`;
  }
}
