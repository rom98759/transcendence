import { ZodIssue, ZodIssueCode } from 'zod/v3';
import { HTTP_STATUS } from '../constants/index.js';
import { EventValue, LogContext, LogDetail, ReasonValue } from '../logging/logging-types.js';
import { LOG_REASONS } from '../logging/logging.js';
import { ERROR_CODES } from './error-codes.js';

export type DeepValues<T> = T extends object ? { [K in keyof T]: DeepValues<T[K]> }[keyof T] : T;

type SecurityFrontReasons =
  | typeof LOG_REASONS.SECURITY.TOKEN_EXPIRED
  | typeof LOG_REASONS.SECURITY.RATE_LIMIT_REACHED;

type ValidationReasons = DeepValues<typeof LOG_REASONS.VALIDATION>;
type ConflictReasons = DeepValues<typeof LOG_REASONS.CONFLICT>;

export type FrontendReasonValue =
  | SecurityFrontReasons
  | ValidationReasons
  | ConflictReasons
  | ZodIssueCode
  | typeof LOG_REASONS.UNKNOWN;

const PUBLIC_REASONS: string[] = [
  LOG_REASONS.SECURITY.TOKEN_EXPIRED,
  LOG_REASONS.SECURITY.RATE_LIMIT_REACHED,
  ...Object.values(LOG_REASONS.VALIDATION),
  ...Object.values(LOG_REASONS.CONFLICT),
  LOG_REASONS.UNKNOWN,
];

const isFrontendReason = (reason: string): reason is FrontendReasonValue => {
  return PUBLIC_REASONS.includes(reason);
};

export type HttpStatus = DeepValues<typeof HTTP_STATUS>;

export type ErrorCode = DeepValues<typeof ERROR_CODES>;

// interface for quick error generation through error catalog
export interface ErrorDefinition {
  code: ErrorCode;
  message: string;
  event: EventValue;
  reason: ReasonValue;
  statusCode?: HttpStatus;
}

// attribute which will be propagated till client
export interface ErrorDetail {
  reason: FrontendReasonValue;
  field?: string;
  message?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: HttpStatus;
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

export class FrontendError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: HttpStatus;
  public readonly details: ErrorDetail[] | null;
  constructor(
    message: string,
    statusCode: HttpStatus,
    code: ErrorCode,
    details: ErrorDetail[] | null,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const mapZodIssuesToErrorDetails = (issues: ZodIssue[]): ErrorDetail[] => {
  return issues.map((issue) => ({
    field: issue.path?.join('.'), // Ex: "email" ou "user.email"
    reason: issue.code as ErrorDetail['reason'], // Ex: "invalid_string"
  }));
};

export const mapToFrontendError = (error: AppError): FrontendError => {
  let mappedDetails: ErrorDetail[] | null = null;
  const reason = error?.context?.reason || '';
  const safeReason: FrontendReasonValue = isFrontendReason(reason) ? reason : LOG_REASONS.UNKNOWN;

  if (error.context?.zodIssues) {
    mappedDetails = error.context.zodIssues.map((issue: ZodIssue) => ({
      field: issue.path?.join('.') || 'unknown',
      reason: safeReason,
    }));
  } else if (error.context?.details && Array.isArray(error.context.details)) {
    mappedDetails = error.context.details.map((detail: LogDetail) => ({
      field: detail?.field || 'unknown',
      reason: safeReason,
    }));
  } else if (error.context?.field || isFrontendReason(reason)) {
    mappedDetails = [
      {
        field: error.context?.field as string,
        reason: safeReason,
      },
    ];
  }

  return new FrontendError(error.message, error.statusCode, error.code, mappedDetails);
};
