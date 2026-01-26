import { ErrorCode, ErrorDefinition, ReasonValue } from '../types/errors.js';
import { ERROR_CODES, EVENTS, REASONS } from './constants.js';

// Factory pattern to centralize error generation

// 401 Unauthorized or 403 Forbidden or 400 Validation on register or 409 username conflict
const authError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode = 401,
): ErrorDefinition => ({
  code: code,
  event: EVENTS.APPLICATION.AUTH_FAIL,
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
  event = EVENTS.APPLICATION.VALIDATION_FAIL,
): ErrorDefinition => ({
  code: code,
  event: event,
  statusCode,
  reason,
  message,
});

const unhandledError = (
  code: ErrorCode,
  reason: ReasonValue,
  message: string,
  statusCode = 503,
  event = EVENTS.CRITICAL.BUG,
): ErrorDefinition => ({
  code: code,
  event: event,
  statusCode,
  reason,
  message,
});

export const APP_ERRORS = {
  // === LOGIN ===
  LOGIN_INVALID_CREDENTIALS: authError(
    ERROR_CODES.INVALID_CREDENTIALS,
    REASONS.SECURITY.BAD_CREDENTIALS,
    'Invalid email or password',
  ),
  LOGIN_USER_NOT_FOUND: authError(
    ERROR_CODES.UNAUTHORIZED,
    REASONS.SECURITY.USER_NOT_FOUND,
    'User not found',
  ),
  LOGIN_ACCOUNT_LOCKED: authError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    REASONS.SECURITY.ACCOUNT_LOCKED,
    'Account is locked due to too many failed attempts',
    403,
  ),
  LOGIN_MISSING_FIELDS: authError(
    ERROR_CODES.VALIDATION_ERROR,
    REASONS.VALIDATION.MISSING_FIELD,
    'Email and password are required',
    400,
  ),
  LOGIN_2FA_REQUIRED: authError(
    ERROR_CODES.MFA_REQUIRED,
    REASONS.SECURITY.MFA_ON,
    '2FA is required',
    400,
  ),
  LOGIN_2FA_INVALID: authError(
    ERROR_CODES.MFA_INVALID,
    REASONS.SECURITY.MFA_INVALID,
    '2FA code is invalid',
    400,
  ),

  // === REGISTER ===
  REG_EMAIL_EXISTS: authError(
    ERROR_CODES.CONFLICT,
    REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Email address is already in use',
    409,
  ),
  REG_USERNAME_TAKEN: authError(
    ERROR_CODES.CONFLICT,
    REASONS.CONFLICT.UNIQUE_VIOLATION,
    'Username is already taken',
    409,
  ),
  REG_WEAK_PASSWORD: authError(
    ERROR_CODES.VALIDATION_ERROR,
    REASONS.VALIDATION.WEAK_PASSWORD,
    'Password does not meet security requirements',
    400,
  ),

  // === GATEWAY ===
  TOKEN_EXPIRED: authError(
    ERROR_CODES.UNAUTHORIZED,
    REASONS.SECURITY.TOKEN_EXPIRED,
    'Session token has expired',
  ),
  TOKEN_INVALID: authError(
    ERROR_CODES.UNAUTHORIZED,
    REASONS.SECURITY.TOKEN_INVALID,
    'Invalid token signature',
  ),
  TOKEN_MISSING: authError(
    ERROR_CODES.UNAUTHORIZED,
    REASONS.SECURITY.TOKEN_MISSING,
    'Authentication header missing',
  ),

  // === SYSTEM / INTER-SERVICE ===
  SERVICE_RATE_LIMIT: serviceError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    REASONS.SECURITY.RATE_LIMIT_REACHED,
    'Too many requests. Please try again later.',
    429,
  ),
  SERVICE_BAD_GATEWAY: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    REASONS.NETWORK.TIMEOUT,
    'Bad gateway',
    502,
  ),
  SERVICE_UNAVAILABLE: serviceError(
    ERROR_CODES.INTERNAL_ERROR,
    REASONS.NETWORK.UPSTREAM_ERROR,
    'Service returned an error',
    503,
  ),
  SERVICE_GENERIC: serviceError(ERROR_CODES.INTERNAL_ERROR, REASONS.UNKNOWN, 'Internal error'),
} as const;
