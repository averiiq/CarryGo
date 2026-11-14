/** Supported payment gateway identifiers */
export type GatewayId = 'razorpay' | 'phonepe' | 'payu';

/** Credentials resolved from DB for the active gateway */
export interface GatewayCredentials {
  gateway: GatewayId;
  isTestMode: boolean;
  keyId: string;
  keySecret: string;
  merchantId: string;
  webhookSecret: string;
  saltKey: string;
  saltIndex: string;
  config: Record<string, unknown>;
}

/** Standardized result from creating an order across gateways */
export interface CreateOrderResult {
  /** Gateway's own order/transaction identifier */
  orderId: string;
  /** Amount in paise */
  amount: number;
  currency: string;
  /** Gateway-specific data the client needs to open checkout */
  clientData: Record<string, unknown>;
  /** If a redirect/link URL is needed (PhonePe, PayU, or Razorpay payment links) */
  redirectUrl?: string;
}

/** Standardized result from verifying a payment */
export interface VerifyPaymentResult {
  verified: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'captured' | 'authorized' | 'failed' | 'pending';
}

/** Split amounts computed from app_config */
export interface PaymentSplit {
  totalAmount: number;
  platformFee: number;
  gstAmount: number;
  travelerPayout: number;
}

/** Result from initiating a payout */
export interface PayoutResult {
  success: boolean;
  payoutId: string;
  status: 'queued' | 'processing' | 'processed' | 'reversed' | 'failed';
  error?: string;
}

/** The interface every gateway adapter must implement */
export interface GatewayAdapter {
  readonly id: GatewayId;

  /** Create a payment order on the gateway */
  createOrder(params: {
    amountPaise: number;
    currency: string;
    requestId: string;
    senderId: string;
    travellerId: string;
    generateLink?: boolean;
    customer?: { name: string; email: string; phone: string };
    callbackUrl?: string;
  }): Promise<CreateOrderResult>;

  /** Verify a payment using gateway-specific verification */
  verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    requestId: string;
  }): Promise<VerifyPaymentResult>;

  /** Verify webhook signature (returns true if valid) */
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;

  /** Check payment link status (for polling) */
  checkPaymentStatus?(orderId: string): Promise<{
    paid: boolean;
    status: string;
    paymentId?: string;
  }>;

  /** Initiate payout to beneficiary (traveler) */
  initiatePayout?(params: {
    amountPaise: number;
    currency: string;
    beneficiaryName: string;
    beneficiaryContact: string;
    beneficiaryAccountId?: string;
    referenceId: string;
    narration: string;
  }): Promise<PayoutResult>;
}
