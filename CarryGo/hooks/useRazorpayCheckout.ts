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
  senderId?: string;
  travellerId?: string;
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
  senderId,
  travellerId,
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

  const resetCheckout = useCallback(() => {
    clearPolling();
    setState({
      isCreatingOrder: false,
      isProcessing: false,
      isVerifying: false,
      error: null,
    });
  }, [clearPolling]);

  const handlePaymentSuccess = useCallback(async (result: RazorpayPaymentResult) => {
    clearPolling();
    setState({ isCreatingOrder: false, isProcessing: false, isVerifying: true, error: null });

    try {
      const { data, error } = await verifyRazorpayPayment({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
        requestId,
      });

      if (error || !data) {
        const msg = error ?? 'Payment verification failed';
        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg });
        showAlert('Verification Failed', msg);
        onFailure?.(msg);
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
      onSuccess(data.paymentId);
    } catch (verErr: any) {
      const msg = verErr?.message || 'Payment verification failed';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg });
      showAlert('Verification Error', msg);
      onFailure?.(msg);
    }
  }, [requestId, onSuccess, onFailure, clearPolling, showAlert]);

  const confirmDemoBooking = useCallback(async (amount?: number) => {
    clearPolling();
    setState({ isCreatingOrder: false, isProcessing: true, isVerifying: false, error: null });
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

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
      onSuccess(res.data.id);
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete test booking';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg });
      showAlert('Booking Error', msg);
      onFailure?.(msg);
    }
  }, [clearPolling, requestId, senderId, travellerId, onSuccess, onFailure, showAlert]);

  const openRazorpayWeb = useCallback(async (order: RazorpayOrder) => {
    try {
      await ensureRazorpayWebSdkLoaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Razorpay SDK not loaded';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: message });
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
          setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was cancelled.' });
          onFailure?.('Payment cancelled');
        },
      },
    };

    const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void } };
    if (!win.Razorpay) {
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Razorpay SDK not loaded' });
      onFailure?.('Razorpay SDK not loaded');
      return;
    }

    try {
      const rzp = new win.Razorpay(options);
      rzp.open();
    } catch (rzpErr: any) {
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: rzpErr?.message || 'Failed to open web checkout' });
      onFailure?.(rzpErr?.message || 'Failed to open web checkout');
    }
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
      } catch (nativeErr: any) {
        console.warn('[RazorpayCheckout] Native SDK error:', nativeErr);
        const errDesc = String(nativeErr?.description || nativeErr?.message || '');
        const errCode = nativeErr?.code;
        // User deliberately cancelled the native dialog
        if (errCode === 0 || errDesc.toLowerCase().includes('cancel')) {
          setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was cancelled.' });
          onFailure?.('Payment cancelled');
          return;
        }
      }
    }

    // 2. In Expo Go or development environments:
    // Generate an official Razorpay Payment Link and launch the gateway via in-app browser
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
        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
        if (FeatureFlags.isDemoMode || __DEV__) {
          showAlert(
            'Test Payment Fallback',
            'Live gateway link is currently unavailable. Would you like to confirm and lock this booking in Test Mode?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
                  onFailure?.('Payment cancelled');
                },
              },
              { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(amountInRupees) },
            ]
          );
          return;
        }
        throw new Error(linkRes.error || 'Failed to generate Razorpay gateway checkout link');
      }

      const { paymentLinkId, shortUrl } = linkRes.data;
      let isVerified = false;

      clearPolling();

      // Poll Razorpay API for live payment capture while user pays on Razorpay (5s interval, max 8 checks)
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
        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: true, error: null });
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

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });

        if (FeatureFlags.isDemoMode || __DEV__) {
          showAlert(
            'Payment Incomplete',
            'No captured live payment was detected. You can complete this booking instantly in Test Mode.',
            [
              {
                text: 'Dismiss',
                style: 'cancel',
                onPress: () => {
                  setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
                  onFailure?.('Payment cancelled');
                },
              },
              { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(amountInRupees) },
            ]
          );
          return;
        }

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: 'Payment was not completed.' });
        showAlert(
          'Payment Incomplete',
          'No payment was captured by Razorpay. If you closed the window or cancelled, tap "Pay & Book" to retry.'
        );
        onFailure?.('Payment not completed');
      }
    } catch (err: unknown) {
      clearPolling();
      const message = err instanceof Error ? err.message : 'Failed to launch Razorpay gateway';

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });

      if (FeatureFlags.isDemoMode || __DEV__) {
        showAlert(
          'Test Payment Fallback',
          'Could not start gateway checkout. Confirm booking instantly in Test Mode?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
                onFailure?.(message);
              },
            },
            { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking() },
          ]
        );
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: message });
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

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });

        if (FeatureFlags.isDemoMode || __DEV__ || msg.toLowerCase().includes('not configured')) {
          showAlert(
            'Test Mode Payment',
            'Live gateway is not configured or in test mode. Would you like to confirm and lock this booking in Test Mode?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
                  onFailure?.('Cancelled');
                },
              },
              { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
            ]
          );
          return;
        }

        setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: msg });
        showAlert('Order Creation Failed', msg);
        onFailure?.(msg);
        return;
      }

      setState({ isCreatingOrder: false, isProcessing: true, isVerifying: false, error: null });

      if (Platform.OS === 'web') {
        await openRazorpayWeb(order);
      } else {
        await openRazorpayNative(order);
      }
    } catch (checkoutErr: any) {
      const errMsg = checkoutErr?.message || 'Checkout failed to start';
      setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });

      if (FeatureFlags.isDemoMode || __DEV__) {
        showAlert(
          'Test Payment Fallback',
          'Could not start gateway checkout. Confirm booking in Test Mode?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setState({ isCreatingOrder: false, isProcessing: false, isVerifying: false, error: null });
                onFailure?.(errMsg);
              },
            },
            { text: 'Pay in Test Mode', onPress: () => void confirmDemoBooking(options?.fallbackAmount) },
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
    resetCheckout,
  };
}