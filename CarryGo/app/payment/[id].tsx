import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  TouchTarget,
} from '@/constants/theme';
import { fetchPaymentByRequestOrId, resolveRequestId } from '@/services/payments.service';
import { Payment, PaymentStatus } from '@/types';
import { useAlert } from '@/template';
import { FeatureFlags, disabledFeatureMessage } from '@/constants/featureFlags';
import { useRequestQuery } from '@/features/requests/queries';
import { useAuth } from '@/hooks/useAuth';
import { Haptic } from '@/services/haptics.service';
import { getSupabaseClient } from '@/template';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';

function formatAmount(amount?: number | null): string {
  if (amount == null) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

let paymentChannelInstance = 0;

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [resolvedId, setResolvedId] = useState<string>(id || '');
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const loadPayment = async () => {
      setLoadingPayment(true);
      const targetRequestId = await resolveRequestId(id);
      if (isMounted && targetRequestId) {
        setResolvedId(targetRequestId);
      }

      const { data } = await fetchPaymentByRequestOrId(targetRequestId || id);
      if (!isMounted) return;

      if (data) {
        setPayment(data);
        if (data.requestId) {
          setResolvedId(data.requestId);
        }
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

  const effectiveRequestId = payment?.requestId || resolvedId || id;
  const { data: request } = useRequestQuery(effectiveRequestId);

  const isSender = user?.id && request?.senderId ? user.id === request.senderId : true;
  const isTraveller = user?.id && request?.travellerId ? user.id === request.travellerId : false;
  const isAccepted = request?.status === 'accepted';

  const paymentStatus: PaymentStatus | 'unpaid' = payment
    ? (payment.status as PaymentStatus)
    : 'unpaid';

  const isPaid = paymentStatus === 'locked' || paymentStatus === 'released';
  const canPay = !isPaid && isSender && isAccepted;

  const {
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
      // Refresh local record
      void fetchPaymentByRequestOrId(effectiveRequestId).then(res => {
        if (res.data) setPayment(res.data);
      });
    },
    onFailure: (message) => {
      Haptic.warning();
      showAlert('Payment Incomplete', message);
    },
  });

  const handleInitiatePayment = () => {
    Haptic.select();
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

    try {
      await Share.share({
        title: `CarryGo Escrow Receipt - ${receiptNumber}`,
        message:
          `📦 CarryGo Official Escrow Receipt\n` +
          `Receipt ID: ${receiptNumber}\n` +
          `Route: ${fromCity} ➔ ${toCity}\n` +
          `Amount: ${amountStr}\n` +
          `Status: ${isPaid ? 'LOCKED IN ESCROW' : 'PENDING PAYMENT'}`,
      });
    } catch {}
  };

  const effectivePrice = payment?.amount ?? request?.price ?? 100;
  const txDate = payment?.createdAt
    ? new Date(payment.createdAt)
    : request?.createdAt
    ? new Date(request.createdAt)
    : new Date();

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
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading payment details...</Text>
      </View>
    );
  }

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
          hitSlop={TouchTarget.smallHitSlop}
        >
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isPaid ? 'Escrow Receipt' : 'Escrow Payment'}
          </Text>
          <Text style={[styles.navSubtitle, { color: C.textMuted }]}>
            {receiptNumber}
          </Text>
        </View>

        <Pressable
          style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]}
          onPress={handleShareReceipt}
          hitSlop={TouchTarget.smallHitSlop}
        >
          <Feather name="share-2" size={17} color={C.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Minimalist Hero Card ─────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isPaid ? C.successSubtle : C.warningSubtle,
                  borderColor: isPaid ? C.successBorder : C.warningBorder,
                },
              ]}
            >
              <Ionicons
                name={isPaid ? 'shield-checkmark' : 'time-outline'}
                size={14}
                color={isPaid ? C.primary : C.warning}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isPaid ? C.primary : C.warning },
                ]}
              >
                {paymentStatus === 'released'
                  ? 'Released to Traveler'
                  : paymentStatus === 'locked'
                  ? 'Locked in Escrow'
                  : 'Awaiting Escrow Payment'}
              </Text>
            </View>
          </View>

          {/* Traveller Strip — trust signal before payment */}
          {request && isSender && request.travellerName ? (
            <View style={[styles.travellerStrip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              {request.travellerAvatar ? (
                <Image source={{ uri: request.travellerAvatar }} style={styles.travellerAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.travellerAvatar, styles.travellerAvatarFallback, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.travellerAvatarInitial, { color: C.primary }]}>
                    {(request.travellerName || 'T').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.travellerInfo}>
                <Text style={[styles.travellerLabel, { color: C.textMuted }]}>PAYING</Text>
                <View style={styles.travellerNameRow}>
                  <Text style={[styles.travellerName, { color: C.textPrimary }]} numberOfLines={1}>
                    {request.travellerName}
                  </Text>
                  <Ionicons name="shield-checkmark" size={12} color={C.primary} />
                </View>
              </View>
            </View>
          ) : null}

          {/* Amount Spotlight */}
          <View style={styles.amountSection}>
            <Text style={[styles.amountLabel, { color: C.textMuted }]}>ESCROW AMOUNT</Text>
            <Text style={[styles.amountText, { color: C.textPrimary }]}>
              {formatAmount(effectivePrice)}
            </Text>
          </View>

          {/* Route Strip */}
          {request ? (
            <View style={[styles.routePill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.cityWrap}>
                <View style={[styles.cityDot, { backgroundColor: C.primary }]} />
                <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.fromCity || 'Origin'}
                </Text>
              </View>
              <Feather name="arrow-right" size={14} color={C.textMuted} />
              <View style={styles.cityWrap}>
                <View style={[styles.cityDot, { backgroundColor: C.primary }]} />
                <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.toCity || 'Destination'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Clean Key Details */}
          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>Receipt Ref</Text>
              <Pressable style={styles.copyRow} onPress={handleCopyReceiptId} hitSlop={TouchTarget.smallHitSlop}>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>{receiptNumber}</Text>
                <Feather
                  name={copiedId ? 'check' : 'copy'}
                  size={12}
                  color={copiedId ? C.primary : C.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>Date</Text>
              <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                {txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            {payment?.razorpayPaymentId ? (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>Payment ID</Text>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                  {payment.razorpayPaymentId}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Primary Action: Pay Button / Escrow Status ────────────────── */}
        {isPaid ? (
          /* Locked in Escrow confirmation note */
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
            <View style={styles.lockedNoteRow}>
              <Ionicons name="checkmark-circle" size={18} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockedNoteTitle, { color: C.textPrimary }]}>
                  Payment Protected in Escrow
                </Text>
                <Text style={[styles.lockedNoteSub, { color: C.textMuted }]}>
                  Funds are safely locked. The traveler will receive payout upon OTP confirmation.
                </Text>
              </View>
            </View>
          </View>
        ) : !isAccepted ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
            <View style={styles.lockedNoteRow}>
              <Feather name="clock" size={18} color={C.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockedNoteTitle, { color: C.textPrimary }]}>
                  Awaiting Offer Acceptance
                </Text>
                <Text style={[styles.lockedNoteSub, { color: C.textMuted }]}>
                  Payment can only be deposited once this travel offer has been accepted by both parties.
                </Text>
              </View>
            </View>
          </View>
        ) : !isSender ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
            <View style={styles.lockedNoteRow}>
              <Feather name="info" size={18} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockedNoteTitle, { color: C.textPrimary }]}>
                  Awaiting Sender Escrow Deposit
                </Text>
                <Text style={[styles.lockedNoteSub, { color: C.textMuted }]}>
                  The sender will deposit ₹{Math.round(effectivePrice).toLocaleString('en-IN')} in escrow. You will be notified as soon as funds are secured.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.primaryBorder }, S.card]}>
            <Pressable
              onPress={handleInitiatePayment}
              disabled={isCreatingOrder || isVerifying}
              style={({ pressed }) => [
                styles.payButton,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                (isCreatingOrder || isVerifying) && { opacity: 0.7 },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
            >
              {isCreatingOrder || isVerifying ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.payButtonText}>
                    {isCreatingOrder ? 'Generating Razorpay Gateway...' : 'Verifying Payment...'}
                  </Text>
                </>
              ) : error ? (
                <>
                  <Feather name="refresh-cw" size={17} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>
                    Retry Payment • {formatAmount(effectivePrice)}
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="lock" size={17} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>
                    Pay & Lock {formatAmount(effectivePrice)} in Escrow
                  </Text>
                </>
              )}
            </Pressable>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: C.errorSubtle || C.error + '15', borderColor: C.error + '55' }]}>
                <Feather name="alert-circle" size={14} color={C.error} />
                <Text style={[styles.errorText, { color: C.error, flex: 1 }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.securityNote}>
              <Feather name="shield" size={13} color={C.primary} />
              <Text style={[styles.securityText, { color: C.textMuted }]}>
                Protected by CarryGo Escrow • Funds released only after delivery verification
              </Text>
            </View>
          </View>
        )}

        {/* ── Footer Quick Actions ─────────────────────────────────────── */}
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.footerBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={handleCopyReceiptId}
          >
            <Feather name={copiedId ? 'check' : 'copy'} size={14} color={copiedId ? C.primary : C.textSecondary} />
            <Text style={[styles.footerBtnText, { color: C.textPrimary }]}>
              {copiedId ? 'Copied' : 'Copy ID'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.footerBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={handleShareReceipt}
          >
            <Feather name="share-2" size={14} color={C.textSecondary} />
            <Text style={[styles.footerBtnText, { color: C.textPrimary }]}>Share Receipt</Text>
          </Pressable>

          <Pressable
            style={[styles.footerBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={() => router.push('/support')}
          >
            <Feather name="help-circle" size={14} color={C.textSecondary} />
            <Text style={[styles.footerBtnText, { color: C.textPrimary }]}>Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  navSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  travellerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  travellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  travellerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  travellerAvatarInitial: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  travellerInfo: {
    flex: 1,
    gap: 1,
  },
  travellerLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  travellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  travellerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    flexShrink: 1,
  },
  amountSection: {
    alignItems: 'center',
    marginVertical: Spacing.sm + 2,
    gap: 2,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  amountText: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cityName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  metaList: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.sm + 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: FontSize.xs,
  },
  metaValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.md,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  errorText: {
    fontSize: FontSize.xs,
    textAlign: 'left',
    fontWeight: FontWeight.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  securityText: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
  lockedNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  lockedNoteTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  lockedNoteSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  disabledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  disabledTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  disabledText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
