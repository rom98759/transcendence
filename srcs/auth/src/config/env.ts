import { config } from 'dotenv';
import { bool, cleanEnv, email, port, str } from 'envalid';

config({ path: '../.env' });
config({ path: '../.env.auth' });

// Valeurs interdites pour la sécurité
const FORBIDDEN_JWT_SECRETS = ['supersecretkey', ''];

export const authenv = cleanEnv(process.env, {
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
    desc: 'JWT secret key for token signing - MUST be cryptographically secure',
    example: 'a-long-random-cryptographically-secure-string-at-least-32-chars',
  }),

  // Service Configuration
  AUTH_SERVICE_PORT: port({ default: 3001 }),
  AUTH_SERVICE_NAME: str({ default: 'auth-service' }),
  AUTH_DB_PATH: str({
    default: '/data/auth.db',
    desc: 'Path to SQLite database file',
  }),

  // Redis Configuration
  REDIS_HOST: str({ default: 'redis-broker' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  // User Management Service
  UM_SERVICE_NAME: str({ default: 'user-service' }),
  UM_SERVICE_PORT: port({ default: 3002 }),

  // Admin User Configuration
  ADMIN_USERNAME: str({
    default: 'admin',
    desc: 'Default admin username',
  }),
  ADMIN_EMAIL: email({
    default: 'admin@transcendence.local',
    desc: 'Default admin email',
  }),
  ADMIN_PASSWORD: str({
    default: 'Admin123!',
    desc: 'Default admin password - CHANGE IN PRODUCTION',
  }),

  // Invite User Configuration
  INVITE_USERNAME: str({
    default: 'invite',
    desc: 'Default invite username',
  }),
  INVITE_EMAIL: email({
    default: 'invite@transcendence.local',
    desc: 'Default invite email',
  }),
  INVITE_PASSWORD: str({
    default: 'Invite123!',
    desc: 'Default invite password - CHANGE IN PRODUCTION',
  }),

  // Application Configuration
  APP_NAME: str({
    default: 'Transcendence',
    desc: 'Application name for TOTP issuer',
  }),

  // OAuth 2.0 Configuration - Google
  GOOGLE_CLIENT_ID: str({
    desc: 'Google OAuth 2.0 Client ID',
    example: '123456789-abcdef.apps.googleusercontent.com',
  }),
  GOOGLE_CLIENT_SECRET: str({
    desc: 'Google OAuth 2.0 Client Secret - KEEP SECURE',
    example: 'GOCSPX-your_client_secret_here',
  }),

  // OAuth 2.0 Configuration - 42 School
  SCHOOL42_CLIENT_ID: str({
    desc: '42 School OAuth 2.0 Client ID (Application UID)',
    example: 'u-s4t2ud-abcdef123456789...',
  }),
  SCHOOL42_CLIENT_SECRET: str({
    desc: '42 School OAuth 2.0 Client Secret - KEEP SECURE',
    example: 's-s4t2ud-your_secret_here...',
  }),

  // OAuth 2.0 General Configuration
  OAUTH_BASE_URL: str({
    default: 'http://localhost:4430',
    desc: 'Base URL for OAuth callback redirects (frontend URL)',
  }),
});

// ⚠️ CRITICAL SECURITY VALIDATION
if (FORBIDDEN_JWT_SECRETS.includes(authenv.JWT_SECRET.toLowerCase())) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET cannot be a default/common value!');
  console.error('   Current value:', authenv.JWT_SECRET);
  console.error('   Forbidden values:', FORBIDDEN_JWT_SECRETS.join(', '));
  console.error('');
  console.error('   Generate a secure secret with:');
  console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.error('');
  process.exit(1);
}

if (authenv.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short!');
  console.error('   Current length:', authenv.JWT_SECRET.length);
  console.error('   Minimum length: 32 characters');
  console.error('');
  console.error('   Generate a secure secret with:');
  console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.error('');
  process.exit(1);
}

// Production warnings
if (authenv.NODE_ENV === 'production') {
  if (authenv.ADMIN_PASSWORD === 'Admin123!') {
    console.warn('⚠️  WARNING: Using default ADMIN_PASSWORD in production!');
    console.warn('   This is a security risk. Please change ADMIN_PASSWORD in .env.auth');
  }

  if (authenv.INVITE_PASSWORD === 'Invite123!') {
    console.warn('⚠️  WARNING: Using default INVITE_PASSWORD in production!');
    console.warn('   This is a security risk. Please change INVITE_PASSWORD in .env.auth');
  }
}

// Compute derived values
export const UM_SERVICE_URL = `https://${authenv.UM_SERVICE_NAME}:${authenv.UM_SERVICE_PORT}`;
