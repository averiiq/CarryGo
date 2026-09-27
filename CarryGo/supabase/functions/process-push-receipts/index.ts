import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(req: Request) {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean);
  const origin = req.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

type ReceiptResponse = {
  data?: Record<string, { status: 'ok' | 'error'; message?: string; details?: { error?: string } }>;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalSecret = Deno.env.get('INTERNAL_SERVICE_KEY');

    const isServiceKey = Boolean(token && serviceRoleKey && token === serviceRoleKey);
    const isSecretMatch = Boolean(internalSecret && req.headers.get('x-service-token') === internalSecret);

    if (!isServiceKey && !isSecretMatch) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      );
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
      return new Response(JSON.stringify({ error: expoResult }), {
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
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
