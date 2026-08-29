const enabled = (value: string | undefined) => value === 'true';

// These switches require both a code review and an environment opt-in.
// Set a readiness value to true only after the corresponding provider/server flow exists.
const productionReady = {
  kycProvider: true,
  payments: true,
  secureDeliveryConfirmation: true,
  preciseLocationSharing: true,
} as const;

export const FeatureFlags = {
  isDemoMode: process.env.EXPO_PUBLIC_APP_MODE !== 'production',
  reviewerLogin: enabled(process.env.EXPO_PUBLIC_ENABLE_REVIEWER_LOGIN),
  kycProvider: productionReady.kycProvider && enabled(process.env.EXPO_PUBLIC_ENABLE_KYC_PROVIDER),
  payments: productionReady.payments && enabled(process.env.EXPO_PUBLIC_ENABLE_PAYMENTS),
  secureDeliveryConfirmation: productionReady.secureDeliveryConfirmation && enabled(process.env.EXPO_PUBLIC_ENABLE_SECURE_DELIVERY),
  preciseLocationSharing: productionReady.preciseLocationSharing && enabled(process.env.EXPO_PUBLIC_ENABLE_PRECISE_LOCATION),
} as const;

export const disabledFeatureMessage = {
  kyc: 'Identity verification is unavailable until a compliant KYC provider is connected.',
  payments: 'Payments are unavailable until a real payment provider is connected.',
  delivery: 'Delivery confirmation is unavailable until secure server-side verification is deployed.',
  location: 'Precise location sharing is unavailable until the production privacy controls are deployed.',
} as const;

