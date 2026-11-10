import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { getUserErrorMessage } from '@/lib/error-handler';
import { storageGet, storageSet } from '@/lib/secure-storage';
import { fetchOrCreateDelivery } from '@/services/deliveries.service';
import { Payment, RazorpayOrder } from '@/types';
import { validateUUID } from '@/lib/validation';
import { notifyPaymentLocked } from '@/services/notifications.service';
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

const RAZORPAY_TEST_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

async function extractFunctionErrorMessage(error: any, fallback: string): Promise<string> {
  if (!error) return fallback;
  if ('context' in error && error.context) {
    try {
      if (typeof error.context.json === 'function') {
        const json = await error.context.json();
        if (json?.error) return json.error;
        if (json?.message) return json.message;
      }
      if (typeof error.context.text === 'function') {
        const text = await error.context.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) return parsed.error;
          if (parsed?.message) return parsed.message;
        } catch {
          if (text) return text;
        }
      }
    } catch (contextErr) {
      console.warn('[extractFunctionErrorMessage] error context parsing failed:', contextErr);
    }
  }
  return error.message || fallback;
}

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
      const errorMsg = await extractFunctionErrorMessage(error, 'Could not create payment order');
      return { data: null, error: errorMsg };
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
      const errorMsg = await extractFunctionErrorMessage(error, 'Payment verification failed');
      return { data: null, error: errorMsg };
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
    .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) {
    const cached = await storageGet<Payment>(`payment_cache_${paymentId}`);
    if (cached) return { data: cached, error: null };
    return { data: null, error: null };
  }

  return { data: mapRow(data), error: null };
}

export async function fetchPaymentByRequestOrId(identifier: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const idCheck = validateUUID(identifier);
  if (!idCheck.valid) return { data: null, error: idCheck.error };
  const sb = getSupabaseClient();

  // Single query: check both request_id and id in one round-trip
  let { data, error } = await sb
    .from('payments')
    .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
    .or(`request_id.eq.${identifier},id.eq.${identifier}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If still not found, check if identifier is a delivery ID
  if (!data && !error) {
    const { data: delivery } = await sb
      .from('deliveries')
      .select('request_id')
      .eq('id', identifier)
      .maybeSingle();
    if (delivery?.request_id) {
      const res = await sb
        .from('payments')
        .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
        .eq('request_id', delivery.request_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = res.data;
      error = res.error;
    }
  }

  if (error) return { data: null, error: error.message };
  if (!data) {
    const cached = (await storageGet<Payment>(`payment_cache_${identifier}`)) ||
      (await storageGet<Payment>(`payment_cache_req_${identifier}`));
    if (cached) return { data: cached, error: null };
    return { data: null, error: null };
  }

  return { data: mapRow(data), error: null };
}

export async function resolveRequestId(identifier: string): Promise<string> {
  if (!identifier) return '';
  const idCheck = validateUUID(identifier);
  if (!idCheck.valid) return '';
  const sb = getSupabaseClient();
  try {
    // 1. Check if identifier is already a valid request ID
    const { data: req } = await sb
      .from('requests')
      .select('id')
      .eq('id', identifier)
      .maybeSingle();
    if (req?.id) return req.id;

    // 2. Check if identifier is a delivery ID
    const { data: del } = await sb
      .from('deliveries')
      .select('request_id')
      .eq('id', identifier)
      .maybeSingle();
    if (del?.request_id) return del.request_id;

    // 3. Check if identifier is a payment ID
    const { data: pay } = await sb
      .from('payments')
      .select('request_id')
      .eq('id', identifier)
      .maybeSingle();
    if (pay?.request_id) return pay.request_id;
  } catch (err) {
    console.warn('[resolveRequestId] Failed to resolve identifier:', err);
  }
  return '';
}

export async function fetchPaymentByRequest(requestId: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) {
    const cached = (await storageGet<Payment>(`payment_cache_req_${requestId}`)) ||
      (await storageGet<Payment>(`payment_cache_${requestId}`));
    if (cached) return { data: cached, error: null };
    return { data: null, error: null };
  }

  return { data: mapRow(data), error: null };
}

export async function fetchUserPayments(userId: string, options?: { limit?: number; offset?: number }) {
  if (!FeatureFlags.payments) return { data: [], error: disabledFeatureMessage.payments };
  const idCheck = validateUUID(userId);
  if (!idCheck.valid) return { data: [], error: idCheck.error };
  const sb = getSupabaseClient();
  const limit = Math.min(options?.limit ?? 50, MAX_PAGE_SIZE);
  const offset = options?.offset ?? 0;
  const { data, error } = await sb
    .from('payments')
    .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const dbList = data ? data.map(mapRow) : [];
  try {
    const cachedList = (await storageGet<Payment[]>(`user_cached_payments_${userId}`)) || [];
    const combined = [...dbList];
    for (const c of cachedList) {
      if (!combined.some(p => p.requestId === c.requestId || p.id === c.id)) {
        combined.unshift(c);
      }
    }
    return { data: combined, error: error?.message || null };
  } catch {
    return { data: dbList, error: error?.message || null };
  }
}

export const MAX_PAGE_SIZE = 100;

export async function confirmMockBookingPayment(params: {
  requestId: string;
  amount: number;
  senderId?: string;
  travellerId?: string;
}): Promise<{ data: Payment | null; error: string | null }> {
  if (!__DEV__ && !FeatureFlags.isDemoMode) {
    return { data: null, error: 'Test payment mode is only available in development or demo mode.' };
  }
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  const authUserId = session?.user?.id || '';

  let senderId = '';
  let travellerId = '';
  let price = Number(params.amount) || 100;

  try {
    const { data: req } = await sb
      .from('requests')
      .select('id, sender_id, traveller_id, price, status')
      .eq('id', params.requestId)
      .maybeSingle();

    if (req) {
      if (req.sender_id && validateUUID(req.sender_id).valid) {
        senderId = req.sender_id;
      }
      if (req.traveller_id && validateUUID(req.traveller_id).valid) {
        travellerId = req.traveller_id;
      }
      if (req.price != null && !isNaN(Number(req.price))) {
        price = Number(req.price);
      }
    }
  } catch (lookupErr) {
    console.warn('[confirmMockBookingPayment] Request lookup note:', lookupErr);
  }

  if (!senderId) {
    if (authUserId && validateUUID(authUserId).valid) {
      senderId = authUserId;
    } else if (params.senderId && validateUUID(params.senderId).valid) {
      senderId = params.senderId;
    }
  }

  if (!travellerId && params.travellerId && validateUUID(params.travellerId).valid) {
    travellerId = params.travellerId;
  }

  const nowIso = new Date().toISOString();
  const razorpayPaymentId = `pay_demo_${Date.now()}`;
  const razorpayOrderId = `order_demo_${Date.now()}`;

  let persistedPaymentId = '';

  // 1. Persist directly to Supabase payments table so database, notifications, and counterparty see it
  if (senderId) {
    try {
      const upsertRow: Record<string, unknown> = {
        request_id: params.requestId,
        sender_id: senderId,
        amount: price,
        status: 'locked',
        locked_at: nowIso,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      };
      if (travellerId) {
        upsertRow.traveller_id = travellerId;
      }

      const { data: dbPayment, error: dbErr } = await (sb.from('payments') as any)
        .upsert(upsertRow, { onConflict: 'request_id' })
        .select('id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, created_at')
        .maybeSingle();

      if (dbPayment?.id) {
        persistedPaymentId = dbPayment.id;
      }
      if (dbErr) {
        console.warn('[confirmMockBookingPayment] Supabase payments upsert note:', dbErr.message);
      }
    } catch (dbErr) {
      console.warn('[confirmMockBookingPayment] Supabase payments upsert caught:', dbErr);
    }
  }

  const paymentId = persistedPaymentId || `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const paymentRecord: Payment = {
    id: paymentId,
    requestId: params.requestId,
    senderId,
    travellerId,
    amount: price,
    status: 'locked',
    lockedAt: nowIso,
    razorpayOrderId,
    razorpayPaymentId,
    createdAt: nowIso,
  };

  // 2. Cache in local storage for instant offline & screen transitions
  try {
    await storageSet(`payment_cache_${params.requestId}`, paymentRecord);
    await storageSet(`payment_cache_req_${params.requestId}`, paymentRecord);
    await storageSet(`payment_cache_${paymentId}`, paymentRecord);

    if (senderId) {
      const userKey = `user_cached_payments_${senderId}`;
      const existingList = (await storageGet<Payment[]>(userKey)) || [];
      const updatedList = [paymentRecord, ...existingList.filter(p => p.requestId !== params.requestId)];
      await storageSet(userKey, updatedList);
    }

    if (travellerId) {
      const travKey = `user_cached_payments_${travellerId}`;
      const travList = (await storageGet<Payment[]>(travKey)) || [];
      await storageSet(travKey, [paymentRecord, ...travList.filter(p => p.requestId !== params.requestId)]);
    }
  } catch (storageErr) {
    console.warn('[confirmMockBookingPayment] Storage cache warning:', storageErr);
  }

  // 3. Ensure request is marked accepted in DB
  try {
    await sb
      .from('requests')
      .update({ status: 'accepted', updated_at: nowIso })
      .eq('id', params.requestId);
  } catch (statusErr) {
    console.warn('[confirmMockBookingPayment] request status update failed:', statusErr);
  }

  // 4. Initialize delivery record with pickup OTP ready
  try {
    await fetchOrCreateDelivery(params.requestId, senderId, true);
  } catch (delErr) {
    console.warn('[confirmMockBookingPayment] Delivery init note:', delErr);
  }

  // 5. Notify traveller of payment reservation
  if (travellerId) {
    try {
      await notifyPaymentLocked({
        userId: travellerId,
        senderId,
        amount: price,
        deliveryOrRequestId: params.requestId,
        isTraveller: true,
      });
    } catch (notifErr) {
      console.warn('[confirmMockBookingPayment] Payment notification note:', notifErr);
    }
  }

  return { data: paymentRecord, error: null };
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
          name: params.customerName || 'CaryGoo Customer',
          email: params.customerEmail || 'customer@carygoo.in',
          phone: params.customerPhone || '+919876543210',
          contact: params.customerPhone || '+919876543210',
        },
      },
    });

    if (error) {
      const errorMsg = await extractFunctionErrorMessage(error, 'Could not generate payment link');
      return { data: null, error: errorMsg };
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


