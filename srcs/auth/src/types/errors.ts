import { DATA_ERROR, EVENTS, REASONS } from '../utils/constants.js';
import { LogContext } from './logger.js';
import { ERROR_CODES } from '@transcendence/core';

type DeepValues<T> = T extends object ? { [K in keyof T]: DeepValues<T[K]> }[keyof T] : T;

export type ErrorCode = DeepValues<typeof ERROR_CODES>;

export type EventValue = DeepValues<typeof EVENTS>;

export type ReasonValue = DeepValues<typeof REASONS> | string;

export type DataErrorCode = DeepValues<typeof DATA_ERROR>;

export interface ErrorDefinition {
  code: ErrorCode;
  message: string;
  event: EventValue;
  reason: ReasonValue;
  statusCode?: number;
}

export interface AppBaseError extends Error {
  context?: {
    event?: string;
    reason?: string;
  };
}

export class DataError extends Error {
  constructor(
    public code: DataErrorCode,
    public message: string,
    public originalError?: unknown,
    public meta?: Record<string, any>,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

export class ServiceError extends Error {
  public statusCode: number;
  public code: string;
  public context: LogContext;
  constructor(
    public definition: ErrorDefinition,
    dynamicContext: Omit<LogContext, 'event' | 'reason'> = {},
  ) {
    super(definition.message);
    this.name = 'ServiceError';
    this.statusCode = definition.statusCode || 500;
    this.code = definition.code;
    this.definition = definition;
    this.context = {
      event: definition.event,
      reason: definition.reason,
      ...dynamicContext,
    } as LogContext;

    Error.captureStackTrace(this, this.constructor);
  }
}
