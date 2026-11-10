import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';

const DEFAULT_SANDBOX_BASE_URL = 'https://api.sandbox.co.in';

let cachedSandboxToken: string | null = null;
let sandboxTokenExpiry = 0;
let tokenRefreshPromise: Promise<string> | null = null;

async function getSandboxToken(apiKey: string, apiSecret: string, baseUrl: string): Promise<string> {
  const now = Date.now();
  if (cachedSandboxToken && sandboxTokenExpiry > now + 60000) {
    return cachedSandboxToken;
  }

  // Deduplicate concurrent refresh requests
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = (async () => {
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
    sandboxTokenExpiry = Date.now() + 1 * 60 * 60 * 1000;
    return token;
  })().finally(() => {
    tokenRefreshPromise = null;
  });

  return tokenRefreshPromise;
}

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

    // Rate limit KYC OTP requests — 5 attempts per hour per user
    const { error: rateLimitError } = await userClient.rpc('enforce_rate_limit', {
      p_user_id: authData.user.id,
      p_action: 'kyc_otp_request',
    });
    if (rateLimitError) {
      return jsonResponse({ error: 'Too many KYC verification attempts. Please wait before trying again.' }, 429);
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
      // Strip PII — only return reference_id and status, never raw demographic data
      return jsonResponse({
        success: response.ok,
        referenceId: resData?.data?.reference_id || resData?.reference_id || null,
        message: resData?.data?.message || resData?.message || (response.ok ? 'OTP sent' : 'OTP generation failed'),
      }, response.status);
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

      if (response.ok && resData?.data) {
        // Store full PII server-side only (in kyc_sessions via RPC), never return to client
        const demographic = resData.data;
        const serviceClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        );
        await serviceClient.rpc('store_kyc_verification', {
          p_user_id: authData.user.id,
          p_reference_id: referenceId,
          p_full_name: demographic.full_name || demographic.name || '',
          p_dob: demographic.dob || demographic.date_of_birth || '',
          p_gender: demographic.gender || '',
          p_address: JSON.stringify(demographic.address || {}),
          p_photo: demographic.photo || demographic.profile_image || '',
          p_aadhaar_last_four: demographic.aadhaar_number?.slice(-4) || '',
        }).catch(err => console.warn('[sandbox-kyc] Failed to store KYC data:', err));

        // Return only success indicator — no PII
        return jsonResponse({
          success: true,
          verified: true,
          message: 'Aadhaar verification successful',
        });
      }

      return jsonResponse({
        success: false,
        verified: false,
        message: resData?.data?.message || resData?.message || 'OTP verification failed',
      }, response.status);
    }

    return jsonResponse({ error: `Unsupported KYC action: ${action}` }, 400);
  } catch (err) {
    console.error('[sandbox-kyc]', err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
