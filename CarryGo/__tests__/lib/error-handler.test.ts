import { AppError, ErrorCode, handleServiceError, isNetworkError, isAuthError } from '@/lib/error-handler';

jest.mock('@/lib/monitoring', () => ({
  captureException: jest.fn(),
}));

describe('AppError', () => {
  it('creates error with correct properties', () => {
    const err = new AppError({
      code: ErrorCode.PAYMENT_FAILED,
      message: 'Razorpay timeout',
      userMessage: 'Payment processing failed. Please try again.',
    });

    expect(err.code).toBe(ErrorCode.PAYMENT_FAILED);
    expect(err.message).toBe('Razorpay timeout');
    expect(err.userMessage).toBe('Payment processing failed. Please try again.');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('preserves context', () => {
    const err = new AppError({
      code: ErrorCode.UNKNOWN,
      message: 'test',
      userMessage: 'test',
      context: { requestId: '123' },
    });

    expect(err.context).toEqual({ requestId: '123' });
  });
});

describe('isNetworkError', () => {
  it('detects TypeError with network message', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('detects timeout errors', () => {
    expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
  });

  it('detects ECONNREFUSED', () => {
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('does not flag other errors', () => {
    expect(isNetworkError(new Error('Validation failed'))).toBe(false);
  });
});

describe('isAuthError', () => {
  it('detects JWT expired', () => {
    expect(isAuthError(new Error('jwt expired'))).toBe(true);
  });

  it('detects token expired', () => {
    expect(isAuthError(new Error('Token expired, please refresh'))).toBe(true);
  });

  it('detects unauthorized message', () => {
    expect(isAuthError(new Error('Not authenticated'))).toBe(true);
  });

  it('detects error with 401 code', () => {
    expect(isAuthError({ code: '401', message: 'Unauthorized' })).toBe(true);
  });

  it('does not flag other errors', () => {
    expect(isAuthError(new Error('Server error'))).toBe(false);
  });
});

describe('handleServiceError', () => {
  it('returns AppError as-is', () => {
    const original = new AppError({
      code: ErrorCode.CONFLICT,
      message: 'dup',
      userMessage: 'Already exists',
    });
    const result = handleServiceError(original);
    expect(result).toBe(original);
  });

  it('wraps network error', () => {
    const result = handleServiceError(new TypeError('Network request failed'));
    expect(result.code).toBe(ErrorCode.NETWORK_OFFLINE);
    expect(result.userMessage).toContain('internet connection');
  });

  it('wraps auth error', () => {
    const result = handleServiceError(new Error('jwt expired'));
    expect(result.code).toBe(ErrorCode.AUTH_EXPIRED);
    expect(result.userMessage).toContain('session');
  });

  it('wraps Supabase unique constraint violation', () => {
    const result = handleServiceError({ code: '23505', message: 'duplicate key' });
    expect(result.code).toBe(ErrorCode.CONFLICT);
  });

  it('wraps Supabase permission error', () => {
    const result = handleServiceError({ code: '42501', message: 'permission denied' });
    expect(result.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
  });

  it('wraps unknown errors safely', () => {
    const result = handleServiceError('random string error');
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.userMessage).toContain('Something went wrong');
  });
});
