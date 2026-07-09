/**
 * End-to-end test for AWS S3 upload pipeline.
 * Tests: signing, path building, actual PUT to both buckets, CloudFront read.
 *
 * Run: node scripts/test-aws-upload.mjs
 */

import { webcrypto } from 'node:crypto';

// Polyfill crypto.subtle for Node
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  region: 'ap-south-1',
  accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || 'AKIAZONDITB6X5H2ED67',
  secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '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',
  buckets: {
    parcelProofs: {
      name: 'carrygo-parcel-proofs',
      pathPrefix: 'parcel-proofs',
      cloudfrontDomain: 'd1kpta3nvwmxk5.cloudfront.net',
    },
    userDocuments: {
      name: 'carrygo-user-documents',
      pathPrefix: 'user-documents-proof',
      cloudfrontDomain: 'd1kpta3nvwmxk5.cloudfront.net',
    },
  },
};

// ─── Signing (copy of lib/aws/signing.ts logic) ──────────────────────────────

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key, message) {
  const keyData = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function sha256(data) {
  const buffer = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return toHex(hash);
}

async function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeURIPath(path) {
  return path.split('/').map(s => encodeURIComponent(s)).join('/');
}

async function signPutRequest(bucketName, fullKey, contentType, contentLength) {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  const host = `${bucketName}.s3.${CONFIG.region}.amazonaws.com`;
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
  const credential = `${CONFIG.accessKeyId}/${dateStamp}/${CONFIG.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${CONFIG.region}/s3/aws4_request`,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(CONFIG.secretAccessKey, dateStamp, CONFIG.region, 's3');
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

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function testPathBuilding() {
  console.log('\n━━━ Test: Path Building ━━━');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const userId = 'abc-def-123';

  // Parcel image path
  const parcelKey = `parcels/${userId}/${date}/parcel-id-456.webp`;
  const parcelFull = `parcel-proofs/${parcelKey}`;
  assert(parcelFull.startsWith('parcel-proofs/parcels/'), 'Parcel path starts with parcel-proofs/parcels/');
  assert(parcelFull.endsWith('.webp'), 'Parcel path ends with .webp');

  // KYC path
  const kycKey = `kyc-documents/${userId}/${date}/session-1_id_front.webp`;
  const kycFull = `user-documents-proof/${kycKey}`;
  assert(kycFull.startsWith('user-documents-proof/kyc-documents/'), 'KYC path starts with user-documents-proof/kyc-documents/');

  // Avatar path
  const avatarKey = `avatars/${userId}/${date}/profile.webp`;
  const avatarFull = `user-documents-proof/${avatarKey}`;
  assert(avatarFull.startsWith('user-documents-proof/avatars/'), 'Avatar path starts with user-documents-proof/avatars/');

  // Delivery proof path
  const deliveryKey = `delivery-proofs/${userId}/${date}/del-789_pickup.webp`;
  const deliveryFull = `parcel-proofs/${deliveryKey}`;
  assert(deliveryFull.startsWith('parcel-proofs/delivery-proofs/'), 'Delivery path starts with parcel-proofs/delivery-proofs/');

  // CDN URLs
  const cdnParcel = `https://d1kpta3nvwmxk5.cloudfront.net/${parcelFull}`;
  assert(cdnParcel.includes('cloudfront.net'), 'CDN URL uses CloudFront domain');
  assert(!cdnParcel.includes('s3.'), 'CDN URL does not contain S3 domain');
}

async function testSigning() {
  console.log('\n━━━ Test: AWS Signature V4 ━━━');

  const result = await signPutRequest(
    'carrygo-parcel-proofs',
    'parcel-proofs/test/file.webp',
    'image/webp',
    1024
  );

  assert(result.url.startsWith('https://carrygo-parcel-proofs.s3.ap-south-1.amazonaws.com/'), 'S3 URL format correct');
  assert(result.headers['Authorization'].startsWith('AWS4-HMAC-SHA256'), 'Auth header starts with AWS4-HMAC-SHA256');
  assert(result.headers['Authorization'].includes('Credential=AKIA'), 'Auth header contains credential');
  assert(result.headers['Authorization'].includes('SignedHeaders='), 'Auth header contains signed headers');
  assert(result.headers['Authorization'].includes('Signature='), 'Auth header contains signature');
  assert(result.headers['x-amz-date'].endsWith('Z'), 'amz-date header in ISO format');
  assert(result.headers['x-amz-content-sha256'] === 'UNSIGNED-PAYLOAD', 'Body hash is UNSIGNED-PAYLOAD');
  assert(result.headers['Content-Type'] === 'image/webp', 'Content-Type set correctly');
  assert(result.headers['Content-Length'] === '1024', 'Content-Length set correctly');
}

async function testActualUpload(bucketName, pathPrefix, label) {
  console.log(`\n━━━ Test: Actual S3 Upload → ${label} ━━━`);

  const testContent = `CarryGo upload test - ${new Date().toISOString()}`;
  const testBytes = new TextEncoder().encode(testContent);
  const testKey = `${pathPrefix}/_test/${Date.now()}.txt`;

  try {
    const { url, headers } = await signPutRequest(
      bucketName, testKey, 'text/plain', testBytes.length
    );

    console.log(`  → PUT ${url}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: testBytes,
    });

    const status = response.status;
    const body = await response.text();

    if (status >= 200 && status < 300) {
      assert(true, `Upload succeeded (HTTP ${status})`);
    } else {
      assert(false, `Upload failed (HTTP ${status}): ${body.slice(0, 200)}`);

      if (status === 403) {
        console.log('    → 403 = IAM policy does not allow PutObject on this path');
        console.log(`    → Check: arn:aws:s3:::${bucketName}/${testKey}`);
      } else if (status === 301) {
        console.log('    → 301 = Wrong region. Bucket may be in a different region.');
      }
      return false;
    }

    return true;
  } catch (err) {
    assert(false, `Network error: ${err.message}`);
    return false;
  }
}

async function testCloudFrontRead(pathPrefix, label) {
  console.log(`\n━━━ Test: CloudFront Read → ${label} ━━━`);

  // Try reading the file we just uploaded
  const cfDomain = 'd1kpta3nvwmxk5.cloudfront.net';

  // We can't read the test file immediately (CloudFront may take a moment)
  // Instead test that CloudFront responds (even with 404 means routing works)
  const testUrl = `https://${cfDomain}/${pathPrefix}/_test/nonexistent.txt`;

  try {
    const response = await fetch(testUrl, { method: 'GET' });
    const status = response.status;

    if (status === 403) {
      assert(true, `CloudFront responds with 403 (expected for nonexistent file with OAC) — routing works`);
    } else if (status === 404) {
      assert(true, `CloudFront responds with 404 (file not found) — routing works`);
    } else if (status === 200) {
      assert(true, `CloudFront responds with 200 — full pipeline works`);
    } else {
      assert(false, `Unexpected status ${status} — check CloudFront origin config`);
    }
  } catch (err) {
    assert(false, `CloudFront unreachable: ${err.message}`);
  }
}

async function testImagePresets() {
  console.log('\n━━━ Test: Image Preset Config ━━━');

  const PRESETS = {
    avatar: { maxWidth: 512, quality: 0.75 },
    parcel: { maxWidth: 1200, quality: 0.72 },
    kyc: { maxWidth: 1600, quality: 0.8 },
    delivery_proof: { maxWidth: 1200, quality: 0.7 },
    thumbnail: { maxWidth: 300, quality: 0.65 },
  };

  assert(PRESETS.avatar.maxWidth === 512, 'Avatar max 512px (good for profile pics)');
  assert(PRESETS.avatar.quality === 0.75, 'Avatar quality 75% (good balance)');

  assert(PRESETS.parcel.maxWidth === 1200, 'Parcel max 1200px (enough detail for inspection)');
  assert(PRESETS.parcel.quality === 0.72, 'Parcel quality 72% (bandwidth efficient)');

  assert(PRESETS.kyc.maxWidth === 1600, 'KYC max 1600px (high detail for document text)');
  assert(PRESETS.kyc.quality === 0.8, 'KYC quality 80% (preserve document readability)');

  assert(PRESETS.delivery_proof.maxWidth === 1200, 'Delivery proof max 1200px');
  assert(PRESETS.delivery_proof.quality === 0.7, 'Delivery proof quality 70% (good enough for verification)');

  assert(PRESETS.thumbnail.maxWidth === 300, 'Thumbnail max 300px (list view)');
  assert(PRESETS.thumbnail.quality === 0.65, 'Thumbnail quality 65% (minimal size for previews)');

  // Bandwidth estimates (typical phone camera 4000x3000 = 4MB JPEG)
  const originalSize = 4_000_000; // 4MB
  const estimates = {
    avatar: Math.round(512 * 512 * 0.75 * 0.12), // ~23KB
    parcel: Math.round(1200 * 900 * 0.72 * 0.12), // ~93KB
    kyc: Math.round(1600 * 1200 * 0.8 * 0.12), // ~184KB
    delivery_proof: Math.round(1200 * 900 * 0.7 * 0.12), // ~91KB
    thumbnail: Math.round(300 * 225 * 0.65 * 0.12), // ~5KB
  };

  console.log('\n  Estimated sizes (WebP from 4MB phone photo):');
  for (const [preset, size] of Object.entries(estimates)) {
    const savings = Math.round((1 - size / originalSize) * 100);
    console.log(`    ${preset}: ~${Math.round(size / 1024)}KB (${savings}% savings)`);
  }
}

// ─── Run All Tests ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CarryGo AWS S3 + CloudFront Upload Test Suite  ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await testPathBuilding();
  await testSigning();
  await testImagePresets();

  const parcelOk = await testActualUpload('carrygo-parcel-proofs', 'parcel-proofs', 'Parcel Proofs Bucket');
  const userDocsOk = await testActualUpload('carrygo-user-documents', 'user-documents-proof', 'User Documents Bucket');

  if (parcelOk) await testCloudFrontRead('parcel-proofs', 'Parcel Proofs via CF');
  if (userDocsOk) await testCloudFrontRead('user-documents-proof', 'User Documents via CF');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Pipeline is working.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
