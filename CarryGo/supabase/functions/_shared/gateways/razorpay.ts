import type { GatewayAdapter, GatewayCredentials, CreateOrderResult, VerifyPaymentResult, PayoutResult } from './types.ts';

export class RazorpayAdapter implements GatewayAdapter {
  readonly id = 'razorpay' as const;
  private keyId: string;
  private keySecret: string;
  private authHeader: string;

  constructor(creds: GatewayCredentials) {
    this.keyId = creds.keyId;
    this.keySecret = creds.keySecret;
    this.authHeader = `Basic ${btoa(`${creds.keyId}:${creds.keySecret}`)}`;
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
    if (params.generateLink) {
      return this.createPaymentLink(params);
    }

    const payload = {
      amount: params.amountPaise,
      currency: params.currency,
      receipt: `req_${params.requestId.slice(0, 20)}`,
      notes: {
        request_id: params.requestId,
        sender_id: params.senderId,
        traveller_id: params.travellerId,
      },
    };

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Razorpay order creation failed: ${errBody}`);
    }

    const order = await res.json();
    if (typeof order?.id !== 'string' || Number(order?.amount) !== params.amountPaise) {
      throw new Error('Razorpay returned an invalid order');
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      clientData: { keyId: this.keyId, orderId: order.id },
    };
  }

  private async createPaymentLink(params: {
    amountPaise: number;
    currency: string;
    requestId: string;
    senderId: string;
    travellerId: string;
    customer?: { name: string; email: string; phone: string };
    callbackUrl?: string;
  }): Promise<CreateOrderResult> {
    const payload = {
      amount: params.amountPaise,
      currency: params.currency,
      description: `CaryGoo Delivery Booking #${params.requestId.slice(0, 8)}`,
      customer: {
        name: params.customer?.name || 'CaryGoo Customer',
        email: params.customer?.email || '',
        contact: params.customer?.phone || '',
      },
      notify: { sms: false, email: false },
      callback_url: params.callbackUrl || 'https://carrygo.averiq.in/payment/success',
      callback_method: 'get',
      notes: {
        request_id: params.requestId,
        sender_id: params.senderId,
        traveller_id: params.travellerId,
      },
    };

    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Razorpay payment link failed: ${errBody}`);
    }

    const data = await res.json();
    return {
      orderId: data.id,
      amount: params.amountPaise,
      currency: params.currency,
      clientData: { keyId: this.keyId, paymentLinkId: data.id },
      redirectUrl: data.short_url,
    };
  }

  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    requestId: string;
  }): Promise<VerifyPaymentResult> {
    const isPaymentLink = params.orderId.startsWith('plink_');

    // For payment links, poll the link status
    if (isPaymentLink) {
      const res = await fetch(
        `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(params.orderId)}`,
        { headers: { Authorization: this.authHeader } }
      );
      if (!res.ok) throw new Error('Unable to verify payment link');

      const data = await res.json();
      const captured = Array.isArray(data.payments)
        ? data.payments.find((p: Record<string, unknown>) => p.status === 'captured')
        : null;
      const isPaid = data.status === 'paid' && captured;

      return {
        verified: isPaid,
        paymentId: captured?.payment_id || captured?.id || params.paymentId,
        orderId: params.orderId,
        amount: Number(data.amount || 0),
        status: isPaid ? 'captured' : 'failed',
      };
    }

    // Standard order: verify HMAC signature
    if (!params.signature) throw new Error('Missing payment signature');

    const isValid = await this.verifyHmac(
      `${params.orderId}|${params.paymentId}`,
      params.signature
    );
    if (!isValid) {
      return { verified: false, paymentId: params.paymentId, orderId: params.orderId, amount: 0, status: 'failed' };
    }

    // Confirm with Razorpay API
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}`,
      { headers: { Authorization: this.authHeader } }
    );
    if (!res.ok) throw new Error('Unable to confirm payment with Razorpay');

    const payment = await res.json();
    const isCaptured = ['authorized', 'captured'].includes(payment?.status);

    return {
      verified: isCaptured,
      paymentId: params.paymentId,
      orderId: params.orderId,
      amount: Number(payment?.amount || 0),
      status: isCaptured ? (payment.status as 'captured' | 'authorized') : 'failed',
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    return this.verifyHmac(rawBody, signature);
  }

  async checkPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string; paymentId?: string }> {
    const res = await fetch(
      `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: this.authHeader } }
    );
    if (!res.ok) return { paid: false, status: 'error' };

    const data = await res.json();
    const captured = Array.isArray(data.payments)
      ? data.payments.find((p: Record<string, unknown>) => p.status === 'captured')
      : null;
    const isPaid = data.status === 'paid' && captured;

    return {
      paid: isPaid,
      status: data.status,
      paymentId: isPaid ? (captured.payment_id || captured.id) : undefined,
    };
  }

  async initiatePayout(params: {
    amountPaise: number;
    currency: string;
    beneficiaryName: string;
    beneficiaryContact: string;
    beneficiaryAccountId?: string;
    referenceId: string;
    narration: string;
  }): Promise<PayoutResult> {
    // Razorpay Route: create a transfer from the payment to the linked account
    // If no linked account, use RazorpayX Payouts for direct bank transfer
    // For now, use the Transfers API (requires linked account setup)
    try {
      const payload = {
        account: params.beneficiaryAccountId || 'default',
        amount: params.amountPaise,
        currency: params.currency,
        notes: {
          reference_id: params.referenceId,
          beneficiary_name: params.beneficiaryName,
          narration: params.narration,
        },
      };

      const res = await fetch('https://api.razorpay.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('[RazorpayAdapter] Payout failed:', errBody);
        return {
          success: false,
          payoutId: '',
          status: 'failed',
          error: `Razorpay transfer failed: ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        payoutId: data.id || '',
        status: data.status === 'processed' ? 'processed' : 'processing',
      };
    } catch (err) {
      return {
        success: false,
        payoutId: '',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Payout initiation failed',
      };
    }
  }

  private async verifyHmac(payload: string, signature: string): Promise<boolean> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expected = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
