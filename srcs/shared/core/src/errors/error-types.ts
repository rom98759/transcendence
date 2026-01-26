import { EventValue, LogContext, ReasonValue } from '../logging/logging-types.js';
import { ERROR_CODES } from './error-codes.js';

export type DeepValues<T> = T extends object ? { [K in keyof T]: DeepValues<T[K]> }[keyof T] : T;

export type ErrorCode = DeepValues<typeof ERROR_CODES>;

export interface ErrorDefinition {
  code: ErrorCode;
  message: string;
  event: EventValue;
  reason: ReasonValue;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: LogContext;
  constructor(
    definition: ErrorDefinition,
    dynamicContext: Omit<LogContext, 'event' | 'reason'> = {},
    cause?: unknown,
  ) {
    super(definition.message, { cause });
    this.name = 'AppError';
    this.code = definition.code;
    this.statusCode = definition.statusCode || 500;
    this.context = {
      event: definition.event,
      reason: definition.reason,
      ...dynamicContext,
    } as LogContext;
    if ('captureStackTrace' in Error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      (Error as { captureStackTrace: Function }).captureStackTrace(this, this.constructor);
    }
  }
}
