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

  login: async (
    payload: UserLoginDTO,
  ): Promise<{ username: string } | { require2FA: true; username: string; message: string }> => {
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

    // Backend retourne soit result (2FA requise) soit user (login direct)
    if (data?.result?.require2FA) {
      return {
        require2FA: true,
        username: data.result.username,
        message: data.result.message,
      };
    }

    return { username: data?.user?.username };
  },

  // me: async (): Promise<UserDTO> => {
  //   usernameSchema.parse(username);
  //   // const response = await api.get(`/auth/me/`);
  //   const response = {
  //     data: {
  //       authId: 1,
  //       email: 'toto@mail.com',
  //       username: 'Toto',
  //     },
  //     message: 'OK',
  //   };
  //   return response.data;
  // },
  me: async (): Promise<UserDTO> => {
    const { data } = await api.get('/auth/me', {
      withCredentials: true,
    });
    return data;
  },

  // 2FA - Setup: Génère le QR code pour activer la 2FA
  setup2FA: async (): Promise<{ qrCode: string; message: string; expiresIn: number }> => {
    const { data } = await api.post('/auth/2fa/setup', {}, { withCredentials: true });
    return data.result;
  },

  // 2FA - Verify Setup: Vérifie le code OTP et active définitivement la 2FA
  verify2FASetup: async (code: string): Promise<{ message: string; username: string }> => {
    const { data } = await api.post('/auth/2fa/setup/verify', { code }, { withCredentials: true });
    return data.result;
  },

  // 2FA - Verify Login: Vérifie le code OTP lors du login (phase 2)
  verify2FALogin: async (code: string): Promise<{ message: string; username: string }> => {
    const { data } = await api.post('/auth/2fa/verify', { code }, { withCredentials: true });
    return data.result;
  },

  // 2FA - Disable: Désactive la 2FA pour l'utilisateur connecté
  disable2FA: async (): Promise<{ message: string; username: string }> => {
    const { data } = await api.post('/auth/2fa/disable', {}, { withCredentials: true });
    return data.result;
  },
};
