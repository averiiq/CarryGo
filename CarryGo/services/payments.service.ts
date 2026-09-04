import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { Payment, RazorpayOrder } from '@/types';
import type { Database } from '@/types/database';

type PaymentRow = Database['public']['Tables']['payments']['Row'];

function mapRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    travellerId: row.traveller_id,
    amount: Number(row.amount),
    status: row.status as Payment['status'],
    lockedAt: row.locked_at,
    releasedAt: row.released_at ?? undefined,
    razorpayOrderId: row.razorpay_order_id ?? undefined,
    razorpayPaymentId: row.razorpay_payment_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function createRazorpayOrder(requestId: string): Promise<{ data: RazorpayOrder | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { data: null, error: 'Authentication required' };

  const { data, error } = await sb.functions.invoke('create-razorpay-order', {
    body: { requestId },
  });

  if (error) return { data: null, error: error.message ?? 'Failed to create order' };
  if (data?.error) return { data: null, error: data.error };

  return { data: data as RazorpayOrder, error: null };
}

export async function verifyRazorpayPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  requestId: string;
}): Promise<{ data: { paymentId: string; status: string; amount: number } | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();

  const { data, error } = await sb.functions.invoke('verify-razorpay-payment', {
    body: {
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.razorpaySignature,
      requestId: params.requestId,
    },
  });

  if (error) return { data: null, error: error.message ?? 'Verification failed' };
  if (data?.error) return { data: null, error: data.error };

  return { data, error: null };
}

export async function fetchPaymentByRequest(requestId: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  return { data: mapRow(data), error: null };
}

export async function fetchUserPayments(userId: string) {
  if (!FeatureFlags.payments) return { data: [], error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function releasePayment(paymentId: string, actorId: string) {
  if (!FeatureFlags.payments) return { error: disabledFeatureMessage.payments };
  if (!actorId) return { error: 'Authentication required' };

  const rateCheck = await enforceRateLimit(actorId, 'release_payment');
  if (!rateCheck.allowed) return { error: rateCheck.error ?? 'Rate limit exceeded' };

  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('release_payment_atomic', {
    p_payment_id: paymentId,
    p_actor_id: actorId,
  });

  if (error) {
    if (error.message.includes('not found')) return { error: 'Payment not found or already processed.' };
    if (error.message.includes('unauthorized')) return { error: 'Only the traveller can release this payment.' };
    return { error: error.message };
  }

  if (!data) return { error: 'Payment has already been processed or does not exist.' };
  return { error: null };
}

export async function refundPayment(paymentId: string, actorId: string) {
  if (!FeatureFlags.payments) return { error: disabledFeatureMessage.payments };
  if (!actorId) return { error: 'Authentication required' };

  const rateCheck = await enforceRateLimit(actorId, 'refund_payment');
  if (!rateCheck.allowed) return { error: rateCheck.error ?? 'Rate limit exceeded' };

  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('refund_payment_atomic', {
    p_payment_id: paymentId,
    p_actor_id: actorId,
  });

  if (error) {
    if (error.message.includes('not found')) return { error: 'Payment not found or already processed.' };
    if (error.message.includes('unauthorized')) return { error: 'Only the sender can refund this payment.' };
    return { error: error.message };
  }

  if (!data) return { error: 'Payment has already been processed or does not exist.' };
  return { error: null };
}
