import { useState, useCallback, useRef } from 'react';
import { Platform, NativeModules, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { PaymentOrderResponse, RazorpayPaymentResult, GatewayId } from '@/types';
import {
  createPaymentOrder,
  verifyPaymentOrder,
  createPaymentLink,
  checkPaymentStatus,
  confirmMockBookingPayment,
} from '@/services/payments.service';
import { FeatureFlags } from '@/constants/featureFlags';
import { useAlert } from '@/template';

interface CheckoutState {
  isCreatingOrder: boolean;
  isProcessing: boolean;
  isVerifying: boolean;
  error: string | null;
  gateway: GatewayId | null;
}

interface UsePaymentCheckoutOptions {
  requestId: string;
  senderId?: string;
  travellerId?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  onSuccess: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

const GATEWAY_LABELS: Record<GatewayId, string> = {
  razorpay: 'Razorpay',
  phonepe: 'PhonePe',
  payu: 'PayU',
};

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

export function usePaymentCheckout({
  requestId,
  senderId,
  travellerId,
  senderName,
  senderEmail,
  senderPhone,
  onSuccess,
  onFailure,
}: UsePaymentCheckoutOptions) {
  const { showAlert } = useAlert();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<CheckoutState>({
    isCreatingOrder: false,
    isProcessing: false,
    isVerifying: false,
    error: null,
    gateway: null,
  });

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const resetCheckout = useCallback(() => {
    clearPolling();
    setState({
      isCreatingOrder: false,
      isProcessing: false,
      isVerifying: false,
      error: null,
      gateway: null,
    });
  }, [clearPolling]);

  // ── Razorpay verification (SDK-based checkout returns payment result inline) ──
  const handleRazorpaySuccess = useCallback(async (result: RazorpayPaymentResult) => {
    clearPolling();
    setState(s => ({ ...s, isProcessing: false, isVerifying: true, error: null }));

    try {
      const { data, error } = await verifyPaymentOrder({
        orderId: result.razorpay_order_id,
        paymentId: result.razorpay_payment_id,
        signature: result.razorpay_signature,
        requestId,
        gateway: 'razorpay',
      });

      if (error || !data) {
        const msg = error ?? 'Payment verification failed';
        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg, gateway: 'razorpay' });
        showAlert('Verification Failed', msg);
        onFailure?.(msg);
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway: 'razorpay' });
      onSuccess(data.paymentId);
    } catch (verErr: any) {
      const msg = verErr?.message || 'Payment verification failed';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg, gateway: 'razorpay' });
      showAlert('Verification Error', msg);
      onFailure?.(msg);
    }
  }, [requestId, onSuccess, onFailure, clearPolling, showAlert]);

  // ── Demo/test booking ──
  const confirmDemoBooking = useCallback(async (amount?: number) => {
    clearPolling();
    setState({ isCreatingOrder: false, isProcessing: true, isVerifying: false, error: null, gateway: null });
    try {
      const res = await confirmMockBookingPayment({
        requestId,
        amount: Number(amount) || 100,
        senderId,
        travellerId,
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to complete test booking');
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway: null });
      onSuccess(res.data.id);
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete test booking';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg, gateway: null });
      showAlert('Booking Error', msg);
      onFailure?.(msg);
    }
  }, [clearPolling, requestId, senderId, travellerId, onSuccess, onFailure, showAlert]);

  // ── Razorpay Web SDK checkout ──
  const openRazorpayWeb = useCallback(async (order: PaymentOrderResponse) => {
    try {
      await ensureRazorpayWebSdkLoaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Razorpay SDK not loaded';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: message, gateway: 'razorpay' });
      onFailure?.(message);
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'CaryGoo',
      description: 'Delivery Payment',
      order_id: order.orderId,
      prefill: {
        name: senderName ?? '',
        email: senderEmail ?? '',
        contact: senderPhone ?? '',
      },
      handler: (response: RazorpayPaymentResult) => {
        void handleRazorpaySuccess(response);
      },
      modal: {
        ondismiss: () => {
          setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was cancelled.', gateway: 'razorpay' });
          onFailure?.('Payment cancelled');
        },
      },
    };

    const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void } };
    if (!win.Razorpay) {
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Razorpay SDK not loaded', gateway: 'razorpay' });
      onFailure?.('Razorpay SDK not loaded');
      return;
    }

    try {
      const rzp = new win.Razorpay(options);
      rzp.open();
    } catch (rzpErr: any) {
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: rzpErr?.message || 'Failed to open web checkout', gateway: 'razorpay' });
      onFailure?.(rzpErr?.message || 'Failed to open web checkout');
    }
  }, [senderName, senderEmail, senderPhone, onFailure, handleRazorpaySuccess]);

  // ── Razorpay Native SDK checkout ──
  const openRazorpayNative = useCallback(async (order: PaymentOrderResponse) => {
    const hasNativeOpener = Boolean(
      NativeModules?.RNRazorpayCheckout &&
      NativeModules?.RazorpayEventEmitter &&
      typeof NativeModules.RNRazorpayCheckout?.open === 'function'
    );

    if (hasNativeOpener) {
      try {
        let RazorpayCheckout: any = null;
        try {
          RazorpayCheckout = require('react-native-razorpay').default || require('react-native-razorpay');
        } catch (reqErr) {
          console.warn('[PaymentCheckout] Native SDK require error:', reqErr);
        }

        if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
          const options = {
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'CaryGoo',
            description: 'Delivery Payment',
            order_id: order.orderId,
            prefill: {
              name: senderName ?? '',
              email: senderEmail ?? '',
              contact: senderPhone ?? '',
            },
            theme: { color: '#004AAD' },
          };

          const result = await RazorpayCheckout.open(options);
          await handleRazorpaySuccess({
            razorpay_order_id: result.razorpay_order_id,
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_signature: result.razorpay_signature,
          });
          return;
        }
      } catch (nativeErr: any) {
        console.warn('[PaymentCheckout] Native SDK error:', nativeErr);
        const errDesc = String(nativeErr?.description || nativeErr?.message || '');
        const errCode = nativeErr?.code;
        if (errCode === 0 || errDesc.toLowerCase().includes('cancel')) {
          setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was cancelled.', gateway: 'razorpay' });
          onFailure?.('Payment cancelled');
          return;
        }
      }
    }

    // Fallback to payment link for Expo Go / dev
    await openRedirectCheckout(order);
  }, [senderName, senderEmail, senderPhone, onFailure, handleRazorpaySuccess]);

  // ── Redirect-based checkout (PhonePe, PayU, or Razorpay link fallback) ──
  const openRedirectCheckout = useCallback(async (order: PaymentOrderResponse) => {
    const gateway = order.gateway;
    const label = GATEWAY_LABELS[gateway] || gateway;

    try {
      let checkoutUrl = order.redirectUrl;

      // For Razorpay fallback in Expo Go: generate a payment link
      if (!checkoutUrl && gateway === 'razorpay') {
        const amountInRupees = Math.round(order.amount / 100);
        const linkRes = await createPaymentLink({
          requestId,
          amount: amountInRupees,
          description: `CaryGoo Delivery Booking - ₹${amountInRupees}`,
          customerName: senderName,
          customerEmail: senderEmail,
          customerPhone: senderPhone,
        });

        if (linkRes.error || !linkRes.data?.shortUrl) {
          if (FeatureFlags.isDemoMode || __DEV__) {
            showAlert(
              'Test Payment Fallback',
              `Live ${label} gateway link is currently unavailable. Would you like to confirm and lock this booking in Test Mode?`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => { resetCheckout(); onFailure?.('Payment cancelled'); } },
                { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(amountInRupees) },
              ]
            );
            return;
          }
          throw new Error(linkRes.error || `Failed to generate ${label} checkout link`);
        }

        checkoutUrl = linkRes.data.shortUrl;
      }

      if (!checkoutUrl) {
        throw new Error(`No checkout URL available for ${label}`);
      }

      let isVerified = false;
      clearPolling();

      // Poll for payment completion (5s interval, max 12 checks = 60s)
      let pollCount = 0;
      pollTimerRef.current = setInterval(async () => {
        if (isVerified || pollCount >= 12) {
          clearPolling();
          return;
        }
        pollCount += 1;

        try {
          const pollResult = await checkPaymentStatus(order.orderId, gateway);
          if (pollResult.paid && pollResult.paymentId) {
            isVerified = true;
            clearPolling();
            if (Platform.OS === 'ios') {
              try { await WebBrowser.dismissBrowser(); } catch {}
            }
            setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway });
            onSuccess(pollResult.paymentId);
          }
        } catch {}
      }, 5000);

      // Open checkout URL in browser
      try {
        await WebBrowser.openBrowserAsync(checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#004AAD',
          controlsColor: '#FFFFFF',
          showTitle: true,
        });
      } catch (browserErr) {
        console.warn('[PaymentCheckout] In-app browser error, opening system browser:', browserErr);
        await Linking.openURL(checkoutUrl);
      }

      // Check final status when user returns
      clearPolling();
      if (!isVerified) {
        setState(s => ({ ...s, isProcessing: false, isVerifying: true }));
        try {
          const finalStatus = await checkPaymentStatus(order.orderId, gateway);
          if (finalStatus.paid && finalStatus.paymentId) {
            setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway });
            onSuccess(finalStatus.paymentId);
            return;
          }
        } catch {}

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway });

        if (FeatureFlags.isDemoMode || __DEV__) {
          showAlert(
            'Payment Incomplete',
            `No captured payment detected via ${label}. You can complete this booking in Test Mode.`,
            [
              { text: 'Dismiss', style: 'cancel', onPress: () => { resetCheckout(); onFailure?.('Payment cancelled'); } },
              { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(Math.round(order.amount / 100)) },
            ]
          );
          return;
        }

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was not completed.', gateway });
        showAlert('Payment Incomplete', `No payment was captured by ${label}. Tap "Pay & Book" to retry.`);
        onFailure?.('Payment not completed');
      }
    } catch (err: unknown) {
      clearPolling();
      const message = err instanceof Error ? err.message : `Failed to launch ${label} gateway`;

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway });

      if (FeatureFlags.isDemoMode || __DEV__) {
        showAlert(
          'Test Payment Fallback',
          `Could not start ${label} checkout. Confirm booking in Test Mode?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => { resetCheckout(); onFailure?.(message); } },
            { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking() },
          ]
        );
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: message, gateway });
      showAlert('Payment Failed', message);
      onFailure?.(message);
    }
  }, [
    requestId, senderName, senderEmail, senderPhone,
    onSuccess, onFailure, showAlert, clearPolling, resetCheckout, confirmDemoBooking,
  ]);

  // ── Main entry point ──
  const startCheckout = useCallback(async (options?: { forceDemo?: boolean; fallbackAmount?: number }) => {
    if (options?.forceDemo) {
      await confirmDemoBooking(options.fallbackAmount);
      return;
    }

    setState({ isCreatingOrder: true, isProcessing: false, isVerifying: false, error: null, gateway: null });

    try {
      const { data: order, error: orderError } = await createPaymentOrder(requestId);
      if (orderError || !order) {
        const msg = orderError ?? 'Failed to create order';
        console.warn('[usePaymentCheckout] createPaymentOrder note:', msg);

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway: null });

        if (FeatureFlags.isDemoMode || __DEV__ || msg.toLowerCase().includes('not configured')) {
          showAlert(
            'Test Mode Payment',
            'Live gateway is not configured or in test mode. Would you like to confirm and lock this booking in Test Mode?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => { resetCheckout(); onFailure?.('Cancelled'); } },
              { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
            ]
          );
          return;
        }

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg, gateway: null });
        showAlert('Order Creation Failed', msg);
        onFailure?.(msg);
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: true, isVerifying: false, error: null, gateway: order.gateway });

      const gateway = order.gateway;

      if (gateway === 'razorpay') {
        // Razorpay: use SDK on web, native SDK on mobile, or fallback to redirect
        if (Platform.OS === 'web') {
          await openRazorpayWeb(order);
        } else {
          await openRazorpayNative(order);
        }
      } else {
        // PhonePe / PayU: redirect-based checkout
        await openRedirectCheckout(order);
      }
    } catch (checkoutErr: any) {
      const errMsg = checkoutErr?.message || 'Checkout failed to start';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null, gateway: null });

      if (FeatureFlags.isDemoMode || __DEV__) {
        showAlert(
          'Test Payment Fallback',
          'Could not start gateway checkout. Confirm booking in Test Mode?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => { resetCheckout(); onFailure?.(errMsg); } },
            { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
          ]
        );
        return;
      }
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: errMsg, gateway: null });
      showAlert('Payment Error', errMsg);
      onFailure?.(errMsg);
    }
  }, [confirmDemoBooking, requestId, onFailure, openRazorpayWeb, openRazorpayNative, openRedirectCheckout, showAlert, resetCheckout]);

  const isLoading = state.isCreatingOrder || state.isProcessing || state.isVerifying;

  return {
    ...state,
    isLoading,
    startCheckout,
    confirmDemoBooking,
    resetCheckout,
  };
}
