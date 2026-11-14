import type { GatewayAdapter, GatewayCredentials, CreateOrderResult, VerifyPaymentResult } from './types.ts';

const PHONEPE_PROD_URL = 'https://api.phonepe.com/apis/hermes';
const PHONEPE_TEST_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';

export class PhonePeAdapter implements GatewayAdapter {
  readonly id = 'phonepe' as const;
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;
  private baseUrl: string;

  constructor(creds: GatewayCredentials) {
    this.merchantId = creds.merchantId;
    this.saltKey = creds.saltKey;
    this.saltIndex = creds.saltIndex || '1';
    this.baseUrl = creds.isTestMode ? PHONEPE_TEST_URL : PHONEPE_PROD_URL;
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
    const transactionId = `CG_${params.requestId.slice(0, 8)}_${Date.now()}`;
    const callbackUrl = params.callbackUrl || 'https://carrygo.averiq.in/payment/success';

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: params.senderId.slice(0, 36),
      amount: params.amountPaise,
      redirectUrl: callbackUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: `${callbackUrl}?txnId=${transactionId}`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const base64Payload = btoa(JSON.stringify(payload));
    const checksum = await this.computeChecksum(base64Payload, '/pg/v1/pay');

    const res = await fetch(`${this.baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`PhonePe order creation failed: ${errBody}`);
    }

    const data = await res.json();
    if (!data?.success) {
      throw new Error(`PhonePe error: ${data?.message || 'Unknown error'}`);
    }

    const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;

    return {
      orderId: transactionId,
      amount: params.amountPaise,
      currency: params.currency,
      clientData: {
        merchantId: this.merchantId,
        transactionId,
      },
      redirectUrl,
    };
  }

  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    requestId: string;
  }): Promise<VerifyPaymentResult> {
    const statusPath = `/pg/v1/status/${this.merchantId}/${params.orderId}`;
    const checksum = await this.computeChecksum('', statusPath);

    const res = await fetch(`${this.baseUrl}${statusPath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': this.merchantId,
      },
    });

    if (!res.ok) {
      throw new Error('Unable to verify PhonePe payment status');
    }

    const data = await res.json();
    const isSuccess = data?.success === true && data?.code === 'PAYMENT_SUCCESS';
    const paymentId = data?.data?.transactionId || params.orderId;

    return {
      verified: isSuccess,
      paymentId,
      orderId: params.orderId,
      amount: Number(data?.data?.amount || 0),
      status: isSuccess ? 'captured' : 'failed',
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    // PhonePe webhook verification: SHA256(response_body + salt_key) + ### + salt_index
    const expectedParts = signature.split('###');
    if (expectedParts.length !== 2) return false;

    const [expectedHash, expectedIndex] = expectedParts;
    if (expectedIndex !== this.saltIndex) return false;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(rawBody + this.saltKey)
    );
    const computedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash.length !== expectedHash.length) return false;
    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return mismatch === 0;
  }

  async checkPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string; paymentId?: string }> {
    try {
      const result = await this.verifyPayment({
        orderId,
        paymentId: orderId,
        requestId: '',
      });
      return {
        paid: result.verified,
        status: result.status,
        paymentId: result.verified ? result.paymentId : undefined,
      };
    } catch {
      return { paid: false, status: 'error' };
    }
  }

  private async computeChecksum(base64Payload: string, apiEndpoint: string): Promise<string> {
    const stringToHash = base64Payload + apiEndpoint + this.saltKey;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(stringToHash));
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${hash}###${this.saltIndex}`;
  }
}
