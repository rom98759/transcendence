import { DeepValues, ZodIssue } from '../errors/error-types.js';
import { LOG_EVENTS, LOG_REASONS } from './logging.js';

export type EventValue = DeepValues<typeof LOG_EVENTS>;

export interface LogDetail {
  resource?: string;
  field?: string;
  value?: string;
  expected?: string;
  extraInfo?: string;
}

export type ReasonValue = DeepValues<typeof LOG_REASONS>;

export interface LogContext {
  event: EventValue;
  reason?: ReasonValue;
  userId?: number | string;
  details?: LogDetail[];
  zodIssues?: ZodIssue[]; // Zod details
  originalError?: unknown;
  field?: string;
  meta?: Record<string, string>;
}
