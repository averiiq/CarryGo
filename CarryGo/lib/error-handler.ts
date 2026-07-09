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
    return new AppError({
      code: ErrorCode.AUTH_EXPIRED,
      message: extractMessage(error),
      userMessage: 'Your session has expired. Please sign in again.',
    });
  }

  if (isSupabaseError(error)) {
    return mapSupabaseError(error);
  }

  return new AppError({
    code: ErrorCode.UNKNOWN,
    message: extractMessage(error),
    userMessage: 'Something went wrong. Please try again later.',
  });
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

  if (message.includes('not authenticated') || message.includes('unauthorized')) {
    return true;
  }

  if (isObjectWithCode(error)) {
    const code = (error as { code: string }).code;
    return code === '401' || code === 'PGRST301';
  }

  return false;
}

interface SupabaseErrorShape {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function isSupabaseError(error: unknown): error is SupabaseErrorShape {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('code' in error || 'details' in error)
  );
}

function mapSupabaseError(error: SupabaseErrorShape): AppError {
  const code = error.code ?? '';
  const message = error.message ?? 'Unknown Supabase error';

  if (code === '23505') {
    return new AppError({
      code: ErrorCode.CONFLICT,
      message,
      userMessage: 'This item already exists. Please try a different value.',
    });
  }

  if (code === '23503') {
    return new AppError({
      code: ErrorCode.NOT_FOUND,
      message,
      userMessage: 'The referenced item no longer exists.',
    });
  }

  if (code === '42501' || code === 'PGRST301') {
    return new AppError({
      code: ErrorCode.AUTH_UNAUTHORIZED,
      message,
      userMessage: 'You do not have permission to perform this action.',
    });
  }

  if (code.startsWith('5')) {
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
