import { SQSEvent, SQSRecord } from 'aws-lambda';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { idempotencyEngine } from '../lib/idempotency';
import { withRetry } from '../lib/retry';
import { SmsNotificationPayload, WorkerBatchResult } from './types';

export interface SmsProviderAdapter {
  sendSms(payload: { toPhoneNumber: string; messageText: string }): Promise<{ messageId: string }>;
}

export class MockSmsProvider implements SmsProviderAdapter {
  public sentMessages: Array<{ toPhoneNumber: string; messageText: string }> = [];

  async sendSms(payload: { toPhoneNumber: string; messageText: string }): Promise<{ messageId: string }> {
    this.sentMessages.push(payload);
    return { messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  }
}

/**
 * Dedicated SMS Worker Service:
 * Handles high-throughput, mission-critical SMS notifications (OTP verification,
 * delivery alert, driver arrival) independently from other notification streams.
 */
export class SmsWorkerService {
  private provider: SmsProviderAdapter;
  private breaker: CircuitBreaker;

  constructor(provider?: SmsProviderAdapter) {
    this.provider = provider ?? new MockSmsProvider();
    this.breaker = new CircuitBreaker({
      name: 'sms-gateway-breaker',
      failureThreshold: 5,
      resetTimeoutMs: 10_000,
    });
  }

  public setProvider(provider: SmsProviderAdapter): void {
    this.provider = provider;
  }

  /**
   * Normalizes Indian and international phone numbers to E.164 standard.
   */
  public normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // Default to +91 (India) if 10-digit number
    if (/^\d{10}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  }

  public async processSms(payload: SmsNotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 1. Idempotency Check
    if (payload.idempotencyKey) {
      const check = idempotencyEngine.acquire(`sms:${payload.idempotencyKey}`, JSON.stringify(payload));
      if (check.status === 'REPLAY') {
        return { success: true, messageId: 'idempotent-replay' };
      }
      if (check.status === 'IN_FLIGHT') {
        return { success: false, error: 'SMS dispatch already in-flight' };
      }
    }

    const normalizedPhone = this.normalizePhoneNumber(payload.toPhoneNumber);

    try {
      // 2. Dispatch under Circuit Breaker with Retry backoff
      const result = await this.breaker.execute(async () => {
        return await withRetry(
          async () => {
            return await this.provider.sendSms({
              toPhoneNumber: normalizedPhone,
              messageText: payload.messageText,
            });
          },
          { maxRetries: 3, initialDelayMs: 150 },
        );
      });

      if (payload.idempotencyKey) {
        idempotencyEngine.complete(`sms:${payload.idempotencyKey}`, {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({ messageId: result.messageId }),
        });
      }

      return { success: true, messageId: result.messageId };
    } catch (err) {
      if (payload.idempotencyKey) {
        idempotencyEngine.fail(`sms:${payload.idempotencyKey}`);
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Processes SQS event batch from dedicated SMS queue
   */
  public async processQueueBatch(event: SQSEvent): Promise<WorkerBatchResult> {
    const result: WorkerBatchResult = {
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (const record of event.Records) {
      result.processedCount++;
      try {
        const payload = JSON.parse(record.body) as SmsNotificationPayload;
        const res = await this.processSms(payload);
        if (res.success) {
          result.successCount++;
        } else {
          result.failureCount++;
          result.errors.push({ id: record.messageId, error: res.error || 'Unknown error' });
        }
      } catch (err) {
        result.failureCount++;
        result.errors.push({
          id: record.messageId,
          error: err instanceof Error ? err.message : 'Invalid JSON payload',
        });
      }
    }

    return result;
  }
}

export const smsWorkerService = new SmsWorkerService();
