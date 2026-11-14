import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { getUserErrorMessage } from '@/lib/error-handler';
import { storageGet, storageSet } from '@/lib/secure-storage';
import { fetchOrCreateDelivery } from '@/services/deliveries.service';
import { Payment, RazorpayOrder, PaymentOrderResponse, GatewayId } from '@/types';
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
    gatewayProvider: (row.gateway_provider as GatewayId) ?? undefined,
    gatewayOrderId: row.gateway_order_id ?? undefined,
    gatewayPaymentId: row.gateway_payment_id ?? undefined,
    platformFee: row.platform_fee != null ? Number(row.platform_fee) : undefined,
    gstAmount: row.gst_amount != null ? Number(row.gst_amount) : undefined,
    travelerPayout: row.traveler_payout != null ? Number(row.traveler_payout) : undefined,
    payoutStatus: (row.payout_status as Payment['payoutStatus']) ?? undefined,
    payoutReference: row.payout_reference ?? undefined,
    payoutCompletedAt: row.payout_completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

const PAYMENT_SELECT_COLS = 'id, request_id, sender_id, traveller_id, amount, status, locked_at, released_at, razorpay_order_id, razorpay_payment_id, gateway_provider, gateway_order_id, gateway_payment_id, platform_fee, gst_amount, traveler_payout, payout_status, payout_reference, payout_completed_at, created_at' as const;

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

export async function createPaymentOrder(
  requestId: string,
  options?: { generateLink?: boolean; customer?: { name?: string; email?: string; phone?: string } },
): Promise<{ data: PaymentOrderResponse | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { data: null, error: 'Authentication required' };

  try {
    const { data, error } = await sb.functions.invoke('create-payment-order', {
      body: { requestId, generateLink: options?.generateLink, customer: options?.customer },
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
          gateway: data.gateway || 'razorpay',
          keyId: data.keyId || '',
          redirectUrl: data.redirectUrl,
          paymentLinkId: data.paymentLinkId,
          shortUrl: data.shortUrl,
          formParams: data.formParams,
          split: data.split,
        },
        error: null,
      };
    }

    return { data: null, error: data?.error || 'Could not create payment order' };
  } catch (directErr) {
    return { data: null, error: getUserErrorMessage(directErr, 'Failed to create payment order') };
  }
}

/** @deprecated Use createPaymentOrder instead */
export async function createRazorpayOrder(requestId: string): Promise<{ data: RazorpayOrder | null; error: string | null }> {
  const result = await createPaymentOrder(requestId);
  if (!result.data) return { data: null, error: result.error };
  return {
    data: {
      orderId: result.data.orderId,
      amount: result.data.amount,
      currency: result.data.currency,
      keyId: result.data.keyId,
    },
    error: null,
  };
}

export async function verifyPaymentOrder(params: {
  orderId: string;
  paymentId?: string;
  signature?: string;
  requestId: string;
  gateway?: GatewayId;
  checkOnly?: boolean;
}): Promise<{ data: { paymentId: string; status: string; amount: number; paid?: boolean; gateway?: string; split?: { platformFee: number; gst: number; travelerPayout: number } } | null; error: string | null }> {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb.functions.invoke('verify-payment', {
      body: {
        orderId: params.orderId,
        paymentId: params.paymentId || '',
        signature: params.signature || '',
        requestId: params.requestId,
        gateway: params.gateway,
        checkOnly: params.checkOnly,
      },
    });

    if (error) {
      const errorMsg = await extractFunctionErrorMessage(error, 'Payment verification failed');
      return { data: null, error: errorMsg };
    }

    if (params.checkOnly) {
      return { data: data, error: null };
    }

    if (data?.paymentId) {
      return { data, error: null };
    }

    return { data: null, error: data?.error || 'Payment verification failed' };
  } catch (verifyErr) {
    return { data: null, error: getUserErrorMessage(verifyErr, 'Payment verification failed') };
  }
}

/** @deprecated Use verifyPaymentOrder instead */
export async function verifyRazorpayPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  requestId: string;
}): Promise<{ data: { paymentId: string; status: string; amount: number } | null; error: string | null }> {
  return verifyPaymentOrder({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
    requestId: params.requestId,
    gateway: 'razorpay',
  });
}

export async function fetchPaymentById(paymentId: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select(PAYMENT_SELECT_COLS)
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
    .select(PAYMENT_SELECT_COLS)
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
        .select(PAYMENT_SELECT_COLS)
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
    .select(PAYMENT_SELECT_COLS)
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
    .select(PAYMENT_SELECT_COLS)
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
        .select(PAYMENT_SELECT_COLS)
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

  // Trigger payout processing (fire-and-forget — webhook/admin can retry on failure)
  Promise.resolve(sb.functions.invoke('process-payout', { body: { paymentId } })).catch((payoutErr) => {
    console.warn('[releasePayment] Payout trigger note:', payoutErr);
  });

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

export async function createPaymentLink(params: {
  requestId: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<{ data: { paymentLinkId: string; shortUrl: string; redirectUrl?: string; gateway: GatewayId } | null; error: string | null }> {
  const result = await createPaymentOrder(params.requestId, {
    generateLink: true,
    customer: {
      name: params.customerName || 'CaryGoo Customer',
      email: params.customerEmail || 'customer@carygoo.in',
      phone: params.customerPhone || '+919876543210',
    },
  });

  if (!result.data) return { data: null, error: result.error };

  const gateway = result.data.gateway;
  // Redirect-based gateways return a redirectUrl directly
  if (result.data.redirectUrl) {
    return {
      data: {
        paymentLinkId: result.data.orderId,
        shortUrl: result.data.redirectUrl,
        redirectUrl: result.data.redirectUrl,
        gateway,
      },
      error: null,
    };
  }

  // Razorpay returns paymentLinkId + shortUrl
  if (result.data.paymentLinkId && result.data.shortUrl) {
    return {
      data: {
        paymentLinkId: result.data.paymentLinkId,
        shortUrl: result.data.shortUrl,
        gateway,
      },
      error: null,
    };
  }

  return { data: null, error: 'Payment link response was incomplete' };
}

/** @deprecated Use createPaymentLink instead */
export async function createRazorpayPaymentLink(params: {
  requestId: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<{ data: { paymentLinkId: string; shortUrl: string } | null; error: string | null }> {
  return createPaymentLink(params);
}

export async function checkPaymentStatus(orderId: string, gateway?: GatewayId): Promise<{
  paid: boolean;
  status: string;
  paymentId?: string;
  error?: string;
}> {
  const result = await verifyPaymentOrder({
    orderId,
    requestId: '',
    gateway,
    checkOnly: true,
  });

  if (!result.data) {
    return { paid: false, status: 'error', error: result.error || 'Failed to check payment status' };
  }

  return {
    paid: Boolean(result.data.paid),
    status: result.data.status || 'unknown',
    paymentId: result.data.paymentId,
  };
}

/** @deprecated Use checkPaymentStatus instead */
export async function checkRazorpayPaymentLinkStatus(paymentLinkId: string): Promise<{
  paid: boolean;
  status: string;
  paymentId?: string;
  error?: string;
}> {
  return checkPaymentStatus(paymentLinkId);
}


