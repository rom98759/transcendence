import { config } from 'dotenv';
import { bool, cleanEnv, port, str } from 'envalid';

config({ path: '../.env' });
config({ path: '../.env.gateway' });

// Valeurs interdites pour la sécurité
const FORBIDDEN_JWT_SECRETS = [
  'supersecretkey',
  'supersecretke1',
  'changeme',
  'secret',
  'password',
  'default',
  'test',
];

export const gatewayenv = cleanEnv(process.env, {
  // Environment
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),

  // Logging
  LOG_ENABLED: bool({ default: true }),
  LOG_LEVEL: str({
    choices: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  }),

  // JWT Configuration - CRITICAL SECURITY
  JWT_SECRET: str({
    desc: 'JWT secret key for token verification - MUST match auth service secret',
    example: 'a-long-random-cryptographically-secure-string-at-least-32-chars',
  }),

  // Gateway Configuration
  API_GATEWAY_PORT: port({ default: 3000 }),
  API_GATEWAY_NAME: str({ default: 'api-gateway' }),

  // Services Configuration
  AUTH_SERVICE_NAME: str({ default: 'auth-service' }),
  AUTH_SERVICE_PORT: port({ default: 3001 }),

  UM_SERVICE_NAME: str({ default: 'user-service' }),
  UM_SERVICE_PORT: port({ default: 3002 }),

  GAME_SERVICE_NAME: str({ default: 'game-service' }),
  GAME_SERVICE_PORT: port({ default: 3003 }),

  BK_SERVICE_NAME: str({ default: 'blockchain-service' }),
  BK_SERVICE_PORT: port({ default: 3005 }),

  // Proxy Configuration
  PROXY_TIMEOUT_MS: port({
    default: 5000,
    desc: 'Timeout for upstream requests in milliseconds',
  }),

  // Rate Limiting
  RATE_LIMIT_MAX: port({
    default: 1000,
    desc: 'Maximum requests per time window',
  }),
  RATE_LIMIT_WINDOW: str({
    default: '1 minute',
    desc: 'Time window for rate limiting (e.g., "1 minute", "15 minutes")',
  }),
});

// ⚠️ CRITICAL SECURITY VALIDATION
if (FORBIDDEN_JWT_SECRETS.includes(gatewayenv.JWT_SECRET.toLowerCase())) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET cannot be a default/common value!');
  console.error('   Current value:', gatewayenv.JWT_SECRET);
  console.error('   Forbidden values:', FORBIDDEN_JWT_SECRETS.join(', '));
  console.error('');
  console.error('   Generate a secure secret with:');
  console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.error('');
  console.error('   ⚠️  IMPORTANT: JWT_SECRET must be the SAME in auth and gateway services!');
  console.error('');
  process.exit(1);
}

if (gatewayenv.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short!');
  console.error('   Current length:', gatewayenv.JWT_SECRET.length);
  console.error('   Minimum length: 32 characters');
  console.error('');
  console.error('   Generate a secure secret with:');
  console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.error('');
  process.exit(1);
}

// Compute service URLs
export const AUTH_SERVICE_URL = `https://${gatewayenv.AUTH_SERVICE_NAME}:${gatewayenv.AUTH_SERVICE_PORT}`;
export const UM_SERVICE_URL = `https://${gatewayenv.UM_SERVICE_NAME}:${gatewayenv.UM_SERVICE_PORT}`;
export const GAME_SERVICE_URL = `https://${gatewayenv.GAME_SERVICE_NAME}:${gatewayenv.GAME_SERVICE_PORT}`;
export const BK_SERVICE_URL = `https://${gatewayenv.BK_SERVICE_NAME}:${gatewayenv.BK_SERVICE_PORT}`;
