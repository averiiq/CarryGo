/**
 * PhonePe webhook handler.
 * Receives payment callbacks from PhonePe and finalizes payments.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WEBHOOK_CORS_HEADERS as CORS_HEADERS } from '../_shared/cors.ts';
import { resolveGatewayCredentialsByName, createGatewayAdapter } from '../_shared/gateways/index.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const creds = await resolveGatewayCredentialsByName(supabase, 'phonepe');
    const adapter = createGatewayAdapter(creds);

    const rawBody = await req.text();
    const xVerify = req.headers.get('x-verify') || '';

    if (!xVerify) return json({ error: 'Missing verification header' }, 401);

    const isValid = await adapter.verifyWebhookSignature(rawBody, xVerify);
    if (!isValid) return json({ error: 'Invalid webhook signature' }, 401);

    const body = JSON.parse(rawBody);
    const responseBase64 = body.response;
    if (!responseBase64) return json({ ok: true, ignored: true, reason: 'No response payload' });

    const decoded = JSON.parse(atob(responseBase64));
    const code = decoded?.code;
    const transactionId = decoded?.data?.merchantTransactionId;

    if (!transactionId) return json({ ok: true, ignored: true, reason: 'No transaction ID' });

    if (code === 'PAYMENT_SUCCESS') {
      const paymentId = decoded?.data?.transactionId || transactionId;

      const { error } = await supabase.rpc('finalize_gateway_payment', {
        p_order_id: transactionId,
        p_payment_id: paymentId,
        p_gateway: 'phonepe',
      });

      if (error) {
        console.error('[phonepe-webhook] finalize error:', error.message);
        return json({ ok: false, error: 'Failed to finalize payment' }, 500);
      }

      return json({ ok: true, action: 'finalized' });
    }

    if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
      await supabase.from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', transactionId).eq('gateway', 'phonepe').eq('status', 'created');

      return json({ ok: true, action: 'marked_failed' });
    }

    return json({ ok: true, ignored: true, code });
  } catch (err) {
    console.error('[phonepe-webhook]', err instanceof Error ? err.message : String(err));
    return json({ error: 'Internal server error' }, 500);
  }
});
