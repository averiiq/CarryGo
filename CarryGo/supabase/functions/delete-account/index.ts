import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors.rejectedResponse) return cors.rejectedResponse;
  if (cors.preflightResponse) return cors.preflightResponse;

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...cors.headers },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return jsonResponse({ error: 'Server configuration missing' }, 503);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const { data: authData, error: authError } = await userClient.auth.getUser(token);

    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userId = authData.user.id;

    const { error: rateLimitError } = await userClient.rpc('enforce_rate_limit', {
      p_user_id: userId,
      p_action: 'delete_account',
    });
    if (rateLimitError) {
      return jsonResponse({ error: 'Too many attempts. Please wait.' }, 429);
    }

    // Call the PostgreSQL soft_delete_user_account RPC
    const { data: rpcData, error: rpcError } = await userClient.rpc('soft_delete_user_account');

    if (rpcError) {
      console.error('[delete-account] soft delete failed', rpcError.message);
      return jsonResponse({ error: 'Failed to delete account. Please try again later.' }, 500);
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData && rpcData.error) {
      console.warn('[delete-account] RPC returned error:', rpcData.error);
      return jsonResponse({ error: 'Account deletion is not allowed at this time.' }, 400);
    }

    return jsonResponse({ success: true, data: rpcData });
  } catch (err) {
    console.error('[delete-account]', err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
