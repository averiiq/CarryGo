import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY') ?? '';

const ALLOWED_PREFIXES = ['avatars/', 'parcels/', 'kyc-documents/', 'delivery-proofs/'];

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

async function sha1Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many uploads. Please wait.' }),
        { status: 429, headers }
      );
    }

    const body = await req.json();
    // Support both old format {folder, publicId} and new format {publicId}
    // If old client sends folder separately, merge it into publicId
    let publicId: string = body.publicId ?? '';
    if (!publicId && body.folder && body.publicId === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: publicId' }),
        { status: 400, headers }
      );
    }
    if (body.folder && publicId && !publicId.startsWith(body.folder)) {
      publicId = `${body.folder}/${publicId}`;
    }

    if (!publicId || typeof publicId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required field: publicId' }),
        { status: 400, headers }
      );
    }

    if (publicId.includes('..') || publicId.includes('\0') || publicId.includes('\\')) {
      return new Response(
        JSON.stringify({ error: 'Invalid characters in path.' }),
        { status: 400, headers }
      );
    }

    const hasValidPrefix = ALLOWED_PREFIXES.some(p => publicId.startsWith(p));
    if (!hasValidPrefix) {
      return new Response(
        JSON.stringify({ error: 'Invalid upload path prefix.' }),
        { status: 400, headers }
      );
    }

    if (!publicId.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Upload path must include your user ID.' }),
        { status: 403, headers }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Sign EXACTLY what we send to Cloudinary: public_id and timestamp only
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = await sha1Hex(stringToSign);

    return new Response(JSON.stringify({
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY,
      publicId,
    }), { headers });

  } catch (err) {
    console.error('[generate-upload-url]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
});
