import {
  renderBaseEmailLayout,
  renderAlertBox,
  convertHtmlToPlainText,
} from '../baseLayout';
import {
  ReferralPromotionEmailData,
  CorridorDiscountEmailData,
  RewardTierUpgradeEmailData,
  RenderedEmail,
} from '../types';

/**
 * 6. Promotional & Loyalty Email Templates
 */

export function buildReferralPromotionEmail(data: ReferralPromotionEmailData): RenderedEmail {
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      Do your friends or colleagues travel between cities or need reliable parcel delivery? Invite them to <strong>CaryGoo</strong> and earn rewards together!
    </p>

    <div style="background-color: #E8F8F0; border: 2px dashed #008B48; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #008B48; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
        Your Unique Referral Code
      </div>
      <div style="font-size: 28px; font-weight: 800; color: #008B48; letter-spacing: 3px; font-family: 'Courier New', Courier, monospace;">
        ${data.referralCode}
      </div>
      <div style="font-size: 13px; color: #065F46; margin-top: 8px;">
        Give ₹50 off their first delivery &bull; You get <strong>${data.bonusCoins} CaryGoo Coins</strong>!
      </div>
    </div>

    ${renderAlertBox(
      'CaryGoo Coins can be redeemed for instant delivery discounts, zero platform fees, and exclusive corridor promotions.',
      'success',
      '🎁'
    )}

    ${typeof data.totalReferrals === 'number' ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; text-align: center; margin: 18px 0; font-size: 13px; color: #475569;">
      You have invited <strong>${data.totalReferrals} friends</strong> and earned <strong>${data.earnedCoins || 0} Coins</strong> so far!
    </div>
    ` : ''}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Invite friends with code ${data.referralCode} and earn ${data.bonusCoins} CaryGoo Coins.`,
    title: 'Invite Friends & Earn Rewards! 🎁',
    badge: { text: 'Referral Rewards', variant: 'success' },
    contentHtml,
    primaryCta: {
      text: 'Share My Referral Code',
      url: data.referralUrl,
    },
    footerNote: 'Terms and conditions apply to CaryGoo referral coin redemptions.',
  });

  return {
    subject: `Give ₹50, Get ${data.bonusCoins} Coins with code ${data.referralCode} — Share CaryGoo!`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'promotional',
  };
}

export function buildCorridorDiscountEmail(data: CorridorDiscountEmailData): RenderedEmail {
  const ctaUrl = data.ctaUrl || 'https://carygoo.com/search';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Hi ${data.userName},
    </p>
    <p style="margin: 0 0 16px 0;">
      We have an exclusive offer just for you on one of our busiest delivery routes: <strong>${data.fromCity} ↔ ${data.toCity}</strong>!
    </p>

    <div style="background: linear-gradient(135deg, #004AAD 0%, #008B48 100%); border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; color: #FFFFFF;">
      <div style="font-size: 14px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">
        ${data.promoTitle}
      </div>
      <div style="font-size: 36px; font-weight: 800; margin: 8px 0;">
        FLAT ₹${data.discountAmount} OFF
      </div>
      <div style="display: inline-block; background-color: #FFFFFF; color: #004AAD; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; margin-top: 4px;">
        USE CODE: ${data.promoCode}
      </div>
    </div>

    ${renderAlertBox(
      `This coupon code is valid until <strong>${data.validUntil}</strong> for parcel deliveries between ${data.fromCity} and ${data.toCity}.`,
      'info',
      '⏳'
    )}
  `;

  const html = renderBaseEmailLayout({
    preheader: `Flat ₹${data.discountAmount} off your next delivery on ${data.fromCity} ↔ ${data.toCity} with code ${data.promoCode}`,
    title: `${data.promoTitle} - Flat ₹${data.discountAmount} OFF`,
    badge: { text: 'Special Offer', variant: 'primary' },
    contentHtml,
    primaryCta: {
      text: 'Send a Parcel Now',
      url: ctaUrl,
    },
    footerNote: `Coupon code ${data.promoCode} is single-use per customer. Expires on ${data.validUntil}.`,
  });

  return {
    subject: `Special Offer: Flat ₹${data.discountAmount} OFF on ${data.fromCity} ↔ ${data.toCity}!`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'promotional',
  };
}

export function buildRewardTierUpgradeEmail(data: RewardTierUpgradeEmailData): RenderedEmail {
  const rewardsUrl = data.rewardsUrl || 'https://carygoo.com/rewards';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
      Congratulations ${data.userName}!
    </p>
    <p style="margin: 0 0 16px 0;">
      Your active deliveries and stellar reputation have leveled you up from <strong>${data.oldTier}</strong> to <strong>${data.newTier} Tier</strong> in the CaryGoo Community!
    </p>

    <div style="background-color: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 1px;">
        New Status Achieved
      </div>
      <div style="font-size: 26px; font-weight: 800; color: #B45309; margin: 6px 0;">
        ⭐ ${data.newTier} Member
      </div>
      <div style="font-size: 13px; color: #92400E;">
        Current Wallet Balance: <strong>${data.currentCoins} CaryGoo Coins</strong>
      </div>
    </div>

    <h3 style="margin: 22px 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
      Your Newly Unlocked Perks:
    </h3>
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
      ${data.unlockedPerks.map(perk => `<li>${perk}</li>`).join('')}
    </ul>
  `;

  const html = renderBaseEmailLayout({
    preheader: `Congratulations! You've achieved ${data.newTier} Tier on CaryGoo.`,
    title: `You've Leveled Up to ${data.newTier}! 🌟`,
    badge: { text: 'Tier Upgrade', variant: 'warning' },
    contentHtml,
    primaryCta: {
      text: 'View My Rewards & Badges',
      url: rewardsUrl,
    },
  });

  return {
    subject: `You've reached ${data.newTier} Tier on CaryGoo! 🌟`,
    html,
    text: convertHtmlToPlainText(html),
    category: 'promotional',
  };
}
