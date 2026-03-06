import {
  ERROR_CODES,
  ErrorCode,
  ErrorDetail,
  FrontendError,
  FrontendReasonValue,
  HTTP_STATUS,
  HttpStatus,
  LOG_REASONS,
} from '@transcendence/core';
import axios from 'axios';
import i18next from 'i18next';
import { mapErrorToI18nKey } from '../utils/auth-error-map';
import z from 'zod';

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
    let details: ErrorDetail[] = [];
    if (error.response) {
      const { data } = error.response;
      const errorPayload = data.error || data;
      statusCode =
        error.response?.status ||
        (errorPayload.status as HttpStatus) ||
        HTTP_STATUS.INTERNAL_SERVER_ERROR;
      code = errorPayload?.code || ERROR_CODES.INTERNAL_ERROR;
      message = i18next.t(mapErrorToI18nKey(code)) || errorPayload?.message || error.message;

      if (Array.isArray(errorPayload?.details)) {
        details = errorPayload.details.map((d: any) => ({
          field: d.field || undefined,
          message: message || '',
          reason: d.reason || errorPayload.code || 'validation_error',
        }));
      } else if (errorPayload?.details && typeof errorPayload.details === 'object') {
        details = [
          {
            field: errorPayload.details.field || undefined,
            message: message || '',
            reason: errorPayload.code || 'validation_error',
          },
        ];
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

export const validateFromSchema = <T>(
  value: unknown,
  fieldName: string,
  schema: z.ZodSchema<T>,
): T => {
  const validation = schema.safeParse(value);

  if (!validation.success) {
    throw new FrontendError(
      i18next.t(`errors.${ERROR_CODES.VALIDATION_ERROR}`),
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      validation.error.issues.map((issue: z.core.$ZodIssue) => ({
        field: fieldName,
        message: issue?.code
          ? i18next.t(`zod_errors.${issue?.code}`)
          : i18next.t(`zod_errors.invalid_format`),
        reason: (issue?.code as FrontendReasonValue) || LOG_REASONS.UNKNOWN,
      })),
    );
  }
  return validation.data;
};

export default api;
