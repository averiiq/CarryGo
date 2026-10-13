import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { getUserErrorMessage } from '@/lib/error-handler';
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

const RAZORPAY_TEST_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_RuhXVSCs94jL0c';

export async function createRazorpayOrder(requestId: string): Promise<{ data: RazorpayOrder | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { data: null, error: 'Authentication required' };

  try {
    const { data, error } = await sb.functions.invoke('create-razorpay-order', {
      body: { requestId },
    });

    if (error) {
      return { data: null, error: error.message || 'Could not create payment order' };
    }

    if (data?.orderId) {
      return {
        data: {
          orderId: data.orderId,
          amount: Number(data.amount),
          currency: data.currency || 'INR',
          keyId: data.keyId || RAZORPAY_TEST_KEY_ID,
        },
        error: null,
      };
    }

    return { data: null, error: data?.error || 'Could not create payment order' };
  } catch (directErr) {
    return { data: null, error: getUserErrorMessage(directErr, 'Failed to create payment order') };
  }
}

export async function verifyRazorpayPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  requestId: string;
}): Promise<{ data: { paymentId: string; status: string; amount: number } | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb.functions.invoke('verify-razorpay-payment', {
      body: {
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        requestId: params.requestId,
      },
    });

    if (error) {
      return { data: null, error: error.message || 'Payment verification failed' };
    }

    if (data?.paymentId) {
      return { data, error: null };
    }

    return { data: null, error: data?.error || 'Payment verification failed' };
  } catch (verifyErr) {
    return { data: null, error: getUserErrorMessage(verifyErr, 'Payment verification failed') };
  }
}

export async function fetchPaymentById(paymentId: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  return { data: mapRow(data), error: null };
}

export async function fetchPaymentByRequestOrId(identifier: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  
  let { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('request_id', identifier)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    const res = await sb
      .from('payments')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  return { data: mapRow(data), error: null };
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

export async function createRazorpayPaymentLink(params: {
  requestId: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<{ data: { paymentLinkId: string; shortUrl: string } | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { data: null, error: 'Authentication required' };

  try {
    const { data, error } = await sb.functions.invoke('create-razorpay-order', {
      body: {
        requestId: params.requestId,
        generateLink: true,
        customer: {
          name: params.customerName || 'CarryGo Customer',
          email: params.customerEmail || 'customer@carrygo.com',
          contact: params.customerPhone || '+919876543210',
        },
      },
    });

    if (error) {
      return { data: null, error: error.message || 'Could not generate payment link' };
    }

    if (data?.paymentLinkId && data?.shortUrl) {
      return {
        data: {
          paymentLinkId: data.paymentLinkId,
          shortUrl: data.shortUrl,
        },
        error: null,
      };
    }

    return { data: null, error: 'Payment link response was incomplete' };
  } catch (err) {
    return { data: null, error: getUserErrorMessage(err, 'Could not generate payment link') };
  }
}

export async function checkRazorpayPaymentLinkStatus(paymentLinkId: string): Promise<{
  paid: boolean;
  status: string;
  paymentId?: string;
  error?: string;
}> {
  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb.functions.invoke('verify-razorpay-payment', {
      body: {
        checkOnly: true,
        razorpayOrderId: paymentLinkId,
      },
    });

    if (error || !data) {
      return { paid: false, status: 'error', error: error?.message || 'Failed to check payment status' };
    }

    return {
      paid: Boolean(data.paid),
      status: data.status || 'unknown',
      paymentId: data.paymentId,
    };
  } catch (err) {
    return { paid: false, status: 'error', error: getUserErrorMessage(err, 'Failed to check payment link') };
  }
}


