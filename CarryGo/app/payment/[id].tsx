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
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  StatusBarGeometry,
} from '@/constants/theme';
import { fetchPaymentByRequestOrId, resolveRequestId } from '@/services/payments.service';
import { Payment, PaymentStatus } from '@/types';
import { useAlert } from '@/template';
import { FeatureFlags, disabledFeatureMessage } from '@/constants/featureFlags';
import { useRequestQuery } from '@/features/requests/queries';
import { useConversationsQuery } from '@/features/conversations/queries';
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
  const { C } = useThemeColors();
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
        .subscribe();
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
  const { data: conversations } = useConversationsQuery(user?.id);

  const isSender = user?.id && request?.senderId ? user.id === request.senderId : true;
  const isTraveller = user?.id && request?.travellerId ? user.id === request.travellerId : false;
  const isAccepted = request?.status === 'accepted';
  const isCompleted = request?.status === 'completed' || payment?.status === 'released';

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
    onSuccess: () => {
      Haptic.success();
      router.replace({ pathname: '/delivery/[id]', params: { id: effectiveRequestId } });
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
    const cleanId = String(effectiveRequestId || '').trim();
    return cleanId ? `CG-REQ-${cleanId.slice(0, 8).toUpperCase()}` : 'CG-REQ-PENDING';
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
        title: `CaryGoo Booking Receipt • ${receiptNumber}`,
        message:
          `📦 CaryGoo Booking Payment Receipt\n` +
          `Ref ID: ${receiptNumber}\n` +
          `Route: ${fromCity} ➔ ${toCity}\n` +
          `Amount: ${amountStr}\n` +
          `Status: ${isPaid ? (isCompleted ? 'COMPLETED & RELEASED' : 'PAID & BOOKED') : 'PENDING PAYMENT'}\n` +
          `Protected by CaryGoo 100% Booking Guarantee.`,
      });
    } catch {}
  };

  const handleOpenChat = () => {
    Haptic.tap();
    const conv = conversations?.find((c) => c.requestId === effectiveRequestId);
    if (conv?.id) {
      router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    } else {
      router.push('/(tabs)/messages');
    }
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
        <View style={[styles.navBar, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top), backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <Pressable style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </Pressable>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>Payment Status</Text>
          <View style={{ width: 38 }} />
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
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading payment status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top),
            backgroundColor: C.surface,
            borderBottomColor: C.surfaceBorder,
          },
        ]}
      >
        <Pressable
          style={[styles.iconButton, { backgroundColor: C.surfaceElevated }]}
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          hitSlop={TouchTarget.smallHitSlop}
        >
          <Feather name="arrow-left" size={19} color={C.textPrimary} />
        </Pressable>

        <View style={styles.navTitleCol}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isPaid ? 'Booking Receipt' : 'Payment Status'}
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Minimalist Status Hero ─────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Status Halo Icon & Capsule */}
          <View style={styles.heroStatusWrap}>
            {isPaid ? (
              <View style={[styles.heroIconCircle, { backgroundColor: C.successSubtle }]}>
                <Ionicons
                  name={isCompleted ? 'checkmark-done-circle' : 'shield-checkmark'}
                  size={32}
                  color={C.success}
                />
              </View>
            ) : canPay ? (
              <View style={[styles.heroIconCircle, { backgroundColor: C.primarySubtle }]}>
                <Ionicons name="lock-closed" size={28} color={C.primary} />
              </View>
            ) : (
              <View style={[styles.heroIconCircle, { backgroundColor: C.warningSubtle }]}>
                <Ionicons name="time" size={28} color={C.warning} />
              </View>
            )}

            {/* Pill Capsule */}
            <View
              style={[
                styles.statusCapsule,
                {
                  backgroundColor: isPaid
                    ? C.successSubtle
                    : canPay
                    ? C.primarySubtle
                    : C.warningSubtle,
                  borderColor: isPaid
                    ? C.successBorder
                    : canPay
                    ? C.primaryBorder
                    : C.warningBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isPaid
                      ? C.success
                      : canPay
                      ? C.primary
                      : C.warning,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusCapsuleText,
                  {
                    color: isPaid
                      ? C.success
                      : canPay
                      ? C.primary
                      : C.warning,
                  },
                ]}
              >
                {isPaid
                  ? isCompleted
                    ? 'COMPLETED & RELEASED'
                    : 'PAID & BOOKED'
                  : canPay
                  ? 'PAYMENT REQUIRED'
                  : isAccepted
                  ? 'AWAITING SENDER DEPOSIT'
                  : 'OFFER PENDING ACCEPTANCE'}
              </Text>
            </View>
          </View>

          {/* Amount Spotlight */}
          <View style={styles.amountWrap}>
            <Text style={[styles.amountLabel, { color: C.textMuted }]}>
              {isPaid ? 'AMOUNT PAID & BOOKED' : 'AMOUNT PAYABLE'}
            </Text>
            <Text style={[styles.amountValue, { color: C.textPrimary }]}>
              {formatAmount(effectivePrice)}
            </Text>
          </View>

          {/* Calm, Reassuring Subtitle */}
          <Text style={[styles.heroSubtext, { color: C.textSecondary }]}>
            {isPaid
              ? isCompleted
                ? 'Delivery confirmed. Funds were successfully paid to the traveler.'
                : 'Held safely by CaryGoo. Funds are released only after delivery PIN confirmation.'
              : canPay
              ? 'Complete payment to confirm and book your parcel delivery.'
              : isAccepted
              ? 'The sender must complete the booking payment before transit begins.'
              : 'Payment will unlock as soon as both parties accept the delivery request.'}
          </Text>
        </View>

        {/* ── Visual Booking Timeline Stepper ─────────────────────────── */}
        <View style={[styles.stepperCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            Booking Protection Lifecycle
          </Text>

          <View style={styles.stepperContainer}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isPaid
                      ? C.success
                      : canPay
                      ? C.primary
                      : C.surfaceElevated,
                    borderColor: isPaid
                      ? C.success
                      : canPay
                      ? C.primary
                      : C.surfaceBorder,
                  },
                ]}
              >
                {isPaid ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepBadgeNum,
                      { color: canPay ? '#fff' : C.textMuted },
                    ]}
                  >
                    1
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: isPaid ? C.textPrimary : C.textSecondary }]}>
                Funds Locked
              </Text>
              <Text style={[styles.stepSub, { color: C.textMuted }]}>
                {isPaid ? 'Secured' : 'Step 1'}
              </Text>
            </View>

            <View
              style={[
                styles.stepConnector,
                { backgroundColor: isPaid ? C.success : C.surfaceBorder },
              ]}
            />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isCompleted
                      ? C.success
                      : isPaid
                      ? C.primary
                      : C.surfaceElevated,
                    borderColor: isCompleted
                      ? C.success
                      : isPaid
                      ? C.primary
                      : C.surfaceBorder,
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepBadgeNum,
                      { color: isPaid ? '#fff' : C.textMuted },
                    ]}
                  >
                    2
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: isPaid ? C.textPrimary : C.textSecondary }]}>
                Live Transit
              </Text>
              <Text style={[styles.stepSub, { color: C.textMuted }]}>
                {isPaid ? (isCompleted ? 'Finished' : 'In Progress') : 'Pending'}
              </Text>
            </View>

            <View
              style={[
                styles.stepConnector,
                { backgroundColor: isCompleted ? C.success : C.surfaceBorder },
              ]}
            />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isCompleted ? C.success : C.surfaceElevated,
                    borderColor: isCompleted ? C.success : C.surfaceBorder,
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepBadgeNum, { color: C.textMuted }]}>3</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: isCompleted ? C.textPrimary : C.textSecondary }]}>
                PIN Payout
              </Text>
              <Text style={[styles.stepSub, { color: C.textMuted }]}>
                {isCompleted ? 'Released' : 'Final Step'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Official Booking Receipt Card ───────────────────────────── */}
        <View style={[styles.receiptCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Route Overview */}
          {request ? (
            <View style={[styles.routeRow, { backgroundColor: C.surfaceElevated }]}>
              <View style={styles.routeCityCol}>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>FROM</Text>
                <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.fromCity || 'Origin'}
                </Text>
              </View>

              <View style={styles.routeArrowBox}>
                <MaterialIcons name="arrow-forward" size={16} color={C.primary} />
              </View>

              <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>TO</Text>
                <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.toCity || 'Destination'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Participants */}
          {request ? (
            <View style={[styles.participantsRow, { borderBottomColor: C.surfaceBorder }]}>
              {/* Sender */}
              <View style={styles.participantItem}>
                <View style={[styles.avatarCircle, { backgroundColor: C.primarySubtle }]}>
                  {request.senderAvatar ? (
                    <Image source={{ uri: request.senderAvatar }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: C.primary }]}>
                      {(request.senderName || 'S').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.participantRole, { color: C.textMuted }]}>SENDER</Text>
                  <Text style={[styles.participantName, { color: C.textPrimary }]} numberOfLines={1}>
                    {request.senderName || 'Sender'}
                  </Text>
                </View>
              </View>

              <View style={[styles.verticalDivider, { backgroundColor: C.surfaceBorder }]} />

              {/* Traveler */}
              <View style={styles.participantItem}>
                <View style={[styles.avatarCircle, { backgroundColor: C.successSubtle }]}>
                  {request.travellerAvatar ? (
                    <Image source={{ uri: request.travellerAvatar }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: C.success }]}>
                      {(request.travellerName || 'T').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.participantRole, { color: C.textMuted }]}>TRAVELER</Text>
                  <Text style={[styles.participantName, { color: C.textPrimary }]} numberOfLines={1}>
                    {request.travellerName || 'Traveler'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Breakdown Items */}
          <View style={styles.breakdownList}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>Carrier Delivery Reward</Text>
              <Text style={[styles.breakdownValue, { color: C.textPrimary }]}>
                {formatAmount(effectivePrice)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>Booking Protection Guarantee</Text>
                <Ionicons name="shield-checkmark" size={13} color={C.success} />
              </View>
              <Text style={[styles.breakdownFree, { color: C.success }]}>Included (₹0)</Text>
            </View>

            <View style={[styles.breakdownDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.breakdownRow}>
              <Text style={[styles.totalLabel, { color: C.textPrimary }]}>Total Booking Amount</Text>
              <Text style={[styles.totalValue, { color: C.primary }]}>
                {formatAmount(effectivePrice)}
              </Text>
            </View>
          </View>

          {/* Transaction Metadata Footer */}
          <View style={[styles.metaBlock, { backgroundColor: C.surfaceElevated, borderTopColor: C.surfaceBorder }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>Receipt Ref</Text>
              <Pressable style={styles.copyRow} onPress={handleCopyReceiptId} hitSlop={TouchTarget.smallHitSlop}>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>{receiptNumber}</Text>
                <Feather
                  name={copiedId ? 'check' : 'copy'}
                  size={12}
                  color={copiedId ? C.success : C.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>Timestamp</Text>
              <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                {txDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                •{' '}
                {txDate.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {payment?.razorpayPaymentId ? (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>Gateway Ref</Text>
                <Text style={[styles.metaValue, { color: C.textPrimary }]}>
                  {payment.razorpayPaymentId}
                </Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: C.textMuted }]}>Protection</Text>
              <Text style={[styles.metaValue, { color: C.success }]}>
                100% Booking Insured
              </Text>
            </View>
          </View>
        </View>

        {/* ── Contextual Primary Actions ─────────────────────────────── */}
        {isPaid ? (
          <View style={styles.actionBlock}>
            <Pressable
              onPress={() => {
                Haptic.confirm();
                router.push({ pathname: '/delivery/[id]', params: { id: effectiveRequestId } });
              }}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
            >
              <View style={styles.livePulseDot} />
              <Ionicons name="map-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Track Live Delivery</Text>
              <Feather name="arrow-right" size={17} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
            </Pressable>

            <Pressable
              onPress={handleOpenChat}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="chatbubble-outline" size={17} color={C.textPrimary} />
              <Text style={[styles.secondaryActionText, { color: C.textPrimary }]}>
                {isSender ? 'Chat with Traveler' : 'Chat with Sender'}
              </Text>
            </Pressable>
          </View>
        ) : canPay ? (
          <View style={styles.actionBlock}>
            <Pressable
              onPress={handleInitiatePayment}
              disabled={isCreatingOrder || isVerifying}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                (isCreatingOrder || isVerifying) && { opacity: 0.75 },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
            >
              {isCreatingOrder || isVerifying ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    {isCreatingOrder ? 'Preparing Secure Gateway...' : 'Verifying Payment...'}
                  </Text>
                </>
              ) : error ? (
                <>
                  <Feather name="refresh-cw" size={17} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    Retry Payment • {formatAmount(effectivePrice)}
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="lock" size={17} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    Pay & Book {formatAmount(effectivePrice)}
                  </Text>
                  <Feather name="arrow-right" size={17} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
                </>
              )}
            </Pressable>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder }]}>
                <Feather name="alert-circle" size={15} color={C.error} />
                <Text style={[styles.errorText, { color: C.error, flex: 1 }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.trustNote}>
              <Feather name="shield" size={13} color={C.success} />
              <Text style={[styles.trustNoteText, { color: C.textMuted }]}>
                100% money-back guarantee • Full refund if the trip is cancelled before pickup.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.actionBlock}>
            <Pressable
              onPress={handleOpenChat}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>
                {isSender ? 'Coordinate with Traveler' : 'Coordinate with Sender'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Minimal Utility Actions ─────────────────────────────────── */}
        <View style={styles.utilityRow}>
          <Pressable
            style={[styles.utilityBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={handleCopyReceiptId}
          >
            <Feather
              name={copiedId ? 'check' : 'copy'}
              size={13}
              color={copiedId ? C.success : C.textSecondary}
            />
            <Text style={[styles.utilityBtnText, { color: C.textPrimary }]}>
              {copiedId ? 'Copied Ref' : 'Copy Ref'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.utilityBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={handleShareReceipt}
          >
            <Feather name="share-2" size={13} color={C.textSecondary} />
            <Text style={[styles.utilityBtnText, { color: C.textPrimary }]}>Share Receipt</Text>
          </Pressable>

          <Pressable
            style={[styles.utilityBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={() => router.push('/support')}
          >
            <Feather name="help-circle" size={13} color={C.textSecondary} />
            <Text style={[styles.utilityBtnText, { color: C.textPrimary }]}>Support</Text>
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

  // Navigation Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitleCol: {
    alignItems: 'center',
    gap: 2,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroStatusWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCapsuleText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  amountWrap: {
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.6,
  },
  heroSubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  // Stepper Card
  stepperCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.mdl,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNum: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 10,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginTop: -20,
    borderRadius: 1,
  },

  // Receipt Card
  receiptCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  routeCityCol: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  routeCity: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  routeArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Participants
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  participantItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  participantRole: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  participantName: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  verticalDivider: {
    width: 1,
    height: 30,
  },

  // Breakdown
  breakdownList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
  },
  breakdownFree: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: FontWeight.extrabold,
  },

  // Metadata Footer
  metaBlock: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  // Action Block
  actionBlock: {
    gap: Spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
  },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    marginTop: 2,
  },
  trustNoteText: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Utility Buttons
  utilityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  utilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  utilityBtnText: {
    fontSize: 11,
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
