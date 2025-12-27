/**
 * Constantes centralisées pour le service Gateway
 */

export const GATEWAY_CONFIG = {
  // Routes publiques : pas de vérification JWT requise
  PUBLIC_ROUTES: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/2fa/verify',
    '/api/auth/2fa/setup/verify',
    '/api/game/sessions',
    '/api/auth/health',
    '/api/game/health',
    '/api/block/health',
  ],

  // Rate Limiting
  RATE_LIMIT: {
    GLOBAL: { max: 400, timeWindow: '1 minute' }, // Plus permissif car c'est un gateway (agrège plusieurs services)
  },

  // Proxy Configuration
  PROXY_TIMEOUT_MS: 5000, // 5 secondes

  // Services URLs
  SERVICES: {
    AUTH: 'http://auth-service:3001',
    GAME: 'http://game-service:3003',
    BLOCK: 'http://blockchain-service:3002',
  },
} as const;

/**
 * Codes d'erreur standardisés pour la gateway
 */
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Proxy
  BAD_GATEWAY: 'BAD_GATEWAY',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.TOKEN_MISSING]: 'Authentication token is missing',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid or malformed token',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Token has expired',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ERROR_CODES.BAD_GATEWAY]: 'Bad gateway',
  [ERROR_CODES.UPSTREAM_ERROR]: 'Upstream service error',
  [ERROR_CODES.UPSTREAM_TIMEOUT]: 'Upstream request timed out',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
} as const;
