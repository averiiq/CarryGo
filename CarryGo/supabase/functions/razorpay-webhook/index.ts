import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-razorpay-signature',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RAZORPAY_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expectedSignature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedSignature.length !== signature.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    mismatch |= expectedSignature.charCodeAt(index) ^ signature.charCodeAt(index);
  }

  return mismatch === 0;
}

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return jsonResponse({ error: 'Webhook secret is not configured' }, 503);
    }

    const signature = req.headers.get('x-razorpay-signature') ?? '';
    if (!signature) {
      return jsonResponse({ error: 'Missing webhook signature' }, 401);
    }

    const rawBody = await req.text();
    const isValidSignature = await verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      return jsonResponse({ error: 'Invalid webhook signature' }, 401);
    }

    const body = JSON.parse(rawBody) as RazorpayEvent;
    const eventName = body.event ?? '';

    const paymentEntity = body.payload?.payment?.entity ?? {};
    const orderEntity = body.payload?.order?.entity ?? {};

    const orderId = String(paymentEntity.order_id ?? orderEntity.id ?? '');
    const paymentId = String(paymentEntity.id ?? '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!orderId) {
      return jsonResponse({ ok: true, ignored: true, reason: 'No order id in payload' });
    }

    if (eventName === 'payment.failed') {
      await supabase
        .from('razorpay_orders')
        .update({ status: 'failed' })
        .eq('order_id', orderId)
        .eq('status', 'created');

      return jsonResponse({ ok: true, action: 'marked_failed' });
    }

    if (['payment.authorized', 'payment.captured'].includes(eventName)) {
      if (!paymentId) {
        return jsonResponse({ ok: true, ignored: true, reason: 'No payment id for payment event' });
      }

      const { error } = await supabase.rpc('finalize_razorpay_payment', {
        p_order_id: orderId,
        p_payment_id: paymentId,
      });

      if (error) {
        console.error('[razorpay-webhook] finalize_razorpay_payment:', error.message);
        return jsonResponse({ ok: false, error: 'Failed to finalize payment' }, 500);
      }

      return jsonResponse({ ok: true, action: 'finalized' });
    }

    if (eventName === 'order.paid' && paymentId) {
      const { error } = await supabase.rpc('finalize_razorpay_payment', {
        p_order_id: orderId,
        p_payment_id: paymentId,
      });

      if (error) {
        console.error('[razorpay-webhook] finalize_razorpay_payment(order.paid):', error.message);
        return jsonResponse({ ok: false, error: 'Failed to finalize payment' }, 500);
      }

      return jsonResponse({ ok: true, action: 'finalized' });
    }

    return jsonResponse({ ok: true, ignored: true, event: eventName });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[razorpay-webhook]', message);
    return jsonResponse({ error: message }, 500);
  }
});
