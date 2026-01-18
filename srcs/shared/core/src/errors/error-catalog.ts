import { ReasonValue } from '../logging/logging-types.js';
import { LOG_EVENTS, LOG_REASONS } from '../logging/logging.js';
import { ErrorCode, ErrorDefinition } from './error-types.js';
import { ERROR_CODES } from './error-codes.js';

// Factory pattern to centralize error generation

// 401 Unauthorized or 403 Forbidden or 400 Validation on register or 409 username conflict
const authError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode = 401,
): ErrorDefinition => ({
  code: code,
  event: LOG_EVENTS.APPLICATION.AUTH_FAIL,
  statusCode,
  reason,
  message,
});

// 500 or 501 not implemented or 502 bad gateway (generic) or 503 Unavailable or 504 gateway timeout
const serviceError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode = 500,
  event = LOG_EVENTS.APPLICATION.VALIDATION_FAIL,
): ErrorDefinition => ({
  code: code,
  event: event,
  statusCode,
  reason,
  message,
});

export const ERR_DEFS = {
  // === LOGIN ===
  LOGIN_INVALID_CREDENTIALS: authError(
    ERROR_CODES.INVALID_CREDENTIALS,
    LOG_REASONS.SECURITY.BAD_CREDENTIALS,
    'Invalid email or password',
  ),
  LOGIN_USER_NOT_FOUND: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.USER_NOT_FOUND,
    'User not found',
  ),
  LOGIN_ACCOUNT_LOCKED: authError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    LOG_REASONS.SECURITY.ACCOUNT_LOCKED,
    'Account is locked due to too many failed attempts',
    403,
  ),
  LOGIN_MISSING_FIELDS: authError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.MISSING_FIELD,
    'Email and password are required',
    400,
  ),
  LOGIN_2FA_REQUIRED: authError(
    ERROR_CODES.MFA_REQUIRED,
    LOG_REASONS.SECURITY.MFA_ON,
    '2FA is required',
    400,
  ),
  LOGIN_2FA_INVALID: authError(
    ERROR_CODES.MFA_INVALID,
    LOG_REASONS.SECURITY.MFA_INVALID,
    '2FA code is invalid',
    400,
  ),

  // === REGISTER ===
  REG_EMAIL_EXISTS: authError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Email address is already in use',
  ),
  REG_USERNAME_TAKEN: authError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Username is already taken',
  ),
  REG_WEAK_PASSWORD: authError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.WEAK_PASSWORD,
    'Password does not meet security requirements',
    400,
  ),

  // === GATEWAY ===
  TOKEN_EXPIRED: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_EXPIRED,
    'Session token has expired',
  ),
  TOKEN_INVALID: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_INVALID,
    'Invalid token signature',
  ),
  TOKEN_MISSING: authError(
    ERROR_CODES.UNAUTHORIZED,
    LOG_REASONS.SECURITY.TOKEN_MISSING,
    'Authentication header missing',
  ),

  // === ROLE ===
  FORBIDDEN: authError(
    ERROR_CODES.FORBIDDEN,
    LOG_REASONS.SECURITY.ROLE_ADMIN_REQUIRED,
    'Forbidden',
    403,
  ),

  // === SYSTEM / INTER-SERVICE ===
  SERVICE_RATE_LIMIT: serviceError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    LOG_REASONS.SECURITY.RATE_LIMIT_REACHED,
    'Too many requests. Please try again later.',
    429,
  ),
  SERVICE_BAD_GATEWAY: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.NETWORK.TIMEOUT,
    'Bad gateway',
    502,
  ),
  SERVICE_UNAVAILABLE: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    LOG_REASONS.NETWORK.UPSTREAM_ERROR,
    'Service returned an error',
    503,
  ),
  SERVICE_GENERIC: serviceError(ERROR_CODES.INTERNAL_ERROR, LOG_REASONS.UNKNOWN, 'Internal error'),

  // === RESOURCES ===
  RESOURCE_NOT_FOUND: serviceError(
    ERROR_CODES.NOT_FOUND,
    LOG_REASONS.UNKNOWN,
    'Resource not found',
    404,
  ),
  RESOURCE_ALREADY_EXIST: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Resource already exists',
    409,
  ),
  RESOURCE_LIMIT_REACHED: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.LIMIT_VIOLATION,
    'Resource limit reached',
    422,
  ),
  RESOURCE_INVALID_STATE: serviceError(
    ERROR_CODES.CONFLICT,
    LOG_REASONS.CONFLICT.STATE_VIOLATION,
    'Resource cannot be in invalid state',
    422,
  ),
  // Validation
  RESSOURCE_INVALID_TYPE: serviceError(
    ERROR_CODES.VALIDATION_ERROR,
    LOG_REASONS.VALIDATION.INVALID_FORMAT,
    'Invalid type',
    400,
  ),
} as const;
