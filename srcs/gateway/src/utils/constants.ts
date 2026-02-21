/**
 * Constantes centralisées pour le service Gateway
 */

import {
  gatewayenv,
  AUTH_SERVICE_URL,
  UM_SERVICE_URL,
  GAME_SERVICE_URL,
  BK_SERVICE_URL,
} from '../config/env.js';

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
const isTestOrDev = ['test', 'development'].includes(gatewayenv.NODE_ENV);

export const GATEWAY_CONFIG = {
  // Routes publiques : pas de vérification JWT requise
  PUBLIC_ROUTES: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/2fa/verify',
    '/api/auth/2fa/setup/verify',
    '/api/game/sessions',
    '/api/auth/health',
    '/api/users/health',
    '/api/game/health',
    '/api/block/health',
    '/api/game/create-session',
    '/api/game/rl/reset',
    '/api/game/rl/step',
    '/api/auth/oauth/google/callback',
    '/api/auth/oauth/school42/callback',
  ],

  // Rate Limiting
  RATE_LIMIT: {
    GLOBAL: {
      max: isTestOrDev ? 10000 : gatewayenv.RATE_LIMIT_MAX,
      timeWindow: gatewayenv.RATE_LIMIT_WINDOW,
    },
  },

  // Proxy Configuration
  PROXY_TIMEOUT_MS: gatewayenv.PROXY_TIMEOUT_MS,

  // Services URLs
  SERVICES: {
    AUTH: AUTH_SERVICE_URL,
    USERS: UM_SERVICE_URL,
    GAME: GAME_SERVICE_URL,
    BLOCK: BK_SERVICE_URL,
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

  // Proxy & Gateway
  BAD_GATEWAY: 'BAD_GATEWAY',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
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
  [ERROR_CODES.GATEWAY_TIMEOUT]: 'Gateway timeout',
  [ERROR_CODES.UPSTREAM_ERROR]: 'Upstream service error',
  [ERROR_CODES.UPSTREAM_TIMEOUT]: 'Upstream request timed out',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
} as const;
