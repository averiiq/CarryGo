import { captureException } from '@/lib/monitoring';

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly context?: Record<string, unknown>;

  constructor(params: {
    code: ErrorCode;
    message: string;
    userMessage: string;
    context?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.context = params.context;
  }
}

export function handleServiceError(error: unknown): AppError {
  captureException(error, { source: 'handleServiceError' });

  if (error instanceof AppError) {
    return error;
  }

  if (isNetworkError(error)) {
    return new AppError({
      code: ErrorCode.NETWORK_OFFLINE,
      message: extractMessage(error),
      userMessage: 'Unable to connect. Please check your internet connection and try again.',
    });
  }

  if (isAuthError(error)) {
    const rawMsg = extractMessage(error).toLowerCase();
    const isRls = rawMsg.includes('row-level security') || rawMsg.includes('permission denied');
    return new AppError({
      code: isRls ? ErrorCode.AUTH_UNAUTHORIZED : ErrorCode.AUTH_EXPIRED,
      message: extractMessage(error),
      userMessage: isRls
        ? 'You do not have permission to perform this action.'
        : 'Your session has expired. Please sign in again.',
    });
  }

  if (isRateLimitError(error)) {
    return new AppError({
      code: ErrorCode.RATE_LIMITED,
      message: extractMessage(error),
      userMessage: 'Too many requests. Please wait a moment before trying again.',
    });
  }

  if (isDatabaseError(error)) {
    return mapDatabaseError(error);
  }

  const raw = extractMessage(error);
  const isFriendlyCustom = isUserFriendlyMessage(raw);

  return new AppError({
    code: ErrorCode.UNKNOWN,
    message: raw,
    userMessage: isFriendlyCustom ? raw : 'Something went wrong. Please try again later.',
  });
}

/**
 * Returns a safe, user-ready error string guaranteed not to leak raw database or stack details.
 */
export function getUserErrorMessage(error: unknown, fallback?: string): string {
  if (!error) return fallback || 'An unexpected error occurred.';
  const appError = handleServiceError(error);
  if (fallback && appError.code === ErrorCode.UNKNOWN && !isUserFriendlyMessage(appError.message)) {
    return fallback;
  }
  return appError.userMessage;
}

/**
 * Returns an appropriate short title for alerts or error states.
 */
export function getErrorTitle(error: unknown, defaultTitle: string = 'Notice'): string {
  if (!error) return defaultTitle;
  const appError = error instanceof AppError ? error : handleServiceError(error);
  switch (appError.code) {
    case ErrorCode.NETWORK_OFFLINE:
    case ErrorCode.NETWORK_TIMEOUT:
      return 'Connection Issue';
    case ErrorCode.AUTH_EXPIRED:
      return 'Session Expired';
    case ErrorCode.AUTH_UNAUTHORIZED:
      return 'Permission Denied';
    case ErrorCode.RATE_LIMITED:
      return 'Please Wait';
    case ErrorCode.CONFLICT:
      return 'Already Exists';
    case ErrorCode.NOT_FOUND:
      return 'Not Found';
    case ErrorCode.SERVER_ERROR:
      return 'System Notice';
    case ErrorCode.VALIDATION_FAILED:
      return 'Invalid Input';
    default:
      return defaultTitle;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return true;
  }

  const message = extractMessage(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('fetch failed')
  );
}

export function isAuthError(error: unknown): boolean {
  const message = extractMessage(error).toLowerCase();

  if (message.includes('jwt expired') || message.includes('token expired')) {
    return true;
  }

  if (
    message.includes('not authenticated') ||
    message.includes('unauthorized') ||
    message.includes('permission denied') ||
    message.includes('forbidden') ||
    message.includes('row-level security')
  ) {
    return true;
  }

  if (isObjectWithCode(error)) {
    const code = (error as { code: string }).code;
    return code === '401' || code === '403' || code === '42501' || code === 'PGRST301';
  }

  return false;
}

export function isRateLimitError(error: unknown): boolean {
  const code = isObjectWithCode(error) ? String((error as { code: unknown }).code) : '';
  const message = extractMessage(error).toLowerCase();
  return code === '429' || message.includes('rate limit') || message.includes('too many requests');
}

export function isDatabaseError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    if ('code' in error || 'details' in error || 'hint' in error) return true;
  }
  const msg = extractMessage(error).toLowerCase();
  return (
    msg.includes('relation ') ||
    msg.includes('table ') ||
    msg.includes('violates') ||
    msg.includes('duplicate key') ||
    msg.includes('foreign key') ||
    msg.includes('row-level security') ||
    msg.includes('pgrst')
  );
}

function mapDatabaseError(error: unknown): AppError {
  const code = isObjectWithCode(error) ? String((error as { code: unknown }).code) : '';
  const message = extractMessage(error);
  const lower = message.toLowerCase();

  if (code === '23505' || lower.includes('duplicate key') || lower.includes('already exists')) {
    return new AppError({
      code: ErrorCode.CONFLICT,
      message,
      userMessage: 'This item already exists. Please try a different value.',
    });
  }

  if (code === '23503' || lower.includes('foreign key') || lower.includes('not found') || code === 'PGRST116') {
    return new AppError({
      code: ErrorCode.NOT_FOUND,
      message,
      userMessage: 'The referenced item no longer exists or is unavailable.',
    });
  }

  if (code === '42501' || code === 'PGRST301' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return new AppError({
      code: ErrorCode.AUTH_UNAUTHORIZED,
      message,
      userMessage: 'You do not have permission to perform this action.',
    });
  }

  if (lower.includes('relation') && lower.includes('does not exist')) {
    return new AppError({
      code: ErrorCode.SERVER_ERROR,
      message,
      userMessage: 'This feature is temporarily undergoing maintenance. Please try again shortly.',
    });
  }

  if (code.startsWith('5') || lower.includes('internal server error')) {
    return new AppError({
      code: ErrorCode.SERVER_ERROR,
      message,
      userMessage: 'Our servers are experiencing issues. Please try again shortly.',
    });
  }

  return new AppError({
    code: ErrorCode.UNKNOWN,
    message,
    userMessage: 'Something went wrong. Please try again later.',
  });
}

function isUserFriendlyMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  const rawTechSubstrings = [
    'relation ', 'table "', 'column ', 'violates', 'syntax error',
    'pgrst', 'pg_', 'null value in column', 'typeerror',
    'referenceerror', 'uncaught', 'stack trace',
    'row-level security', 'foreign key constraint', 'unique constraint',
  ];
  if (rawTechSubstrings.some(s => lower.includes(s))) return false;
  return msg.length <= 160;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

function isObjectWithCode(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error;
}
