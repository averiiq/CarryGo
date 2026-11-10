/**
 * Unified Notification Orchestrator
 * Coordinates multi-channel dispatches (in-app, push, email, sms)
 * with strict recipient isolation and anti-self-alert safety guarantees.
 */

import { getSupabaseClient } from '@/template';
import { inAppNotificationService } from './in-app.service';
import { pushNotificationService } from './push.service';
import { emailNotificationService } from './email.service';
import { smsNotificationService } from './sms.service';
import {
  ChannelResult,
  NotificationCategory,
  NotificationChannel,
  UnifiedNotificationPayload,
  UnifiedNotificationResult,
  UserNotificationPreferences,
} from './types';

export class NotificationOrchestrator {
  /**
   * Fetches user notification preferences, caching or falling back to all-true defaults.
   */
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    const defaults: UserNotificationPreferences = {
      userId,
      enableMatches: true,
      enableTripUpdates: true,
      enableParcelUpdates: true,
      enableChat: true,
      enablePayments: true,
      enablePromotions: true,
      enableCityAlerts: true,
    };

    if (!userId) return defaults;

    try {
      const sb = getSupabaseClient();
      const { data, error } = await (sb as any)
        .from('user_notification_preferences')
        .select('user_id, enable_matches, enable_trip_updates, enable_parcel_updates, enable_chat, enable_payments, enable_promotions, enable_city_alerts')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return defaults;
      const row = data as any;

      return {
        userId,
        enableMatches: row.enable_matches ?? true,
        enableTripUpdates: row.enable_trip_updates ?? true,
        enableParcelUpdates: row.enable_parcel_updates ?? true,
        enableChat: row.enable_chat ?? true,
        enablePayments: row.enable_payments ?? true,
        enablePromotions: row.enable_promotions ?? true,
        enableCityAlerts: row.enable_city_alerts ?? true,
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Evaluates if a given category is allowed by user preferences.
   */
  isCategoryAllowed(category: NotificationCategory | undefined, prefs: UserNotificationPreferences): boolean {
    if (!category) return true;
    switch (category) {
      case 'matching':
        return prefs.enableMatches;
      case 'trip_update':
        return prefs.enableTripUpdates;
      case 'parcel_update':
        return prefs.enableParcelUpdates;
      case 'message':
        return prefs.enableChat;
      case 'payment':
        return prefs.enablePayments;
      default:
        return true;
    }
  }

  /**
   * Central dispatch method for all notification channels.
   */
  async send(payload: UnifiedNotificationPayload): Promise<UnifiedNotificationResult> {
    const recipientId = typeof payload.recipient === 'string'
      ? payload.recipient
      : payload.recipient?.userId;

    if (!recipientId) {
      return {
        success: false,
        recipientId: '',
        channelResults: {},
        error: 'Recipient ID is required for notification dispatch',
      };
    }

    // ── STRICT ANTI-SELF-ALERT GUARD ─────────────────────────────────────────
    // Prevent senders from receiving their own notifications!
    if (payload.senderId && payload.senderId === recipientId && payload.type !== 'system_alert') {
      console.log(`[NotificationOrchestrator] Suppressed self-notification for user ${recipientId} (type: ${payload.type})`);
      return {
        success: false,
        recipientId,
        channelResults: {
          in_app: { success: false, skipped: true, reason: 'Self-notification suppressed' },
          push: { success: false, skipped: true, reason: 'Self-notification suppressed' },
        },
        error: 'Self-notification suppressed',
      };
    }

    const priority = payload.priority || 'normal';
    const category = payload.category || 'general';
    const channels = payload.channels && payload.channels.length > 0
      ? payload.channels
      : (['in_app', 'push'] as NotificationChannel[]);

    // Check user preferences
    const prefs = await this.getUserPreferences(recipientId);
    const categoryAllowed = this.isCategoryAllowed(category, prefs);

    const channelResults: Record<NotificationChannel, ChannelResult> = {
      in_app: { success: false, skipped: true },
      push: { success: false, skipped: true },
      email: { success: false, skipped: true },
      sms: { success: false, skipped: true },
    };

    let createdNotificationId: string | undefined;
    let pushTokensFromDb: string[] | undefined;

    // ── 1. In-App Notification Dispatch ───────────────────────────────────────
    if (channels.includes('in_app')) {
      const inAppRes = await inAppNotificationService.createNotification(recipientId, {
        title: payload.title,
        body: payload.body,
        type: payload.type,
        category,
        priority,
        relatedId: payload.relatedId,
        deepLink: payload.deepLink,
        data: payload.data,
      });

      channelResults.in_app = inAppRes;
      if (inAppRes.success) {
        createdNotificationId = inAppRes.id;
        pushTokensFromDb = inAppRes.pushTokens;
      }
    }

    // If user disabled notifications for this category and it's not critical, skip external channels
    if (!categoryAllowed && priority !== 'critical') {
      console.log(`[NotificationOrchestrator] External channels skipped for user ${recipientId} due to preferences (${category})`);
      return {
        success: channelResults.in_app?.success ?? false,
        recipientId,
        notificationId: createdNotificationId,
        channelResults,
      };
    }

    const parallelDispatches: Promise<void>[] = [];

    // ── 2. Push Notification Dispatch ─────────────────────────────────────────
    if (channels.includes('push')) {
      parallelDispatches.push(
        (async () => {
          const pushRes = await pushNotificationService.sendPush({
            recipientId,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            category,
            priority,
            relatedId: payload.relatedId,
            deepLink: payload.deepLink,
            data: payload.data,
            tokens: pushTokensFromDb,
            options: payload.pushOptions,
          });
          channelResults.push = pushRes;
        })()
      );
    }

    // ── 3. Email Notification Dispatch ────────────────────────────────────────
    if (channels.includes('email')) {
      parallelDispatches.push(
        (async () => {
          const emailRes = await emailNotificationService.sendEmail({
            recipientId,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            category,
            priority,
            deepLink: payload.deepLink,
            options: payload.emailOptions,
          });
          channelResults.email = emailRes;
        })()
      );
    }

    // ── 4. SMS Notification Dispatch ──────────────────────────────────────────
    if (channels.includes('sms')) {
      parallelDispatches.push(
        (async () => {
          const smsRes = await smsNotificationService.sendSms({
            recipientId,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            category,
            priority,
            options: payload.smsOptions,
          });
          channelResults.sms = smsRes;
        })()
      );
    }

    await Promise.allSettled(parallelDispatches);

    const overallSuccess =
      (channelResults.in_app?.success ?? false) ||
      (channelResults.push?.success ?? false) ||
      (channelResults.email?.success ?? false) ||
      (channelResults.sms?.success ?? false);

    return {
      success: overallSuccess,
      recipientId,
      notificationId: createdNotificationId,
      channelResults,
    };
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
