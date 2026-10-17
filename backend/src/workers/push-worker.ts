import { SQSEvent } from 'aws-lambda';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { idempotencyEngine } from '../lib/idempotency';
import { withRetry } from '../lib/retry';
import { PushNotificationPayload, WorkerBatchResult } from './types';

export interface PushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded' | string };
}

export interface PushProviderAdapter {
  sendPushBatch(messages: Array<{
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string | null;
    badge?: number;
    channelId?: string;
    priority?: string;
    ttl?: number;
  }>): Promise<PushReceipt[]>;
  getReceipts?(ticketIds: string[]): Promise<Record<string, PushReceipt>>;
}

export class MockPushProvider implements PushProviderAdapter {
  public sentPushes: Array<{ to: string; title: string; body: string; channelId?: string }> = [];

  async sendPushBatch(messages: Array<{ to: string; title: string; body: string; channelId?: string }>): Promise<PushReceipt[]> {
    for (const msg of messages) {
      this.sentPushes.push({ to: msg.to, title: msg.title, body: msg.body, channelId: msg.channelId });
    }
    return messages.map(() => ({
      status: 'ok',
      id: `mock-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));
  }

  async getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>> {
    const receipts: Record<string, PushReceipt> = {};
    for (const id of ticketIds) {
      receipts[id] = { status: 'ok' };
    }
    return receipts;
  }
}

/**
 * Production Expo Push API Provider Adapter:
 * Directly delivers push messages to Expo's Push service gateway (APNs / FCM).
 */
export class ExpoPushProviderAdapter implements PushProviderAdapter {
  private apiUrl = 'https://exp.host/--/api/v2/push/send';
  private receiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.EXPO_ACCESS_TOKEN;
  }

  async sendPushBatch(messages: Array<{
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string | null;
    badge?: number;
    channelId?: string;
    priority?: string;
    ttl?: number;
  }>): Promise<PushReceipt[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json() as { data?: PushReceipt[] };
      return json.data ?? [];
    } finally {
      clearTimeout(timer);
    }
  }

  async getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>> {
    if (ticketIds.length === 0) return {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(this.receiptsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: ticketIds }),
    });

    if (!response.ok) {
      throw new Error(`Expo GetReceipts error: ${response.status}`);
    }

    const json = await response.json() as { data?: Record<string, PushReceipt> };
    return json.data ?? {};
  }
}

/**
 * Dedicated Push Worker Service:
 * Handles high-concurrency push notification broadcasts to mobile clients (Expo & FCM).
 * Employs batching (up to 100 messages per HTTP call) to safely process tens of thousands
 * of pushes per minute without hitting API rate limits.
 */
export class PushWorkerService {
  private provider: PushProviderAdapter;
  private breaker: CircuitBreaker;
  public invalidTokens: Set<string> = new Set();

  constructor(provider?: PushProviderAdapter) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.NODE_ENV === 'test') {
      this.provider = new MockPushProvider();
    } else {
      this.provider = new ExpoPushProviderAdapter();
    }

    this.breaker = new CircuitBreaker({
      name: 'push-gateway-breaker',
      failureThreshold: 5,
      resetTimeoutMs: 8_000,
    });
  }

  public setProvider(provider: PushProviderAdapter): void {
    this.provider = provider;
  }

  /**
   * Validates if a string is a well-formatted Expo or FCM push token.
   */
  public isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return (
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[') ||
      token.length >= 32
    );
  }

  /**
   * Maps notification types into dedicated Android notification channel IDs
   */
  public resolveChannelId(type?: string): string {
    if (!type) return 'default';
    if (type.includes('message') || type.includes('chat')) return 'messages';
    if (type.includes('delivery') || type.includes('request') || type.includes('otp')) return 'deliveries';
    if (type.includes('payment') || type.includes('escrow') || type.includes('refund')) return 'payments';
    if (type.includes('match') || type.includes('route')) return 'matches';
    return 'default';
  }

  public async processPush(
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; tickets?: PushReceipt[]; error?: string }> {
    if (payload.idempotencyKey) {
      const check = idempotencyEngine.acquire(`push:${payload.idempotencyKey}`, JSON.stringify(payload));
      if (check.status === 'REPLAY') {
        return { success: true, tickets: [{ status: 'ok', id: 'idempotent-replay' }] };
      }
      if (check.status === 'IN_FLIGHT') {
        return { success: false, error: 'Push dispatch already in-flight' };
      }
    }

    const rawTokens = Array.isArray(payload.toToken) ? payload.toToken : [payload.toToken];
    const validTokens = rawTokens.filter((tok) => this.isValidToken(tok) && !this.invalidTokens.has(tok));

    if (validTokens.length === 0) {
      return { success: false, error: 'No valid or active push tokens provided' };
    }

    const channelId = payload.channelId ?? this.resolveChannelId(payload.data?.type as string | undefined);
    const messages = validTokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound ?? 'default',
      badge: payload.badge,
      channelId,
      priority: payload.priority ?? 'high',
      ttl: 2419200, // 4 weeks retention
    }));

    try {
      // Chunk messages in groups of 100 for batch optimization
      const allReceipts: PushReceipt[] = [];
      const CHUNK_SIZE = 100;

      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
        const chunk = messages.slice(i, i + CHUNK_SIZE);
        const chunkReceipts = await this.breaker.execute(async () => {
          return await withRetry(
            async () => {
              return await this.provider.sendPushBatch(chunk);
            },
            { maxRetries: 3, initialDelayMs: 150 },
          );
        });

        // Track invalid tokens for cleanup
        chunkReceipts.forEach((receipt, index) => {
          if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            this.invalidTokens.add(chunk[index].to);
          }
        });

        allReceipts.push(...chunkReceipts);
      }

      if (payload.idempotencyKey) {
        idempotencyEngine.complete(`push:${payload.idempotencyKey}`, {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({ sentCount: allReceipts.length }),
        });
      }

      return { success: true, tickets: allReceipts };
    } catch (err) {
      if (payload.idempotencyKey) {
        idempotencyEngine.fail(`push:${payload.idempotencyKey}`);
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
        const payload = JSON.parse(record.body) as PushNotificationPayload;
        const res = await this.processPush(payload);
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

export const pushWorkerService = new PushWorkerService();
