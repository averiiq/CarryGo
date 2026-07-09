import { getAwsConfig, getBucketConfig, BucketId } from './config';

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

export interface S3PutParams {
  bucketId: BucketId;
  key: string;
  contentType: string;
  contentLength: number;
}

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

export async function signS3PutRequest(params: S3PutParams): Promise<SignedRequest> {
  const config = getAwsConfig();
  const bucket = getBucketConfig(params.bucketId);
  const { key, contentType, contentLength } = params;

  const fullKey = `${bucket.pathPrefix}/${key}`;

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  const host = `${bucket.name}.s3.${config.region}.amazonaws.com`;
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

  const credential = `${config.accessKeyId}/${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${config.region}/s3/aws4_request`,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`;

  return {
    url,
    headers: {
      'Authorization': authorization,
      'Content-Type': contentType,
      'Content-Length': String(contentLength),
      'x-amz-content-sha256': bodyHash,
      'x-amz-date': amzDate,
    },
  };
}

function encodeURIPath(path: string): string {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}
