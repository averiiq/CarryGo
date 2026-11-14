import type { GatewayAdapter, GatewayCredentials, CreateOrderResult, VerifyPaymentResult } from './types.ts';

const PAYU_PROD_URL = 'https://secure.payu.in';
const PAYU_TEST_URL = 'https://test.payu.in';

export class PayUAdapter implements GatewayAdapter {
  readonly id = 'payu' as const;
  private merchantKey: string;
  private merchantSalt: string;
  private baseUrl: string;

  constructor(creds: GatewayCredentials) {
    this.merchantKey = creds.keyId;
    this.merchantSalt = creds.keySecret;
    this.baseUrl = creds.isTestMode ? PAYU_TEST_URL : PAYU_PROD_URL;
  }

  async createOrder(params: {
    amountPaise: number;
    currency: string;
    requestId: string;
    senderId: string;
    travellerId: string;
    generateLink?: boolean;
    customer?: { name: string; email: string; phone: string };
    callbackUrl?: string;
  }): Promise<CreateOrderResult> {
    const txnId = `CG_${params.requestId.slice(0, 8)}_${Date.now()}`;
    const amountRupees = (params.amountPaise / 100).toFixed(2);
    const productInfo = `CaryGoo Delivery #${params.requestId.slice(0, 8)}`;
    const callbackUrl = params.callbackUrl || 'https://carrygo.averiq.in/payment/success';

    const hashString = [
      this.merchantKey,
      txnId,
      amountRupees,
      productInfo,
      params.customer?.name || 'Customer',
      params.customer?.email || 'customer@carygoo.in',
      `request_id=${params.requestId}`,
      '', '', '', '', '',
      this.merchantSalt,
    ].join('|');

    const hash = await this.sha512(hashString);

    // PayU uses form-based redirect, so we return the data the client needs to POST
    return {
      orderId: txnId,
      amount: params.amountPaise,
      currency: params.currency,
      clientData: {
        action: `${this.baseUrl}/_payment`,
        method: 'POST',
        params: {
          key: this.merchantKey,
          txnid: txnId,
          amount: amountRupees,
          productinfo: productInfo,
          firstname: params.customer?.name || 'Customer',
          email: params.customer?.email || 'customer@carygoo.in',
          phone: params.customer?.phone || '',
          surl: callbackUrl,
          furl: callbackUrl,
          hash,
          udf1: `request_id=${params.requestId}`,
        },
      },
      redirectUrl: `${this.baseUrl}/_payment`,
    };
  }

  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    requestId: string;
  }): Promise<VerifyPaymentResult> {
    // PayU verify_payment API
    const command = 'verify_payment';
    const hashString = `${this.merchantKey}|${command}|${params.orderId}|${this.merchantSalt}`;
    const hash = await this.sha512(hashString);

    const formData = new URLSearchParams();
    formData.set('key', this.merchantKey);
    formData.set('command', command);
    formData.set('var1', params.orderId);
    formData.set('hash', hash);

    const res = await fetch(`${this.baseUrl}/merchant/postservice?form=2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) {
      throw new Error('Unable to verify PayU payment');
    }

    const data = await res.json();
    const txnDetails = data?.transaction_details?.[params.orderId];
    const isSuccess = txnDetails?.status === 'success';

    return {
      verified: isSuccess,
      paymentId: txnDetails?.mihpayid || params.paymentId,
      orderId: params.orderId,
      amount: Math.round(Number(txnDetails?.amt || 0) * 100),
      status: isSuccess ? 'captured' : 'failed',
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    // PayU webhook: reverse hash verification
    // hash = sha512(SALT|status||||||||||email|firstname|productinfo|amount|txnid|key)
    try {
      const params = new URLSearchParams(rawBody);
      const status = params.get('status') || '';
      const email = params.get('email') || '';
      const firstname = params.get('firstname') || '';
      const productinfo = params.get('productinfo') || '';
      const amount = params.get('amount') || '';
      const txnid = params.get('txnid') || '';
      const udf1 = params.get('udf1') || '';

      const reverseHash = [
        this.merchantSalt,
        status,
        '', '', '', '', '', '', '', '',
        udf1,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        this.merchantKey,
      ].join('|');

      const expected = await this.sha512(reverseHash);
      const provided = signature || params.get('hash') || '';

      if (expected.length !== provided.length) return false;
      let mismatch = 0;
      for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
      }
      return mismatch === 0;
    } catch {
      return false;
    }
  }

  private async sha512(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(input));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
