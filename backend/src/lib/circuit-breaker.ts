export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before opening (default: 5)
  resetTimeoutMs?: number;   // Time to stay OPEN before testing HALF_OPEN (default: 5000ms)
  name?: string;             // Identifier for logging / monitoring
}

export class CircuitBreakerError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN. Fast-failing downstream request.`);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Lightweight Circuit Breaker:
 * Prevents cascading thread pool exhaustion and socket churn when downstream
 * databases or third-party APIs (Supabase, DynamoDB, Sandbox KYC) experience outages.
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  public readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name ?? 'default';
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 5000;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) {
        return fallback();
      }
      throw new CircuitBreakerError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker:${this.name}] Tripped to OPEN state after ${this.failureCount} failures.`);
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

// Pre-configured breakers for core infrastructure
export const dynamoDbBreaker = new CircuitBreaker({ name: 'dynamodb', failureThreshold: 5, resetTimeoutMs: 4000 });
export const sandboxKycBreaker = new CircuitBreaker({ name: 'sandbox-kyc', failureThreshold: 3, resetTimeoutMs: 8000 });
export const supabaseBreaker = new CircuitBreaker({ name: 'supabase', failureThreshold: 5, resetTimeoutMs: 5000 });
