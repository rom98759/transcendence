import { ZodIssue } from 'zod/v3';
import { DeepValues } from '../errors/error-types';
import { LOG_EVENTS, LOG_REASONS } from './logging';

export type EventValue = DeepValues<typeof LOG_EVENTS>;

export interface LogDetail {
  field?: string;
  value?: string;
  expected?: string;
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
}
