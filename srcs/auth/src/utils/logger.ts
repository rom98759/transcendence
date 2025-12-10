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
    const timestamp = new Date().toISOString()
    return {
      timestamp,
      level,
      service: this.serviceName,
      ...context,
    }
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
