import { getSupabaseClient } from '@/template';

export type RateLimitAction =
  | 'create_trip'
  | 'create_parcel'
  | 'create_request'
  | 'send_message'
  | 'search'
  | 'create_payment'
  | 'release_payment'
  | 'refund_payment';

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
    return { allowed: true };
  }

  return { allowed: true };
}
