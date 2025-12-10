// Types pour les contextes de log spécifiques
export interface BaseLogContext {
  event: string
  user?: string | null
  username?: string | null
  url?: string
  method?: string
  requestId?: string
  duration?: number
  [key: string]: any
}

export interface ProxyLogContext extends BaseLogContext {
  event: 'proxy_request' | 'proxy_success' | 'proxy_error' | 'proxy_timeout'
  targetUrl: string
  status?: number
  remote?: string
  err?: string
  upstreamDuration?: number
}

export interface AuthLogContext extends BaseLogContext {
  event: 'jwt_missing' | 'jwt_verify_failed' | 'jwt_verify_success' | 'auth_bypass'
  token?: boolean
  jwtError?: string
}

export interface RequestLogContext extends BaseLogContext {
  event: 'request_start' | 'request_end' | 'request_error'
  status?: number
  userAgent?: string
  ip?: string
  responseTime?: number
}

export interface HealthLogContext extends BaseLogContext {
  event: 'health_check' | 'service_health_check' | 'health_check_failed'
  serviceName?: string
  healthy?: boolean
  services?: Record<string, string>
}

export type LogContext =
  | ProxyLogContext
  | AuthLogContext
  | RequestLogContext
  | HealthLogContext
  | BaseLogContext

export interface Logger {
  debug(context: LogContext): void
  info(context: LogContext): void
  warn(context: LogContext): void
  error(context: LogContext): void

  // Méthodes spécialisées pour la gateway
  logProxyRequest(context: Omit<ProxyLogContext, 'event'>): void
  logAuth(context: Omit<AuthLogContext, 'event'>, success: boolean): void
  logRequest(context: Omit<RequestLogContext, 'event'>, phase: 'start' | 'end' | 'error'): void
  logHealth(
    context: Omit<HealthLogContext, 'event'>,
    type: 'check' | 'service_check' | 'failed',
  ): void
}

class GatewayLogger implements Logger {
  private serviceName = 'api-gateway'
  private logLevel: string = 'info'
  private isDevelopment: boolean = false

  constructor() {
    // Configuration au runtime
    this.initializeConfig()
  }

  private initializeConfig(): void {
    try {
      // @ts-ignore - globalThis.process existe au runtime Node.js
      const env = globalThis.process?.env || {}
      this.logLevel = env.LOG_LEVEL || 'info'
      this.isDevelopment = env.NODE_ENV !== 'production'
    } catch {
      // Fallback sécurisé si process n'est pas disponible
      this.logLevel = 'info'
      this.isDevelopment = false
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }

  private formatLog(level: string, context: LogContext): object {
    const timestamp = new Date().toISOString()
    const baseLog = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.isDevelopment ? 'development' : 'production',
      ...context,
    }

    // Supprime champs sensibles
    if (!this.isDevelopment) {
      const { requestId, ...cleanContext } = baseLog
      return cleanContext
    }

    return baseLog
  }

  private writeLog(level: 'debug' | 'info' | 'warn' | 'error', context: LogContext): void {
    if (!this.shouldLog(level)) return

    const logData = this.formatLog(level, context)
    const logString = JSON.stringify(logData)

    switch (level) {
      case 'debug':
      case 'info':
        console.log(logString)
        break
      case 'warn':
        console.warn(logString)
        break
      case 'error':
        console.error(logString)
        break
    }
  }

  // Méthodes de base
  debug(context: LogContext): void {
    this.writeLog('debug', context)
  }

  info(context: LogContext): void {
    this.writeLog('info', context)
  }

  warn(context: LogContext): void {
    this.writeLog('warn', context)
  }

  error(context: LogContext): void {
    this.writeLog('error', context)
  }

  // Méthodes spécialisées pour la gateway
  logProxyRequest(context: Omit<ProxyLogContext, 'event'>): void {
    const { status } = context

    if (!status) {
      this.info({ ...context, event: 'proxy_request' })
    } else if (status >= 200 && status < 400) {
      this.info({ ...context, event: 'proxy_success' })
    } else if (status >= 400 && status < 500) {
      this.warn({ ...context, event: 'proxy_error' })
    } else {
      this.error({ ...context, event: 'proxy_error' })
    }
  }

  logAuth(context: Omit<AuthLogContext, 'event'>, success: boolean): void {
    if (success) {
      this.debug({ ...context, event: 'jwt_verify_success' })
    } else {
      this.warn({
        ...context,
        event: context.token === false ? 'jwt_missing' : 'jwt_verify_failed',
      })
    }
  }

  logRequest(context: Omit<RequestLogContext, 'event'>, phase: 'start' | 'end' | 'error'): void {
    const eventMap = {
      start: 'request_start' as const,
      end: 'request_end' as const,
      error: 'request_error' as const,
    }

    const level =
      phase === 'error'
        ? 'error'
        : phase === 'end' && context.status && context.status >= 400
          ? 'warn'
          : 'info'

    this.writeLog(level, { ...context, event: eventMap[phase] })
  }

  logHealth(
    context: Omit<HealthLogContext, 'event'>,
    type: 'check' | 'service_check' | 'failed',
  ): void {
    const eventMap = {
      check: 'health_check' as const,
      service_check: 'service_health_check' as const,
      failed: 'health_check_failed' as const,
    }

    const level = type === 'failed' ? 'error' : 'info'
    this.writeLog(level, { ...context, event: eventMap[type] })
  }
}

// Singleton logger instance
export const logger = new GatewayLogger()

// Helper functions pour faciliter l'usage
export const logUtils = {
  // Génère un ID de requête unique pour tracer les appels
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // Mesure le temps d'exécution
  timeExecution<T>(fn: () => T): { result: T; duration: number } {
    const start = Date.now()
    const result = fn()
    const duration = Date.now() - start
    return { result, duration }
  },

  // Parse user agent pour logs enrichis
  parseUserAgent(userAgent: string): { browser?: string; version?: string; os?: string } {
    if (!userAgent) return {}

    const browser = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Firefox')
        ? 'Firefox'
        : 'Unknown'
    return { browser }
  },

  // Sanitize les données sensibles pour les logs
  sanitizeForLog(data: any): any {
    if (!data || typeof data !== 'object') return data

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization']
    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  },
}

// Factory pour créer des contextes de log typés
export const createLogContext = {
  proxy: (targetUrl: string, user?: string): Omit<ProxyLogContext, 'event'> => ({
    targetUrl,
    user: user || null,
  }),

  auth: (url: string, user?: string): Omit<AuthLogContext, 'event'> => ({
    url,
    user: user || null,
  }),

  request: (
    method: string,
    url: string,
    user?: string,
    ip?: string,
  ): Omit<RequestLogContext, 'event'> => ({
    method,
    url,
    user: user || null,
    ip: ip || null,
  }),

  health: (serviceName?: string): Omit<HealthLogContext, 'event'> => ({
    serviceName: serviceName || null,
  }),
}

// Optimisation : réduire la verbosité en production
export function optimizeErrorHandler(error: any, isDev: boolean = false): object {
  const baseError = {
    message: error?.statusCode >= 500 ? 'Internal server error' : error?.message || 'Unknown error',
    code: error?.code || 'INTERNAL_ERROR',
  }

  // En développement, on expose plus de détails
  if (isDev && error?.statusCode >= 500) {
    return {
      ...baseError,
      details: {
        stack: error?.stack,
        url: error?.url,
        method: error?.method,
        timestamp: new Date().toISOString(),
      },
    }
  }

  return baseError
}

// Middleware helper pour logger automatiquement les requêtes
export function createRequestLogger(requestId?: string) {
  const reqId = requestId || logUtils.generateRequestId()

  return {
    requestId: reqId,
    logStart: (method: string, url: string, user?: string, ip?: string) => {
      logger.logRequest(createLogContext.request(method, url, user, ip), 'start')
    },
    logEnd: (status: number, duration: number, user?: string) => {
      logger.logRequest(
        {
          ...createLogContext.request('', '', user),
          status,
          responseTime: duration,
          requestId: reqId,
        },
        'end',
      )
    },
    logError: (error: any, user?: string) => {
      logger.logRequest(
        {
          ...createLogContext.request('', '', user),
          err: error?.message || error,
          requestId: reqId,
        },
        'error',
      )
    },
  }
}
