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
  | 'kyc_initiate'
  | 'confirm_delivery';

export async function enforceRateLimit(userId: string, action: RateLimitAction): Promise<{ allowed: boolean; error?: string }> {
  const sb = getSupabaseClient();

  const { error } = await sb.rpc('enforce_rate_limit', {
    p_user_id: userId,
    p_action: action,
  });

  if (error) {
    if (error.message.includes('Rate limit exceeded')) {
      // Confirmed rate-limit hit — block the request
      return { allowed: false, error: 'Too many requests. Please wait before trying again.' };
    }
    // Transient network / DB error — fail open so users aren't blocked by infrastructure issues
    console.warn(`[rate-limit] RPC error for action "${action}", failing open:`, error.message);
    return { allowed: true };
  }

  return { allowed: true };
}

