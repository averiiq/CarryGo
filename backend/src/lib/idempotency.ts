import { createHash } from 'crypto';
import { JsonResponse } from '../http/response';

export type IdempotencyStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

export interface IdempotencyRecord {
  key: string;
  payloadHash: string;
  status: IdempotencyStatus;
  response?: JsonResponse;
  createdAt: number;
  expiresAt: number;
}

export type IdempotencyAcquireResult =
  | { status: 'NEW' }
  | { status: 'REPLAY'; response: JsonResponse }
  | { status: 'IN_FLIGHT' }
  | { status: 'PAYLOAD_MISMATCH' };

/**
 * Enterprise Idempotency Engine:
 * Prevents duplicate transactions (e.g. double bookings, duplicate trip posts, double-charges)
 * during client retry storms or mobile network dropouts.
 * 
 * Features:
 * 1. Cryptographic payload validation (SHA-256) to detect key re-use with differing payloads.
 * 2. Atomic state machine ('STARTED' -> 'COMPLETED' | 'FAILED').
 * 3. Bounded memory store with LRU eviction and background auto-pruning.
 * 4. Transparent cached response replay with 'x-cache-lookup: IDEMPOTENT_REPLAY'.
 */
export class IdempotencyEngine {
  private store = new Map<string, IdempotencyRecord>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(maxEntries = 25_000, defaultTtlMs = 600_000) { // 10 minute retention
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;

    const cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    cleanupTimer.unref?.();
  }

  private hashPayload(payload: string): string {
    return createHash('sha256').update(payload || '').digest('hex');
  }

  acquire(key: string, rawPayload: string = ''): IdempotencyAcquireResult {
    const now = Date.now();
    const payloadHash = this.hashPayload(rawPayload);
    const existing = this.store.get(key);

    if (existing) {
      if (now > existing.expiresAt) {
        this.store.delete(key);
      } else {
        // Validate payload match to prevent malicious or accidental hash collisions
        if (existing.payloadHash !== payloadHash) {
          return { status: 'PAYLOAD_MISMATCH' };
        }

        if (existing.status === 'COMPLETED' && existing.response) {
          const replayResponse: JsonResponse = {
            ...existing.response,
            headers: {
              ...existing.response.headers,
              'x-cache-lookup': 'IDEMPOTENT_REPLAY',
            },
          };
          return { status: 'REPLAY', response: replayResponse };
        }

        if (existing.status === 'STARTED') {
          return { status: 'IN_FLIGHT' };
        }
      }
    }

    // Evict oldest if reached capacity limit
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      key,
      payloadHash,
      status: 'STARTED',
      createdAt: now,
      expiresAt: now + this.defaultTtlMs,
    });

    return { status: 'NEW' };
  }

  complete(key: string, response: JsonResponse): void {
    const record = this.store.get(key);
    if (record) {
      record.status = 'COMPLETED';
      record.response = response;
    }
  }

  fail(key: string): void {
    const record = this.store.get(key);
    if (record) {
      record.status = 'FAILED';
      // Fast expire on failures so client can re-attempt immediately
      record.expiresAt = Date.now() + 5_000;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }
}

// Global Idempotency Engine singleton
export const idempotencyEngine = new IdempotencyEngine();
