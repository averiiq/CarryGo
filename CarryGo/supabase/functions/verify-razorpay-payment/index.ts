import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  return expectedSignature === signature;
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, requestId } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !requestId) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const isValid = await verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return jsonResponse({ error: 'Invalid payment signature' }, 400);
    }

    const { data: request, error: reqError } = await supabase
      .from('requests')
      .select('id, price, sender_id, traveller_id')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (request.sender_id !== user.id) {
      return jsonResponse({ error: 'Only the sender can verify payment' }, 403);
    }

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        request_id: requestId,
        sender_id: request.sender_id,
        traveller_id: request.traveller_id,
        amount: Number(request.price),
        status: 'locked',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[verify-razorpay-payment] Insert error:', insertError.message);
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
