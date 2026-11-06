import { useState, useCallback, useRef } from 'react';
import { Platform, NativeModules, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { RazorpayOrder, RazorpayPaymentResult } from '@/types';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createRazorpayPaymentLink,
  checkRazorpayPaymentLinkStatus,
  confirmMockBookingPayment,
} from '@/services/payments.service';
import { FeatureFlags } from '@/constants/featureFlags';
import { useAlert } from '@/template';

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
  const { showAlert } = useAlert();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<CheckoutState>({
    isCreatingOrder: false,
    isProcessing: false,
    isVerifying: false,
    error: null,
  });

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const handlePaymentSuccess = useCallback(async (result: RazorpayPaymentResult) => {
    clearPolling();
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
      showAlert('Verification Failed', msg);
      onFailure?.(msg);
      return;
    }

    setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
    onSuccess(data.paymentId);
  }, [requestId, onSuccess, onFailure, clearPolling, showAlert]);

  const confirmDemoBooking = useCallback(async (amount?: number) => {
    clearPolling();
    setState({ isCreatingOrder: false, isProcessing: true, isVerifying: false, error: null });
    try {
      const res = await confirmMockBookingPayment({
        requestId,
        amount: Number(amount) || 100,
        senderId: senderEmail,
      });

      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to complete demo booking');
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
      onSuccess(res.data.id);
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete demo booking';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg });
      showAlert('Booking Error', msg);
      onFailure?.(msg);
    }
  }, [clearPolling, requestId, senderEmail, onSuccess, onFailure, showAlert]);

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
      name: 'CaryGoo',
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
    // 1. Check if native SDK is compiled with both checkout module AND event emitter
    const hasNativeOpener = Boolean(
      NativeModules?.RNRazorpayCheckout &&
      NativeModules?.RazorpayEventEmitter &&
      typeof NativeModules.RNRazorpayCheckout?.open === 'function'
    );

    if (hasNativeOpener) {
      try {
        let RazorpayCheckout: any = null;
        try {
          // Dynamic require guarded inside try-catch to prevent Metro bundle crash
          RazorpayCheckout = require('react-native-razorpay').default || require('react-native-razorpay');
        } catch (reqErr) {
          console.warn('[RazorpayCheckout] Native SDK require error:', reqErr);
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
          await handlePaymentSuccess({
            razorpay_order_id: result.razorpay_order_id,
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_signature: result.razorpay_signature,
          });
          return;
        }
      } catch (nativeErr: unknown) {
        console.warn('[RazorpayCheckout] Native SDK error, falling back to in-app payment link:', nativeErr);
      }
    }

    // 2. In Expo Go or development environments:
    // Generate an official Razorpay Payment Link and launch the REAL Razorpay gateway via in-app browser
    try {
      const amountInRupees = Math.round(order.amount / 100);
      const linkRes = await createRazorpayPaymentLink({
        requestId,
        amount: amountInRupees,
        description: `CaryGoo Delivery Booking - ₹${amountInRupees}`,
        customerName: senderName,
        customerEmail: senderEmail,
        customerPhone: senderPhone,
      });

      if (linkRes.error || !linkRes.data?.shortUrl) {
        if (FeatureFlags.isDemoMode) {
          showAlert(
            'Demo Gateway Fallback',
            'Live gateway link is unavailable. Would you like to confirm and lock this booking in Demo Mode?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => onFailure?.('Payment link unavailable') },
              { text: 'Confirm & Book (Demo)', onPress: () => void confirmDemoBooking(amountInRupees) },
            ]
          );
          return;
        }
        throw new Error(linkRes.error || 'Failed to generate Razorpay gateway checkout link');
      }

      const { paymentLinkId, shortUrl } = linkRes.data;
      let isVerified = false;

      clearPolling();

      // Poll Razorpay API for live payment capture while user pays on Razorpay (5s interval, max 8 checks to protect rate limits)
      let pollCount = 0;
      pollTimerRef.current = setInterval(async () => {
        if (isVerified || pollCount >= 8) {
          clearPolling();
          return;
        }
        pollCount += 1;

        try {
          const pollResult = await checkRazorpayPaymentLinkStatus(paymentLinkId);
          if (pollResult.paid && pollResult.paymentId) {
            isVerified = true;
            clearPolling();
            if (Platform.OS === 'ios') {
              try {
                await WebBrowser.dismissBrowser();
              } catch {}
            }
            await handlePaymentSuccess({
              razorpay_order_id: paymentLinkId,
              razorpay_payment_id: pollResult.paymentId,
              razorpay_signature: '',
            });
          }
        } catch {}
      }, 5000);

      // Open the real Razorpay payment gateway
      try {
        await WebBrowser.openBrowserAsync(shortUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#004AAD',
          controlsColor: '#FFFFFF',
          showTitle: true,
        });
      } catch (browserErr) {
        console.warn('[WebBrowser] In-app browser error, opening system browser:', browserErr);
        await Linking.openURL(shortUrl);
      }

      // Check final status when user returns or closes the browser
      clearPolling();
      if (!isVerified) {
        setState(s => ({ ...s, isProcessing: false, isVerifying: true }));
        try {
          const finalStatus = await checkRazorpayPaymentLinkStatus(paymentLinkId);
          if (finalStatus.paid && finalStatus.paymentId) {
            isVerified = true;
            await handlePaymentSuccess({
              razorpay_order_id: paymentLinkId,
              razorpay_payment_id: finalStatus.paymentId,
              razorpay_signature: '',
            });
            return;
          }
        } catch {}

        if (FeatureFlags.isDemoMode) {
          setState(s => ({ ...s, isProcessing: false, isVerifying: false }));
          showAlert(
            'Payment Confirmation',
            'No captured live payment was detected. In Demo Mode, you can confirm this booking directly.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => onFailure?.('Payment not completed') },
              { text: 'Confirm & Book (Demo)', onPress: () => void confirmDemoBooking(amountInRupees) },
            ]
          );
          return;
        }

        setState(s => ({ ...s, isProcessing: false, isVerifying: false, error: 'Payment was not completed.' }));
        showAlert(
          'Payment Incomplete',
          'No payment was captured by Razorpay. If you closed the browser or cancelled, tap "Pay & Book" anytime to retry.'
        );
        onFailure?.('Payment not completed');
      }
    } catch (err: unknown) {
      clearPolling();
      const message = err instanceof Error ? err.message : 'Failed to launch Razorpay gateway';

      if (FeatureFlags.isDemoMode) {
        showAlert(
          'Demo Booking Fallback',
          'Could not complete gateway checkout. Confirm booking in Demo Mode?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => onFailure?.(message) },
            { text: 'Confirm & Book (Demo)', onPress: () => void confirmDemoBooking() },
          ]
        );
        return;
      }

      setState(s => ({ ...s, isProcessing: false, error: message }));
      showAlert('Payment Failed', message);
      onFailure?.(message);
    }
  }, [
    senderName,
    senderEmail,
    senderPhone,
    requestId,
    handlePaymentSuccess,
    confirmDemoBooking,
    onFailure,
    showAlert,
    clearPolling,
  ]);

  const startCheckout = useCallback(async (options?: { forceDemo?: boolean; fallbackAmount?: number }) => {
    if (options?.forceDemo) {
      await confirmDemoBooking(options.fallbackAmount);
      return;
    }

    setState({ isCreatingOrder: true, isProcessing: false, isVerifying: false, error: null });

    try {
      const { data: order, error: orderError } = await createRazorpayOrder(requestId);
      if (orderError || !order) {
        const msg = orderError ?? 'Failed to create order';
        console.warn('[useRazorpayCheckout] createRazorpayOrder note:', msg);

        // If in Demo Mode or Payment Provider unconfigured, fallback to Demo Booking smoothly
        if (FeatureFlags.isDemoMode || msg.toLowerCase().includes('not configured')) {
          setState(s => ({ ...s, isCreatingOrder: false, error: null }));
          showAlert(
            'Demo Booking Mode',
            'Live payment gateway is unconfigured or in demo mode. Would you like to confirm and lock this booking in Demo Mode?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => onFailure?.('Cancelled') },
              { text: 'Confirm & Book (Demo)', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
            ]
          );
          return;
        }

        setState(s => ({ ...s, isCreatingOrder: false, error: msg }));
        showAlert('Order Creation Failed', msg);
        onFailure?.(msg);
        return;
      }

      setState(s => ({ ...s, isCreatingOrder: false, isProcessing: true }));

      if (Platform.OS === 'web') {
        await openRazorpayWeb(order);
      } else {
        await openRazorpayNative(order);
      }
    } catch (checkoutErr: any) {
      const errMsg = checkoutErr?.message || 'Checkout failed to start';
      if (FeatureFlags.isDemoMode) {
        showAlert(
          'Demo Booking Fallback',
          'Could not start gateway checkout. Confirm booking in Demo Mode?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => onFailure?.(errMsg) },
            { text: 'Confirm & Book (Demo)', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
          ]
        );
        return;
      }
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: errMsg });
      showAlert('Payment Error', errMsg);
      onFailure?.(errMsg);
    }
  }, [confirmDemoBooking, requestId, onFailure, openRazorpayWeb, openRazorpayNative, showAlert]);

  const isLoading = state.isCreatingOrder || state.isProcessing || state.isVerifying;

  return {
    ...state,
    isLoading,
    startCheckout,
    confirmDemoBooking,
  };
}
