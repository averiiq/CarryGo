/**
 * In-App Notification Service
 * Manages database persistence, reads, unread counts, and query isolation.
 */

import { getSupabaseClient } from '@/template';
import { captureException } from '@/lib/monitoring';
import { AppNotification } from '@/types';
import type { Database } from '@/types/database';
import { ChannelResult, NotificationCategory, NotificationPriority } from './types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'] & {
  category?: string | null;
  priority?: string | null;
  deep_link?: string | null;
  image_url?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type as AppNotification['type'],
    category: (row.category || 'general') as AppNotification['category'],
    priority: (row.priority || 'normal') as AppNotification['priority'],
    relatedId: row.related_id ?? undefined,
    deepLink: row.deep_link ?? null,
    imageUrl: row.image_url ?? null,
    data: (row.data as Record<string, unknown>) ?? {},
    read: row.read,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export interface InAppCreatePayload {
  title: string;
  body: string;
  type?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  relatedId?: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

export class InAppNotificationService {
  /**
   * Persists an in-app notification strictly bound to recipientId.
   */
  async createNotification(
    recipientId: string,
    payload: InAppCreatePayload
  ): Promise<ChannelResult & { pushTokens?: string[] }> {
    if (!recipientId) {
      return { success: false, error: 'Recipient ID is required for in-app notification' };
    }

    const sb = getSupabaseClient();
    const title = payload.title.trim();
    const body = payload.body.trim();

    try {
      // 1. Try secure dispatch RPC first
      const { data: cmdData, error: cmdErr } = await sb.rpc('dispatch_notification_command', {
        p_recipient_id: recipientId,
        p_title: title,
        p_body: body,
        p_type: payload.type || 'general',
        p_related_id: payload.relatedId || undefined,
        p_deep_link: payload.deepLink || undefined,
        p_data: (payload.data || {}) as any,
      });

      if (!cmdErr && cmdData) {
        const row = Array.isArray(cmdData) ? cmdData[0] : cmdData;
        const notificationId = (row as any)?.notification_id || (row as any)?.id;
        const rawTokens = (row as any)?.push_tokens;
        let pushTokens: string[] = [];

        if (Array.isArray(rawTokens)) {
          pushTokens = rawTokens.filter((t): t is string => typeof t === 'string' && t.length > 0);
        } else if (typeof rawTokens === 'string' && rawTokens.startsWith('{')) {
          pushTokens = rawTokens.slice(1, -1).split(',').filter(Boolean);
        }

        return {
          success: true,
          id: notificationId,
          pushTokens,
        };
      }

      // 2. Direct insert fallback if RPC isn't deployed or returned an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertRecord: any = {
        user_id: recipientId,
        title,
        body,
        type: payload.type || 'general',
        category: payload.category || 'general',
        priority: payload.priority || 'normal',
        related_id: payload.relatedId || null,
        deep_link: payload.deepLink || null,
        data: payload.data || {},
      };

      if (payload.idempotencyKey) {
        insertRecord.idempotency_key = payload.idempotencyKey;
      }

      const { data: inserted, error: insertErr } = await sb
        .from('notifications')
        .insert(insertRecord)
        .select('id')
        .single();

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }

      return {
        success: true,
        id: inserted?.id,
      };
    } catch (err) {
      captureException(err, { context: 'InAppNotificationService.createNotification' });
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fetches in-app notifications strictly filtered by userId.
   */
  async fetchNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean; category?: string }
  ): Promise<{ data: AppNotification[]; error: string | null }> {
    if (!userId) {
      return { data: [], error: 'User ID is required' };
    }

    try {
      const sb = getSupabaseClient();
      const limit = Math.min(options?.limit ?? 50, 100);
      const offset = options?.offset ?? 0;

      let query: any = (sb.from('notifications') as any)
        .select('id, user_id, title, body, type, category, priority, related_id, deep_link, image_url, data, read, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (options?.unreadOnly) {
        query = query.eq('read', false);
      }
      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;
      if (error) {
        return { data: [], error: error.message };
      }

      return {
        data: ((data as NotificationRow[] | null) || []).map((row: NotificationRow) => mapRow(row)),
        error: null,
      };
    } catch (err) {
      captureException(err, { context: 'InAppNotificationService.fetchNotifications' });
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fetches unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const sb = getSupabaseClient();
      const { count, error } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Marks a single notification as read, ensuring it belongs to userId.
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!notificationId || !userId) {
      return { success: false, error: 'Notification ID and User ID are required' };
    }
    try {
      const sb = getSupabaseClient();
      const { error } = await (sb.from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Marks multiple notifications as read.
   */
  async markManyAsRead(notificationIds: string[], userId: string): Promise<{ success: boolean; error?: string }> {
    if (!notificationIds.length || !userId) {
      return { success: false, error: 'Notification IDs and User ID are required' };
    }
    try {
      const sb = getSupabaseClient();
      const { error } = await (sb.from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    try {
      const sb = getSupabaseClient();
      const { error } = await (sb.from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Deletes a notification, ensuring it belongs to userId.
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!notificationId || !userId) {
      return { success: false, error: 'Notification ID and User ID are required' };
    }
    try {
      const sb = getSupabaseClient();
      const { error } = await sb
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const inAppNotificationService = new InAppNotificationService();
