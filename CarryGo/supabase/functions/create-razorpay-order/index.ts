import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

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
      p_action: 'create_payment',
    });
    if (rateLimitError) {
      return jsonResponse({ error: 'Too many payment attempts. Please wait.' }, 429);
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return jsonResponse({ error: 'Missing requestId' }, 400);
    }

    const { data: request, error: reqError } = await supabase
      .from('requests')
      .select('id, price, sender_id, traveller_id, status')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (request.sender_id !== user.id) {
      return jsonResponse({ error: 'Only the sender can initiate payment' }, 403);
    }

    if (request.status !== 'accepted') {
      return jsonResponse({ error: 'Payment can only be created for accepted requests' }, 400);
    }

    const { data: existingPayment, error: paymentCheckError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentCheckError) {
      console.error('[create-razorpay-order] Payment lookup error:', paymentCheckError.message);
      return jsonResponse({ error: 'Unable to validate existing payment state' }, 500);
    }

    if (existingPayment?.status === 'locked') {
      return jsonResponse({ error: 'Payment already exists for this request' }, 409);
    }

    if (existingPayment?.status === 'released') {
      return jsonResponse({ error: 'Payment has already been completed for this request' }, 409);
    }

    if (existingPayment?.status === 'refunded') {
      return jsonResponse({ error: 'This request payment has already been refunded' }, 409);
    }

    const amountInPaise = Math.round(Number(request.price) * 100);
    if (amountInPaise <= 0 || amountInPaise > 99999999999) {
      return jsonResponse({ error: 'Invalid amount' }, 400);
    }

    const { data: pendingOrder, error: pendingOrderError } = await supabase
      .from('razorpay_orders')
      .select('order_id, amount_paise, currency, status, created_at')
      .eq('request_id', requestId)
      .eq('sender_id', user.id)
      .eq('status', 'created')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOrderError) {
      console.error('[create-razorpay-order] Pending order lookup error:', pendingOrderError.message);
      return jsonResponse({ error: 'Unable to validate pending payment order' }, 500);
    }

    if (pendingOrder) {
      const pendingCreatedAt = new Date(pendingOrder.created_at).getTime();
      const staleThresholdMs = 30 * 60 * 1000;

      if (Number.isFinite(pendingCreatedAt) && Date.now() - pendingCreatedAt <= staleThresholdMs) {
        return jsonResponse({
          orderId: pendingOrder.order_id,
          amount: Number(pendingOrder.amount_paise),
          currency: pendingOrder.currency,
          keyId: RAZORPAY_KEY_ID,
        });
      }

      await supabase
        .from('razorpay_orders')
        .update({ status: 'failed' })
        .eq('order_id', pendingOrder.order_id)
        .eq('status', 'created');
    }

    const orderPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `req_${requestId.slice(0, 20)}`,
      notes: {
        request_id: requestId,
        sender_id: user.id,
        traveller_id: request.traveller_id,
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!razorpayResponse.ok) {
      const errBody = await razorpayResponse.text();
      console.error('[create-razorpay-order] Razorpay error:', errBody);
      return jsonResponse({ error: 'Failed to create payment order' }, 502);
    }

    const order = await razorpayResponse.json();

    if (
      typeof order?.id !== 'string'
      || Number(order?.amount) !== amountInPaise
      || order?.currency !== 'INR'
    ) {
      return jsonResponse({ error: 'Payment provider returned an invalid order' }, 502);
    }

    const { error: orderStoreError } = await supabase.from('razorpay_orders').insert({
      order_id: order.id,
      request_id: request.id,
      sender_id: user.id,
      amount_paise: amountInPaise,
      currency: 'INR',
    });

    if (orderStoreError) {
      console.error('[create-razorpay-order] Failed to persist order:', orderStoreError.message);
      return jsonResponse({ error: 'Failed to initialize payment verification' }, 500);
    }

    return jsonResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[create-razorpay-order]', message);
    return jsonResponse({ error: message }, 500);
  }
});

