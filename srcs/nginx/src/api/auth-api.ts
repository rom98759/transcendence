import {
  ERROR_CODES,
  ErrorDetail,
  FrontendError,
  HTTP_STATUS,
  LOG_REASONS,
  UserDTO,
  UserLoginDTO,
  UserLoginSchema,
  usernameDTO,
  UserRegisterDTO,
  UserRegisterSchema,
  FrontendReasonValue,
} from '@transcendence/core';
import api from './api-client';
import i18next from 'i18next';
import { Setup2FAResponse, TwoFactorStatus, Require2FAResponse } from '../types/twoFactor.types';

/**
 * Type de retour pour login : soit username, soit signal 2FA requis
 */
export type LoginResult =
  | { type: 'success'; username: string }
  | { type: 'require2fa'; context: Require2FAResponse };

/**
 * Type de retour pour OAuth callback : soit données user, soit signal 2FA requis
 */
export type OAuthResult =
  | {
      type: 'success';
      username: string;
      provider: string;
      isNewUser: boolean;
    }
  | { type: 'require2fa'; context: Require2FAResponse };

export const authApi = {
  register: async (payload: UserRegisterDTO): Promise<usernameDTO> => {
    const validation = UserRegisterSchema.safeParse(payload);
    if (!validation.success) {
      const details: ErrorDetail[] = validation.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() || 'form',
        message: issue.message,
        reason: (issue?.code as FrontendReasonValue) || LOG_REASONS.UNKNOWN,
      }));
      throw new FrontendError(
        i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`),
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        details,
      );
    }
    const { data } = await api.post(`/auth/register`, payload);
    return data.user?.username;
  },

  login: async (payload: UserLoginDTO): Promise<LoginResult> => {
    const validation = UserLoginSchema.safeParse(payload);
    if (!validation.success) {
      const details: ErrorDetail[] = validation.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() || 'form',
        message: issue.message,
        reason: (issue?.code as FrontendReasonValue) || LOG_REASONS.UNKNOWN,
      }));
      throw new FrontendError(
        i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`),
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        details,
      );
    }
    const { data } = await api.post(`/auth/login`, payload);

    // Détecter si 2FA est requis
    if (data?.result?.require2FA) {
      return {
        type: 'require2fa',
        context: data.result as Require2FAResponse,
      };
    }

    // Login normal sans 2FA
    return {
      type: 'success',
      username: data?.user?.username,
    };
  },

  me: async (): Promise<UserDTO> => {
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  /**
   * Échange un code d'autorisation OAuth contre un JWT
   * @param provider Provider OAuth ('google' | 'school42')
   * @param request Code d'autorisation et state
   * @returns Informations de connexion OAuth ou signal 2FA
   */
  oauthCallback: async (
    provider: 'google' | 'school42',
    request: { code: string; state?: string },
  ): Promise<OAuthResult> => {
    const { data } = await api.post(`/auth/oauth/${provider}/callback`, {
      code: request.code,
      state: request.state,
    });

    const result = data?.result;

    // Détecter si 2FA est requis
    if (result?.require2FA) {
      return {
        type: 'require2fa',
        context: result as Require2FAResponse,
      };
    }

    // OAuth normal sans 2FA
    const username = result?.username;

    if (!username) {
      const details: ErrorDetail[] = [
        {
          field: 'username',
          message: 'Missing username in OAuth callback response',
          reason: LOG_REASONS.UNKNOWN,
        },
      ];
      throw new FrontendError(
        i18next.t(`errors.${ERROR_CODES.INVALID_CREDENTIALS}`),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INVALID_CREDENTIALS,
        details,
      );
    }

    return {
      type: 'success',
      username,
      provider: result?.provider || provider,
      isNewUser: result?.isNewUser || false,
    };
  },

  /**
   * ========================================
   * 2FA ENDPOINTS
   * ========================================
   */

  /**
   * Démarre la configuration 2FA pour l'utilisateur connecté
   * Retourne le QR code et le secret
   */
  setup2FA: async (): Promise<Setup2FAResponse> => {
    const { data } = await api.post('/auth/2fa/setup');
    return {
      ...data.result,
      qrCodeUrl: data.result.qrCode,
    };
  },

  /**
   * Vérifie et active le 2FA avec le code OTP fourni
   * @param code - Code OTP à 6 chiffres
   */
  verify2FASetup: async (code: string): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/2fa/setup/verify', { code });
    return data.result;
  },

  /**
   * Valide le code OTP pendant le flux de login
   * Appelé depuis /2fa après que login/oauth ait requis 2FA
   * @param code - Code OTP à 6 chiffres
   * @returns Username de l'utilisateur authentifié
   */
  verify2FALogin: async (code: string): Promise<usernameDTO> => {
    const { data } = await api.post('/auth/2fa/verify', { code });
    return data.result?.username;
  },

  /**
   * Désactive le 2FA pour l'utilisateur connecté
   */
  disable2FA: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/2fa/disable');
    return data.result;
  },

  /**
   * Récupère le statut 2FA de l'utilisateur connecté
   */
  get2FAStatus: async (): Promise<TwoFactorStatus> => {
    const { data } = await api.get('/auth/2fa/status');
    return {
      ...data.result,
      enabled: data.result.is2FAEnabled,
    };
  },
};
