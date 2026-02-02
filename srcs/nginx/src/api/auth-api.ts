import {
  ERROR_CODES,
  ErrorDetail,
  FrontendError,
  HTTP_STATUS,
  ReasonValue,
  UserDTO,
  UserLoginDTO,
  UserLoginSchema,
  usernameDTO,
  usernameSchema,
  UserRegisterDTO,
  UserRegisterSchema,
} from '@transcendence/core';
import api from './api-client';
import i18next from 'i18next';
import { FrontendReasonValue } from '../../../shared/core/src/errors/error-types';

export const authApi = {
  register: async (payload: UserRegisterDTO): Promise<usernameDTO> => {
    const validation = UserRegisterSchema.safeParse(payload);
    if (!validation.success) {
      const details: ErrorDetail[] = validation.error.issues.map((issue) => ({
        field: issue.path[0]?.toString() || 'form',
        reason: issue.message as FrontendReasonValue,
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
        reason: issue.message as FrontendReasonValue,
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

  me: async (username: usernameDTO): Promise<UserDTO> => {
    usernameSchema.parse(username);
    // const response = await api.get(`/auth/me/`);
    const response = {
      data: {
        authId: 1,
        email: 'toto@mail.com',
        username: 'Toto',
      },
      message: 'OK',
    };
    return response.data;
  },
};
