import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { FeatureFlags, disabledFeatureMessage } from '@/constants/featureFlags';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useRequestQuery } from '@/features/requests/queries';
import { useAuth } from '@/hooks/useAuth';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchPaymentByRequestOrId } from '@/services/payments.service';
import { getSupabaseClient, useAlert } from '@/template';
import { PanVerificationModal } from '@/components/feature/PanVerificationModal';
import { Haptic } from '@/services/haptics.service';
import { Payment } from '@/types';

type PaymentStatus = 'locked' | 'released' | 'refunded';

function formatAmount(value?: number | null) {
  const amount = typeof value === 'number' ? value : 0;
  return `₹${amount.toLocaleString('en-IN')}`;
}

let paymentChannelInstance = 0;

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [isPanModalVisible, setIsPanModalVisible] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Load payment record
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const loadPayment = async () => {
      setLoadingPayment(true);
      const { data } = await fetchPaymentByRequestOrId(id);
      if (!isMounted) return;

      if (data) {
        setPayment(data);
      } else {
        setPayment(null);
      }
      setLoadingPayment(false);
    };

    void loadPayment();

    const sb = getSupabaseClient();
    const instance = ++paymentChannelInstance;
    let channel: ReturnType<typeof sb.channel> | null = null;

    try {
      channel = sb
        .channel(`payment:${id}:${instance}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payments' },
          (payload) => {
            const row = payload.new as any;
            if (row && (row.request_id === id || row.id === id)) {
              if (isMounted) void loadPayment();
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted && channel) {
            try {
              void sb.removeChannel(channel);
            } catch {}
          }
        });
    } catch {}

    return () => {
      isMounted = false;
      if (channel) {
        try {
          void sb.removeChannel(channel);
        } catch {}
      }
    };
  }, [id]);

  // Request details
  const effectiveRequestId = payment?.requestId || id;
  const { data: request } = useRequestQuery(effectiveRequestId);

  const isSender = user?.id === request?.senderId;
  const isTraveller = user?.id === request?.travellerId;

  const paymentStatus: PaymentStatus | 'unpaid' = payment
    ? (payment.status as PaymentStatus)
    : 'unpaid';

  const {
    isLoading,
    isCreatingOrder,
    isVerifying,
    error,
    startCheckout,
  } = useRazorpayCheckout({
    requestId: effectiveRequestId,
    senderName: user?.name,
    senderEmail: user?.email,
    senderPhone: user?.phone,
    onSuccess: (paymentId) => {
      Haptic.success();
      showAlert('Payment Successful', 'Your payment is now safely locked in CarryGo Escrow.');
    },
    onFailure: (message) => {
      Haptic.warning();
      showAlert('Payment Failed', message);
    },
  });

  const handleInitiatePayment = () => {
    if (!user?.isPanVerified) {
      setIsPanModalVisible(true);
      return;
    }
    startCheckout();
  };

  const receiptNumber = useMemo(() => {
    if (payment?.id) {
      return `CG-TXN-${payment.id.slice(0, 8).toUpperCase()}`;
    }
    return `CG-REQ-${effectiveRequestId.slice(0, 8).toUpperCase()}`;
  }, [payment?.id, effectiveRequestId]);

  const handleCopyReceiptId = async () => {
    Haptic.select();
    await Clipboard.setStringAsync(receiptNumber);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleShareReceipt = async () => {
    Haptic.tap();
    const amountStr = formatAmount(payment?.amount || request?.price);
    const fromCity = request?.fromCity || 'Origin';
    const toCity = request?.toCity || 'Destination';
    const statusText =
      paymentStatus === 'released'
        ? 'COMPLETED & RELEASED'
        : paymentStatus === 'locked'
        ? 'LOCKED IN ESCROW'
        : paymentStatus === 'refunded'
        ? 'REFUNDED'
        : 'PENDING';

    try {
      await Share.share({
        title: `CarryGo Escrow Receipt - ${receiptNumber}`,
        message:
          `📦 CarryGo Official Escrow Receipt\n` +
          `-----------------------------------\n` +
          `Receipt ID: ${receiptNumber}\n` +
          `Status: ${statusText}\n` +
          `Amount: ${amountStr}\n` +
          `Route: ${fromCity} → ${toCity}\n` +
          `Sender: ${request?.senderName || 'Sender'}\n` +
          `Traveler: ${request?.travellerName || 'Traveler'}\n` +
          `Date: ${new Date(payment?.createdAt || Date.now()).toLocaleDateString('en-IN')}\n` +
          `Secured by CarryGo 256-bit Escrow Protection.`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  const statusConfig = useMemo(() => {
    switch (paymentStatus) {
      case 'released':
        return {
          icon: 'check-circle' as const,
          label: 'PAYMENT RELEASED',
          desc: 'Funds successfully transferred to traveler after delivery confirmation.',
          badgeBg: C.successSubtle,
          badgeColor: C.success,
          gradient: [C.successSubtle, 'transparent'] as [string, string],
        };
      case 'refunded':
        return {
          icon: 'rotate-ccw' as const,
          label: 'PAYMENT REFUNDED',
          desc: 'Escrow payment refunded back to the sender account.',
          badgeBg: C.errorSubtle,
          badgeColor: C.error,
          gradient: [C.errorSubtle, 'transparent'] as [string, string],
        };
      case 'locked':
        return {
          icon: 'shield' as const,
          label: 'LOCKED IN ESCROW',
          desc: 'Funds held safely by CarryGo. Released only upon OTP delivery verification.',
          badgeBg: C.warningSubtle,
          badgeColor: C.warning,
          gradient: [C.warningSubtle, 'transparent'] as [string, string],
        };
      default:
        return {
          icon: 'clock' as const,
          label: 'AWAITING PAYMENT',
          desc: 'Payment not yet deposited into escrow. Complete payment to secure delivery.',
          badgeBg: C.primarySubtle,
          badgeColor: C.primary,
          gradient: [C.primarySubtle, 'transparent'] as [string, string],
        };
    }
  }, [paymentStatus, C]);

  if (!FeatureFlags.payments) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.navBar, { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <Pressable style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </Pressable>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>Payment Record</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.disabledContainer}>
          <Feather name="alert-triangle" size={44} color={C.warning} />
          <Text style={[styles.disabledTitle, { color: C.textPrimary }]}>Payments Disabled</Text>
          <Text style={[styles.disabledText, { color: C.textMuted }]}>{disabledFeatureMessage.payments}</Text>
        </View>
      </View>
    );
  }

  if (loadingPayment) {
    return (
      <View style={[styles.container, styles.loadingCenter, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading escrow receipt...</Text>
      </View>
    );
  }

  const effectivePrice = payment?.amount ?? request?.price ?? 0;
  const txDate = payment?.createdAt
    ? new Date(payment.createdAt)
    : request?.createdAt
    ? new Date(request.createdAt)
    : new Date();

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]}
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {payment ? 'Digital Escrow Receipt' : 'Escrow Checkout'}
          </Text>
          <Text style={[styles.navSubtitle, { color: C.textMuted }]}>
            {receiptNumber}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]}
            onPress={handleShareReceipt}
            hitSlop={8}
          >
            <Feather name="share-2" size={17} color={C.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Official Perforated Escrow Receipt Card ───────────────────── */}
        <View style={[styles.receiptCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <LinearGradient
            colors={statusConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Receipt Header Badge */}
          <View style={styles.receiptTopHeader}>
            <View style={styles.brandRow}>
              <View style={[styles.brandIconBox, { backgroundColor: C.primaryDark }]}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.brandName, { color: C.textPrimary }]}>CarryGo Escrow</Text>
                <Text style={[styles.brandSub, { color: C.textMuted }]}>Official Escrow Voucher</Text>
              </View>
            </View>

            {/* Status Pill */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
              <Feather name={statusConfig.icon} size={12} color={statusConfig.badgeColor} />
              <Text style={[styles.statusBadgeText, { color: statusConfig.badgeColor }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Big Amount */}
          <View style={styles.amountSection}>
            <Text style={[styles.amountLabel, { color: C.textMuted }]}>TOTAL ESCROW VALUE</Text>
            <Text style={[styles.amountText, { color: C.textPrimary }]}>
              {formatAmount(effectivePrice)}
            </Text>
            <Text style={[styles.statusDesc, { color: C.textSecondary }]}>
              {statusConfig.desc}
            </Text>
          </View>

          {/* Perforated Divider */}
          <View style={styles.perforationWrapper}>
            <View style={[styles.notch, styles.notchLeft, { backgroundColor: C.background }]} />
            <View style={[styles.dashedLine, { borderColor: C.surfaceBorder }]} />
            <View style={[styles.notch, styles.notchRight, { backgroundColor: C.background }]} />
          </View>

          {/* Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>RECEIPT NO.</Text>
              <Pressable style={styles.copyIdRow} onPress={handleCopyReceiptId}>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>{receiptNumber}</Text>
                <Feather
                  name={copiedId ? 'check' : 'copy'}
                  size={12}
                  color={copiedId ? C.success : C.primary}
                />
              </Pressable>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>DATE & TIME</Text>
              <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                {txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>PAYMENT METHOD</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="credit-card" size={12} color={C.textSecondary} />
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>Razorpay 256-Bit Escrow</Text>
              </View>
            </View>

            {payment?.razorpayPaymentId ? (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>GATEWAY TXN REF</Text>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                  {payment.razorpayPaymentId}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Route & Parties Card ─────────────────────────────────────── */}
        {request ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
            <View style={styles.cardHeader}>
              <Feather name="map-pin" size={16} color={C.primary} />
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Delivery Route</Text>
            </View>

            {/* Route Visual */}
            <View style={[styles.routeRow, { backgroundColor: C.surfaceElevated }]}>
              <View style={styles.cityPill}>
                <View style={[styles.cityDot, { backgroundColor: C.success }]} />
                <Text style={[styles.cityName, { color: C.textPrimary }]}>{request.fromCity || 'Origin'}</Text>
              </View>
              <View style={styles.routeArrow}>
                <Feather name="arrow-right" size={16} color={C.primary} />
              </View>
              <View style={styles.cityPill}>
                <View style={[styles.cityDot, { backgroundColor: C.error }]} />
                <Text style={[styles.cityName, { color: C.textPrimary }]}>{request.toCity || 'Destination'}</Text>
              </View>
            </View>

            {/* Sender & Traveler Rows */}
            <View style={styles.partiesGrid}>
              <View style={[styles.partyCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={[styles.partyAvatar, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.partyAvatarText, { color: C.primary }]}>
                    {(request.senderName || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyRole, { color: C.textMuted }]}>SENDER</Text>
                  <Text style={[styles.partyName, { color: C.textPrimary }]} numberOfLines={1}>
                    {request.senderName || 'Verified Sender'}
                  </Text>
                  {isSender && (
                    <Text style={[styles.youBadge, { color: C.primary }]}>You</Text>
                  )}
                </View>
              </View>

              <View style={[styles.partyCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={[styles.partyAvatar, { backgroundColor: C.accentSubtle }]}>
                  <Text style={[styles.partyAvatarText, { color: C.accent }]}>
                    {(request.travellerName || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyRole, { color: C.textMuted }]}>TRAVELER</Text>
                  <Text style={[styles.partyName, { color: C.textPrimary }]} numberOfLines={1}>
                    {request.travellerName || 'Verified Traveler'}
                  </Text>
                  {isTraveller && (
                    <Text style={[styles.youBadge, { color: C.accent }]}>You</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Financial Itemized Breakdown Card ────────────────────────── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <View style={styles.cardHeader}>
            <Feather name="file-text" size={16} color={C.primary} />
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Itemized Breakdown</Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={[styles.itemLabel, { color: C.textSecondary }]}>Traveler Delivery Fee</Text>
            <Text style={[styles.itemVal, { color: C.textPrimary }]}>{formatAmount(effectivePrice)}</Text>
          </View>

          <View style={styles.itemRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.itemLabel, { color: C.textSecondary }]}>Escrow Protection Guarantee</Text>
              <MaterialIcons name="verified" size={13} color={C.success} />
            </View>
            <Text style={[styles.itemVal, { color: C.success }]}>Free (₹0)</Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={[styles.itemLabel, { color: C.textSecondary }]}>Payment Gateway Charges</Text>
            <Text style={[styles.itemVal, { color: C.success }]}>Waived (₹0)</Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: C.surfaceBorder }]}>
            <Text style={[styles.totalLabel, { color: C.textPrimary }]}>Total Amount Paid</Text>
            <Text style={[styles.totalVal, { color: C.primary }]}>{formatAmount(effectivePrice)}</Text>
          </View>
        </View>

        {/* ── Escrow Timeline / Guarantee Card ─────────────────────────── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <View style={styles.cardHeader}>
            <Feather name="shield" size={16} color={C.primary} />
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Escrow Safety Protocol</Text>
          </View>

          <View style={styles.timeline}>
            <TimelineStep
              number="1"
              title="Escrow Deposit"
              desc="Funds locked safely. Traveler does not get paid yet."
              status={paymentStatus !== 'unpaid' ? 'done' : 'current'}
              C={C}
            />
            <TimelineStep
              number="2"
              title="Parcel Transit"
              desc="Traveler carries package safely along their route."
              status={
                paymentStatus === 'released'
                  ? 'done'
                  : paymentStatus === 'locked'
                  ? 'current'
                  : 'pending'
              }
              C={C}
            />
            <TimelineStep
              number="3"
              title="OTP Delivery Verification"
              desc="Sender/recipient inspects package & gives secret OTP."
              status={paymentStatus === 'released' ? 'done' : 'pending'}
              C={C}
            />
            <TimelineStep
              number="4"
              title="Payout Released"
              desc="Payment transferred instantly into traveler's account."
              status={paymentStatus === 'released' ? 'done' : 'pending'}
              isLast
              C={C}
            />
          </View>
        </View>

        {/* ── Sender Pay Button (If Unpaid) ────────────────────────────── */}
        {!payment && isSender ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.primary + '44' }, S.card]}>
            {error ? <Text style={[styles.errorText, { color: C.error }]}>{error}</Text> : null}

            {/* PAN notice if needed */}
            {!user?.isPanVerified ? (
              <Pressable
                style={[styles.panNotice, { backgroundColor: C.accentSubtle, borderColor: C.accent + '33' }]}
                onPress={() => setIsPanModalVisible(true)}
              >
                <MaterialIcons name="security" size={16} color={C.accent} />
                <Text style={[styles.panNoticeText, { color: C.textPrimary }]}>
                  One-time PAN verification required before checkout.{' '}
                  <Text style={{ color: C.accent, fontWeight: FontWeight.bold }}>Verify now →</Text>
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.panVerifiedRow, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="verified" size={14} color={C.success} />
                <Text style={[styles.panVerifiedText, { color: C.textSecondary }]}>
                  PAN Verified ({user?.panMasked || 'Active'})
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleInitiatePayment}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.payButtonWrap,
                pressed && { opacity: 0.88 },
                isLoading && { opacity: 0.65 },
              ]}
            >
              <LinearGradient
                colors={[C.primary, C.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.payButton}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.payButtonText}>
                      {isCreatingOrder ? 'Creating order...' : isVerifying ? 'Verifying...' : 'Processing...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Feather name="lock" size={17} color="#fff" />
                    <Text style={styles.payButtonText}>Pay & Lock {formatAmount(effectivePrice)} in Escrow</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {/* ── Quick Footer Action Buttons ──────────────────────────────── */}
        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { backgroundColor: C.surfaceElevated },
            ]}
            onPress={handleCopyReceiptId}
          >
            <Feather name={copiedId ? 'check' : 'copy'} size={15} color={copiedId ? C.success : C.primary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>
              {copiedId ? 'Copied!' : 'Copy Receipt ID'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { backgroundColor: C.surfaceElevated },
            ]}
            onPress={handleShareReceipt}
          >
            <Feather name="share-2" size={15} color={C.primary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Share Receipt</Text>
          </Pressable>
        </View>

        {/* Dispute / Help Banner */}
        <Pressable
          style={[styles.helpCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
          onPress={() => router.push('/support')}
        >
          <Feather name="help-circle" size={16} color={C.textMuted} />
          <Text style={[styles.helpCardText, { color: C.textSecondary }]}>
            Have questions about this transaction?{' '}
            <Text style={{ color: C.primary, fontWeight: FontWeight.bold }}>Contact Support</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* PAN Verification Modal */}
      <PanVerificationModal
        visible={isPanModalVisible}
        onClose={() => setIsPanModalVisible(false)}
        onSuccess={() => startCheckout()}
      />
    </View>
  );
}

function TimelineStep({
  number,
  title,
  desc,
  status,
  isLast,
  C,
}: {
  number: string;
  title: string;
  desc: string;
  status: 'done' | 'current' | 'pending';
  isLast?: boolean;
  C: ReturnType<typeof useThemeColors>['C'];
}) {
  const isDone = status === 'done';
  const isCurrent = status === 'current';

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndicatorCol}>
        <View
          style={[
            styles.stepCircle,
            isDone && { backgroundColor: C.success },
            isCurrent && { backgroundColor: C.warning, borderColor: C.warning + '55', borderWidth: 3 },
            !isDone && !isCurrent && { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1 },
          ]}
        >
          {isDone ? (
            <Feather name="check" size={12} color="#fff" />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                { color: isCurrent ? '#fff' : C.textMuted },
              ]}
            >
              {number}
            </Text>
          )}
        </View>
        {!isLast && (
          <View
            style={[
              styles.stepLine,
              { backgroundColor: isDone ? C.success : C.surfaceBorder },
            ]}
          />
        )}
      </View>
      <View style={styles.stepTextCol}>
        <Text
          style={[
            styles.stepTitle,
            { color: isDone || isCurrent ? C.textPrimary : C.textMuted },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.stepDesc, { color: C.textSecondary }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  // Navigation
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  navSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },

  // Perforated Receipt Card
  receiptCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md + 2,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  brandSub: {
    fontSize: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // Amount
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  amountText: {
    fontSize: 34,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  statusDesc: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 280,
    lineHeight: 16,
  },

  // Perforation
  perforationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    position: 'relative',
  },
  notch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: -9,
    zIndex: 2,
  },
  notchLeft: { left: -Spacing.md - 11 },
  notchRight: { right: -Spacing.md - 11 },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: Spacing.xs,
  },

  // Meta Grid
  metaGrid: {
    gap: Spacing.sm + 2,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  copyIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  // General Card
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Route
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  routeArrow: {
    paddingHorizontal: 8,
  },

  // Parties
  partiesGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  partyCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  partyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  partyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  youBadge: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  // Itemized
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemLabel: {
    fontSize: FontSize.xs,
  },
  itemVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  totalVal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },

  // Timeline
  timeline: {
    paddingLeft: Spacing.xs,
    gap: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 24,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 22,
    marginVertical: 2,
  },
  stepTextCol: {
    flex: 1,
    paddingBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  stepDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Pay Button & PAN
  panNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  panNoticeText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  panVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  panVerifiedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  payButtonWrap: {
    borderRadius: BorderRadius.lg,
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
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  errorText: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },

  // Footer Actions
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  helpCardText: {
    fontSize: FontSize.xs,
  },

  // Disabled
  disabledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  disabledTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  disabledText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  loadingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
});
