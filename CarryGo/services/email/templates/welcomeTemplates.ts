import {
  renderBaseEmailLayout,
  renderAlertBox,
  convertHtmlToPlainText,
} from '../baseLayout';
import { WelcomeEmailData, RenderedEmail } from '../types';

/**
 * Welcome Email - Comprehensive onboarding overview for new CaryGoo members.
 */
export function buildWelcomeEmail(data: WelcomeEmailData): RenderedEmail {
  const dashboardUrl = data.dashboardUrl || 'https://carygoo.com';
  const role = data.userRole || 'both';

  const isTraveller = role === 'traveller' || role === 'both';
  const isSender = role === 'sender' || role === 'both';

  const corridorHtml = (data.popularCorridors && data.popularCorridors.length > 0)
    ? `
      <div style="margin: 24px 0 16px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Popular Delivery Corridors
        </h3>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          ${data.popularCorridors.map(c => `
            <tr>
              <td style="padding: 10px 14px; font-size: 14px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #F1F5F9;">
                📍 ${c.from} &rarr; ${c.to}
              </td>
              <td style="padding: 10px 14px; font-size: 14px; color: #008B48; font-weight: 700; text-align: right; border-bottom: 1px solid #F1F5F9;">
                ₹${c.price} avg payout
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const referralHtml = data.referralCode ? `
    <div style="background-color: #E8F8F0; border: 1px solid #A3E7C1; border-radius: 12px; padding: 18px; margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #008B48; text-transform: uppercase; letter-spacing: 0.8px;">
        🎁 Your Personal Referral Code
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #008B48; letter-spacing: 2px; margin: 6px 0;">
        ${data.referralCode}
      </div>
      <div style="font-size: 13px; color: #065F46; line-height: 1.5;">
        Share this code with friends. When they complete their first delivery, you both earn <strong>${data.referralBonusCoins || 100} CaryGoo Coins</strong>!
      </div>
    </div>
  ` : '';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hello ${data.userName}, welcome to CaryGoo!
    </p>
    <p style="margin: 0 0 16px 0;">
      We're thrilled to have you in the CaryGoo community! CaryGoo connects people who need to send parcels with trusted travellers who already have spare luggage space heading on the same route.
    </p>

    ${renderAlertBox(
      'Same-day, next-day, and express intercity deliveries with zero warehouse delays and verified identity checks on every transaction.',
      'info',
      '⚡'
    )}

    <h3 style="margin: 24px 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      How CaryGoo Works For You:
    </h3>

    ${isSender ? `
    <div style="margin-bottom: 14px; padding-left: 14px; border-left: 3px solid #004AAD;">
      <strong style="color: #004AAD; font-size: 14px;">📦 Sending a Parcel?</strong>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        List package weight and route. Pick an approved traveller heading on your route, negotiate the price, and enjoy live route tracking with secure OTP verification upon handover.
      </div>
    </div>
    ` : ''}

    ${isTraveller ? `
    <div style="margin-bottom: 14px; padding-left: 14px; border-left: 3px solid #008B48;">
      <strong style="color: #008B48; font-size: 14px;">🚗 Travelling Soon?</strong>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        Post your trip details (flight, train, bus, or car) and get delivery requests from verified senders. Offset your travel fuel and ticket expenses while helping others.
      </div>
    </div>
    ` : ''}

    ${corridorHtml}
    ${referralHtml}

    <h3 style="margin: 24px 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      3 Rules of Community Trust:
    </h3>
    <ol style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
      <li><strong>Always Verify KYC:</strong> Verified users receive 4x more trip requests and priority corridor matching.</li>
      <li><strong>Inspect at Pickup:</strong> Travellers always visually inspect parcel contents at pickup. Prohibited items are strictly banned.</li>
      <li><strong>Delivery OTP:</strong> Payment release happens securely once the sender/recipient verifies the delivery OTP code.</li>
    </ol>
  `;

  const html = renderBaseEmailLayout({
    preheader: `Welcome to CaryGoo, ${data.userName}! Discover faster, smarter peer-to-peer parcel delivery.`,
    title: 'Welcome to the CaryGoo Community! 🚀',
    badge: { text: 'Welcome Guide', variant: 'success' },
    contentHtml,
    primaryCta: {
      text: 'Explore CaryGoo',
      url: dashboardUrl,
    },
    secondaryCta: {
      text: 'Complete KYC',
      url: `${dashboardUrl}/kyc`,
    },
    footerNote: 'Questions? Our 24/7 community team is available anytime at support@carygoo.com.',
  });

  return {
    subject: `Welcome to CaryGoo, ${data.userName}! 🚀 Getting started guide`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'welcome',
  };
}

