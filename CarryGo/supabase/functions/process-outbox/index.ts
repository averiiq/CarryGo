import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { timingSafeEqual } from 'https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts';

import { handleCors } from '../_shared/cors.ts';

const encoder = new TextEncoder();

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

serve(async req => {
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

    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = Number(payload?.limit ?? 50);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase.rpc('process_outbox_events', {
      p_limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 250)) : 50,
    });

    if (error) {
      console.error('[process-outbox] RPC error:', error.message);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ processed: data ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-outbox] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
