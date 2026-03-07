/**
 * Standardized errors, defining what will be displayed to end user
 */
export const ERROR_CODES = {
  // 400 Validation
  VALIDATION_MANDATORY: 'validation_mandatory',
  VALIDATION_ERROR: 'validation_error',

  // 401 Authentication
  UNAUTHORIZED: 'unauthorized',
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_TOKEN: 'invalid_token',
  INVALID_AUTH_HEADER: 'invalid_auth_header',

  // 403 Access
  FORBIDDEN: 'forbidden', // if admin role is required

  // 404 - 409 Resources
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  USERNAME_EXISTS: 'username_exists',
  EMAIL_EXISTS: 'email_exists',

  // 429 Limits
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',

  // specific
  MFA_REQUIRED: 'mfa_required',
  // 2FA flow
  INVALID_2FA_CODE: 'invalid_2fa_code',
  INVALID_CODE_FORMAT: 'invalid_code_format',
  MISSING_PARAMETERS: 'missing_parameters',
  LOGIN_SESSION_EXPIRED: 'login_session_expired',
  SETUP_SESSION_EXPIRED: 'setup_session_expired',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  TOKEN_MISSING: 'token_missing',
  TOTP_ALREADY_ENABLED: 'totp_already_enabled',
  TWO_FA_NOT_ENABLED: '2fa_not_enabled',
  USER_NOT_FOUND_2FA: 'user_not_found_2fa',
  MISSING_USER_NAME: 'missing_user_name',

  // 500 for all server errors - no details needed for end user
  INTERNAL_ERROR: 'internal_error',
} as const;
