import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
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

    // Call the PostgreSQL soft_delete_user_account RPC
    const { data: rpcData, error: rpcError } = await userClient.rpc('soft_delete_user_account');

    if (rpcError) {
      console.error('[delete-account] soft delete failed', rpcError.message);
      return jsonResponse({ error: rpcError.message || 'Failed to soft delete account' }, 500);
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData && rpcData.error) {
      return jsonResponse({ error: String(rpcData.error) }, 400);
    }

    return jsonResponse({ success: true, data: rpcData });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[delete-account]', message);
    return jsonResponse({ error: message }, 500);
  }
});
