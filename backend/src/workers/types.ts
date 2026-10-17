export interface SmsNotificationPayload {
  toPhoneNumber: string;
  templateId?: string;
  messageText: string;
  variables?: Record<string, string>;
  priority?: 'HIGH' | 'NORMAL';
  idempotencyKey?: string;
}

export interface EmailNotificationPayload {
  toEmail: string;
  subject: string;
  template: 'BOOKING_CONFIRMED' | 'ESCROW_HELD' | 'ESCROW_RELEASED' | 'DELIVERY_OTP' | 'RECEIPT' | 'GENERIC';
  variables: Record<string, unknown>;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface PushNotificationPayload {
  toToken: string | string[]; // Single token or array of Expo push tokens
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  idempotencyKey?: string;
}

export interface WorkerBatchResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: Array<{ id: string; error: string }>;
}
