import { DeepValues } from '../errors/error-types';
import { LOG_EVENTS, LOG_REASONS } from './logging';

export type EventValue = DeepValues<typeof LOG_EVENTS>;

export type ReasonValue = DeepValues<typeof LOG_REASONS> | string;

export interface LogContext {
  event: EventValue;
  reason?: ReasonValue;
  userId?: number | string;
  details?: unknown; // Zod details
  originalError?: unknown;
}
