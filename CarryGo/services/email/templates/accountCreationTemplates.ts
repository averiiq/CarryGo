import {
  renderBaseEmailLayout,
  renderOtpBox,
  renderAlertBox,
  convertHtmlToPlainText,
} from '../baseLayout';
import {
  AccountVerificationEmailData,
  AccountConfirmedEmailData,
  RenderedEmail,
} from '../types';

/**
 * 1. Account Creation - Email Verification / OTP Code
 */
export function buildAccountVerificationEmail(data: AccountVerificationEmailData): RenderedEmail {
  const expiry = data.expiryMinutes || 10;
  const greeting = data.userName ? `Hi ${data.userName},` : 'Hello,';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      ${greeting}
    </p>
    <p style="margin: 0 0 16px 0;">
      Welcome to <strong>CaryGoo</strong>! To finish setting up your account, please enter the one-time verification code below into the app:
    </p>

    ${renderOtpBox(data.verificationCode, `Valid for ${expiry} minutes. Never share this code with anyone.`)}

    <p style="margin: 16px 0; font-size: 14px; color: #475569;">
      If you did not request this verification code or didn't attempt to sign up for CaryGoo, you can safely ignore this email.
    </p>

    ${data.device || data.ipAddress ? `
    ${renderAlertBox(
      `Attempt initiated from: <strong>${data.device || 'Mobile App'}</strong>${data.ipAddress ? ` (IP: ${data.ipAddress})` : ''}. If this wasn't you, someone may have entered your email by mistake.`,
      'info'
    )}
    ` : ''}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Your CaryGoo verification code is ${data.verificationCode}. Valid for ${expiry} minutes.`,
    title: 'Verify Your Email Address',
    badge: { text: 'Account Verification', variant: 'primary' },
    contentHtml,
    primaryCta: data.verificationUrl ? {
      text: 'Verify Account',
      url: data.verificationUrl,
    } : undefined,
    footerNote: 'CaryGoo security tip: Our support team will never ask for your verification code or password.',
  });

  return {
    subject: `${data.verificationCode} is your CaryGoo verification code`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'account_creation',
  };
}

/**
 * 2. Account Confirmed / Successfully Activated
 */
export function buildAccountConfirmedEmail(data: AccountConfirmedEmailData): RenderedEmail {
  const loginUrl = data.loginUrl || 'https://carygoo.com/login';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Your <strong>CaryGoo</strong> account has been successfully verified and activated!
    </p>

    ${renderAlertBox(
      'Your account is ready for fast, trusted peer-to-peer delivery across India. To unlock unlimited sender & traveller capabilities, complete your quick 2-minute KYC verification in the app.',
      'success',
      '🎉'
    )}

    <h3 style="margin: 20px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      What you can do now:
    </h3>
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
      <li><strong>Send Packages:</strong> List a parcel and match with verified travellers heading along your route.</li>
      <li><strong>Travel & Earn:</strong> List your upcoming flight, train, bus, or road trip and earn by carrying verified packages.</li>
      <li><strong>Verified Safety:</strong> Every delivery is protected by secure OTP handover and identity-checked users.</li>
    </ul>
  `;

  const html = renderBaseEmailLayout({
    preheader: 'Your CaryGoo account has been successfully created and verified.',
    title: 'Welcome Aboard! Account Verified',
    badge: { text: 'Account Active', variant: 'success' },
    contentHtml,
    primaryCta: {
      text: 'Open CaryGoo App',
      url: loginUrl,
    },
    footerNote: 'Need help getting started? Visit our Help Center at support@carygoo.com.',
  });

  return {
    subject: 'Welcome to CaryGoo — Your account is active!',
    html,
    text: convertHtmlToPlainText(html),
    category: 'account_creation',
  };
}

