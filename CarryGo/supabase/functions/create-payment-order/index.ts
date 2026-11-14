/**
 * Unified create-payment-order edge function.
 * Reads the active gateway from DB, creates an order on the right provider,
 * stores it in payment_orders, and returns client data.
 * Backward-compatible: if no DB credentials exist, falls back to env-var Razorpay.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';
import { resolveGatewayCredentials, createGatewayAdapter } from '../_shared/gateways/index.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors.rejectedResponse) return cors.rejectedResponse;
  if (cors.preflightResponse) return cors.preflightResponse;

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...cors.headers },
    });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Rate limit
    const { error: rlError } = await userClient.rpc('enforce_rate_limit', {
      p_user_id: user.id,
      p_action: 'create_payment',
    });
    if (rlError) return json({ error: 'Too many payment attempts. Please wait.' }, 429);

    const body = await req.json();
    const { requestId, generateLink, customer } = body;
    if (!requestId) return json({ error: 'Missing requestId' }, 400);

    // Resolve request (with delivery fallback)
    let targetRequestId = requestId;
    let { data: request, error: reqError } = await supabase
      .from('requests')
      .select('id, price, sender_id, traveller_id, status')
      .eq('id', targetRequestId)
      .maybeSingle();

    if (!request) {
      const { data: delivery } = await supabase
        .from('deliveries').select('request_id').eq('id', requestId).maybeSingle();
      if (delivery?.request_id) {
        targetRequestId = delivery.request_id;
        const res = await supabase.from('requests')
          .select('id, price, sender_id, traveller_id, status')
          .eq('id', targetRequestId).maybeSingle();
        request = res.data;
        reqError = res.error;
      }
    }

    if (reqError || !request) return json({ error: 'Request not found' }, 404);
    if (request.sender_id !== user.id) return json({ error: 'Only the sender can initiate payment' }, 403);
    if (request.status !== 'accepted') return json({ error: 'Payment can only be created for accepted requests' }, 400);

    // Check existing payment
    const { data: existingPayment } = await supabase
      .from('payments').select('id, status')
      .eq('request_id', request.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (existingPayment?.status === 'locked') return json({ error: 'Payment already exists for this request' }, 409);
    if (existingPayment?.status === 'released') return json({ error: 'Payment already completed' }, 409);
    if (existingPayment?.status === 'refunded') return json({ error: 'Payment already refunded' }, 409);

    const amountPaise = Math.round(Number(request.price) * 100);
    if (amountPaise <= 0 || amountPaise > 99999999999) return json({ error: 'Invalid amount' }, 400);

    // Resolve active gateway and create adapter
    const creds = await resolveGatewayCredentials(supabase);
    const adapter = createGatewayAdapter(creds);

    // Check for recent pending order (reuse within 30 min)
    const { data: pendingOrder } = await supabase
      .from('payment_orders')
      .select('order_id, amount_paise, currency, status, created_at, gateway')
      .eq('request_id', request.id).eq('sender_id', user.id)
      .eq('gateway', creds.gateway).eq('status', 'created')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (pendingOrder) {
      const age = Date.now() - new Date(pendingOrder.created_at).getTime();
      if (age <= 30 * 60 * 1000) {
        // Reuse existing order
        return json({
          orderId: pendingOrder.order_id,
          amount: Number(pendingOrder.amount_paise),
          currency: pendingOrder.currency,
          gateway: creds.gateway,
          keyId: creds.keyId,
        });
      }
      // Expire stale order
      await supabase.from('payment_orders')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('order_id', pendingOrder.order_id).eq('gateway', creds.gateway);
    }

    // Pre-compute split for storage
    const { data: splitData } = await supabase.rpc('calculate_payment_split', {
      p_amount: Number(request.price),
    });
    const split = splitData?.[0] || { platform_fee: 0, gst_amount: 0, traveler_payout: Number(request.price) };

    // Create order on the gateway
    const result = await adapter.createOrder({
      amountPaise,
      currency: 'INR',
      requestId: request.id,
      senderId: user.id,
      travellerId: request.traveller_id || '',
      generateLink: Boolean(generateLink),
      customer: customer || {
        name: user.user_metadata?.full_name || user.email || 'CaryGoo Customer',
        email: user.email || '',
        phone: user.phone || '',
      },
    });

    // Persist in payment_orders
    const { error: insertError } = await supabase.from('payment_orders').insert({
      order_id: result.orderId,
      gateway: creds.gateway,
      request_id: request.id,
      sender_id: user.id,
      amount_paise: amountPaise,
      currency: 'INR',
      platform_fee_paise: Math.round(Number(split.platform_fee || 0) * 100),
      gst_paise: Math.round(Number(split.gst_amount || 0) * 100),
      traveler_payout_paise: Math.round(Number(split.traveler_payout || 0) * 100),
      gateway_response: result.clientData,
    });

    if (insertError) {
      console.error('[create-payment-order] Failed to persist order:', insertError.message);
      return json({ error: 'Failed to initialize payment' }, 500);
    }

    // Also insert into legacy razorpay_orders for backward compat
    if (creds.gateway === 'razorpay') {
      await supabase.from('razorpay_orders').insert({
        order_id: result.orderId,
        request_id: request.id,
        sender_id: user.id,
        amount_paise: amountPaise,
        currency: 'INR',
      }).then(() => {}, () => {});
    }

    return json({
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      gateway: creds.gateway,
      keyId: creds.keyId,
      // Gateway-specific client data
      ...result.clientData,
      // For redirect-based gateways (PhonePe, PayU)
      redirectUrl: result.redirectUrl,
      // Split preview
      split: {
        platformFee: Number(split.platform_fee || 0),
        gst: Number(split.gst_amount || 0),
        travelerPayout: Number(split.traveler_payout || 0),
      },
    });
  } catch (err) {
    console.error('[create-payment-order]', err instanceof Error ? err.message : String(err));
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
