declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
  }

  interface RazorpaySuccess {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  interface RazorpayCheckout {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  }

  const RazorpayCheckout: RazorpayCheckout;
  export default RazorpayCheckout;
}
