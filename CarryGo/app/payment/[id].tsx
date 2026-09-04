import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FeatureFlags, disabledFeatureMessage } from '@/constants/featureFlags';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useRequestQuery } from '@/features/requests/queries';
import { useAuth } from '@/hooks/useAuth';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchPaymentByRequest } from '@/services/payments.service';
import { getSupabaseClient } from '@/template';
import { ProductIllustration } from '@/components/illustrations';

type PaymentStatus = 'locked' | 'released' | 'refunded';

function formatAmount(value?: number | null) {
  const amount = typeof value === 'number' ? value : 0;
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: request } = useRequestQuery(id);

  const [paymentComplete, setPaymentComplete] = useState(false);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: PaymentStatus } | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const loadPayment = async () => {
      const { data } = await fetchPaymentByRequest(id);
      if (!isMounted) return;

      if (!data) {
        setExistingPayment(null);
        return;
      }

      const status = data.status as PaymentStatus;
      if (status === 'locked' || status === 'released' || status === 'refunded') {
        setExistingPayment({ id: data.id, status });
        if (status === 'locked' || status === 'released') {
          setPaymentComplete(true);
        }
      }
    };

    void loadPayment();

    const sb = getSupabaseClient();
    const channel = sb
      .channel(`payment:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `request_id=eq.${id}` }, () => {
        void loadPayment();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void sb.removeChannel(channel);
    };
  }, [id]);

  const isSender = user?.id === request?.senderId;

  const {
    isLoading,
    isCreatingOrder,
    isVerifying,
    error,
    startCheckout,
  } = useRazorpayCheckout({
    requestId: id,
    senderName: user?.name,
    senderEmail: user?.email,
    senderPhone: user?.phone,
    onSuccess: (paymentId) => {
      setPaymentComplete(true);
      setExistingPayment({ id: paymentId, status: 'locked' });
      Alert.alert('Payment Successful', 'Your payment is now securely held in escrow.');
    },
    onFailure: (message) => {
      Alert.alert('Payment Failed', message);
    },
  });

  const statusMeta = useMemo(() => {
    if (!existingPayment) return null;

    if (existingPayment.status === 'released') {
      return {
        icon: 'verified' as const,
        color: C.success,
        bg: C.successSubtle,
        title: 'Payment Released',
        body: 'Funds are released to the traveller after delivery confirmation.',
      };
    }

    if (existingPayment.status === 'refunded') {
      return {
        icon: 'replay' as const,
        color: C.textMuted,
        bg: C.surfaceElevated,
        title: 'Payment Refunded',
        body: 'The payment has been refunded to the sender account.',
      };
    }

    return {
      icon: 'lock' as const,
      color: C.warning,
      bg: C.warningSubtle,
      title: 'Payment in Escrow',
      body: 'Funds are safely locked and will be released after successful delivery.',
    };
  }, [C.success, C.successSubtle, C.surfaceElevated, C.textMuted, C.warning, C.warningSubtle, existingPayment]);

  if (!FeatureFlags.payments) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={[styles.statusCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <View style={[styles.statusIconWrap, { backgroundColor: C.warningSubtle }]}>
            <MaterialIcons name="construction" size={30} color={C.warning} />
          </View>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>Payments are disabled</Text>
          <Text style={[styles.statusBody, { color: C.textSecondary }]}>{disabledFeatureMessage.payments}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
        <LinearGradient
          colors={[C.primarySubtle, C.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroImage}><ProductIllustration variant="payment" size={128} /></View>
        <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Secure Escrow Payment</Text>
        <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>
          Sender locks funds, traveller delivers, and payment is released only after confirmation.
        </Text>
      </View>

      {statusMeta ? (
        <View style={[styles.statusCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <LinearGradient
            colors={[statusMeta.bg, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.statusIconWrap, { backgroundColor: statusMeta.color + '15' }]}>
            <MaterialIcons name={statusMeta.icon} size={30} color={statusMeta.color} />
          </View>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>{statusMeta.title}</Text>
          <Text style={[styles.statusBody, { color: C.textSecondary }]}>{statusMeta.body}</Text>
        </View>
      ) : paymentComplete ? (
        <View style={[styles.statusCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <LinearGradient
            colors={[C.successSubtle, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.statusIconWrap, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="check-circle" size={30} color={C.success} />
          </View>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>Payment complete</Text>
          <Text style={[styles.statusBody, { color: C.textSecondary }]}>Your payment has been securely locked for this delivery.</Text>
        </View>
      ) : (
        <View style={[styles.statusCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.statusIconWrap, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="shield" size={30} color={C.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>Secure escrow checkout</Text>
          <Text style={[styles.statusBody, { color: C.textSecondary }]}>Pay once, then funds release only after successful delivery confirmation.</Text>
        </View>
      )}

      {request ? (
        <View style={[styles.detailsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.detailsHeader}>
            <MaterialIcons name="receipt-long" size={16} color={C.primary} />
            <Text style={[styles.detailsTitle, { color: C.textPrimary }]}>Payment Details</Text>
          </View>
          <DetailRow label="Sender" value={request.senderName} C={C} />
          <DetailRow label="Traveller" value={request.travellerName} C={C} />
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: C.textMuted }]}>Amount</Text>
            <Text style={[styles.amountText, { color: C.success }]}>{formatAmount(request.price)}</Text>
          </View>
        </View>
      ) : null}

      {!existingPayment && !paymentComplete && isSender ? (
        <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {error ? <Text style={[styles.errorText, { color: C.error }]}>{error}</Text> : null}

          <Pressable
            onPress={startCheckout}
            disabled={isLoading}
            style={({ pressed }) => [styles.payButtonWrap, pressed && { opacity: 0.86 }, isLoading && { opacity: 0.64 }]}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.payButton}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={C.textInverse} />
                  <Text style={styles.payButtonText}>
                    {isCreatingOrder ? 'Creating order...' : isVerifying ? 'Verifying...' : 'Processing...'}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="lock" size={18} color={C.textInverse} />
                  <Text style={styles.payButtonText}>Pay {formatAmount(request?.price)}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={[styles.securityInfo, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="verified-user" size={16} color={C.textMuted} />
            <Text style={[styles.securityText, { color: C.textMuted }]}>Protected by Razorpay escrow. Funds release only after delivery confirmation.</Text>
          </View>
        </View>
      ) : null}

      {!isSender && !existingPayment && !paymentComplete ? (
        <View style={[styles.securityInfo, { backgroundColor: C.surfaceElevated }]}>
          <MaterialIcons name="info-outline" size={16} color={C.textMuted} />
          <Text style={[styles.securityText, { color: C.textMuted }]}>Only the sender can initiate payment for this delivery.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({ label, value, C }: { label: string; value: string; C: ReturnType<typeof useThemeColors>['C'] }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: C.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 128,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    right: -6,
    bottom: -18,
    opacity: 0.38,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  statusIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statusTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  statusBody: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  detailsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  detailRowLast: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
  },
  detailLabel: {
    fontSize: FontSize.sm,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  amountText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  payButtonWrap: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  payButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  securityText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
});




