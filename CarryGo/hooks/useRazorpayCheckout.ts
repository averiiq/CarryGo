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
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  onSuccess: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function useRazorpayCheckout({
  requestId,
  senderId,
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

  const startCheckout = useCallback(async () => {
    setState({ isCreatingOrder: true, isProcessing: false, isVerifying: false, error: null });

    const { data: order, error: orderError } = await createRazorpayOrder(requestId, senderId);
    if (orderError || !order) {
      const msg = orderError ?? 'Failed to create order';
      setState(s => ({ ...s, isCreatingOrder: false, error: msg }));
      onFailure?.(msg);
      return;
    }

    setState(s => ({ ...s, isCreatingOrder: false, isProcessing: true }));

    if (Platform.OS === 'web') {
      openRazorpayWeb(order);
    } else {
      openRazorpayNative(order);
    }
  }, [requestId, senderId]);

  const openRazorpayWeb = useCallback((order: RazorpayOrder) => {
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
        handlePaymentSuccess(response);
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
  }, [senderName, senderEmail, senderPhone]);

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
      handlePaymentSuccess({
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setState(s => ({ ...s, isProcessing: false, error: message }));
      onFailure?.(message);
    }
  }, [senderName, senderEmail, senderPhone]);

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

  const isLoading = state.isCreatingOrder || state.isProcessing || state.isVerifying;

  return {
    ...state,
    isLoading,
    startCheckout,
  };
}
