import {
  renderBaseEmailLayout,
  renderAlertBox,
  convertHtmlToPlainText,
} from '../baseLayout';
import { KycEmailData, RenderedEmail } from '../types';

/**
 * 5. KYC Identity Verification Email Templates
 */
export function buildKycStatusEmail(data: KycEmailData): RenderedEmail {
  const actionUrl = data.actionUrl || 'https://carygoo.com/kyc';

  let title = 'KYC Verification Status';
  let badgeText = 'KYC';
  let badgeVariant: 'primary' | 'success' | 'warning' | 'info' = 'primary';
  let subject = 'CaryGoo Identity Verification Update';
  let bodyHtml = '';
  let primaryCtaText = 'View KYC Status';

  switch (data.status) {
    case 'submitted': {
      title = '📋 KYC Documents Received & Under Review';
      badgeText = 'Under Review';
      badgeVariant = 'info';
      subject = 'KYC Verification Submitted — Under Review';
      primaryCtaText = 'Check Verification Status';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.userName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Thank you for submitting your identity verification documents${data.documentType ? ` (${data.documentType})` : ''}. Our security team is currently reviewing your submission.
        </p>

        ${renderAlertBox(
          'Verification is usually completed within <strong>2 to 24 hours</strong>. We will notify you immediately once your verified status is active.',
          'info',
          '⏳'
        )}

        <h3 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Why KYC matters:
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          CaryGoo is built on trust and mutual safety. Verified profiles ensure peer-to-peer security for senders and travellers alike.
        </p>
      `;
      break;
    }

    case 'approved': {
      title = '✅ KYC Verification Approved!';
      badgeText = 'Verified Member';
      badgeVariant = 'success';
      subject = 'Congratulations! Your CaryGoo KYC is Approved';
      primaryCtaText = 'Explore Verified Features';

      const defaultPerks = [
        'Green "Verified Member" trust badge displayed on your profile',
        'Unlimited parcel listings and trip postings across all corridors',
        'Up to 4x higher matching priority and booking acceptance',
        'Direct access to instant delivery request negotiations',
      ];

      const perks = data.verifiedPerks && data.verifiedPerks.length > 0 ? data.verifiedPerks : defaultPerks;

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Congratulations ${data.userName}!
        </p>
        <p style="margin: 0 0 16px 0;">
          Your identity verification has been <strong>successfully verified and approved</strong>. Your account is now fully verified.
        </p>

        ${renderAlertBox(
          'Your profile now displays the official CaryGoo Verified Badge, establishing instant trust with other community members.',
          'success',
          '🛡️'
        )}

        <h3 style="margin: 22px 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Unlocked Benefits:
        </h3>
        <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
          ${perks.map(p => `<li>${p}</li>`).join('')}
        </ul>
      `;
      break;
    }

    case 'rejected':
    case 'action_needed': {
      title = '⚠️ KYC Verification Requires Attention';
      badgeText = 'Action Required';
      badgeVariant = 'warning';
      subject = 'Action Required: Update your CaryGoo KYC Documents';
      primaryCtaText = 'Resubmit Documents';

      const reasonText = data.reason
        || 'The submitted document was unclear, expired, or did not match your profile name. Please upload a clear, legible photo of an official government ID.';

      bodyHtml = `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
          Hi ${data.userName},
        </p>
        <p style="margin: 0 0 16px 0;">
          Our review team was unable to complete verification of your submitted documents.
        </p>

        ${renderAlertBox(
          `<strong>Reason for review hold:</strong><br>${reasonText}`,
          'warning',
          '📋'
        )}

        <h3 style="margin: 22px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Quick Tips for Instant Approval:
        </h3>
        <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
          <li>Ensure all 4 corners of the ID card are visible.</li>
          <li>Avoid flash glare or heavy shadows covering your photo and name.</li>
          <li>Ensure your document is an official government-issued ID (Aadhaar, Passport, Driving License, or Voter ID).</li>
        </ul>
      `;
      break;
    }
  }

  const html = renderBaseEmailLayout({
    preheader: `${title} - CaryGoo Identity Verification`,
    title,
    badge: { text: badgeText, variant: badgeVariant },
    contentHtml: bodyHtml,
    primaryCta: {
      text: primaryCtaText,
      url: actionUrl,
    },
    footerNote: 'Identity verification is handled under strict security compliance. Details are encrypted at rest.',
  });

  return {
    subject,
    html,
    text: convertHtmlToPlainText(html),
    category: 'kyc',
  };
}

