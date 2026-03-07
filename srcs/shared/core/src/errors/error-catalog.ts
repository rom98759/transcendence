import { ReasonValue } from '../logging/logging-types.js';
import { LOG_EVENTS, LOG_REASONS } from '../logging/logging.js';
import { ErrorCode, ErrorDefinition, HttpStatus } from './error-types.js';
import { HTTP_STATUS } from '../constants/index.js';
import { ERROR_CODES } from './error-codes.js';

// Factory pattern to centralize error generation

// 401 Unauthorized or 403 Forbidden or 400 Validation on register or 409 username conflict
const authError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode: HttpStatus,
): ErrorDefinition => ({
  code: code,
  event: LOG_EVENTS.APPLICATION.AUTH_FAIL,
  statusCode: statusCode ?? HTTP_STATUS.UNAUTHORIZED,
  reason,
  message,
});

// 500 or 501 not implemented or 502 bad gateway (generic) or 503 Unavailable or 504 gateway timeout
const serviceError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode: HttpStatus,
  event = LOG_EVENTS.APPLICATION.VALIDATION_FAIL,
): ErrorDefinition => ({
  code: code,
  event: event,
  statusCode: statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR,
  reason,
  message,
});

export const ERR_DEFS = {
  // === LOGIN ===
  LOGIN_INVALID_CREDENTIALS: authError(
    ERROR_CODES.INVALID_CREDENTIALS,
    LOG_REASONS.SECURITY.BAD_CREDENTIALS,
    'Invalid email or password',
    HTTP_STATUS.UNAUTHORIZED,
  ),
  LOGIN_USER_NOT_FOUND: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.USER_NOT_FOUND,
    'User not found',
    HTTP_STATUS.UNAUTHORIZED,
  ),
  LOGIN_ACCOUNT_LOCKED: authError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    LOG_REASONS.SECURITY.ACCOUNT_LOCKED,
    'Account is locked due to too many failed attempts',
    HTTP_STATUS.FORBIDDEN,
  ),
  LOGIN_MISSING_FIELDS: authError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.MISSING_FIELD,
    'Email and password are required',
    HTTP_STATUS.BAD_REQUEST,
  ),
  LOGIN_2FA_REQUIRED: authError(
    ERROR_CODES.MFA_REQUIRED,
    LOG_REASONS.SECURITY.MFA_ON,
    '2FA is required',
    HTTP_STATUS.BAD_REQUEST,
  ),
  LOGIN_2FA_INVALID: authError(
    ERROR_CODES.INVALID_2FA_CODE,
    LOG_REASONS.SECURITY.MFA_INVALID,
    '2FA code is invalid',
    HTTP_STATUS.BAD_REQUEST,
  ),

  // === REGISTER ===
  REG_EMAIL_EXISTS: authError(
    ERROR_CODES.EMAIL_EXISTS,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Email address is already in use',
    HTTP_STATUS.CONFLICT,
  ),
  REG_USERNAME_TAKEN: authError(
    ERROR_CODES.USERNAME_EXISTS,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Username is already taken',
    HTTP_STATUS.CONFLICT,
  ),
  REG_WEAK_PASSWORD: authError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.WEAK_PASSWORD,
    'Password does not meet security requirements',
    HTTP_STATUS.BAD_REQUEST,
  ),

  // === GATEWAY ===
  TOKEN_EXPIRED: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_EXPIRED,
    'Session token has expired',
    HTTP_STATUS.UNAUTHORIZED,
  ),
  TOKEN_INVALID: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_INVALID,
    'Invalid token signature',
    HTTP_STATUS.UNAUTHORIZED,
  ),
  TOKEN_MISSING: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_MISSING,
    'Authentication header missing',
    HTTP_STATUS.UNAUTHORIZED,
  ),

  // === AUTH INFO ===
  AUTH_HEADER_INVALID: authError(
    ERROR_CODES.INVALID_AUTH_HEADER,
    LOG_REASONS.SECURITY.HEADER_INVALID,
    'Invalid authentication header',
    HTTP_STATUS.UNAUTHORIZED,
  ),

  // === ROLE ===
  FORBIDDEN: authError(
    ERROR_CODES.FORBIDDEN,
    LOG_REASONS.SECURITY.ROLE_ADMIN_REQUIRED,
    'Forbidden',
    HTTP_STATUS.FORBIDDEN,
  ),

  // === SYSTEM / INTER-SERVICE ===
  SERVICE_RATE_LIMIT: serviceError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    LOG_REASONS.SECURITY.RATE_LIMIT_REACHED,
    'Too many requests. Please try again later.',
    HTTP_STATUS.TOO_MANY_REQUESTS,
  ),
  SERVICE_BAD_GATEWAY: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.NETWORK.TIMEOUT,
    'Bad gateway',
    HTTP_STATUS.BAD_GATEWAY,
  ),
  SERVICE_UNAVAILABLE: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.NETWORK.UPSTREAM_ERROR,
    'Service returned an error',
    HTTP_STATUS.SERVICE_UNAVAILABLE,
  ),
  SERVICE_GENERIC: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.UNKNOWN,
    'Internal error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ),
  RESOURCE_CONFLICT: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Resource conflict',
    HTTP_STATUS.CONFLICT,
  ),

  // === RESOURCES ===
  RESOURCE_NOT_FOUND: serviceError(
    ERROR_CODES.NOT_FOUND,
    LOG_REASONS.UNKNOWN,
    'Resource not found',
    HTTP_STATUS.NOT_FOUND,
  ),
  RESOURCE_ALREADY_EXIST: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Resource already exists',
    HTTP_STATUS.CONFLICT,
  ),
  RESOURCE_LIMIT_REACHED: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.LIMIT_VIOLATION,
    'Resource limit reached',
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
  ),
  RESOURCE_INVALID_STATE: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.STATE_VIOLATION,
    'Resource cannot be in invalid state',
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
  ),
  // Validation
  RESSOURCE_INVALID_TYPE: serviceError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.INVALID_FORMAT,
    'Invalid format',
    HTTP_STATUS.BAD_REQUEST,
  ),
  // Game service
  USER_NOTFOUND_ERRORS: serviceError(
    ERROR_CODES.NOT_FOUND,
    LOG_REASONS.DATABASE.DB_SELECT,
    `User doesn't exist`,
    HTTP_STATUS.NOT_FOUND,
  ),
  DB_SELECT_ERROR: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.DATABASE.DB_SELECT,
    `Database select critical Error`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ),
  DB_INSERT_ERROR: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.DATABASE.DB_INSERT,
    `Database insert critical Error`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ),
  DB_UPDATE_ERROR: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.DATABASE.DB_UPDATE,
    `Database update critical Error`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ),
  DB_DELETE_ERROR: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.DATABASE.DB_DELETE,
    `Database delete critical Error`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ),
} as const;
