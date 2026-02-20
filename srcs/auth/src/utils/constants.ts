/**
 * Constantes centralisées pour le service d'authentification
 * Utiliser ces valeurs dans tout le code pour maintenir la cohérence
 */

import { authenv, UM_SERVICE_URL } from '../config/env.js';

export { UM_SERVICE_URL };

/**
 * Convertit une chaîne de temps (ex: "1 minute", "5 minutes") en secondes
 */
export function parseTimeWindowToSeconds(timeWindow: string): number {
  const match = timeWindow.match(/(\d+)\s*(second|minute|hour|day)s?/i);
  if (!match) return 60; // Fallback: 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
  };

  return value * (multipliers[unit] || 60);
}

// Adapter les limites selon l'environnement
const isTestOrDev = ['test', 'development'].includes(authenv.NODE_ENV);

export const AUTH_CONFIG = {
  // JWT Configuration
  JWT_EXPIRATION: '1h',
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
  USERNAME_MAX_LENGTH: 20,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/ as RegExp,

  // Email Requirements
  EMAIL_MAX_LENGTH: 100,

  // TOTP Configuration
  TOTP_WINDOW: 1, // ±30 secondes
  TOTP_STEP: 30, // Période de rotation (30 secondes standard)
  TOTP_DIGITS: 6, // Code à 6 chiffres
  TOTP_ISSUER: authenv.APP_NAME,
  TOTP_SETUP_EXPIRATION_SECONDS: 120, // Expiration du secret temporaire en secondes

  // Maintenance
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes en millisecondes
  ONLINE_STATUS_CLEANUP_INTERVAL_MS: 60 * 1000, // 60 secondes en millisecondes

  // Cookie Configuration
  COOKIE_MAX_AGE_SECONDS: 60 * 60, // 1 heure (sync avec JWT)
  COOKIE_2FA_MAX_AGE_SECONDS: 120, // 2 minutes

  // Rate Limiting - Limites adaptées selon l'environnement (dev/test vs production)
  RATE_LIMIT: {
    GLOBAL: {
      max: isTestOrDev ? 10000 : 1000,
      timeWindow: '1 minute',
    },
    LOGIN: {
      max: isTestOrDev ? 1000 : 5,
      timeWindow: '5 minutes',
    },
    REGISTER: {
      max: isTestOrDev ? 1000 : 5,
      timeWindow: '5 minutes',
    },
    TWO_FA_VERIFY: {
      max: isTestOrDev ? 1000 : 5,
      timeWindow: '5 minutes',
    },
    TWO_FA_SETUP: {
      max: isTestOrDev ? 1000 : 5,
      timeWindow: '5 minutes',
    },
    IS_USER_ONLINE: {
      max: isTestOrDev ? 1000 : 2000,
      timeWindow: '1 minute',
    },
    DELETE_USER: {
      max: isTestOrDev ? 100 : 5,
      timeWindow: '1 minute',
    },
  },

  // OAuth 2.0 Configuration
  OAUTH: {
    // Timeouts et limites
    TOKEN_EXCHANGE_TIMEOUT_MS: 10000, // 10 secondes
    USER_PROFILE_TIMEOUT_MS: 8000, // 8 secondes

    // Rate limiting OAuth
    CALLBACK_RATE_LIMIT: {
      max: isTestOrDev ? 1000 : 10,
      timeWindow: '5 minutes',
    },

    // Providers configuration
    GOOGLE: {
      AUTHORIZATION_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
      TOKEN_URL: 'https://oauth2.googleapis.com/token',
      USER_INFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
      SCOPES: ['openid', 'profile', 'email'],
    },

    SCHOOL42: {
      AUTHORIZATION_URL: 'https://api.intra.42.fr/oauth/authorize',
      TOKEN_URL: 'https://api.intra.42.fr/oauth/token',
      USER_INFO_URL: 'https://api.intra.42.fr/v2/me',
      SCOPES: ['public'],
    },
  },
} as const;

/**
 * Rôles utilisateur pour RBAC (Role-Based Access Control)
 * USER: utilisateur standard
 * MODERATOR: peut consulter la liste des utilisateurs et désactiver la 2FA
 * ADMIN: contrôle total (view, update, delete users, disable 2FA)
 */
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * Codes HTTP standardisés pour les réponses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  // Auth errors
  UNAUTHORIZED: 'Unauthorized - Authentication required',
  FORBIDDEN: 'Forbidden - Admin role required',
  INVALID_CREDENTIALS: 'Invalid credentials',

  // User errors
  USER_NOT_FOUND: 'User not found',
  INVALID_USER_ID: 'Invalid user ID',

  // Role errors
  INVALID_ROLE: 'Role must be either "user" or "admin" or "moderator"',

  // Field errors
  MISSING_FIELDS: 'Username, email, and role are required',
  INVALID_DATA: 'Données invalides',

  // Conflict errors
  EMAIL_EXISTS: 'Email is already taken',
  USERNAME_EXISTS: 'Username is already taken',

  // 2FA errors
  TWO_FA_NOT_ENABLED: '2FA is not enabled for this user',

  // Deletion errors
  SELF_DELETION_FORBIDDEN: 'Cannot delete your own account',

  // Generic
  INTERNAL_SERVER_ERROR: 'Internal server error',
  FAILED_HEARTBEAT: 'Failed to record heartbeat',
  FAILED_FETCH_USER: 'Failed to fetch user information',
  FAILED_CHECK_USER_ONLINE: 'Failed to check user online status',
} as const;

/**
 * Codes d'erreur pour les réponses API
 */
export const ERROR_RESPONSE_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_USER_ID: 'INVALID_USER_ID',
  INVALID_ROLE: 'INVALID_ROLE',
  MISSING_FIELDS: 'MISSING_FIELDS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  TWO_FA_NOT_ENABLED: '2FA_NOT_ENABLED',
  SELF_DELETION_FORBIDDEN: 'SELF_DELETION_FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  HEARTBEAT_ERROR: 'HEARTBEAT_ERROR',
  FETCH_USER_ERROR: 'FETCH_USER_ERROR',
  CHECK_USER_ONLINE_ERROR: 'CHECK_USER_ONLINE_ERROR',
} as const;

// // Constantes supplémentaires pour OAuth
// export const DATA_ERROR = {
//   DUPLICATE: 'duplicate_entry',
//   NOT_FOUND: 'not_found',
//   USER_NOT_FOUND: 'user_not_found',
//   USER_EXISTS: 'user_exists',
//   EMAIL_EXISTS: 'email_exists',
//   ALREADY_EXISTS: 'already_exists',
//   CONNECTION_FAIL: 'connection_fail',
//   CONSTRAINT_VIOLATION: 'constraint_violation',
//   INTERNAL_ERROR: 'internal_error',
// } as const;

// export const VALIDATION_REASONS = {
//   MISSING_FIELD: 'missing_field',
//   WEAK_PASSWORD: 'weak_password',
//   INVALID_FORMAT: 'invalid_format',
//   INVALID_INPUT: 'invalid_input',
// } as const;

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
  'daemon',
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
  'refresh_token',
] as const;

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  ...SENSITIVE_FIELDS.map((field) => `*.${field}`),
] as const;

/**
 * 4 levels of events
 * LIFECYCLE of the container when everything goes smooth = INFO
 * DEPENDENCY when other services or network have issues = WARN
 * APPLICATION when app itself has anticipated issues = WARN
 * CRITICAL for unplanned issues that are somehow caught by framework = ERROR (BUG) or not caught = FATAL (PANIC)
 * NB : service-specific events are prefixed with AUTH, UM, etc
 * NB : except validation, application level does not need events that can be inferred from caught error status (401, 403, etc)
 */
export const EVENTS = {
  LIFECYCLE: {
    UP: 'lc_service_up',
    DOWN: 'lc_service_down',
    // infra
    REDIS_CONNECT: 'lc_redis_connected',
    REDIS_DISCONNECT: 'lc_redis_disconnected',
    DB_CONNECT: 'lc_db_connected',
    // auth
    AUTH_REGISTER_SUCCESS: 'lc_auth_registered',
    AUTH_LOGIN_SUCCESS: 'lc_auth_logged_in',
    AUTH_TOKEN_SUCCESS: 'lc_auth_token_valid', // token check ok
    // user management
    UM_FRIEND_ADD: 'lc_um_friend_added',
    UM_FRIEND_REMOVE: 'lc_um_friend_removed',
    // game
    GAME_MATCH_START: 'lc_game_match_started',
    GAME_MATCH_END: 'lc_game_match_ended',
    GAME_MATCH_ABORT: 'lc_game_match_aborted',
    // oauth
    OAUTH_LOGIN_SUCCESS: 'lc_oauth_logged_in',
    OAUTH_REGISTER_SUCCESS: 'lc_oauth_registered',
  },

  DEPENDENCY: {
    SLOW: 'dep_slow_response',
    FAIL: 'dep_failure', // 500 received
    UNAVAILABLE: 'dep_unavailable', // Connection refused
    ROLLBACK: 'dep_rollback', // when transaction fails : ensure consistency between services
  },

  APPLICATION: {
    // service specific errors
    AUTH_FAIL: 'app_auth_failed',
    VALIDATION_FAIL: 'app_validation_failed',
    // oauth specific events
    OAUTH_EXCHANGE_START: 'app_oauth_exchange_start',
    OAUTH_EXCHANGE_SUCCESS: 'app_oauth_exchange_success',
    OAUTH_EXCHANGE_FAILED: 'app_oauth_exchange_failed',
    OAUTH_USER_CREATED: 'app_oauth_user_created',
    OAUTH_USER_LINKED: 'app_oauth_user_linked',
  },

  CRITICAL: {
    BUG: 'crit_logic_bug', // 500 Unhandled exception
    PANIC: 'crit_panic', // uncaught by Fastify - process.on('uncaughtException', (err) => {})
  },
};

/**
 * technical reasons behind log events
 * NB : no need to be too specific - some reasons can be inferred from meta fields (ex : username conflicts)
 */
export const REASONS = {
  SECURITY: {
    BAD_CREDENTIALS: 'bad_credentials',
    USER_NOT_FOUND: 'user_not_found',
    ACCOUNT_LOCKED: 'account_locked',
    TOKEN_MISSING: 'token_missing',
    TOKEN_INVALID: 'token_invalid',
    TOKEN_EXPIRED: 'token_expired',
    MFA_ON: 'mfa_enabled',
    MFA_OFF: 'mfa_disabled',
    MFA_INVALID: 'mfa_code_invalid',
    MFA_TOTP_SECRET: 'mfa_totp_secret',
    RATE_LIMIT_REACHED: 'rate_limit_reached',
  },
  VALIDATION: {
    MISSING_FIELD: 'missing_field',
    WEAK_PASSWORD: 'weak_password',
    INVALID_FORMAT: 'invalid_format',
  },
  CONFLICT: {
    UNIQUE_VIOLATION: 'conflict_unique_constraint',
    STATE_VIOLATION: 'conflict_invalid_state',
    LIMIT_VIOLATION: 'conflict_limit_reached',
  },
  NETWORK: {
    TIMEOUT: 'network_timeout',
    UNREACHABLE: 'network_unreachable',
    UPSTREAM_ERROR: 'network_upstream_service_error', // 4xx or 5xx from service
  },
  INFRA: {
    DB_INIT_ERROR: 'infra_db_init_error',
    DB_CLOSE_ERROR: 'infra_db_close_error',
    DB_QUERY_FAIL: 'infra_db_query', // other than uniqueness violation
    REDIS_ERROR: 'infra_redis_error',
  },
  UNKNOWN: 'unknown_reason',
} as const;

/**
 * Standardized errors, defining what will be displayed to end user
 */
// export const ERROR_CODES = {
//   // 400 Validation
//   VALIDATION_ERROR: 'VALIDATION_ERROR',

//   // 401 Authentication
//   UNAUTHORIZED: 'UNAUTHORIZED',
//   INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

//   // 403 Access
//   FORBIDDEN: 'FORBIDDEN', // if admin role is required

//   // 404 - 409 Resources
//   NOT_FOUND: 'NOT_FOUND',
//   CONFLICT: 'CONFLICT',

//   // 429 Limits
//   RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

//   // specific
//   MFA_REQUIRED: 'MFA_REQUIRED',
//   MFA_INVALID: 'INVALID_MFA_CODE',

//   // 500 for all server errors - no details needed for end user
//   INTERNAL_ERROR: 'INTERNAL_ERROR',
// } as const;

/**
 * Error codes for data layer only
 */
export const DATA_ERROR = {
  DUPLICATE: 'duplicate_entry',
  NOT_FOUND: 'not_found',
  CONNECTION_FAIL: 'connection_fail',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  INTERNAL_ERROR: 'internal_error',
  ALREADY_EXISTS: 'already_exists',
} as const;

/**
 * Standard error messages
 * NB : some default messages are not user-friendly (CONFLICT, ...)
 * -> we should check error metadata in frontend to display a more transparent message, eg 'username is taken'
 */
// export const ERROR_MESSAGES = {
//   [ERROR_CODES.VALIDATION_ERROR]: 'Invalid input data',
//   [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
//   [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',
//   [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
//   [ERROR_CODES.NOT_FOUND]: 'Resource not found',
//   [ERROR_CODES.CONFLICT]: 'Conflicting resource',
//   [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
//   [ERROR_CODES.MFA_REQUIRED]: 'Two-factors authentication is required',
//   [ERROR_CODES.MFA_INVALID]: 'Invalid 2FA code is invalid',
//   [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
// } as const
