import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || 'rzp_test_RuhXVSCs94jL0c';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '0Z27VMXyp4zIfvdMthsqZw09';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const payload = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  if (expectedSignature.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    mismatch |= expectedSignature.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return jsonResponse({ error: 'Payment provider is not configured' }, 503);
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { error: rateLimitError } = await userClient.rpc('enforce_rate_limit', {
      p_user_id: user.id,
      p_action: 'verify_payment',
    });
    if (rateLimitError) {
      return jsonResponse({ error: 'Too many verification attempts. Please wait.' }, 429);
    }

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, requestId, checkOnly } = body;

    if (checkOnly) {
      if (!razorpayOrderId) {
        return jsonResponse({ error: 'Missing razorpayOrderId' }, 400);
      }
      const plinkResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(razorpayOrderId)}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        },
      });
      if (!plinkResponse.ok) {
        return jsonResponse({ error: 'Unable to check payment link status' }, 502);
      }
      const plinkData = await plinkResponse.json();
      const amountPaid = Number(plinkData.amount_paid || 0);
      const amountExpected = Number(plinkData.amount || 0);
      const hasCapturedPayment = Array.isArray(plinkData.payments) && plinkData.payments.some((p: any) => p.status === 'captured');
      const isPaid = plinkData.status === 'paid' && amountPaid > 0 && amountExpected > 0 && amountPaid >= amountExpected && hasCapturedPayment;
      let paymentId: string | undefined;
      if (isPaid && Array.isArray(plinkData.payments)) {
        const captured = plinkData.payments.find((p: any) => p.status === 'captured');
        paymentId = captured?.payment_id || captured?.id;
      }
      return jsonResponse({
        paid: isPaid,
        status: plinkData.status,
        paymentId: isPaid ? paymentId : undefined,
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !requestId) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const isPaymentLink = typeof razorpayOrderId === 'string' && razorpayOrderId.startsWith('plink_');
    let effectivePaymentId = razorpayPaymentId;

    if (isPaymentLink) {
      const plinkResponse = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(razorpayOrderId)}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        },
      });

      if (!plinkResponse.ok) {
        return jsonResponse({ error: 'Unable to verify payment link with provider' }, 502);
      }

      const plinkData = await plinkResponse.json();
      const amountPaid = Number(plinkData.amount_paid || 0);
      const amountExpected = Number(plinkData.amount || 0);
      const hasCapturedPayment = Array.isArray(plinkData.payments) && plinkData.payments.some((p: any) => p.status === 'captured');
      const isPaid = plinkData.status === 'paid' && amountPaid > 0 && amountExpected > 0 && amountPaid >= amountExpected && hasCapturedPayment;
      if (!isPaid) {
        return jsonResponse({ error: 'Payment has not been completed or captured on Razorpay' }, 400);
      }

      const captured = plinkData.payments.find((p: any) => p.status === 'captured');
      if (!captured || !(captured.payment_id || captured.id)) {
        return jsonResponse({ error: 'No verified captured payment found on this payment link' }, 400);
      }
      effectivePaymentId = captured.payment_id || captured.id;
    } else {
      const isValid = await verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) {
        await supabase.from('razorpay_orders').update({ status: 'failed' }).eq('order_id', razorpayOrderId).eq('status', 'created');
        return jsonResponse({ error: 'Invalid payment signature' }, 400);
      }
    }

    const { data: orderRecord, error: orderError } = await supabase
      .from('razorpay_orders')
      .select('order_id, request_id, sender_id, amount_paise, currency, status')
      .eq('order_id', razorpayOrderId)
      .single();

    if (orderError || !orderRecord) {
      return jsonResponse({ error: 'Payment order not found' }, 404);
    }

    let targetRequestId = requestId;
    if (orderRecord.request_id !== targetRequestId) {
      const { data: delivery } = await supabase
        .from('deliveries')
        .select('request_id')
        .eq('id', requestId)
        .maybeSingle();
      if (delivery?.request_id) {
        targetRequestId = delivery.request_id;
      }
    }

    if (orderRecord.sender_id !== user.id || orderRecord.request_id !== targetRequestId) {
      return jsonResponse({ error: 'Only the sender can verify payment' }, 403);
    }

    if (orderRecord.status === 'failed') {
      return jsonResponse({ error: 'This payment order is no longer valid. Please retry checkout.' }, 409);
    }

    const providerResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(effectivePaymentId)}`, {
      headers: {
        'Authorization': `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
    });

    if (!providerResponse.ok) {
      return jsonResponse({ error: 'Unable to confirm payment status with provider' }, 502);
    }

    const providerPayment = await providerResponse.json();
    if (
      (!isPaymentLink && providerPayment?.order_id !== razorpayOrderId)
      || Number(providerPayment?.amount) !== Number(orderRecord.amount_paise)
      || providerPayment?.currency !== orderRecord.currency
      || !['authorized', 'captured'].includes(providerPayment?.status)
    ) {
      await supabase.from('razorpay_orders').update({ status: 'failed' }).eq('order_id', razorpayOrderId).eq('status', 'created');
      return jsonResponse({ error: 'Payment does not match the original order or was not captured' }, 400);
    }

    const { data: payment, error: insertError } = await supabase.rpc('finalize_razorpay_payment', {
      p_order_id: razorpayOrderId,
      p_payment_id: effectivePaymentId,
    });

    if (insertError) {
      await supabase.from('razorpay_orders').update({ status: 'failed' }).eq('order_id', razorpayOrderId).eq('status', 'created');
      console.error('[verify-razorpay-payment] Finalize error:', insertError.message);
      return jsonResponse({ error: 'Failed to record payment' }, 500);
    }

    return jsonResponse({
      paymentId: payment.id,
      status: 'locked',
      amount: payment.amount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[verify-razorpay-payment]', message);
    return jsonResponse({ error: message }, 500);
  }
});


