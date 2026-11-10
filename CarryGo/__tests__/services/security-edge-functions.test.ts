/**
 * Security hardening tests for Supabase Edge Functions.
 *
 * These are structural/static analysis tests that verify security patterns
 * are correctly applied across all edge functions. They read the source files
 * and assert that:
 *
 * SEC-1: No inline CORS with wildcard '*' fallback (shared module used)
 * SEC-2: Rate limiting present on sandbox-kyc OTP generation
 * SEC-3: No error message disclosure to clients (String(err), err.message)
 * SEC-4: Rate limiting on delete-account and send-email
 * SEC-5: sandbox-kyc token cache TTL ≤ 1 hour
 * SEC-6: Razorpay webhook uses WEBHOOK_CORS_HEADERS (not inline '*')
 */
import * as fs from 'fs';
import * as path from 'path';

const FUNCTIONS_DIR = path.resolve(__dirname, '../../supabase/functions');

function readFunction(name: string): string {
  return fs.readFileSync(path.join(FUNCTIONS_DIR, name, 'index.ts'), 'utf-8');
}

function readSharedCors(): string {
  return fs.readFileSync(path.join(FUNCTIONS_DIR, '_shared', 'cors.ts'), 'utf-8');
}

const EDGE_FUNCTIONS = [
  'create-razorpay-order',
  'delete-account',
  'generate-upload-url',
  'process-outbox',
  'process-push-receipts',
  'sandbox-kyc',
  'send-email',
  'send-push-notifications',
  'verify-razorpay-payment',
];

const WEBHOOK_FUNCTIONS = ['razorpay-webhook'];

describe('SEC-1: CORS hardening — no inline wildcard CORS', () => {
  test.each(EDGE_FUNCTIONS)(
    '%s imports handleCors from shared module',
    (fnName) => {
      const src = readFunction(fnName);
      expect(src).toContain("import { handleCors } from '../_shared/cors.ts'");
    },
  );

  test.each(EDGE_FUNCTIONS)(
    '%s does not define a local getCorsHeaders function',
    (fnName) => {
      const src = readFunction(fnName);
      expect(src).not.toMatch(/function getCorsHeaders/);
    },
  );

  test.each(EDGE_FUNCTIONS)(
    '%s does not contain inline Access-Control-Allow-Origin: *',
    (fnName) => {
      const src = readFunction(fnName);
      expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
    },
  );

  test('shared _shared/cors.ts exists and exports handleCors', () => {
    const src = readSharedCors();
    expect(src).toContain('export function handleCors');
    expect(src).toContain('export function getCorsHeaders');
    expect(src).toContain('export const WEBHOOK_CORS_HEADERS');
  });
});

describe('SEC-2: Rate limiting on sandbox-kyc OTP generation', () => {
  test('sandbox-kyc calls enforce_rate_limit', () => {
    const src = readFunction('sandbox-kyc');
    expect(src).toContain('enforce_rate_limit');
    expect(src).toMatch(/p_action.*kyc_otp_request|kyc_otp/);
  });
});

describe('SEC-3: No error message disclosure to clients', () => {
  const ALL_FUNCTIONS = [...EDGE_FUNCTIONS, ...WEBHOOK_FUNCTIONS];

  test.each(ALL_FUNCTIONS)(
    '%s does not return String(err) or err.message to client',
    (fnName) => {
      const src = readFunction(fnName);
      const lines = src.split('\n');
      for (const line of lines) {
        // Skip server-side logging lines
        if (line.includes('console.error') || line.includes('console.warn')) continue;
        // Check response-constructing lines
        if (line.includes('Response') || line.includes('jsonResponse')) {
          expect(line).not.toMatch(/error:\s*String\(err\)/);
          expect(line).not.toMatch(/error:\s*err\.message/);
          expect(line).not.toMatch(/error:\s*message\b/);
        }
      }
    },
  );
});

describe('SEC-4: Rate limiting on delete-account and send-email', () => {
  test('delete-account calls enforce_rate_limit with delete_account action', () => {
    const src = readFunction('delete-account');
    expect(src).toContain('enforce_rate_limit');
    expect(src).toContain('delete_account');
  });

  test('send-email calls enforce_rate_limit with send_email action', () => {
    const src = readFunction('send-email');
    expect(src).toContain('enforce_rate_limit');
    expect(src).toContain('send_email');
  });
});

describe('SEC-5: sandbox-kyc token cache TTL ≤ 1 hour', () => {
  test('token cache TTL is 1 hour or less', () => {
    const src = readFunction('sandbox-kyc');
    const ttlMatch = src.match(/(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(ttlMatch).not.toBeNull();
    const hours = parseInt(ttlMatch![1], 10);
    expect(hours).toBeLessThanOrEqual(1);
  });
});

describe('SEC-6: Razorpay webhook uses WEBHOOK_CORS_HEADERS', () => {
  test('razorpay-webhook imports WEBHOOK_CORS_HEADERS from shared module', () => {
    const src = readFunction('razorpay-webhook');
    expect(src).toContain("import { WEBHOOK_CORS_HEADERS");
    expect(src).toContain("from '../_shared/cors.ts'");
  });

  test('razorpay-webhook does not define inline CORS_HEADERS', () => {
    const src = readFunction('razorpay-webhook');
    expect(src).not.toMatch(/const CORS_HEADERS\s*=\s*\{/);
  });
});
