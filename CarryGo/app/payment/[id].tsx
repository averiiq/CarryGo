import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureFlags, disabledFeatureMessage } from '@/constants/featureFlags';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useRequestQuery } from '@/features/requests/queries';
import { useAuth } from '@/hooks/useAuth';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchPaymentByRequest } from '@/services/payments.service';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: request } = useRequestQuery(id);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string } | null>(null);

  React.useEffect(() => {
    if (!id) return;
    fetchPaymentByRequest(id).then(({ data }) => {
      if (data) setExistingPayment({ id: data.id, status: data.status });
    });
  }, [id]);

  const isSender = user?.id === request?.senderId;

  const { isLoading, isCreatingOrder, isVerifying, error, startCheckout } = useRazorpayCheckout({
    requestId: id,
    senderId: user?.id ?? '',
    senderName: user?.name,
    senderEmail: user?.email,
    senderPhone: user?.phone,
    onSuccess: (paymentId) => {
      setPaymentComplete(true);
      setExistingPayment({ id: paymentId, status: 'locked' });
      Alert.alert('Payment Successful', 'Your payment has been securely locked in escrow.');
    },
    onFailure: (msg) => {
      Alert.alert('Payment Failed', msg);
    },
  });

  if (!FeatureFlags.payments) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={[styles.hero, Shadow.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.icon, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
            <MaterialIcons name="construction" size={34} color={C.warning} />
          </View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Payment Integration Unavailable</Text>
          <Text style={[styles.body, { color: C.textSecondary }]}>
            {disabledFeatureMessage.payments}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const statusColor = existingPayment?.status === 'locked' ? C.warning
    : existingPayment?.status === 'released' ? C.success
    : existingPayment?.status === 'refunded' ? C.textMuted
    : C.textSecondary;

  const statusLabel = existingPayment?.status === 'locked' ? 'Held in Escrow'
    : existingPayment?.status === 'released' ? 'Released to Traveller'
    : existingPayment?.status === 'refunded' ? 'Refunded'
    : '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {existingPayment ? (
        <View style={[styles.hero, Shadow.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.icon, { backgroundColor: statusColor + '18', borderColor: statusColor + '55' }]}>
            <MaterialIcons
              name={existingPayment.status === 'released' ? 'check-circle' : existingPayment.status === 'refunded' ? 'replay' : 'lock'}
              size={34}
              color={statusColor}
            />
          </View>
          <Text style={[styles.title, { color: C.textPrimary }]}>{statusLabel}</Text>
          <Text style={[styles.body, { color: C.textSecondary }]}>
            {existingPayment.status === 'locked'
              ? 'Payment is securely held. It will be released to the traveller upon delivery confirmation.'
              : existingPayment.status === 'released'
              ? 'Payment has been released to the traveller after successful delivery.'
              : 'Payment has been refunded to your account.'}
          </Text>
        </View>
      ) : paymentComplete ? (
        <View style={[styles.hero, Shadow.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.icon, { backgroundColor: C.success + '18', borderColor: C.success + '55' }]}>
            <MaterialIcons name="check-circle" size={34} color={C.success} />
          </View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Payment Complete</Text>
          <Text style={[styles.body, { color: C.textSecondary }]}>
            Your payment is securely held in escrow.
          </Text>
        </View>
      ) : (
        <View style={[styles.hero, Shadow.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.icon, { backgroundColor: C.accent + '18', borderColor: C.accent + '55' }]}>
            <MaterialIcons name="payment" size={34} color={C.accent} />
          </View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Secure Payment</Text>
          <Text style={[styles.body, { color: C.textSecondary }]}>
            Pay securely via Razorpay. Your funds are held in escrow and released only after delivery confirmation.
          </Text>
        </View>
      )}

      {request ? (
        <View style={[styles.details, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.detailsTitle, { color: C.textPrimary }]}>Delivery Details</Text>
          <View style={[styles.row, { borderBottomColor: C.surfaceBorder }]}>
            <Text style={[styles.label, { color: C.textMuted }]}>Sender</Text>
            <Text style={[styles.value, { color: C.textPrimary }]}>{request.senderName}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: C.surfaceBorder }]}>
            <Text style={[styles.label, { color: C.textMuted }]}>Traveller</Text>
            <Text style={[styles.value, { color: C.textPrimary }]}>{request.travellerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: C.textMuted }]}>Amount</Text>
            <Text style={[styles.amount, { color: C.success }]}>₹{request.price}</Text>
          </View>
        </View>
      ) : null}

      {!existingPayment && !paymentComplete && isSender ? (
        <View style={styles.actions}>
          {error ? (
            <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: C.accent, opacity: isLoading ? 0.6 : 1 }]}
            onPress={startCheckout}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.payButtonText}>
                  {isCreatingOrder ? 'Creating Order...' : isVerifying ? 'Verifying...' : 'Processing...'}
                </Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Pay ₹{request?.price ?? '—'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.securityNote, { color: C.textMuted }]}>
            Protected by Razorpay. Funds released only on delivery.
          </Text>
        </View>
      ) : null}

      {!isSender && !existingPayment ? (
        <View style={[styles.infoBox, { backgroundColor: C.surfaceElevated }]}>
          <MaterialIcons name="info-outline" size={18} color={C.textMuted} />
          <Text style={[styles.infoText, { color: C.textMuted }]}>
            Only the sender can initiate payment for this delivery.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  icon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  details: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  detailsTitle: {
    marginBottom: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: FontSize.sm,
  },
  value: {
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
  },
  amount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  payButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  payButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  securityNote: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
