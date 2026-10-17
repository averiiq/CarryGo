import { SQSEvent } from 'aws-lambda';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { idempotencyEngine } from '../lib/idempotency';
import { withRetry } from '../lib/retry';
import { EmailNotificationPayload, WorkerBatchResult } from './types';

export interface EmailProviderAdapter {
  sendEmail(options: {
    toEmail: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  }): Promise<{ messageId: string }>;
}

export class MockEmailProvider implements EmailProviderAdapter {
  public sentEmails: Array<{ toEmail: string; subject: string; htmlBody: string }> = [];

  async sendEmail(options: {
    toEmail: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  }): Promise<{ messageId: string }> {
    this.sentEmails.push({
      toEmail: options.toEmail,
      subject: options.subject,
      htmlBody: options.htmlBody,
    });
    return { messageId: `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  }
}

/**
 * Dedicated Email Worker Service:
 * Manages transactional receipts, escrow invoices, and delivery documentation
 * in a completely isolated queue without impacting real-time push or SMS latency.
 */
export class EmailWorkerService {
  private provider: EmailProviderAdapter;
  private breaker: CircuitBreaker;

  constructor(provider?: EmailProviderAdapter) {
    this.provider = provider ?? new MockEmailProvider();
    this.breaker = new CircuitBreaker({
      name: 'email-ses-breaker',
      failureThreshold: 5,
      resetTimeoutMs: 10_000,
    });
  }

  public setProvider(provider: EmailProviderAdapter): void {
    this.provider = provider;
  }

  public renderTemplate(
    template: EmailNotificationPayload['template'],
    variables: Record<string, unknown>,
  ): { html: string; text: string } {
    switch (template) {
      case 'BOOKING_CONFIRMED':
        return {
          html: `<h1>CarryGo Booking Confirmed!</h1><p>Hi ${variables.userName ?? 'Customer'}, your booking #${variables.bookingId} has been confirmed.</p><p>Trip route: ${variables.fromCity} to ${variables.toCity}.</p>`,
          text: `CarryGo Booking Confirmed! Your booking #${variables.bookingId} (${variables.fromCity} -> ${variables.toCity}) is confirmed.`,
        };
      case 'ESCROW_HELD':
        return {
          html: `<h1>Payment Secured in CarryGo Escrow</h1><p>Amount ₹${variables.amount} is securely held in escrow for Request #${variables.requestId}.</p>`,
          text: `Payment of ₹${variables.amount} secured in CarryGo Escrow for Request #${variables.requestId}.`,
        };
      case 'ESCROW_RELEASED':
        return {
          html: `<h1>Payout Released!</h1><p>₹${variables.payoutAmount} has been credited to your CarryGo wallet for completing delivery #${variables.parcelId}.</p>`,
          text: `Payout of ₹${variables.payoutAmount} released for delivery #${variables.parcelId}.`,
        };
      case 'DELIVERY_OTP':
        return {
          html: `<h1>Your CarryGo Delivery OTP</h1><p>Your one-time passcode for delivery handover is: <strong>${variables.otp}</strong>. Share this only with your verified traveler upon receiving your package.</p>`,
          text: `Your CarryGo Delivery OTP is ${variables.otp}. Share only upon receipt.`,
        };
      default:
        return {
          html: `<p>${variables.message ?? 'CarryGo Notification'}</p>`,
          text: `${variables.message ?? 'CarryGo Notification'}`,
        };
    }
  }

  public async processEmail(
    payload: EmailNotificationPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (payload.idempotencyKey) {
      const check = idempotencyEngine.acquire(`email:${payload.idempotencyKey}`, JSON.stringify(payload));
      if (check.status === 'REPLAY') {
        return { success: true, messageId: 'idempotent-replay' };
      }
      if (check.status === 'IN_FLIGHT') {
        return { success: false, error: 'Email dispatch already in-flight' };
      }
    }

    const { html, text } = this.renderTemplate(payload.template, payload.variables);

    try {
      const result = await this.breaker.execute(async () => {
        return await withRetry(
          async () => {
            return await this.provider.sendEmail({
              toEmail: payload.toEmail,
              subject: payload.subject,
              htmlBody: html,
              textBody: text,
            });
          },
          { maxRetries: 3, initialDelayMs: 200 },
        );
      });

      if (payload.idempotencyKey) {
        idempotencyEngine.complete(`email:${payload.idempotencyKey}`, {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({ messageId: result.messageId }),
        });
      }

      return { success: true, messageId: result.messageId };
    } catch (err) {
      if (payload.idempotencyKey) {
        idempotencyEngine.fail(`email:${payload.idempotencyKey}`);
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

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
        const payload = JSON.parse(record.body) as EmailNotificationPayload;
        const res = await this.processEmail(payload);
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

export const emailWorkerService = new EmailWorkerService();
