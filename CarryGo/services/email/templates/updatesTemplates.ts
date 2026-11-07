import {
  renderBaseEmailLayout,
  renderAlertBox,
  convertHtmlToPlainText,
} from '../baseLayout';
import {
  AppFeatureUpdateEmailData,
  PolicyUpdateEmailData,
  SystemMaintenanceEmailData,
  RenderedEmail,
} from '../types';

/**
 * 7. System, Feature & Policy Update Email Templates
 */

export function buildAppFeatureUpdateEmail(data: AppFeatureUpdateEmailData): RenderedEmail {
  const ctaUrl = data.ctaUrl || 'https://carygoo.com';
  const ctaText = data.ctaText || 'Try New Features';

  const highlightsHtml = data.highlights.map(h => `
    <div style="margin-bottom: 16px; padding: 14px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
      <div style="font-size: 15px; font-weight: 700; color: #004AAD;">
        ${h.icon ? `${h.icon} ` : '✨ '}${h.title}
      </div>
      <div style="font-size: 13.5px; color: #475569; margin-top: 4px; line-height: 1.5;">
        ${h.description}
      </div>
    </div>
  `).join('');

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      ${data.userName ? `Hi ${data.userName},` : 'Hello CaryGoo Member,'}
    </p>
    <p style="margin: 0 0 20px 0;">
      We're excited to announce CaryGoo <strong>version ${data.version}</strong>! Here are the latest improvements designed to make your peer-to-peer delivery experience faster, smoother, and more reliable:
    </p>

    ${highlightsHtml}

    ${renderAlertBox(
      'Make sure your CaryGoo app is updated to the latest version on the Google Play Store or App Store to enjoy all these improvements.',
      'info',
      '📲'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `What's new in CaryGoo ${data.version}: ${data.releaseTitle}`,
    title: `What's New in CaryGoo v${data.version} 🚀`,
    badge: { text: `v${data.version} Release`, variant: 'primary' },
    contentHtml,
    primaryCta: {
      text: ctaText,
      url: ctaUrl,
    },
    footerNote: 'Feedback? We\'d love to hear your thoughts at support@carygoo.com.',
  });

  return {
    subject: `CaryGoo Update: ${data.releaseTitle} (v${data.version}) 🚀`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'updates',
  };
}

export function buildPolicyUpdateEmail(data: PolicyUpdateEmailData): RenderedEmail {
  const pointsHtml = data.summaryPoints.map(point => `
    <li style="margin-bottom: 8px;">${point}</li>
  `).join('');

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      ${data.userName ? `Hi ${data.userName},` : 'Hello CaryGoo Member,'}
    </p>
    <p style="margin: 0 0 16px 0;">
      We are writing to let you know that we are updating our <strong>${data.policyName}</strong>, effective from <strong>${data.effectiveDate}</strong>.
    </p>

    <h3 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      Key Highlights of This Update:
    </h3>
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.7;">
      ${pointsHtml}
    </ul>

    ${renderAlertBox(
      'By continuing to use CaryGoo on or after the effective date, you agree to these updated terms. If you have questions or concerns, please reach out to our legal and safety team.',
      'info',
      '📄'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Important notice: Updates to our ${data.policyName} effective ${data.effectiveDate}.`,
    title: `Important Notice: ${data.policyName} Update`,
    badge: { text: 'Policy Update', variant: 'info' },
    contentHtml,
    primaryCta: {
      text: 'Read Full Policy',
      url: data.fullPolicyUrl,
    },
    footerNote: 'This is a mandatory service and legal notification regarding your CaryGoo account.',
  });

  return {
    subject: `Important Notice: Updates to CaryGoo ${data.policyName}`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'updates',
  };
}

export function buildSystemMaintenanceEmail(data: SystemMaintenanceEmailData): RenderedEmail {
  const statusUrl = data.statusPageUrl || 'https://carygoo.com/status';

  const affectedHtml = data.affectedServices.map(s => `<li>${s}</li>`).join('');

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      ${data.userName ? `Hi ${data.userName},` : 'Hello CaryGoo Member,'}
    </p>
    <p style="margin: 0 0 16px 0;">
      To keep CaryGoo running smoothly and securely, we will be performing scheduled platform maintenance during the following window:
    </p>

    <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #92400E; text-transform: uppercase;">
        Maintenance Window
      </div>
      <div style="font-size: 16px; font-weight: 700; color: #78350F; margin: 6px 0;">
        ${data.windowStart} &rarr; ${data.windowEnd}
      </div>
    </div>

    <h3 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      Expected Service Impact:
    </h3>
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.7;">
      ${affectedHtml}
    </ul>

    ${renderAlertBox(
      'Active deliveries will not be cancelled. If you are completing a handover during this period, offline delivery OTP codes remain valid.',
      'info',
      '🛠️'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Scheduled maintenance on CaryGoo between ${data.windowStart} and ${data.windowEnd}.`,
    title: 'Scheduled System Maintenance Notice 🛠️',
    badge: { text: 'Maintenance', variant: 'warning' },
    contentHtml,
    primaryCta: {
      text: 'View Status Page',
      url: statusUrl,
    },
    footerNote: 'We apologize for any temporary inconvenience as we upgrade our infrastructure.',
  });

  return {
    subject: `Notice: Scheduled Maintenance on CaryGoo (${data.windowStart})`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'updates',
  };
}

