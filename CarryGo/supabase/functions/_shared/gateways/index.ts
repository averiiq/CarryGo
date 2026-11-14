import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { GatewayAdapter, GatewayCredentials, GatewayId } from './types.ts';
import { RazorpayAdapter } from './razorpay.ts';
import { PhonePeAdapter } from './phonepe.ts';
import { PayUAdapter } from './payu.ts';

export type { GatewayId, GatewayCredentials, GatewayAdapter, CreateOrderResult, VerifyPaymentResult, PaymentSplit } from './types.ts';

/**
 * Resolve the active gateway credentials from the database.
 * Falls back to env-var Razorpay credentials for backward compatibility.
 */
export async function resolveGatewayCredentials(
  supabase: ReturnType<typeof createClient>
): Promise<GatewayCredentials> {
  // Try the new DB-driven approach first
  const { data, error } = await supabase.rpc('get_active_gateway');

  if (!error && data && data.length > 0) {
    const row = data[0];
    // Only use DB credentials if key_id is actually populated
    if (row.key_id) {
      return {
        gateway: row.gateway as GatewayId,
        isTestMode: row.is_test_mode,
        keyId: row.key_id,
        keySecret: row.key_secret,
        merchantId: row.merchant_id || '',
        webhookSecret: row.webhook_secret || '',
        saltKey: row.salt_key || '',
        saltIndex: row.salt_index || '1',
        config: row.config || {},
      };
    }
  }

  // Fallback: env-var Razorpay credentials (backward compat)
  const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

  if (!keyId || !keySecret) {
    throw new Error('No payment gateway credentials configured. Set up credentials in CMS Settings or provide RAZORPAY_KEY_ID env var.');
  }

  return {
    gateway: 'razorpay',
    isTestMode: false,
    keyId,
    keySecret,
    merchantId: '',
    webhookSecret,
    saltKey: '',
    saltIndex: '1',
    config: {},
  };
}

/**
 * Resolve credentials for a specific gateway (used by webhooks).
 */
export async function resolveGatewayCredentialsByName(
  supabase: ReturnType<typeof createClient>,
  gateway: GatewayId
): Promise<GatewayCredentials> {
  const { data, error } = await supabase
    .from('payment_gateway_credentials')
    .select('*')
    .eq('gateway', gateway)
    .single();

  if (error || !data) {
    // Fallback for razorpay
    if (gateway === 'razorpay') {
      return {
        gateway: 'razorpay',
        isTestMode: false,
        keyId: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
        keySecret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
        merchantId: '',
        webhookSecret: Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '',
        saltKey: '',
        saltIndex: '1',
        config: {},
      };
    }
    throw new Error(`No credentials found for gateway: ${gateway}`);
  }

  const isTest = data.is_test_mode;
  return {
    gateway: data.gateway as GatewayId,
    isTestMode: isTest,
    keyId: isTest ? data.test_key_id : data.live_key_id,
    keySecret: isTest ? data.test_key_secret : data.live_key_secret,
    merchantId: isTest ? data.test_merchant_id : data.live_merchant_id,
    webhookSecret: isTest ? data.test_webhook_secret : data.live_webhook_secret,
    saltKey: data.salt_key || '',
    saltIndex: data.salt_index || '1',
    config: data.config || {},
  };
}

/** Create a gateway adapter instance from credentials */
export function createGatewayAdapter(creds: GatewayCredentials): GatewayAdapter {
  switch (creds.gateway) {
    case 'razorpay':
      return new RazorpayAdapter(creds);
    case 'phonepe':
      return new PhonePeAdapter(creds);
    case 'payu':
      return new PayUAdapter(creds);
    default:
      throw new Error(`Unsupported gateway: ${creds.gateway}`);
  }
}
