/**
 * Constantes centralisées pour le service d'authentification
 * Utiliser ces valeurs dans tout le code pour maintenir la cohérence
 */

export const UM_SERVICE_NAME = process.env['UM_SERVICE_NAME'] || 'user-service';
export const UM_SERVICE_PORT = process.env['UM_SERVICE_PORT'] || '3002';
export const UM_SERVICE_URL = `http://${UM_SERVICE_NAME}:${UM_SERVICE_PORT}`;

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
  TOTP_ISSUER: process.env.APP_NAME || 'Transcendence',
  TOTP_SETUP_EXPIRATION_SECONDS: 120, // Expiration du secret temporaire en secondes

  // Maintenance
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes en millisecondes

  // Cookie Configuration
  COOKIE_MAX_AGE_SECONDS: 60 * 60, // 1 heure (sync avec JWT)
  COOKIE_2FA_MAX_AGE_SECONDS: 120, // 2 minutes

  // Rate Limiting (utilisé par @fastify/rate-limit)
  RATE_LIMIT: {
    // Tests enchaînent de nombreuses requêtes : on relève les seuils pour éviter des 429 involontaires
    GLOBAL: { max: 1000, timeWindow: '15 minutes' },
    LOGIN: { max: 1000, timeWindow: '15 minutes' },
    REGISTER: { max: 1000, timeWindow: '15 minutes' },
    TWO_FA_VERIFY: { max: 1000, timeWindow: '15 minutes' },
    TWO_FA_SETUP: { max: 1000, timeWindow: '15 minutes' },
  },
} as const;

/**
 * Rôles utilisateur pour RBAC (Role-Based Access Control)
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
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
export const ERROR_CODES = {
  // 400 Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 401 Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 403 Access
  FORBIDDEN: 'FORBIDDEN', // if admin role is required

  // 404 - 409 Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // 429 Limits
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // specific
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'INVALID_MFA_CODE',

  // 500 for all server errors - no details needed for end user
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Error codes for data layer only
 */
export const DATA_ERROR = {
  DUPLICATE: 'duplicate_entry',
  NOT_FOUND: 'not_found',
  CONNECTION_FAIL: 'connection_fail',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  INTERNAL_ERROR: 'internal_error',
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
