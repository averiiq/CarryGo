import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { handleCors } from '../_shared/cors.ts';

type ExpoTicket = {
  id?: string;
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors.rejectedResponse) return cors.rejectedResponse;
  if (cors.preflightResponse) return cors.preflightResponse;
  const corsHeaders = cors.headers;

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalSecret = Deno.env.get('INTERNAL_SERVICE_KEY') || Deno.env.get('PUSH_WEBHOOK_SECRET');

    const isServiceKey = Boolean(token && serviceRoleKey && token === serviceRoleKey);
    const isSecretMatch = Boolean(internalSecret && (req.headers.get('x-service-token') === internalSecret || req.headers.get('x-webhook-secret') === internalSecret));

    let authenticatedUser: { id: string } | null = null;

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
      authenticatedUser = user;

      // Rate limit push notification requests for authenticated users
      const { error: rateLimitError } = await anonClient.rpc('enforce_rate_limit', {
        p_user_id: user.id,
        p_action: 'send_push_notification',
      });
      if (rateLimitError) {
        return new Response(JSON.stringify({ error: 'Too many notification requests. Please wait.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = await req.json();
    const record = payload.record || payload;

    const { id, user_id, title, body, type, related_id, category, priority, deep_link, data: rawData } = record;

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

    // Enforce authorization: Non-service callers can only dispatch to themselves unless they have an admin role
    if (authenticatedUser && authenticatedUser.id !== user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('system_role')
        .eq('id', authenticatedUser.id)
        .maybeSingle();

      const isAdmin = profile?.system_role === 'admin' || profile?.system_role === 'support_agent';
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Cannot send push notification to another user' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Anti-self-alerting guard: do not push notifications back to the acting user
    const senderId = (rawData as any)?.senderId || (rawData as any)?.sender_id;
    if (senderId && senderId === user_id && type !== 'system_alert') {
      return new Response(JSON.stringify({ message: 'Self-notification suppressed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, expo_push_token, failure_count')
      .eq('user_id', user_id)
      .is('invalidated_at', null);

    if (devicesError) {
      console.error('[send-push-notifications] devices lookup error:', devicesError.message);
      return new Response(JSON.stringify({ error: 'Failed to look up devices' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const seenTokens = new Set<string>();
    const activeDevices = (devices || []).filter(device => {
      const token = typeof device.expo_push_token === 'string' ? device.expo_push_token.trim() : '';
      const isValid = (
        token.startsWith('ExponentPushToken[')
        || token.startsWith('ExpoPushToken[')
        || /^[a-zA-Z0-9_-]{22,64}$/.test(token)
      );
      if (isValid && !seenTokens.has(token)) {
        seenTokens.add(token);
        return true;
      }
      return false;
    });

    if (activeDevices.length === 0) {
      return new Response(JSON.stringify({ message: 'No Expo push devices for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine Android notification channel
    const channelId = category === 'payment'
      ? 'payments'
      : (category === 'parcel_update' || category === 'trip_update' || type === 'delivery_otp')
        ? 'deliveries'
        : 'default';

    const pushPriority = (priority === 'critical' || priority === 'high') ? 'high' : 'default';

    const messages = activeDevices.map(device => ({
      to: device.expo_push_token,
      title,
      body,
      sound: 'default',
      badge: 1,
      priority: pushPriority,
      channelId,
      data: {
        recipientId: user_id,
        notificationId: id,
        type: type || 'general',
        category: category || 'general',
        priority: priority || 'normal',
        relatedId: related_id || null,
        deepLink: deep_link || null,
        ...(typeof rawData === 'object' && rawData !== null ? rawData : {}),
      },
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
      console.error('[send-push-notifications] Expo push error:', JSON.stringify(expoResult));
      return new Response(JSON.stringify({ error: 'Push notification dispatch failed' }), {
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
    console.error('[send-push-notifications]', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
