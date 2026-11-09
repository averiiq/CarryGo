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

const DEFAULT_SANDBOX_BASE_URL = 'https://api.sandbox.co.in';

let cachedSandboxToken: string | null = null;
let sandboxTokenExpiry = 0;

async function getSandboxToken(apiKey: string, apiSecret: string, baseUrl: string): Promise<string> {
  const now = Date.now();
  if (cachedSandboxToken && sandboxTokenExpiry > now + 60000) {
    return cachedSandboxToken;
  }

  const response = await fetch(`${baseUrl}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'x-api-secret': apiSecret,
      'x-api-version': '2.0',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sandbox gateway authentication failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    data?: { access_token?: string };
  };

  const token = data.access_token || data.data?.access_token;
  if (!token) {
    throw new Error('Could not obtain access token from UIDAI Sandbox gateway.');
  }

  cachedSandboxToken = token;
  sandboxTokenExpiry = now + 23 * 60 * 60 * 1000;
  return token;
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Server configuration missing' }, 503);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const { data: authData, error: authError } = await userClient.auth.getUser(token);

    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload = await req.json();
    const { action } = payload;

    const apiKey = Deno.env.get('SANDBOX_API_KEY') || '';
    const apiSecret = Deno.env.get('SANDBOX_API_SECRET') || '';
    const baseUrl = (Deno.env.get('SANDBOX_BASE_URL') || DEFAULT_SANDBOX_BASE_URL).replace(/\/+$/, '');

    if (!apiKey || !apiSecret) {
      return jsonResponse({ error: 'Sandbox provider credentials not configured on server' }, 503);
    }

    const sandboxAuthToken = await getSandboxToken(apiKey, apiSecret, baseUrl);

    if (action === 'generate_otp') {
      const { aadhaarNumber } = payload;
      const cleanAadhaar = String(aadhaarNumber || '').replace(/\D/g, '');

      if (cleanAadhaar.length !== 12) {
        return jsonResponse({ error: 'Aadhaar number must be exactly 12 digits' }, 400);
      }

      const response = await fetch(`${baseUrl}/kyc/aadhaar/okyc/otp`, {
        method: 'POST',
        headers: {
          'Authorization': sandboxAuthToken,
          'x-api-key': apiKey,
          'x-api-version': '2.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
          aadhaar_number: cleanAadhaar,
          consent: 'y',
          reason: 'For KYC verification',
        }),
      });

      const resData = await response.json();
      return jsonResponse(resData, response.status);
    }

    if (action === 'verify_otp') {
      const { referenceId, otp } = payload;
      const cleanOtp = String(otp || '').replace(/\D/g, '');

      if (!referenceId || cleanOtp.length !== 6) {
        return jsonResponse({ error: 'Valid reference ID and 6-digit OTP required' }, 400);
      }

      const response = await fetch(`${baseUrl}/kyc/aadhaar/okyc/otp/verify`, {
        method: 'POST',
        headers: {
          'Authorization': sandboxAuthToken,
          'x-api-key': apiKey,
          'x-api-version': '2.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
          reference_id: referenceId,
          otp: cleanOtp,
        }),
      });

      const resData = await response.json();
      return jsonResponse(resData, response.status);
    }

    return jsonResponse({ error: `Unsupported KYC action: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
