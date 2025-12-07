/**
 * Constantes centralisées pour le service d'authentification
 * Utiliser ces valeurs dans tout le code pour maintenir la cohérence
 */

export const AUTH_CONFIG = {
  // JWT Configuration
  JWT_EXPIRATION: '1h',
  JWT_ALGORITHM: 'HS256' as const,

  // Login Token Configuration (2FA)
  LOGIN_TOKEN_EXPIRATION_SECONDS: 120, // 2 minutes
  MAX_LOGIN_TOKEN_ATTEMPTS: 3,

  // Bcrypt Configuration
  BCRYPT_ROUNDS: 10,

  // Password Requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,

  // Username Requirements
  USERNAME_MIN_LENGTH: 4,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/ as RegExp,

  // Email Requirements
  EMAIL_MAX_LENGTH: 100,

  // TOTP Configuration
  TOTP_WINDOW: 1, // ±30 secondes
  TOTP_ISSUER: process.env.APP_NAME || 'Transcendence',

  // Cookie Configuration
  COOKIE_MAX_AGE_SECONDS: 60 * 60, // 1 heure (sync avec JWT)
  COOKIE_2FA_MAX_AGE_SECONDS: 120, // 2 minutes

  // Rate Limiting (utilisé par @fastify/rate-limit)
  RATE_LIMIT: {
    GLOBAL: { max: 100, timeWindow: '15 minutes' },
    LOGIN: { max: 5, timeWindow: '5 minutes' },
    REGISTER: { max: 3, timeWindow: '15 minutes' },
    TWO_FA_VERIFY: { max: 3, timeWindow: '2 minutes' },
    TWO_FA_SETUP: { max: 5, timeWindow: '15 minutes' },
  }
} as const;

/**
 * Rôles utilisateur pour RBAC (Role-Based Access Control)
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

/**
 * Noms d'utilisateur réservés qui ne peuvent pas être enregistrés
 */
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'root',
  'system',
  'administrator',
  'superuser',
  'guest',
  'support',
  'service',
  'daemon'
];

/**
 * Champs sensibles à ne jamais logger en clair
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'totp_secret',
  'jwt',
  'authorization',
  'cookie',
  'loginToken',
  '2fa_login_token',
  '2fa_setup_token',
  'access_token',
  'refresh_token'
] as const;

/**
 * Codes d'erreur standardisés
 */
export const ERROR_CODES = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_IDENTIFIER: 'MISSING_IDENTIFIER',
  MISSING_PARAMETERS: 'MISSING_PARAMETERS',

  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_MISSING: 'TOKEN_MISSING',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // User Management
  USER_EXISTS: 'USER_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // 2FA
  TWO_FA_ALREADY_ENABLED: '2FA_ALREADY_ENABLED',
  TWO_FA_NOT_ENABLED: '2FA_NOT_ENABLED',
  INVALID_2FA_CODE: 'INVALID_2FA_CODE',
  INVALID_LOGIN_TOKEN: 'INVALID_LOGIN_TOKEN',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

  // Database
  DB_ERROR: 'DB_ERROR',
  DB_FIND_USER_BY_USERNAME_ERROR: 'DB_FIND_USER_BY_USERNAME_ERROR',
  DB_FIND_USER_BY_EMAIL_ERROR: 'DB_FIND_USER_BY_EMAIL_ERROR',
  DB_FIND_USER_BY_IDENTIFIER_ERROR: 'DB_FIND_USER_BY_IDENTIFIER_ERROR',
  DB_FIND_USER_BY_ID_ERROR: 'DB_FIND_USER_BY_ID_ERROR',
  DB_CREATE_USER_ERROR: 'DB_CREATE_USER_ERROR',
  DB_CHECK_2FA_ERROR: 'DB_CHECK_2FA_ERROR',
  DB_GET_TOTP_SECRET_ERROR: 'DB_GET_TOTP_SECRET_ERROR',
  DB_ENABLE_2FA_ERROR: 'DB_ENABLE_2FA_ERROR',
  DB_DISABLE_2FA_ERROR: 'DB_DISABLE_2FA_ERROR',
  DB_CREATE_LOGIN_TOKEN_ERROR: 'DB_CREATE_LOGIN_TOKEN_ERROR',
  DB_VALIDATE_LOGIN_TOKEN_ERROR: 'DB_VALIDATE_LOGIN_TOKEN_ERROR',
  DB_DELETE_LOGIN_TOKEN_ERROR: 'DB_DELETE_LOGIN_TOKEN_ERROR',
  DB_CLOSE_ERROR: 'DB_CLOSE_ERROR',
  DB_LIST_USERS_ERROR: 'DB_LIST_USERS_ERROR',

  // Access Control
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  // QR Code
  QR_CODE_GENERATION_ERROR: 'QR_CODE_GENERATION_ERROR',
} as const;

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Invalid input data',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ERROR_CODES.TOKEN_MISSING]: 'Authentication token is missing',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid or expired token',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.USER_EXISTS]: 'User already exists',
  [ERROR_CODES.EMAIL_EXISTS]: 'Email already in use',
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.TWO_FA_ALREADY_ENABLED]: '2FA is already enabled',
  [ERROR_CODES.TWO_FA_NOT_ENABLED]: '2FA is not enabled',
  [ERROR_CODES.INVALID_2FA_CODE]: 'Invalid 2FA code',
  [ERROR_CODES.INVALID_LOGIN_TOKEN]: 'Invalid or expired login token',
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please try again later.',
  [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.ROUTE_NOT_FOUND]: 'Route not found',
} as const;
