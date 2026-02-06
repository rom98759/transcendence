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

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message: string = i18next.t(`errors.${ERROR_CODES.INTERNAL_ERROR}`);
    let code: ErrorCode = ERROR_CODES.INTERNAL_ERROR;
    let details: ErrorDetail[] | null = null;
    // console.log(error);
    if (error.response) {
      const { data } = error.response;
      const errorPayload = data.error || data;
      statusCode =
        error.response?.status ||
        (errorPayload.status as HttpStatus) ||
        HTTP_STATUS.INTERNAL_SERVER_ERROR;
      code = errorPayload?.code || ERROR_CODES.INTERNAL_ERROR;
      const translationKey = `errors.${code}`;
      message = i18next.t(translationKey) || errorPayload?.message || error.message;
      details = errorPayload?.details || null;
      if (errorPayload?.details) {
        details = errorPayload.details;
      }
      if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
        console.warn('Invalid or expired session. Redirecting...');
      }
    }
    const frontendError = new FrontendError(message, statusCode, code, details);

    return Promise.reject(frontendError);
  },
);

export default api;
