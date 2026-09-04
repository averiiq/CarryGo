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

    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('[delete-account] profile delete failed', profileDeleteError.message);
      return jsonResponse({ error: 'Failed to delete account profile' }, 500);
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId, true);

    if (authDeleteError) {
      console.error('[delete-account] auth delete failed', authDeleteError.message);
      return jsonResponse({ error: 'Failed to delete account user' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[delete-account]', message);
    return jsonResponse({ error: message }, 500);
  }
});
