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

type ExpoTicket = {
  id?: string;
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record || payload;

    const { id, user_id, title, body, type, related_id } = record;

    if (!id || !user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, expo_push_token, failure_count')
      .eq('user_id', user_id)
      .is('invalidated_at', null);

    if (devicesError) {
      return new Response(JSON.stringify({ error: devicesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const activeDevices = (devices || []).filter(device =>
      typeof device.expo_push_token === 'string'
      && device.expo_push_token.startsWith('ExponentPushToken')
    );

    if (activeDevices.length === 0) {
      return new Response(JSON.stringify({ message: 'No Expo push devices for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = activeDevices.map(device => ({
      to: device.expo_push_token,
      title,
      body,
      sound: 'default',
      badge: 1,
      data: {
        type,
        relatedId: related_id || null,
      },
      channelId: 'default',
    }));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    if (!expoResponse.ok) {
      console.error('Expo push error:', JSON.stringify(expoResult));
      return new Response(JSON.stringify({ error: `Expo push failed: ${JSON.stringify(expoResult)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tickets = Array.isArray(expoResult.data) ? expoResult.data as ExpoTicket[] : [];

    for (let index = 0; index < activeDevices.length; index += 1) {
      const device = activeDevices[index];
      const ticket = tickets[index] || {};
      const ticketError = ticket.details?.error === 'DeviceNotRegistered';
      const nextStatus = ticket.status === 'ok'
        ? 'ticketed'
        : ticketError
          ? 'invalid_token'
          : 'failed';

      await supabase.from('notification_deliveries').upsert({
        notification_id: id,
        user_device_id: device.id,
        expo_ticket_id: ticket.id ?? null,
        status: nextStatus,
        attempt_count: 1,
        sent_at: new Date().toISOString(),
        checked_at: ticket.status === 'ok' ? null : new Date().toISOString(),
        last_error: ticket.message ?? ticket.details?.error ?? null,
      }, {
        onConflict: 'notification_id,user_device_id',
      });

      if (ticketError) {
        await supabase
          .from('user_devices')
          .update({
            invalidated_at: new Date().toISOString(),
            failure_count: (device.failure_count ?? 0) + 1,
          })
          .eq('id', device.id);
      }
    }

    return new Response(JSON.stringify({ success: true, result: expoResult }), {
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
