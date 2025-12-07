export interface LogContext {
  event: string
  user?: string | null
  username?: string | null
  email?: string | null
  identifier?: string | null
  id?: number | null
  url?: string
  method?: string
  status?: number
  reason?: string
  err?: string
  duration?: number
  [key: string]: any
}

export interface Logger {
  debug(context: LogContext): void
  info(context: LogContext): void
  warn(context: LogContext): void
  error(context: LogContext): void
}

/**
 * Sanitize les données sensibles pour les logs
 * Remplace les champs sensibles par '[REDACTED]'
 */
function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const SENSITIVE_FIELDS = [
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
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
}

class AuthLogger implements Logger {
  private serviceName = 'auth-service'
  private logLevel: string = process.env.LOG_LEVEL || 'info'

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }

  private formatLog(level: string, context: LogContext): object {
    const timestamp = new Date().toISOString();
    const sanitizedContext = sanitizeForLog(context);
    return {
      timestamp,
      level,
      service: this.serviceName,
      ...sanitizedContext
    };
  }

  debug(context: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(JSON.stringify(this.formatLog('debug', context)))
    }
  }

  info(context: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify(this.formatLog('info', context)))
    }
  }

  warn(context: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.formatLog('warn', context)))
    }
  }

  error(context: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.formatLog('error', context)))
    }
  }
}

// Singleton logger instance
export const logger = new AuthLogger()
