/**
 * Transactional Email Notification Service
 * Dispatches transactional notifications via Resend API / Supabase Edge function.
 */

import { getSupabaseClient } from '@/template';
import { captureException } from '@/lib/monitoring';
import { sendEmail } from '@/services/email/email.service';
import { ChannelResult, EmailDispatchOptions, NotificationCategory, NotificationPriority } from './types';

export class EmailNotificationService {
  /**
   * Resolves recipient email from user ID if not provided explicitly.
   */
  async resolveRecipientEmail(userId: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data?.email) return null;
      return data.email;
    } catch {
      return null;
    }
  }

  /**
   * Formats a standard branded transactional email HTML template.
   */
  buildHtmlBody(params: { title: string; body: string; deepLink?: string; actionLabel?: string }): string {
    const { title, body, deepLink, actionLabel } = params;
    const actionButton = deepLink
      ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="https://carygoo.com/app?redirect=${encodeURIComponent(deepLink)}" 
           style="background-color: #004AAD; color: #ffffff; padding: 14px 28px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
          ${actionLabel || 'View in CaryGoo'}
        </a>
      </div>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background-color: #004AAD; padding: 24px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CaryGoo</h1>
            <p style="color: #BAE6FD; margin: 4px 0 0; font-size: 13px;">Peer-to-Peer Intercity Delivery</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px 28px;">
            <h2 style="color: #0F172A; margin: 0 0 16px; font-size: 18px; font-weight: 600;">${title}</h2>
            <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 20px;">
              ${body.replace(/\n/g, '<br/>')}
            </p>
            ${actionButton}
          </div>
          <!-- Footer -->
          <div style="background-color: #F1F5F9; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #64748B; font-size: 12px; margin: 0 0 6px;">
              You received this because of an active request or trip on CaryGoo.
            </p>
            <p style="color: #94A3B8; font-size: 11px; margin: 0;">
              &copy; ${new Date().getFullYear()} Averiq Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Sends an email notification to the recipient.
   */
  async sendEmail(params: {
    recipientId: string;
    title: string;
    body: string;
    type?: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    deepLink?: string;
    options?: EmailDispatchOptions;
  }): Promise<ChannelResult> {
    const { recipientId, title, body, deepLink, options } = params;

    let email = options?.recipientEmail;
    if (!email) {
      email = (await this.resolveRecipientEmail(recipientId)) ?? undefined;
    }

    if (!email) {
      return {
        success: true,
        skipped: true,
        reason: 'No email address registered for user',
      };
    }

    const subject = options?.subject || title;
    const html = options?.html || this.buildHtmlBody({ title, body, deepLink });
    const text = options?.text || `${title}\n\n${body}\n\nOpen CaryGoo: https://carygoo.com`;

    try {
      const result = await sendEmail({
        to: email,
        subject,
        html,
        text,
        replyTo: options?.replyTo,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to dispatch email',
        };
      }

      console.log(`[EmailNotificationService] Email dispatched successfully to ${email} (ID: ${result.messageId})`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (err) {
      console.warn('[EmailNotificationService] Error sending email:', err);
      captureException(err, { context: 'EmailNotificationService.sendEmail' });
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const emailNotificationService = new EmailNotificationService();

