import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { timingSafeEqual } from 'https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts';

import { handleCors } from '../_shared/cors.ts';

type ReceiptResponse = {
  data?: Record<string, { status: 'ok' | 'error'; message?: string; details?: { error?: string } }>;
};

const encoder = new TextEncoder();

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors.rejectedResponse) return cors.rejectedResponse;
  if (cors.preflightResponse) return cors.preflightResponse;
  const corsHeaders = cors.headers;

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalSecret = Deno.env.get('INTERNAL_SERVICE_KEY');

    const isServiceKey = safeEqual(token, serviceRoleKey);
    const isSecretMatch = Boolean(internalSecret && safeEqual(req.headers.get('x-service-token') || '', internalSecret));

    // Internal-only endpoint — reject all non-service callers
    if (!isServiceKey && !isSecretMatch) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('notification_deliveries')
      .select('id, user_device_id, expo_ticket_id')
      .eq('status', 'ticketed')
      .not('expo_ticket_id', 'is', null)
      .limit(100);

    if (deliveriesError) {
      throw deliveriesError;
    }

    if (!deliveries || deliveries.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const receiptIds = deliveries
      .map(delivery => delivery.expo_ticket_id)
      .filter((value): value is string => Boolean(value));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: receiptIds }),
    });

    const expoResult = (await expoResponse.json()) as ReceiptResponse;

    if (!expoResponse.ok) {
      console.error('[process-push-receipts] Expo API error:', expoResult);
      return new Response(JSON.stringify({ error: 'Push receipt check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const delivery of deliveries) {
      const ticketId = delivery.expo_ticket_id as string;
      const receipt = expoResult.data?.[ticketId];
      if (!receipt) {
        continue;
      }

      const isInvalidToken = receipt.details?.error === 'DeviceNotRegistered';
      const nextStatus = receipt.status === 'ok'
        ? 'delivered'
        : isInvalidToken
          ? 'invalid_token'
          : 'failed';

      await supabase
        .from('notification_deliveries')
        .update({
          status: nextStatus,
          checked_at: new Date().toISOString(),
          delivered_at: receipt.status === 'ok' ? new Date().toISOString() : null,
          last_error: receipt.message ?? receipt.details?.error ?? null,
        })
        .eq('id', delivery.id);

      if (isInvalidToken) {
        await supabase
          .from('user_devices')
          .update({
            invalidated_at: new Date().toISOString(),
            failure_count: 1,
          })
          .eq('id', delivery.user_device_id);
      }
    }

    return new Response(JSON.stringify({ success: true, checked: deliveries.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[process-push-receipts]', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
