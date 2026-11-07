import {
  renderBaseEmailLayout,
  renderDetailsGrid,
  renderOtpBox,
  renderAlertBox,
  convertHtmlToPlainText,
  DetailItem,
} from '../baseLayout';
import {
  NewDeviceLoginEmailData,
  PasswordResetEmailData,
  PaymentReservedEmailData,
  RenderedEmail,
} from '../types';

/**
 * 8. Security & Transaction Confirmation Email Templates
 */

export function buildNewDeviceLoginEmail(data: NewDeviceLoginEmailData): RenderedEmail {
  const details: DetailItem[] = [
    { label: 'Device', value: data.device },
    ...(data.operatingSystem ? [{ label: 'Operating System', value: data.operatingSystem }] : []),
    ...(data.browserOrApp ? [{ label: 'App / Client', value: data.browserOrApp }] : []),
    ...(data.approximateLocation ? [{ label: 'Location', value: data.approximateLocation }] : []),
    { label: 'IP Address', value: data.ipAddress },
    { label: 'Time (IST)', value: data.timestamp },
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      A new sign-in was detected on your <strong>CaryGoo</strong> account:
    </p>

    ${renderDetailsGrid(details)}

    ${renderAlertBox(
      'If this was you, you can safely disregard this email. If you did NOT sign in from this device, please lock your account immediately and reset your password.',
      'security',
      '🛡️'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Security alert: New sign-in detected from ${data.device} on your CaryGoo account.`,
    title: 'New Sign-in Detected',
    badge: { text: 'Security Alert', variant: 'warning' },
    contentHtml,
    primaryCta: {
      text: 'Secure My Account Now',
      url: data.secureAccountUrl,
    },
    footerNote: 'This is an automated security alert sent to safeguard your CaryGoo account.',
  });

  return {
    subject: `Security Alert: New sign-in from ${data.device}`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'security',
  };
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): RenderedEmail {
  const expiry = data.expiryMinutes || 15;
  const greeting = data.userName ? `Hi ${data.userName},` : 'Hello,';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      ${greeting}
    </p>
    <p style="margin: 0 0 16px 0;">
      We received a request to reset the password for your CaryGoo account. You can reset your password using the secure button below:
    </p>

    ${data.resetCode ? `
    ${renderOtpBox(data.resetCode, `Password reset token valid for ${expiry} minutes.`)}
    ` : ''}

    ${renderAlertBox(
      `This password reset link is valid for <strong>${expiry} minutes</strong>. If you did not request a password reset, your account is safe and you can ignore this email.`,
      'info',
      '🔒'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Reset your CaryGoo account password. Link valid for ${expiry} minutes.`,
    title: 'Password Reset Request',
    badge: { text: 'Password Reset', variant: 'primary' },
    contentHtml,
    primaryCta: {
      text: 'Reset Password',
      url: data.resetUrl,
    },
    footerNote: 'CaryGoo will never email you asking for your password or OTP code.',
  });

  return {
    subject: 'Reset your CaryGoo password',
    html,
    text: convertHtmlToPlainText(html),
    category: 'security',
  };
}

/**
 * Payment Reserved Receipt (Strictly NO "escrow" phrasing)
 */
export function buildPaymentReservedEmail(data: PaymentReservedEmailData): RenderedEmail {
  const trackingUrl = data.trackingUrl || `https://carygoo.com/requests/${data.requestId}`;

  const details: DetailItem[] = [
    { label: 'Receipt No.', value: data.receiptNumber },
    { label: 'Delivery Request', value: `#${data.requestId.substring(0, 8).toUpperCase()}` },
    { label: 'Parcel', value: data.parcelTitle },
    { label: 'Route', value: `${data.fromCity} → ${data.toCity}` },
    { label: 'Traveller', value: data.travellerName },
    { label: 'Reserved Amount', value: `₹${data.amount}`, highlight: true },
    { label: 'Date', value: data.date },
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Thank you for your payment. Your delivery payment of <strong>₹${data.amount}</strong> is now securely reserved with CaryGoo Secure Guarantee for your delivery from <strong>${data.fromCity}</strong> to <strong>${data.toCity}</strong>.
    </p>

    ${renderDetailsGrid(details)}

    ${renderAlertBox(
      'Your payment remains safely reserved until delivery is completed. Once the recipient confirms parcel receipt using the delivery OTP code, the payout is released to the traveller.',
      'success',
      '🔒'
    )}

    <h3 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      Handover Security Guarantee:
    </h3>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      If for any reason the delivery cannot be completed, your reserved payment is refunded in accordance with CaryGoo Delivery Guarantee guidelines.
    </p>
  `;

  const html = renderBaseEmailLayout({
    preheader: `Payment Receipt: ₹${data.amount} reserved for delivery to ${data.toCity} [#${data.receiptNumber}]`,
    title: 'Payment Reserved Confirmation 🧾',
    badge: { text: 'Payment Reserved', variant: 'success' },
    contentHtml,
    primaryCta: {
      text: 'Track Delivery Status',
      url: trackingUrl,
    },
    footerNote: 'Retain this receipt for your records. Need billing assistance? Contact support@carygoo.com.',
  });

  return {
    subject: `Payment Receipt: ₹${data.amount} reserved for ${data.fromCity} → ${data.toCity} [#${data.receiptNumber}]`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'security',
  };
}

