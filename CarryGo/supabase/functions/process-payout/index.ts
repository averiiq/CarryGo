/**
 * Process traveler payout after payment release.
 * Called after delivery confirmation (OTP verified) releases the payment.
 * Initiates the actual transfer to the traveler via the gateway payout API.
 * Falls back to marking as manual payout if gateway doesn't support transfers.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: accept either service_role (internal/webhook) or authenticated user
    const authHeader = req.headers.get('authorization');
    let callerUserId: string | null = null;
    let isServiceCall = false;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (token === serviceKey) {
        isServiceCall = true;
      } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return json({ error: 'Unauthorized' }, 401);
        callerUserId = user.id;
      }
    } else {
      return json({ error: 'Missing authorization' }, 401);
    }

    const body = await req.json();
    const { paymentId } = body;
    if (!paymentId) return json({ error: 'Missing paymentId' }, 400);

    // Fetch the payment with split details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, request_id, sender_id, traveller_id, amount, status, gateway_provider, gateway_payment_id, platform_fee, gst_amount, traveler_payout, payout_status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) return json({ error: 'Payment not found' }, 404);

    // Only process released payments with pending/processing payout
    if (payment.status !== 'released') {
      return json({ error: 'Payment must be released before payout' }, 400);
    }

    if (payment.payout_status === 'completed') {
      return json({ ok: true, action: 'already_completed', payoutStatus: 'completed' });
    }

    // Auth check: caller must be the traveller or a service call
    if (!isServiceCall && callerUserId !== payment.traveller_id) {
      return json({ error: 'Only the traveller or admin can trigger payout' }, 403);
    }

    const payoutAmountPaise = Math.round(Number(payment.traveler_payout || payment.amount) * 100);
    const gateway = (payment.gateway_provider || 'razorpay') as GatewayId;

    // Fetch traveler details for payout
    const { data: traveler } = await supabase
      .from('user_profiles')
      .select('full_name, phone, email')
      .eq('id', payment.traveller_id)
      .single();

    const beneficiaryName = traveler?.full_name || 'Traveler';
    const beneficiaryContact = traveler?.phone || traveler?.email || '';

    // Try gateway payout
    try {
      const creds = await resolveGatewayCredentialsByName(supabase, gateway);
      const adapter = createGatewayAdapter(creds);

      if (adapter.initiatePayout) {
        const result = await adapter.initiatePayout({
          amountPaise: payoutAmountPaise,
          currency: 'INR',
          beneficiaryName,
          beneficiaryContact,
          referenceId: `payout_${payment.id.slice(0, 12)}`,
          narration: `CaryGoo delivery payout for request ${payment.request_id.slice(0, 8)}`,
        });

        if (result.success) {
          await supabase
            .from('payments')
            .update({
              payout_status: result.status === 'processed' ? 'completed' : 'processing',
              payout_reference: result.payoutId,
              payout_completed_at: result.status === 'processed' ? new Date().toISOString() : null,
            })
            .eq('id', paymentId);

          return json({
            ok: true,
            action: 'payout_initiated',
            payoutId: result.payoutId,
            payoutStatus: result.status,
            split: {
              totalAmount: Number(payment.amount),
              platformFee: Number(payment.platform_fee || 0),
              gst: Number(payment.gst_amount || 0),
              travelerPayout: Number(payment.traveler_payout || payment.amount),
            },
          });
        }

        // Gateway payout failed — mark as failed for admin review
        console.error('[process-payout] Gateway payout failed:', result.error);
        await supabase
          .from('payments')
          .update({
            payout_status: 'failed',
            payout_reference: `gateway_error: ${result.error || 'Unknown error'}`,
          })
          .eq('id', paymentId);

        return json({
          ok: false,
          action: 'payout_failed',
          error: result.error || 'Gateway payout failed',
          manualPayoutRequired: true,
        });
      }
    } catch (gwErr) {
      console.warn('[process-payout] Gateway adapter error:', gwErr instanceof Error ? gwErr.message : String(gwErr));
    }

    // No gateway payout available — mark as pending for manual processing
    await supabase
      .from('payments')
      .update({ payout_status: 'pending' })
      .eq('id', paymentId);

    return json({
      ok: true,
      action: 'manual_payout_required',
      payoutStatus: 'pending',
      message: 'Gateway payout not available. Admin will process manually.',
      split: {
        totalAmount: Number(payment.amount),
        platformFee: Number(payment.platform_fee || 0),
        gst: Number(payment.gst_amount || 0),
        travelerPayout: Number(payment.traveler_payout || payment.amount),
      },
    });
  } catch (err) {
    console.error('[process-payout]', err instanceof Error ? err.message : String(err));
    return json({ error: 'Internal server error' }, 500);
  }
});
