/**
 * 42 School OAuth 2.0 Provider
 *
 * Implémentation spécifique pour l'authentification 42 School OAuth 2.0
 * Documentation: https://api.intra.42.fr/apidoc/guides/web_application_flow
 *
 * Flow supporté: Authorization Code Flow (client-side initiation)
 * Scopes demandés: public (lecture des informations de base)
 */

import { OAuthProfile, OAuthTokenResponse } from '../../types/dto.js';
import { AUTH_CONFIG } from '../../utils/constants.js';
import { authenv } from '../../config/env.js';
import { logger } from '../../index.js';
import { ServiceError } from '../../types/errors.js';
import { APP_ERRORS } from '../../utils/error-catalog.js';

/**
 * Interface pour les réponses de l'API 42
 */
interface School42TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface School42UserInfo {
  id: number;
  email: string;
  login: string;
  first_name: string;
  last_name: string;
  usual_full_name: string;
  usual_first_name?: string;
  url: string;
  phone: string;
  displayname: string;
  image_url: string;
  'staff?': boolean;
  correction_point: number;
  pool_month: string;
  pool_year: string;
  location: string | null;
  wallet: number;
  anonymize_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Provider 42 School OAuth 2.0
 */
export class School42OAuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = authenv.SCHOOL42_CLIENT_ID;
    this.clientSecret = authenv.SCHOOL42_CLIENT_SECRET;
    this.redirectUri = `${authenv.OAUTH_BASE_URL}/auth/oauth/school42/callback`;
  }

  /**
   * Échange un code d'autorisation contre un token d'accès
   * @param authCode Code reçu de 42 après autorisation utilisateur
   * @returns Token d'accès et métadonnées
   */
  async exchangeCodeForToken(authCode: string): Promise<OAuthTokenResponse> {
    const tokenUrl = AUTH_CONFIG.OAUTH.SCHOOL42.TOKEN_URL;

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    try {
      logger.info({ event: 'school42_token_exchange_start', code_length: authCode.length });

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
          event: 'school42_token_exchange_failed',
          status: response.status,
          error: errorText,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_TOKEN_EXCHANGE_FAILED, {
          provider: 'school42',
          status: response.status,
          details: errorText,
        });
      }

      const tokenData: School42TokenResponse = await response.json();

      logger.info({
        event: 'school42_token_exchange_success',
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
        event: 'school42_token_exchange_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ServiceError(APP_ERRORS.OAUTH_NETWORK_ERROR, {
        provider: 'school42',
        operation: 'token_exchange',
        originalError: error,
      });
    }
  }

  /**
   * Récupère le profil utilisateur via l'API 42
   * @param accessToken Token d'accès valide
   * @returns Profil utilisateur normalisé
   */
  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const userInfoUrl = AUTH_CONFIG.OAUTH.SCHOOL42.USER_INFO_URL;

    try {
      logger.info({ event: 'school42_user_profile_start' });

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
          event: 'school42_user_profile_failed',
          status: response.status,
          error: errorText,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_PROFILE_FETCH_FAILED, {
          provider: 'school42',
          status: response.status,
          details: errorText,
        });
      }

      const userData: School42UserInfo = await response.json();

      // Validation des données essentielles
      if (!userData.id || !userData.email || !userData.login) {
        logger.error({
          event: 'school42_invalid_profile',
          has_id: !!userData.id,
          has_email: !!userData.email,
          has_login: !!userData.login,
        });

        throw new ServiceError(APP_ERRORS.OAUTH_INVALID_PROFILE, {
          provider: 'school42',
          reason: 'missing_required_fields',
        });
      }

      logger.info({
        event: 'school42_user_profile_success',
        user_id: userData.id,
        login: userData.login,
        email: userData.email,
        is_staff: userData['staff?'],
        has_image: !!userData.image_url,
      });

      // Normaliser vers notre format standard
      return {
        id: String(userData.id),
        email: userData.email,
        name: userData.usual_full_name,
        username: userData.login,
        login: userData.login,
        avatarUrl: userData.image_url,
        provider: 'school42',
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error({
        event: 'school42_user_profile_error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ServiceError(APP_ERRORS.OAUTH_NETWORK_ERROR, {
        provider: 'school42',
        operation: 'user_profile',
        originalError: error,
      });
    }
  }

  /**
   * Génère l'URL d'autorisation 42 (pour information)
   * Note: Dans notre architecture client-side, le frontend génère cette URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: AUTH_CONFIG.OAUTH.SCHOOL42.SCOPES.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    return `${AUTH_CONFIG.OAUTH.SCHOOL42.AUTHORIZATION_URL}?${params.toString()}`;
  }
}
