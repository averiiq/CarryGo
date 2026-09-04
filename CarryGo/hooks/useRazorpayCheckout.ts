import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { RazorpayOrder, RazorpayPaymentResult } from '@/types';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/services/payments.service';

interface CheckoutState {
  isCreatingOrder: boolean;
  isProcessing: boolean;
  isVerifying: boolean;
  error: string | null;
}

interface UseRazorpayCheckoutOptions {
  requestId: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  onSuccess: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

let razorpayScriptPromise: Promise<void> | null = null;

function ensureRazorpayWebSdkLoaded(): Promise<void> {
  const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void } };
  if (win.Razorpay) return Promise.resolve();

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-carrygo-razorpay="1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.carrygoRazorpay = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export function useRazorpayCheckout({
  requestId,
  senderName,
  senderEmail,
  senderPhone,
  onSuccess,
  onFailure,
}: UseRazorpayCheckoutOptions) {
  const [state, setState] = useState<CheckoutState>({
    isCreatingOrder: false,
    isProcessing: false,
    isVerifying: false,
    error: null,
  });

  const handlePaymentSuccess = useCallback(async (result: RazorpayPaymentResult) => {
    setState(s => ({ ...s, isProcessing: false, isVerifying: true }));

    const { data, error } = await verifyRazorpayPayment({
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
      requestId,
    });

    if (error || !data) {
      const msg = error ?? 'Payment verification failed';
      setState(s => ({ ...s, isVerifying: false, error: msg }));
      Alert.alert('Verification Failed', msg);
      onFailure?.(msg);
      return;
    }

    setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
    onSuccess(data.paymentId);
  }, [requestId, onSuccess, onFailure]);

  const openRazorpayWeb = useCallback(async (order: RazorpayOrder) => {
    try {
      await ensureRazorpayWebSdkLoaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Razorpay SDK not loaded';
      setState(s => ({ ...s, isProcessing: false, error: message }));
      onFailure?.(message);
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'CarryGo',
      description: 'Delivery Payment',
      order_id: order.orderId,
      prefill: {
        name: senderName ?? '',
        email: senderEmail ?? '',
        contact: senderPhone ?? '',
      },
      handler: (response: RazorpayPaymentResult) => {
        void handlePaymentSuccess(response);
      },
      modal: {
        ondismiss: () => {
          setState(s => ({ ...s, isProcessing: false, error: 'Payment cancelled' }));
          onFailure?.('Payment cancelled');
        },
      },
    };

    const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void } };
    if (!win.Razorpay) {
      setState(s => ({ ...s, isProcessing: false, error: 'Razorpay SDK not loaded' }));
      onFailure?.('Razorpay SDK not loaded');
      return;
    }

    const rzp = new win.Razorpay(options);
    rzp.open();
  }, [senderName, senderEmail, senderPhone, onFailure, handlePaymentSuccess]);

  const openRazorpayNative = useCallback(async (order: RazorpayOrder) => {
    try {
      const RazorpayCheckout = (await import('react-native-razorpay')).default;
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'CarryGo',
        description: 'Delivery Payment',
        order_id: order.orderId,
        prefill: {
          name: senderName ?? '',
          email: senderEmail ?? '',
          contact: senderPhone ?? '',
        },
        theme: { color: '#6366f1' },
      };

      const result = await RazorpayCheckout.open(options);
      await handlePaymentSuccess({
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setState(s => ({ ...s, isProcessing: false, error: message }));
      onFailure?.(message);
    }
  }, [senderName, senderEmail, senderPhone, handlePaymentSuccess, onFailure]);

  const startCheckout = useCallback(async () => {
    setState({ isCreatingOrder: true, isProcessing: false, isVerifying: false, error: null });

    const { data: order, error: orderError } = await createRazorpayOrder(requestId);
    if (orderError || !order) {
      const msg = orderError ?? 'Failed to create order';
      setState(s => ({ ...s, isCreatingOrder: false, error: msg }));
      onFailure?.(msg);
      return;
    }

    setState(s => ({ ...s, isCreatingOrder: false, isProcessing: true }));

    if (Platform.OS === 'web') {
      await openRazorpayWeb(order);
    } else {
      await openRazorpayNative(order);
    }
  }, [requestId, onFailure, openRazorpayWeb, openRazorpayNative]);

  const isLoading = state.isCreatingOrder || state.isProcessing || state.isVerifying;

  return {
    ...state,
    isLoading,
    startCheckout,
  };
}
