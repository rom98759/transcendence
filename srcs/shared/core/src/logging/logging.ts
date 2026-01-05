/**
 * 4 levels of events
 * LIFECYCLE of the container when everything goes smooth = INFO
 * DEPENDENCY when other services or network have issues = WARN
 * APPLICATION when app itself has anticipated issues = WARN
 * CRITICAL for unplanned issues that are somehow caught by framework = ERROR (BUG) or not caught = FATAL (PANIC)
 * NB : service-specific events are prefixed with AUTH, UM, etc
 * NB : except validation, application level does not need events that can be inferred from caught error status (401, 403, etc)
 */
export const LOG_EVENTS = {
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
    // UM_PROFILE_CREATE: 'lc_um_profile_create',
    // UM_PROFILE_GET: 'lc_um_profile_get',
    // UM_FRIEND_CREATE: 'lc_um_friend_create',
    // UM_FRIEND_REMOVE: 'lc_um_friend_remove',
    // UM_FRIEND_GET: 'lc_um_friend_get',
    // UM_FRIEND_UPDATE: 'lc_um_friend_update',

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
    DATA_FAIL: 'data_failure',
    // service specific errors
    AUTH_FAIL: 'app_auth_failed',
    VALIDATION_FAIL: 'app_validation_failed',
  },

  CRITICAL: {
    BUG: 'crit_logic_bug', // 500 Unhandled exception
    PANIC: 'crit_panic', // uncaught by Fastify - process.on('uncaughtException', (err) => {})
  },
} as const;

export const LOG_RESOURCES = {
  PROFILE: 'profile',
  FRIEND: 'friend',
  USER: 'user',
} as const;

export const LOG_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

/**
 * technical reasons behind log events
 * NB : no need to be too specific - some reasons can be inferred from meta fields (ex : username conflicts)
 */
export const LOG_REASONS = {
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
    ROLE_ADMIN_REQUIRED: 'role_admin_required',
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
