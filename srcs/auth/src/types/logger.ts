import { EventValue, ReasonValue } from './errors.js';
import pino from 'pino';
import { loggerConfig } from '../config/logger.config.js';

export interface LogContext {
    event: EventValue,
    reason?: ReasonValue,
    userId?: number | string,
    details?: unknown,              // Zod details
    originalError?: unknown,
}

export const logger = pino(loggerConfig) as pino.Logger<never> & {
  debug: (obj: LogContext, msg?: string) => void;
  info: (obj: LogContext, msg?: string) => void;
  warn: (obj: LogContext, msg?: string) => void;
  error: (obj: LogContext, msg?: string) => void;
};