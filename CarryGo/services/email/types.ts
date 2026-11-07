/**
 * CaryGoo Email System Types
 * Strict typing for transactional, lifecycle, and promotional emails.
 */

export type EmailCategory =
  | 'account_creation'
  | 'welcome'
  | 'delivery'
  | 'parcel'
  | 'kyc'
  | 'promotional'
  | 'updates'
  | 'security';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: string | EmailRecipient | (string | EmailRecipient)[];
  subject: string;
  html: string;
  text: string;
  category?: EmailCategory;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

// ── 1. Account Creation Templates ──────────────────────────────────────────

export interface AccountVerificationEmailData {
  userName?: string;
  userEmail: string;
  verificationCode: string;
  expiryMinutes?: number;
  verificationUrl?: string;
  ipAddress?: string;
  device?: string;
}

export interface AccountConfirmedEmailData {
  userName: string;
  userEmail: string;
  loginUrl?: string;
  accountType?: 'sender' | 'traveller' | 'both';
}

// ── 2. Welcome Templates ───────────────────────────────────────────────────

export interface WelcomeEmailData {
  userName: string;
  userRole?: 'sender' | 'traveller' | 'both';
  dashboardUrl?: string;
  popularCorridors?: Array<{ from: string; to: string; price: number }>;
  referralCode?: string;
  referralBonusCoins?: number;
}

// ── 3. Delivery Templates ──────────────────────────────────────────────────

export type DeliveryEmailStatus =
  | 'request_received'
  | 'request_accepted'
  | 'request_rejected'
  | 'pickup_confirmed'
  | 'in_transit'
  | 'delivered'
  | 'payout_released';

export interface DeliveryEmailData {
  status: DeliveryEmailStatus;
  recipientName: string;
  senderName?: string;
  travellerName?: string;
  requestId: string;
  fromCity: string;
  toCity: string;
  price: number;
  deliveryOtp?: string;
  parcelTitle?: string;
  trackingUrl?: string;
  actionUrl?: string;
  expectedDate?: string;
  payoutAmount?: number;
}

// ── 4. Parcel Templates ────────────────────────────────────────────────────

export interface ParcelListedEmailData {
  userName: string;
  parcelId: string;
  title: string;
  fromCity: string;
  toCity: string;
  weightKg: number;
  priceOffered: number;
  browseMatchesUrl?: string;
}

export interface ParcelMatchFoundEmailData {
  userName: string;
  parcelTitle: string;
  parcelId: string;
  fromCity: string;
  toCity: string;
  travellerName: string;
  travelDate: string;
  transportMode?: string;
  requestMatchUrl: string;
}

export interface ParcelStatusUpdateEmailData {
  userName: string;
  parcelTitle: string;
  parcelId: string;
  status: string;
  statusDescription: string;
  trackingUrl?: string;
  updatedAt?: string;
}

// ── 5. KYC Templates ───────────────────────────────────────────────────────

export type KycEmailStatus = 'submitted' | 'approved' | 'rejected' | 'action_needed';

export interface KycEmailData {
  userName: string;
  status: KycEmailStatus;
  documentType?: string;
  reason?: string;
  actionUrl?: string;
  verifiedPerks?: string[];
}

// ── 6. Promotional Templates ───────────────────────────────────────────────

export interface ReferralPromotionEmailData {
  userName: string;
  referralCode: string;
  bonusCoins: number;
  referralUrl: string;
  totalReferrals?: number;
  earnedCoins?: number;
}

export interface CorridorDiscountEmailData {
  userName: string;
  promoTitle: string;
  promoCode: string;
  discountAmount: number;
  fromCity: string;
  toCity: string;
  validUntil: string;
  ctaUrl?: string;
}

export interface RewardTierUpgradeEmailData {
  userName: string;
  oldTier: string;
  newTier: string;
  currentCoins: number;
  unlockedPerks: string[];
  rewardsUrl?: string;
}

// ── 7. Updates Templates ───────────────────────────────────────────────────

export interface AppFeatureUpdateEmailData {
  userName?: string;
  version: string;
  releaseTitle: string;
  highlights: Array<{ title: string; description: string; icon?: string }>;
  ctaUrl?: string;
  ctaText?: string;
}

export interface PolicyUpdateEmailData {
  userName?: string;
  policyName: string;
  effectiveDate: string;
  summaryPoints: string[];
  fullPolicyUrl: string;
}

export interface SystemMaintenanceEmailData {
  userName?: string;
  windowStart: string;
  windowEnd: string;
  affectedServices: string[];
  statusPageUrl?: string;
}

// ── 8. Security & Account Alert Templates ──────────────────────────────────

export interface NewDeviceLoginEmailData {
  userName: string;
  device: string;
  operatingSystem?: string;
  browserOrApp?: string;
  approximateLocation?: string;
  ipAddress: string;
  timestamp: string;
  secureAccountUrl: string;
}

export interface PasswordResetEmailData {
  userName?: string;
  resetUrl: string;
  resetCode?: string;
  expiryMinutes?: number;
}

export interface PaymentReservedEmailData {
  userName: string;
  amount: number;
  requestId: string;
  parcelTitle: string;
  fromCity: string;
  toCity: string;
  travellerName: string;
  receiptNumber: string;
  date: string;
  trackingUrl?: string;
}

