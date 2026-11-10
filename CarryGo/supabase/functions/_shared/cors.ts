/**
 * Shared CORS utility for Supabase Edge Functions.
 *
 * Mobile (React Native) requests have no Origin header and bypass CORS entirely.
 * Web origins are validated against ALLOWED_ORIGINS env var.
 * If ALLOWED_ORIGINS is not configured, non-webhook functions reject browser requests.
 */

const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'authorization, content-type, x-client-info, apikey, x-service-token';

/**
 * Build CORS headers for a request.
 * - If no Origin header (mobile/server), returns permissive headers (CORS not enforced by client).
 * - If Origin present, validates against ALLOWED_ORIGINS.
 * - Returns null if the origin is not allowed (caller should return 403).
 */
export function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // No Origin header = non-browser request (mobile app, server-to-server, curl)
  // CORS is a browser-only mechanism, so we allow these through
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    };
  }

  // Browser request with Origin header — validate against allowlist
  if (allowedOrigins.length === 0) {
    // ALLOWED_ORIGINS not configured — block browser requests for safety
    console.warn('[CORS] ALLOWED_ORIGINS not configured, rejecting browser request from:', origin);
    return null;
  }

  if (!allowedOrigins.includes(origin)) {
    console.warn('[CORS] Rejected origin:', origin, 'Allowed:', allowedOrigins);
    return null;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  };
}

/**
 * Handle CORS preflight or reject disallowed origins.
 * Returns a Response if the request should be short-circuited (preflight or rejected).
 * Returns null if the request should proceed.
 */
export function handleCors(req: Request): { headers: Record<string, string>; preflightResponse?: Response; rejectedResponse?: Response } {
  const corsHeaders = getCorsHeaders(req);

  if (!corsHeaders) {
    return {
      headers: {},
      rejectedResponse: new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  if (req.method === 'OPTIONS') {
    return {
      headers: corsHeaders,
      preflightResponse: new Response(null, { headers: corsHeaders }),
    };
  }

  return { headers: corsHeaders };
}

/**
 * CORS headers for webhook endpoints (Razorpay, etc.).
 * Webhooks are server-to-server and legitimately need '*' since
 * the payment provider's origin is not known in advance.
 */
export const WEBHOOK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-razorpay-signature',
};
