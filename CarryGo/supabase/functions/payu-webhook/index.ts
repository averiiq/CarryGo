/**
 * PayU webhook/callback handler.
 * Receives payment notifications from PayU and finalizes payments.
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

    const creds = await resolveGatewayCredentialsByName(supabase, 'payu');
    const adapter = createGatewayAdapter(creds);

    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const hash = params.get('hash') || '';

    if (!hash) return json({ error: 'Missing hash' }, 401);

    const isValid = await adapter.verifyWebhookSignature(rawBody, hash);
    if (!isValid) return json({ error: 'Invalid webhook signature' }, 401);

    const status = params.get('status') || '';
    const txnId = params.get('txnid') || '';
    const mihpayid = params.get('mihpayid') || '';

    if (!txnId) return json({ ok: true, ignored: true, reason: 'No txnid' });

    if (status === 'success') {
      const { error } = await supabase.rpc('finalize_gateway_payment', {
        p_order_id: txnId,
        p_payment_id: mihpayid || txnId,
        p_gateway: 'payu',
      });

      if (error) {
        console.error('[payu-webhook] finalize error:', error.message);
        return json({ ok: false, error: 'Failed to finalize payment' }, 500);
      }

      return json({ ok: true, action: 'finalized' });
    }

    if (status === 'failure') {
      await supabase.from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', txnId).eq('gateway', 'payu').eq('status', 'created');

      return json({ ok: true, action: 'marked_failed' });
    }

    return json({ ok: true, ignored: true, status });
  } catch (err) {
    console.error('[payu-webhook]', err instanceof Error ? err.message : String(err));
    return json({ error: 'Internal server error' }, 500);
  }
});
