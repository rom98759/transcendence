import {
  ERROR_CODES,
  ErrorCode,
  ErrorDetail,
  FrontendError,
  HTTP_STATUS,
  HttpStatus,
} from '@transcendence/core';
import axios from 'axios';
import i18next from 'i18next';
import { mapErrorToI18nKey } from '../utils/auth-error-map';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

/**
 * Intercepteur global — transforme les erreurs Axios brutes en FrontendError.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message: string = i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
    let code: ErrorCode = ERROR_CODES.INTERNAL_ERROR;
    let details: ErrorDetail[] | null = null;

    if (error.response) {
      const { data } = error.response;
      const errorPayload = data.error || data;
      statusCode =
        error.response?.status ||
        (errorPayload.status as HttpStatus) ||
        HTTP_STATUS.INTERNAL_SERVER_ERROR;
      code = errorPayload?.code || ERROR_CODES.INTERNAL_ERROR;
      message = i18next.t(mapErrorToI18nKey(code)) || errorPayload?.message || error.message;

      // Transformer les erreurs Zod brutes en ErrorDetail
      if (errorPayload?.details && Array.isArray(errorPayload.details)) {
        details = errorPayload.details.map((detail: any) => ({
          field: detail.field || (detail.path?.[0] as string) || undefined,
          message: detail.message,
          reason: detail.reason || detail.code || 'invalid_format',
        }));
      } else {
        details = null;
      }
    }

    // Extraire les champs extra du payload (ex: remainingAttempts pour 2FA)
    const meta: Record<string, unknown> = {};
    if (error.response) {
      const errorPayload = error.response.data?.error || error.response.data;
      if (errorPayload?.remainingAttempts !== undefined) {
        meta.remainingAttempts = errorPayload.remainingAttempts;
      }
    }

    const frontendError = new FrontendError(
      message,
      statusCode,
      code,
      details,
      Object.keys(meta).length ? meta : undefined,
    );

    return Promise.reject(frontendError);
  },
);

export default api;
