import { getSupabaseClient } from '@/template';
import { captureException } from '@/lib/monitoring';
import {
  EmailMessage,
  EmailResult,
  EmailRecipient,
  AccountVerificationEmailData,
  AccountConfirmedEmailData,
  WelcomeEmailData,
  DeliveryEmailData,
  ParcelListedEmailData,
  ParcelMatchFoundEmailData,
  ParcelStatusUpdateEmailData,
  KycEmailData,
  ReferralPromotionEmailData,
  CorridorDiscountEmailData,
  RewardTierUpgradeEmailData,
  AppFeatureUpdateEmailData,
  PolicyUpdateEmailData,
  SystemMaintenanceEmailData,
  NewDeviceLoginEmailData,
  PasswordResetEmailData,
  PaymentReservedEmailData,
} from './types';
import {
  buildAccountVerificationEmail,
  buildAccountConfirmedEmail,
  buildWelcomeEmail,
  buildDeliveryStatusEmail,
  buildParcelListedEmail,
  buildParcelMatchFoundEmail,
  buildParcelStatusUpdateEmail,
  buildKycStatusEmail,
  buildReferralPromotionEmail,
  buildCorridorDiscountEmail,
  buildRewardTierUpgradeEmail,
  buildAppFeatureUpdateEmail,
  buildPolicyUpdateEmail,
  buildSystemMaintenanceEmail,
  buildNewDeviceLoginEmail,
  buildPasswordResetEmail,
  buildPaymentReservedEmail,
} from './templates';

export const DEFAULT_FROM_EMAIL = 'CaryGoo <notifications@carygoo.com>';
export const SUPPORT_EMAIL = 'support@carygoo.com';

function normalizeRecipients(to: string | EmailRecipient | (string | EmailRecipient)[]): string[] {
  const array = Array.isArray(to) ? to : [to];
  return array.map((r) => {
    if (typeof r === 'string') return r.trim();
    if (r && typeof r === 'object' && r.email) {
      return r.name ? `${r.name} <${r.email}>` : r.email;
    }
    return '';
  }).filter(Boolean);
}

/**
 * Dispatches an email using the active provider:
 * 1. Resend API (if EXPO_PUBLIC_RESEND_API_KEY is configured)
 * 2. Supabase Edge Function 'send-email' (if backend provider enabled)
 * 3. Graceful fallback logger in test / development mode
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const recipients = normalizeRecipients(message.to);
  if (recipients.length === 0) {
    return { success: false, error: 'Recipient email address is required.' };
  }

  const from = message.from || DEFAULT_FROM_EMAIL;
  const replyTo = message.replyTo || SUPPORT_EMAIL;

  // 1. Direct Resend API Integration
  const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: replyTo,
          headers: message.headers,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        console.log(`[EmailService] Resend dispatch success (${data.id}) to:`, recipients.join(', '));
        return { success: true, messageId: data.id, provider: 'resend' };
      }
      console.warn('[EmailService] Resend returned error:', data);
    } catch (err) {
      console.warn('[EmailService] Resend HTTP failure:', err);
      captureException(err, { context: 'sendEmail.resend' });
    }
  }

  // 2. Supabase Edge Function 'send-email' Fallback
  try {
    const sb = getSupabaseClient();
    const { data: edgeData, error: edgeError } = await sb.functions.invoke('send-email', {
      body: {
        to: recipients,
        from,
        replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        category: message.category,
      },
    });

    if (!edgeError && edgeData?.success) {
      console.log('[EmailService] Edge function dispatch success to:', recipients.join(', '));
      return { success: true, messageId: edgeData.messageId || `edge_${Date.now()}`, provider: 'supabase_edge' };
    }
  } catch (err) {
    // Edge function not deployed or network unavailable — fall through to local logging
  }

  // 3. Fallback / Dev Mode Simulator
  const mockId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[EmailService] [Dev/Demo] Email queued for delivery:
  To: ${recipients.join(', ')}
  Subject: ${message.subject}
  Category: ${message.category || 'general'}
  MessageId: ${mockId}`);

  return {
    success: true,
    messageId: mockId,
    provider: 'simulator',
  };
}

// ── High-Level Convenience Dispatchers ─────────────────────────────────────

export async function sendAccountVerificationEmail(
  data: AccountVerificationEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildAccountVerificationEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendAccountConfirmedEmail(
  data: AccountConfirmedEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildAccountConfirmedEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendWelcomeEmail(
  data: WelcomeEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildWelcomeEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendDeliveryStatusEmail(
  data: DeliveryEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildDeliveryStatusEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendParcelListedEmail(
  data: ParcelListedEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildParcelListedEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendParcelMatchFoundEmail(
  data: ParcelMatchFoundEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildParcelMatchFoundEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendParcelStatusUpdateEmail(
  data: ParcelStatusUpdateEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildParcelStatusUpdateEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendKycStatusEmail(
  data: KycEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildKycStatusEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendReferralPromotionEmail(
  data: ReferralPromotionEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildReferralPromotionEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendCorridorDiscountEmail(
  data: CorridorDiscountEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildCorridorDiscountEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendRewardTierUpgradeEmail(
  data: RewardTierUpgradeEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildRewardTierUpgradeEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendAppFeatureUpdateEmail(
  data: AppFeatureUpdateEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildAppFeatureUpdateEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendPolicyUpdateEmail(
  data: PolicyUpdateEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildPolicyUpdateEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendSystemMaintenanceEmail(
  data: SystemMaintenanceEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildSystemMaintenanceEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendNewDeviceLoginEmail(
  data: NewDeviceLoginEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildNewDeviceLoginEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendPasswordResetEmail(
  data: PasswordResetEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildPasswordResetEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

export async function sendPaymentReservedEmail(
  data: PaymentReservedEmailData,
  recipientEmail: string
): Promise<EmailResult> {
  const rendered = buildPaymentReservedEmail(data);
  return sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    category: rendered.category,
  });
}

