/**
 * Unified verify-payment edge function.
 * Verifies payment with the correct gateway adapter and calls finalize_gateway_payment.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';
import { resolveGatewayCredentialsByName, createGatewayAdapter } from '../_shared/gateways/index.ts';
import type { GatewayId } from '../_shared/gateways/types.ts';

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
      p_action: 'verify_payment',
    });
    if (rlError) return json({ error: 'Too many verification attempts.' }, 429);

    const body = await req.json();
    const { orderId, paymentId, signature, requestId, gateway: explicitGateway, checkOnly } = body;

    // Determine gateway from the order record
    let gateway: GatewayId = explicitGateway || 'razorpay';

    if (orderId) {
      const { data: orderRecord } = await supabase
        .from('payment_orders')
        .select('gateway, request_id, sender_id, amount_paise, status')
        .eq('order_id', orderId)
        .maybeSingle();

      if (orderRecord) {
        gateway = orderRecord.gateway as GatewayId;

        // Auth check
        if (orderRecord.sender_id !== user.id) {
          return json({ error: 'Only the sender can verify payment' }, 403);
        }
        if (orderRecord.status === 'failed' || orderRecord.status === 'expired') {
          return json({ error: 'This payment order is no longer valid. Please retry.' }, 409);
        }
      }
    }

    // Get credentials and create adapter
    const creds = await resolveGatewayCredentialsByName(supabase, gateway);
    const adapter = createGatewayAdapter(creds);

    // Check-only mode (for polling payment link status)
    if (checkOnly) {
      if (!orderId) return json({ error: 'Missing orderId' }, 400);
      if (adapter.checkPaymentStatus) {
        const status = await adapter.checkPaymentStatus(orderId);
        return json(status);
      }
      return json({ paid: false, status: 'unsupported' });
    }

    // Full verification
    if (!orderId || !requestId) {
      return json({ error: 'Missing required fields (orderId, requestId)' }, 400);
    }

    const result = await adapter.verifyPayment({
      orderId,
      paymentId: paymentId || '',
      signature: signature || '',
      requestId,
    });

    if (!result.verified) {
      // Mark order failed
      await supabase.from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', orderId).eq('gateway', gateway).eq('status', 'created');

      return json({ error: 'Payment verification failed' }, 400);
    }

    // Finalize: create locked payment with split calculation
    const { data: payment, error: finalizeError } = await supabase.rpc('finalize_gateway_payment', {
      p_order_id: orderId,
      p_payment_id: result.paymentId,
      p_gateway: gateway,
    });

    if (finalizeError) {
      console.error('[verify-payment] finalize error:', finalizeError.message);
      await supabase.from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', orderId).eq('gateway', gateway).eq('status', 'created');
      return json({ error: 'Failed to record payment' }, 500);
    }

    return json({
      paymentId: payment.id,
      status: 'locked',
      amount: payment.amount,
      gateway,
      split: {
        platformFee: Number(payment.platform_fee || 0),
        gst: Number(payment.gst_amount || 0),
        travelerPayout: Number(payment.traveler_payout || 0),
      },
    });
  } catch (err) {
    console.error('[verify-payment]', err instanceof Error ? err.message : String(err));
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
