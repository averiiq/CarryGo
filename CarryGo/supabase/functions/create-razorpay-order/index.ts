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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
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

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('request_id', requestId)
      .single();

    if (existingPayment && existingPayment.status === 'locked') {
      return jsonResponse({ error: 'Payment already exists for this request' }, 409);
    }

    const amountInPaise = Math.round(Number(request.price) * 100);
    if (amountInPaise <= 0 || amountInPaise > 99999999999) {
      return jsonResponse({ error: 'Invalid amount' }, 400);
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
