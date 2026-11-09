jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(() => ({
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { success: true, messageId: 'mock_edge_1' }, error: null }),
    },
  })),
}));

import fs from 'fs';
import path from 'path';
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
  sendEmail,
  sendAccountVerificationEmail,
  sendWelcomeEmail,
  sendDeliveryStatusEmail,
} from '@/services/email';

interface PreviewItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  filename: string;
  html: string;
}

describe('CaryGoo Email Templates & Service', () => {
  const allRenderedTemplates: string[] = [];
  const previewCatalog: PreviewItem[] = [];

  function recordPreview(item: PreviewItem) {
    allRenderedTemplates.push(item.html);
    previewCatalog.push(item);
  }

  afterAll(() => {
    // 1. Strict compliance check: ZERO TOLERANCE FOR ESCROW PHRASING
    for (const html of allRenderedTemplates) {
      expect(html.toLowerCase()).not.toContain('escrow');
    }

    // 2. Export HTML files to CarryGo/email-previews/ for visual testing
    const previewsDir = path.resolve(__dirname, '../../email-previews');
    if (!fs.existsSync(previewsDir)) {
      fs.mkdirSync(previewsDir, { recursive: true });
    }

    for (const item of previewCatalog) {
      fs.writeFileSync(path.join(previewsDir, item.filename), item.html, 'utf8');
    }

    // 3. Generate Master Interactive Gallery
    const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CaryGoo Email Templates Preview Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; height: 100vh; background: #0F172A; color: #F8FAFC; overflow: hidden; }
    #sidebar { width: 340px; background: #1E293B; border-right: 1px solid #334155; display: flex; flex-direction: column; flex-shrink: 0; }
    #sidebar-header { padding: 18px 20px; border-bottom: 1px solid #334155; background: #0F172A; }
    #sidebar-header h1 { font-size: 18px; font-weight: 800; color: #004AAD; }
    #sidebar-header h1 span { color: #008B48; }
    #sidebar-header p { font-size: 12px; color: #94A3B8; margin-top: 4px; }
    #template-list { flex: 1; overflow-y: auto; padding: 12px 10px; }
    .category-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin: 14px 10px 6px 10px; }
    .template-item { display: block; width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px; border: none; background: transparent; color: #CBD5E1; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; margin-bottom: 2px; }
    .template-item:hover { background: #334155; color: #FFFFFF; }
    .template-item.active { background: #004AAD; color: #FFFFFF; font-weight: 600; }
    #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0B1120; }
    #toolbar { padding: 12px 20px; background: #1E293B; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    #toolbar-meta h2 { font-size: 15px; font-weight: 700; color: #FFFFFF; }
    #toolbar-meta p { font-size: 12px; color: #94A3B8; margin-top: 2px; }
    #toolbar-actions { display: flex; align-items: center; gap: 8px; }
    .viewport-btn { background: #334155; border: 1px solid #475569; color: #CBD5E1; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; }
    .viewport-btn.active { background: #008B48; border-color: #008B48; color: #FFFFFF; }
    .open-tab-btn { background: #004AAD; border: none; color: #FFFFFF; padding: 6px 14px; border-radius: 6px; font-size: 12px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
    #preview-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto; background: #0F172A; }
    #preview-frame { border: 1px solid #334155; border-radius: 12px; background: #FFFFFF; width: 620px; height: 100%; transition: width 0.25s ease; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
  </style>
</head>
<body>
  <div id="sidebar">
    <div id="sidebar-header">
      <h1>Cary<span>Goo</span> Email Preview Gallery</h1>
      <p>25 Production Templates &bull; Verified 0 Escrow Phrasing</p>
    </div>
    <div id="template-list">
      <!-- Generated items -->
      ${previewCatalog.map((item, idx) => `
        <button class="template-item ${idx === 0 ? 'active' : ''}" data-file="${item.filename}" data-subject="${item.subject.replace(/"/g, '&quot;')}" data-name="${item.name}">
          ${item.name}
        </button>
      `).join('')}
    </div>
  </div>

  <div id="main">
    <div id="toolbar">
      <div id="toolbar-meta">
        <h2 id="current-name">${previewCatalog[0]?.name || 'Email Preview'}</h2>
        <p id="current-subject">${previewCatalog[0]?.subject || ''}</p>
      </div>
      <div id="toolbar-actions">
        <button class="viewport-btn" data-width="375px">📱 Mobile (375px)</button>
        <button class="viewport-btn active" data-width="620px">💻 Desktop (600px)</button>
        <button class="viewport-btn" data-width="100%">🖥️ Full Width</button>
        <a id="open-tab" class="open-tab-btn" href="${previewCatalog[0]?.filename || '#'}" target="_blank">Open Full Page &rarr;</a>
      </div>
    </div>
    <div id="preview-container">
      <iframe id="preview-frame" src="${previewCatalog[0]?.filename || ''}"></iframe>
    </div>
  </div>

  <script>
    const items = document.querySelectorAll('.template-item');
    const frame = document.getElementById('preview-frame');
    const nameEl = document.getElementById('current-name');
    const subjectEl = document.getElementById('current-subject');
    const openTabBtn = document.getElementById('open-tab');
    const viewportBtns = document.querySelectorAll('.viewport-btn');

    items.forEach(btn => {
      btn.addEventListener('click', () => {
        items.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const file = btn.dataset.file;
        frame.src = file;
        nameEl.textContent = btn.dataset.name;
        subjectEl.textContent = btn.dataset.subject;
        openTabBtn.href = file;
      });
    });

    viewportBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewportBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        frame.style.width = btn.dataset.width;
      });
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(previewsDir, 'index.html'), galleryHtml, 'utf8');
  });

  // ── 1. Account Creation Templates ────────────────────────────────────────

  describe('Account Creation Templates', () => {
    it('renders account verification email with OTP and security notes', () => {
      const email = buildAccountVerificationEmail({
        userName: 'Aarav Sharma',
        userEmail: 'aarav@example.com',
        verificationCode: '849201',
        expiryMinutes: 10,
        device: 'Pixel 8 Pro',
        ipAddress: '103.21.244.2',
      });

      recordPreview({
        id: 'acc_verify',
        name: '🔑 01. Account Verification OTP',
        category: 'Account Creation',
        subject: email.subject,
        filename: '01_account_verification_otp.html',
        html: email.html,
      });
      expect(email.subject).toContain('849201');
      expect(email.subject).toContain('CaryGoo');
      expect(email.html).toContain('Aarav Sharma');
      expect(email.html).toContain('849201');
      expect(email.html).toContain('Valid for 10 minutes');
      expect(email.html).toContain('Pixel 8 Pro');
      expect(email.text).toContain('849201');
      expect(email.category).toBe('account_creation');
    });

    it('renders account confirmed email with activation badge', () => {
      const email = buildAccountConfirmedEmail({
        userName: 'Priya Patel',
        userEmail: 'priya@example.com',
      });

      recordPreview({
        id: 'acc_confirmed',
        name: '✅ 02. Account Confirmed & Active',
        category: 'Account Creation',
        subject: email.subject,
        filename: '02_account_confirmed.html',
        html: email.html,
      });
      expect(email.subject).toContain('Welcome to CaryGoo');
      expect(email.html).toContain('Priya Patel');
      expect(email.html).toContain('Account Verified');
      expect(email.html).toContain('CaryGoo');
    });
  });

  // ── 2. Welcome Templates ─────────────────────────────────────────────────

  describe('Welcome Templates', () => {
    it('renders comprehensive welcome email with corridors and referral code', () => {
      const email = buildWelcomeEmail({
        userName: 'Rahul Verma',
        userRole: 'both',
        referralCode: 'RAHUL77',
        referralBonusCoins: 100,
        popularCorridors: [
          { from: 'Delhi', to: 'Chandigarh', price: 350 },
          { from: 'Mumbai', to: 'Pune', price: 280 },
        ],
      });

      recordPreview({
        id: 'welcome',
        name: '👋 03. Welcome & Onboarding Guide',
        category: 'Welcome',
        subject: email.subject,
        filename: '03_welcome_onboarding.html',
        html: email.html,
      });
      expect(email.subject).toContain('Welcome to CaryGoo, Rahul Verma!');
      expect(email.html).toContain('RAHUL77');
      expect(email.html).toContain('Delhi &rarr; Chandigarh');
      expect(email.html).toContain('₹350');
      expect(email.html).toContain('100 CaryGoo Coins');
      expect(email.category).toBe('welcome');
    });
  });

  // ── 3. Delivery Lifecycle Templates ──────────────────────────────────────

  describe('Delivery Templates', () => {
    it('renders request_received template for traveller', () => {
      const email = buildDeliveryStatusEmail({
        status: 'request_received',
        recipientName: 'Vikram Singh',
        senderName: 'Neha Gupta',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
        parcelTitle: 'Legal Documents & Laptop',
      });

      recordPreview({
        id: 'del_received',
        name: '📦 04. Delivery Request Received',
        category: 'Delivery',
        subject: email.subject,
        filename: '04_delivery_request_received.html',
        html: email.html,
      });
      expect(email.subject).toContain('New Delivery Request: Delhi → Jaipur');
      expect(email.html).toContain('Vikram Singh');
      expect(email.html).toContain('Neha Gupta');
      expect(email.html).toContain('₹450');
      expect(email.html).toContain('Legal Documents & Laptop');
      expect(email.category).toBe('delivery');
    });

    it('renders request_accepted template for sender with secure guarantee phrasing', () => {
      const email = buildDeliveryStatusEmail({
        status: 'request_accepted',
        recipientName: 'Neha Gupta',
        travellerName: 'Vikram Singh',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
      });

      recordPreview({
        id: 'del_accepted',
        name: '🤝 05. Delivery Request Accepted',
        category: 'Delivery',
        subject: email.subject,
        filename: '05_delivery_request_accepted.html',
        html: email.html,
      });
      expect(email.subject).toContain('Request Accepted!');
      expect(email.html).toContain('Vikram Singh');
      expect(email.html).toContain('CaryGoo Secure Guarantee');
      expect(email.html.toLowerCase()).not.toContain('escrow');
    });

    it('renders pickup_confirmed template with delivery OTP', () => {
      const email = buildDeliveryStatusEmail({
        status: 'pickup_confirmed',
        recipientName: 'Neha Gupta',
        travellerName: 'Vikram Singh',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
        deliveryOtp: '739104',
      });

      recordPreview({
        id: 'del_pickup',
        name: '🚗 06. Pickup Confirmed & Secret OTP',
        category: 'Delivery',
        subject: email.subject,
        filename: '06_delivery_pickup_confirmed.html',
        html: email.html,
      });
      expect(email.subject).toContain('Parcel Picked Up!');
      expect(email.html).toContain('739104');
      expect(email.html).toContain('In Transit');
    });

    it('renders in_transit journey milestone template', () => {
      const transitEmail = buildDeliveryStatusEmail({
        status: 'in_transit',
        recipientName: 'Neha Gupta',
        travellerName: 'Vikram Singh',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
      });

      recordPreview({
        id: 'del_transit',
        name: '📍 07. Delivery In-Transit Milestone',
        category: 'Delivery',
        subject: transitEmail.subject,
        filename: '07_delivery_in_transit.html',
        html: transitEmail.html,
      });
      expect(transitEmail.subject).toContain('Transit Update');
    });

    it('renders delivered and payout_released templates', () => {
      const deliveredEmail = buildDeliveryStatusEmail({
        status: 'delivered',
        recipientName: 'Neha Gupta',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
      });
      recordPreview({
        id: 'del_completed',
        name: '🎉 08. Delivery Handover Complete',
        category: 'Delivery',
        subject: deliveredEmail.subject,
        filename: '08_delivery_completed.html',
        html: deliveredEmail.html,
      });
      expect(deliveredEmail.subject).toContain('Delivered!');

      const payoutEmail = buildDeliveryStatusEmail({
        status: 'payout_released',
        recipientName: 'Vikram Singh',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
        payoutAmount: 450,
      });
      recordPreview({
        id: 'del_payout',
        name: '💰 09. Delivery Payout Released',
        category: 'Delivery',
        subject: payoutEmail.subject,
        filename: '09_delivery_payout_released.html',
        html: payoutEmail.html,
      });
      expect(payoutEmail.subject).toContain('Payout Released: ₹450');
      expect(payoutEmail.html).toContain('₹450');

      const rejectedEmail = buildDeliveryStatusEmail({
        status: 'request_rejected',
        recipientName: 'Neha Gupta',
        requestId: 'req_12345678',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        price: 450,
      });
      recordPreview({
        id: 'del_rejected',
        name: '❌ 10. Delivery Request Declined',
        category: 'Delivery',
        subject: rejectedEmail.subject,
        filename: '10_delivery_rejected.html',
        html: rejectedEmail.html,
      });
      expect(rejectedEmail.subject).toContain('Traveller unavailable');
    });
  });

  // ── 4. Parcel Templates ──────────────────────────────────────────────────

  describe('Parcel Templates', () => {
    it('renders parcel listed and match found emails', () => {
      const listed = buildParcelListedEmail({
        userName: 'Ananya',
        parcelId: 'pcl_88776655',
        title: 'Artisan Handicrafts',
        fromCity: 'Jaipur',
        toCity: 'Delhi',
        weightKg: 2.5,
        priceOffered: 400,
      });
      recordPreview({
        id: 'pcl_listed',
        name: '🏷️ 11. Parcel Listed Successfully',
        category: 'Parcel',
        subject: listed.subject,
        filename: '11_parcel_listed.html',
        html: listed.html,
      });
      expect(listed.subject).toContain('Parcel Listed: "Artisan Handicrafts"');
      expect(listed.html).toContain('2.5 kg');
      expect(listed.html).toContain('₹400');

      const match = buildParcelMatchFoundEmail({
        userName: 'Ananya',
        parcelTitle: 'Artisan Handicrafts',
        parcelId: 'pcl_88776655',
        fromCity: 'Jaipur',
        toCity: 'Delhi',
        travellerName: 'Kunal Roy',
        travelDate: '12 Nov 2026',
        transportMode: 'Vande Bharat Express',
        requestMatchUrl: 'https://carygoo.com/match/123',
      });
      recordPreview({
        id: 'pcl_match',
        name: '🎯 12. Smart Route Match Found',
        category: 'Parcel',
        subject: match.subject,
        filename: '12_parcel_match_found.html',
        html: match.html,
      });
      expect(match.subject).toContain('Kunal Roy');
      expect(match.html).toContain('Vande Bharat Express');
      expect(match.html).toContain('12 Nov 2026');
    });

    it('renders parcel status update email', () => {
      const update = buildParcelStatusUpdateEmail({
        userName: 'Ananya',
        parcelTitle: 'Artisan Handicrafts',
        parcelId: 'pcl_88776655',
        status: 'Handed Over to Recipient',
        statusDescription: 'The recipient verified the parcel in good shape.',
      });
      recordPreview({
        id: 'pcl_status',
        name: '📋 13. Parcel Status Milestone Update',
        category: 'Parcel',
        subject: update.subject,
        filename: '13_parcel_status_update.html',
        html: update.html,
      });
      expect(update.subject).toContain('Handed Over to Recipient');
      expect(update.html).toContain('Handed Over to Recipient');
    });
  });

  // ── 5. KYC Templates ─────────────────────────────────────────────────────

  describe('KYC Templates', () => {
    it('renders submitted, approved, and action_needed emails', () => {
      const submitted = buildKycStatusEmail({
        userName: 'Rohan',
        status: 'submitted',
        documentType: 'Aadhaar Card',
      });
      recordPreview({
        id: 'kyc_submitted',
        name: '⏳ 14. KYC Submitted & Under Review',
        category: 'KYC Verification',
        subject: submitted.subject,
        filename: '14_kyc_submitted.html',
        html: submitted.html,
      });
      expect(submitted.subject).toContain('Under Review');
      expect(submitted.html).toContain('2 to 24 hours');

      const approved = buildKycStatusEmail({
        userName: 'Rohan',
        status: 'approved',
      });
      recordPreview({
        id: 'kyc_approved',
        name: '🛡️ 15. KYC Approved & Verified Badge',
        category: 'KYC Verification',
        subject: approved.subject,
        filename: '15_kyc_approved.html',
        html: approved.html,
      });
      expect(approved.subject).toContain('KYC is Approved');
      expect(approved.html).toContain('Verified Member');

      const rejected = buildKycStatusEmail({
        userName: 'Rohan',
        status: 'action_needed',
        reason: 'Aadhaar photo was blurry and corner was cut off.',
      });
      recordPreview({
        id: 'kyc_action',
        name: '⚠️ 16. KYC Action Needed / Resubmit',
        category: 'KYC Verification',
        subject: rejected.subject,
        filename: '16_kyc_action_needed.html',
        html: rejected.html,
      });
      expect(rejected.subject).toContain('Action Required');
      expect(rejected.html).toContain('Aadhaar photo was blurry');
    });
  });

  // ── 6. Promotional Templates ─────────────────────────────────────────────

  describe('Promotional Templates', () => {
    it('renders referral promotion, corridor discounts, and tier upgrades', () => {
      const promo = buildReferralPromotionEmail({
        userName: 'Deepak',
        referralCode: 'DEEPAK50',
        bonusCoins: 150,
        referralUrl: 'https://carygoo.com/ref/DEEPAK50',
        totalReferrals: 3,
        earnedCoins: 450,
      });
      recordPreview({
        id: 'promo_referral',
        name: '🎁 17. Referral Code & Bonus Coins',
        category: 'Promotional',
        subject: promo.subject,
        filename: '17_promotional_referral.html',
        html: promo.html,
      });
      expect(promo.subject).toContain('DEEPAK50');
      expect(promo.html).toContain('150 CaryGoo Coins');
      expect(promo.html).toContain('3 friends');

      const discount = buildCorridorDiscountEmail({
        userName: 'Deepak',
        promoTitle: 'Haryana Express Weekend',
        promoCode: 'HARYANA50',
        discountAmount: 50,
        fromCity: 'Delhi',
        toCity: 'Chandigarh',
        validUntil: '30 Nov 2026',
      });
      recordPreview({
        id: 'promo_discount',
        name: '🎟️ 18. Corridor Discount (₹50 OFF)',
        category: 'Promotional',
        subject: discount.subject,
        filename: '18_promotional_corridor_discount.html',
        html: discount.html,
      });
      expect(discount.subject).toContain('Flat ₹50 OFF');
      expect(discount.html).toContain('HARYANA50');

      const tier = buildRewardTierUpgradeEmail({
        userName: 'Deepak',
        oldTier: 'Silver',
        newTier: 'Gold',
        currentCoins: 1200,
        unlockedPerks: ['Zero platform commission on trips', 'VIP Priority corridor matching'],
      });
      recordPreview({
        id: 'promo_tier',
        name: '⭐ 19. Reward Tier Upgrade (Gold)',
        category: 'Promotional',
        subject: tier.subject,
        filename: '19_promotional_tier_upgrade.html',
        html: tier.html,
      });
      expect(tier.subject).toContain('Gold Tier');
      expect(tier.html).toContain('VIP Priority corridor matching');
    });
  });

  // ── 7. Updates Templates ─────────────────────────────────────────────────

  describe('Updates Templates', () => {
    it('renders feature update, policy update, and maintenance notice', () => {
      const feature = buildAppFeatureUpdateEmail({
        version: '1.3.0',
        releaseTitle: 'Smart Corridor Matching & Offline OTP',
        highlights: [
          { title: 'Offline Delivery OTP', description: 'Confirm delivery even with zero cellular coverage.' },
          { title: 'Route Heatmaps', description: 'See where travellers are moving in real time.' },
        ],
      });
      recordPreview({
        id: 'update_feature',
        name: '🚀 20. App Feature Release (v1.3.0)',
        category: 'Updates',
        subject: feature.subject,
        filename: '20_update_app_feature.html',
        html: feature.html,
      });
      expect(feature.subject).toContain('v1.3.0');
      expect(feature.html).toContain('Offline Delivery OTP');

      const policy = buildPolicyUpdateEmail({
        policyName: 'Community Safety Guidelines',
        effectiveDate: '1 Dec 2026',
        summaryPoints: [
          'Mandatory parcel visual inspection at pickup',
          'Strict prohibition of hazardous items',
        ],
        fullPolicyUrl: 'https://carygoo.com/safety',
      });
      recordPreview({
        id: 'update_policy',
        name: '📄 21. Policy & Terms of Service Update',
        category: 'Updates',
        subject: policy.subject,
        filename: '21_update_policy.html',
        html: policy.html,
      });
      expect(policy.subject).toContain('Community Safety Guidelines');
      expect(policy.html).toContain('Mandatory parcel visual inspection');

      const maint = buildSystemMaintenanceEmail({
        windowStart: 'Sunday 12:00 AM IST',
        windowEnd: 'Sunday 02:00 AM IST',
        affectedServices: ['Database index optimization', 'Edge gateway maintenance'],
      });
      recordPreview({
        id: 'update_maintenance',
        name: '🛠️ 22. Scheduled System Maintenance',
        category: 'Updates',
        subject: maint.subject,
        filename: '22_update_system_maintenance.html',
        html: maint.html,
      });
      expect(maint.subject).toContain('Scheduled Maintenance');
      expect(maint.html).toContain('Sunday 12:00 AM IST');
    });
  });

  // ── 8. Security Templates ────────────────────────────────────────────────

  describe('Security Templates', () => {
    it('renders new device login and password reset', () => {
      const newDevice = buildNewDeviceLoginEmail({
        userName: 'Kavita',
        device: 'OnePlus 12',
        operatingSystem: 'Android 15',
        ipAddress: '49.36.128.91',
        timestamp: '07 Nov 2026, 12:05 PM',
        secureAccountUrl: 'https://carygoo.com/security/lock',
      });
      recordPreview({
        id: 'sec_login',
        name: '🛡️ 23. New Device Sign-in Security Alert',
        category: 'Security',
        subject: newDevice.subject,
        filename: '23_security_new_device_login.html',
        html: newDevice.html,
      });
      expect(newDevice.subject).toContain('OnePlus 12');
      expect(newDevice.html).toContain('Android 15');
      expect(newDevice.html).toContain('49.36.128.91');

      const pwdReset = buildPasswordResetEmail({
        userName: 'Kavita',
        resetUrl: 'https://carygoo.com/reset?token=xyz',
        resetCode: '918273',
        expiryMinutes: 15,
      });
      recordPreview({
        id: 'sec_pwd_reset',
        name: '🔒 24. Password Reset Request',
        category: 'Security',
        subject: pwdReset.subject,
        filename: '24_security_password_reset.html',
        html: pwdReset.html,
      });
      expect(pwdReset.subject).toContain('Reset your CaryGoo password');
      expect(pwdReset.html).toContain('918273');
    });

    it('renders payment reserved confirmation without escrow phrasing', () => {
      const payment = buildPaymentReservedEmail({
        userName: 'Kavita',
        amount: 500,
        requestId: 'req_88990011',
        parcelTitle: 'Winter Jacket & Books',
        fromCity: 'Delhi',
        toCity: 'Manali',
        travellerName: 'Sahil Kapoor',
        receiptNumber: 'CG-2026-9901',
        date: '07 Nov 2026',
      });
      recordPreview({
        id: 'sec_receipt',
        name: '🧾 25. Payment Reserved Confirmation',
        category: 'Security',
        subject: payment.subject,
        filename: '25_security_payment_reserved.html',
        html: payment.html,
      });
      expect(payment.subject).toContain('₹500');
      expect(payment.subject).toContain('CG-2026-9901');
      expect(payment.html).toContain('CaryGoo Secure Guarantee');
      expect(payment.html.toLowerCase()).not.toContain('escrow');
    });
  });

  // ── 9. Dispatcher Service ────────────────────────────────────────────────

  describe('Email Service Dispatcher', () => {
    it('rejects dispatch when recipient list is empty', async () => {
      const result = await sendEmail({
        to: '',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipient email address is required');
    });

    it('simulates successful delivery in test/dev environment', async () => {
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Delivery',
        html: '<p>Test content</p>',
        text: 'Test content',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('dispatches via convenience methods cleanly', async () => {
      const res1 = await sendAccountVerificationEmail(
        { userEmail: 'test@example.com', verificationCode: '123456' },
        'test@example.com'
      );
      expect(res1.success).toBe(true);

      const res2 = await sendWelcomeEmail(
        { userName: 'Test User' },
        'test@example.com'
      );
      expect(res2.success).toBe(true);

      const res3 = await sendDeliveryStatusEmail(
        {
          status: 'delivered',
          recipientName: 'Test Recipient',
          requestId: 'req_test',
          fromCity: 'Delhi',
          toCity: 'Agra',
          price: 300,
        },
        'test@example.com'
      );
      expect(res3.success).toBe(true);
    });
  });
});
