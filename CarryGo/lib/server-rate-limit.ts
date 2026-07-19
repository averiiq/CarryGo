import { getSupabaseClient } from '@/template';

export type RateLimitAction =
  | 'create_trip'
  | 'create_parcel'
  | 'create_request'
  | 'send_message'
  | 'search'
  | 'create_payment'
  | 'release_payment'
  | 'refund_payment'
  | 'kyc_upload'
  | 'confirm_delivery';

export async function enforceRateLimit(userId: string, action: RateLimitAction): Promise<{ allowed: boolean; error?: string }> {
  const sb = getSupabaseClient();

  const { error } = await sb.rpc('enforce_rate_limit', {
    p_user_id: userId,
    p_action: action,
  });

  if (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return { allowed: false, error: 'Too many requests. Please wait before trying again.' };
    }
    // Fail closed: deny access when the rate limit check itself fails
    return { allowed: false, error: 'Unable to verify rate limit. Please try again.' };
  }

  return { allowed: true };
}
