/**
 * Standardized errors, defining what will be displayed to end user
 */
export const ERROR_CODES = {
  // 400 Validation
  VALIDATION_ERROR: 'validation_error',

  // 401 Authentication
  UNAUTHORIZED: 'unauthorized',
  INVALID_CREDENTIALS: 'invalid_credentials',

  // 403 Access
  FORBIDDEN: 'forbidden', // if admin role is required

  // 404 - 409 Resources
  NOT_FOUND: 'not-found',
  CONFLICT: 'conflict',

  // 429 Limits
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',

  // specific
  MFA_REQUIRED: 'mfa_required',
  MFA_INVALID: 'invalid_mfa_code',

  // 500 for all server errors - no details needed for end user
  INTERNAL_ERROR: 'internal_error',
} as const;
