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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalSecret = Deno.env.get('INTERNAL_SERVICE_KEY') || Deno.env.get('EMAIL_WEBHOOK_SECRET');

    const isServiceKey = Boolean(token && serviceRoleKey && token === serviceRoleKey);
    const isSecretMatch = Boolean(internalSecret && (req.headers.get('x-service-token') === internalSecret || req.headers.get('x-webhook-secret') === internalSecret));

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

    const payload = await req.json();
    const { to, subject, html, text, from = 'CaryGoo <notifications@carygoo.com>', replyTo = 'support@carygoo.com' } = payload;

    if (!to || !subject || (!html && !text)) {
      return new Response(JSON.stringify({ error: 'Missing required email fields (to, subject, content)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const recipients = Array.isArray(to) ? to : [to];
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject,
          html,
          text,
          reply_to: replyTo,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        console.error('Resend delivery failed:', resendData);
        return new Response(JSON.stringify({ error: 'Resend dispatch failed', details: resendData }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, messageId: resendData.id, provider: 'resend' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dev / Staging simulated delivery
    const simId = `sim_${Date.now()}`;
    console.log(`[send-email Edge Function] Simulated email delivery to: ${JSON.stringify(to)}, Subject: "${subject}"`);

    return new Response(JSON.stringify({ success: true, messageId: simId, provider: 'simulator' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

