/**
 * Unified Notification Architecture Types
 * CarryGo Standalone Notification Service
 */

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationCategory =
  | 'matching'
  | 'trip_update'
  | 'parcel_update'
  | 'payment'
  | 'message'
  | 'general'
  | 'system';

export type NotificationType =
  | 'new_request'
  | 'new_offer'
  | 'request_accepted'
  | 'request_rejected'
  | 'request_cancelled'
  | 'delivery_otp'
  | 'delivery_pickup'
  | 'delivery_confirmed'
  | 'trip_milestone'
  | 'payment_reserved'
  | 'payment_released'
  | 'payment_refunded'
  | 'chat_message'
  | 'kyc_update'
  | 'system_alert'
  | 'general';

export interface NotificationRecipient {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface EmailDispatchOptions {
  subject?: string;
  html?: string;
  text?: string;
  recipientEmail?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  replyTo?: string;
}

export interface SmsDispatchOptions {
  message?: string;
  recipientPhone?: string;
  templateId?: string;
  otp?: string;
}

export interface PushDispatchOptions {
  channelId?: 'default' | 'messages' | 'deliveries' | 'payments';
  badge?: number;
  sound?: boolean | string;
  data?: Record<string, unknown>;
}

export interface UnifiedNotificationPayload {
  /** Target user who should receive this notification (ID or full recipient object) */
  recipient: string | NotificationRecipient;
  /** Initiating user ID (used for strict anti-self-alerting checks) */
  senderId?: string;
  /** Title for notification alert */
  title: string;
  /** Main message body */
  body: string;
  /** Granular event type */
  type: NotificationType | string;
  /** Functional category */
  category?: NotificationCategory;
  /** Priority level */
  priority?: NotificationPriority;
  /** Channels to dispatch across (defaults to ['in_app', 'push']) */
  channels?: NotificationChannel[];
  /** Related entity ID (request ID, delivery ID, trip ID, parcel ID, conversation ID) */
  relatedId?: string;
  /** Deep link route for mobile navigation */
  deepLink?: string;
  /** Metadata dictionary */
  data?: Record<string, unknown>;
  /** Optional channel-specific options */
  emailOptions?: EmailDispatchOptions;
  smsOptions?: SmsDispatchOptions;
  pushOptions?: PushDispatchOptions;
}

export interface ChannelResult {
  success: boolean;
  id?: string;
  messageId?: string;
  ticketCount?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface UnifiedNotificationResult {
  success: boolean;
  recipientId: string;
  notificationId?: string;
  channelResults: {
    in_app?: ChannelResult;
    push?: ChannelResult;
    email?: ChannelResult;
    sms?: ChannelResult;
  };
  error?: string;
}

export interface UserNotificationPreferences {
  userId: string;
  enableMatches: boolean;
  enableTripUpdates: boolean;
  enableParcelUpdates: boolean;
  enableChat: boolean;
  enablePayments: boolean;
  enablePromotions: boolean;
  enableCityAlerts: boolean;
}

