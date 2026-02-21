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

  login: async (payload: UserLoginDTO): Promise<usernameDTO> => {
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
    return data?.user?.username;
  },

  me: async (): Promise<UserDTO> => {
    const { data } = await api.get('/auth/me', {
      withCredentials: true,
    });
    return data;
  },

  /**
   * Échange un code d'autorisation OAuth contre un JWT
   * @param provider Provider OAuth ('google' | 'school42')
   * @param request Code d'autorisation et state
   * @returns Informations de connexion OAuth
   */
  oauthCallback: async (
    provider: 'google' | 'school42',
    request: { code: string; state?: string },
  ): Promise<{
    message: string;
    username: string;
    provider: string;
    isNewUser: boolean;
  }> => {
    const { data } = await api.post(
      `/auth/oauth/${provider}/callback`,
      {
        code: request.code,
        state: request.state,
      },
      {
        withCredentials: true,
      },
    );

    return {
      message: data.result?.message || 'OAuth login successful',
      username: data.result?.username || '',
      provider: data.result?.provider || provider,
      isNewUser: data.result?.isNewUser || false,
    };
  },
};
