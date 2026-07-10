import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AWS_REGION = Deno.env.get('AWS_REGION') ?? 'ap-south-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID') ?? '';
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '';

const BUCKETS: Record<string, { name: string; pathPrefix: string; cloudfrontDomain: string }> = {
  parcelProofs: {
    name: Deno.env.get('AWS_BUCKET_PARCEL_PROOFS') ?? 'carrygo-parcel-proofs',
    pathPrefix: 'parcel-proofs',
    cloudfrontDomain: Deno.env.get('CF_PARCEL_PROOFS') ?? '',
  },
  userDocuments: {
    name: Deno.env.get('AWS_BUCKET_USER_DOCS') ?? 'carrygo-user-documents',
    pathPrefix: 'user-documents-proof',
    cloudfrontDomain: Deno.env.get('CF_USER_DOCS') ?? '',
  },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const keyData: BufferSource = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function sha256(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return toHex(hash);
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeURIPath(path: string): string {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

interface SignedUploadUrl {
  url: string;
  headers: Record<string, string>;
  cdnUrl: string;
}

async function generateSignedPutUrl(
  bucketId: string,
  key: string,
  contentType: string,
  contentLength: number
): Promise<SignedUploadUrl> {
  const bucket = BUCKETS[bucketId];
  if (!bucket) throw new Error(`Invalid bucket: ${bucketId}`);

  const fullKey = `${bucket.pathPrefix}/${key}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  const host = `${bucket.name}.s3.${AWS_REGION}.amazonaws.com`;
  const url = `https://${host}/${fullKey}`;
  const bodyHash = 'UNSIGNED-PAYLOAD';
  const signedHeaderNames = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${bodyHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    'PUT',
    `/${encodeURIPath(fullKey)}`,
    '',
    canonicalHeaders,
    signedHeaderNames,
    bodyHash,
  ].join('\n');

  const canonicalRequestHash = await sha256(canonicalRequest);
  const credential = `${AWS_ACCESS_KEY_ID}/${dateStamp}/${AWS_REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${AWS_REGION}/s3/aws4_request`,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, 's3');
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`;

  const cdnUrl = bucket.cloudfrontDomain
    ? `https://${bucket.cloudfrontDomain}/${fullKey}`
    : url;

  return {
    url,
    headers: {
      'Authorization': authorization,
      'Content-Type': contentType,
      'Content-Length': String(contentLength),
      'x-amz-content-sha256': bodyHash,
      'x-amz-date': amzDate,
    },
    cdnUrl,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    const { bucketId, key, contentType, contentLength } = body;

    if (!bucketId || !key || !contentType || !contentLength) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bucketId, key, contentType, contentLength' }),
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: `Invalid content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }),
        { status: 400 }
      );
    }

    if (contentLength > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { status: 400 }
      );
    }

    if (!key.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Upload key must contain your user ID' }),
        { status: 403 }
      );
    }

    const signed = await generateSignedPutUrl(bucketId, key, contentType, contentLength);

    return new Response(JSON.stringify(signed), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[generate-upload-url]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
