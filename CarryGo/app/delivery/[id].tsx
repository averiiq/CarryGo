import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  ActivityIndicator, Animated, Platform, KeyboardAvoidingView,
  AppState, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import DeliveryMap from '@/components/feature/DeliveryMap';
import { useAuth } from '@/hooks/useAuth';
import { useRequestQuery } from '@/features/requests/queries';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RatingModal } from '@/components/feature/RatingModal';
import { DeliveryTimeline, DeliveryStep, STEPS, stepIndex } from '@/components/feature/DeliveryTimeline';
import {
  SenderPickupOtpCard,
  TravellerPickupActionCard,
  TravellerTripControlsCard,
  SenderLiveJourneyCard,
  DeliveryOtpActionCard,
  SenderOtpCard,
  DeliverySuccessCard,
} from '@/components/feature/DeliveryActionCards';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import {
  fetchDelivery,
  fetchOrCreateDelivery,
  createDelivery,
  getOrIssuePickupOtp,
  confirmPickupWithOtp,
  updateTripProgress,
  confirmDelivery,
  issueDeliveryOtp,
} from '@/services/deliveries.service';
import { getCurrentLocation, updateDeliveryLocation, fetchDeliveryLocation } from '@/services/location.service';
import { Delivery } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';

export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const requestQuery = useRequestQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [pickupOtp, setPickupOtp] = useState<string | null>(null);
  const [enteredPickupOtp, setEnteredPickupOtp] = useState('');
  const [enteredDeliveryOtp, setEnteredDeliveryOtp] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ userId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickupOtpLoading, setPickupOtpLoading] = useState(false);
  const [tripUpdateLoading, setTripUpdateLoading] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [travellerLocation, setTravellerLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null);

  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const request = requestQuery.data ?? null;
  const isTraveller = user?.id === request?.travellerId;
  const isSender = user?.id === request?.senderId;
  const isParticipant = Boolean(user?.id && (isTraveller || isSender));
  const deliveryId = delivery?.id;
  const step: DeliveryStep = (delivery?.status as DeliveryStep) || 'awaiting_pickup';

  // Find active chat conversation for this request
  const conversation = conversationsQuery.data?.find(c => c.requestId === id);

  const initDelivery = useCallback(async () => {
    if (!id || !request || !isParticipant) return;
    const { data } = await fetchOrCreateDelivery(id, user?.id);
    if (data) {
      setDelivery(data);
      if (data.pickupOtp) {
        setPickupOtp(data.pickupOtp);
      } else if (isSender && ((data.status as DeliveryStep) || 'awaiting_pickup') === 'awaiting_pickup') {
        // Auto-fetch/generate pickup code immediately for sender
        setPickupOtpLoading(true);
        const otpRes = await getOrIssuePickupOtp(data.id || id);
        setPickupOtpLoading(false);
        if (otpRes.data) setPickupOtp(otpRes.data);
      }
    }
  }, [id, isParticipant, isSender, request, user?.id]);

  useEffect(() => {
    if (!id || !request || !isParticipant) return;
    void initDelivery();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fadeAnim, id, initDelivery, isParticipant, request]);

  // If sender and awaiting pickup, ensure pickup OTP is ready to show
  useEffect(() => {
    if (!isSender || step !== 'awaiting_pickup') return;
    if (pickupOtp) return;

    let isMounted = true;
    void (async () => {
      setPickupOtpLoading(true);
      const targetId = delivery?.id || id;
      if (!targetId) return;
      const res = await getOrIssuePickupOtp(targetId);
      if (isMounted) {
        setPickupOtpLoading(false);
        if (res.data) setPickupOtp(res.data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [delivery?.id, id, isSender, step, pickupOtp]);

  // Poll traveller location (sender side) with AppState awareness
  useEffect(() => {
    if (!FeatureFlags.preciseLocationSharing || !deliveryId || !isSender || step === 'delivered') return;
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isAppActive = AppState.currentState === 'active';

    const poll = async () => {
      if (!isAppActive) return;
      try {
        const { data } = await fetchDeliveryLocation(deliveryId);
        if (data) {
          setTravellerLocation(data);
          consecutiveFailures = 0;
        }
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_FAILURES && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    void poll();
    intervalId = setInterval(poll, 15000);
    pollInterval.current = intervalId;

    const subscription = AppState.addEventListener('change', (nextState) => {
      isAppActive = nextState === 'active';
      if (isAppActive) {
        void poll();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      pollInterval.current = null;
      subscription.remove();
    };
  }, [deliveryId, isSender, step]);

  // Handle location sharing toggle for traveller
  const handleToggleLocation = async (enabled: boolean) => {
    if (!isTraveller || step !== 'in_transit') {
      showAlert('Not Allowed', 'Only the assigned traveller can share live location during transit.');
      return;
    }
    if (!FeatureFlags.preciseLocationSharing) {
      showAlert('Location Sharing Unavailable', disabledFeatureMessage.location);
      return;
    }
    if (!delivery) return;

    setLocationSharing(enabled);
    Haptic.select();

    if (!enabled) {
      if (locationInterval.current) clearInterval(locationInterval.current);
      locationInterval.current = null;
      return;
    }

    const updateLoc = async () => {
      if (AppState.currentState !== 'active') return true;
      const { data, error } = await getCurrentLocation();
      if (!data || !user?.id) {
        if (error) showAlert('Location Error', error);
        setLocationSharing(false);
        return false;
      }

      const update = await updateDeliveryLocation(delivery.id, data.lat, data.lng, user.id);
      if (update.error) {
        showAlert('Location Error', update.error);
        setLocationSharing(false);
        return false;
      }

      return true;
    };

    const started = await updateLoc();
    if (!started) {
      if (locationInterval.current) clearInterval(locationInterval.current);
      locationInterval.current = null;
      return;
    }

    locationInterval.current = setInterval(async () => {
      const ok = await updateLoc();
      if (!ok && locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
    }, 30000);
  };

  // SENDER: Refresh Pickup OTP
  const handleRefreshPickupOtp = async () => {
    if (!isSender) return;
    const targetId = delivery?.id || id;
    if (!targetId) return;
    setPickupOtpLoading(true);
    Haptic.tap();
    const res = await getOrIssuePickupOtp(targetId, true);
    setPickupOtpLoading(false);
    if (res.data) {
      setPickupOtp(res.data);
      Haptic.success();
    } else if (res.error) {
      showAlert('Error', res.error);
    }
  };

  // TRAVELLER: Confirm Pickup with entered 4-digit code
  const handleConfirmPickupWithOtp = async () => {
    if (!isTraveller || step !== 'awaiting_pickup') {
      showAlert('Not Allowed', 'Only the assigned traveller can confirm pickup.');
      return;
    }
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await confirmPickupWithOtp(targetId, enteredPickupOtp);
    setLoading(false);

    if (result.error || !result.data) {
      Haptic.error();
      showAlert('Verification Failed', result.error || 'Incorrect Pickup Code. Please re-check with the sender.');
      return;
    }

    setDelivery(result.data);
    Haptic.success();
    showAlert('Pickup Confirmed!', 'The parcel has been securely handed over. You can now start transit.');
  };

  // TRAVELLER: Update Trip Progress & Notes
  const handleUpdateTripDetails = async (statusText: string, noteText: string, etaText: string) => {
    const targetId = delivery?.id || id;
    if (!isTraveller || !targetId) return;
    setTripUpdateLoading(true);
    Haptic.tap();
    const res = await updateTripProgress(targetId, statusText, noteText, etaText);
    setTripUpdateLoading(false);

    if (res.error) {
      Haptic.error();
      showAlert('Update Failed', res.error);
      return;
    }

    // Refresh local delivery data
    setDelivery(prev => prev ? {
      ...prev,
      tripStatus: statusText,
      tripNote: noteText,
      etaText: etaText,
    } : null);
    Haptic.success();
    showAlert('Progress Updated', 'The sender can now see your latest transit stage & notes.');
  };

  // TRAVELLER: Confirm Final Delivery with 6-digit Delivery OTP
  const handleDeliveryOTP = async () => {
    if (!request) return;
    if (!isTraveller || step !== 'in_transit') {
      showAlert('Not Allowed', 'Only the assigned traveller can confirm delivery OTP.');
      return;
    }
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await confirmDelivery(targetId, enteredDeliveryOtp, user?.id);
    if (!result.success || !result.data) {
      setLoading(false);
      Haptic.error();
      showAlert('Delivery Not Confirmed', result.error || 'The delivery code could not be verified.');
      return;
    }
    setDelivery(result.data);
    await requestQuery.refetch();
    setLoading(false);
    Haptic.success();
    if (locationInterval.current) clearInterval(locationInterval.current);
    if (pollInterval.current) clearInterval(pollInterval.current);
    const target = isTraveller
      ? { userId: request.senderId, name: request.senderName }
      : { userId: request.travellerId, name: request.travellerName };
    setRatingTarget(target);
    setTimeout(() => setShowRating(true), 800);
  };

  // SENDER: Generate or Retrieve 6-digit Delivery OTP
  const handleIssueDeliveryOtp = async () => {
    if (!isSender || step !== 'in_transit') return;
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await issueDeliveryOtp(targetId);
    setLoading(false);
    if (result.error || !result.data) {
      showAlert('Code Unavailable', result.error || 'Could not generate a delivery code.');
      return;
    }
    setDeliveryOtp(result.data);
    Haptic.success();
  };

  const handleRateFromSuccess = () => {
    if (request) {
      const target = isTraveller
        ? { userId: request.senderId, name: request.senderName }
        : { userId: request.travellerId, name: request.travellerName };
      setRatingTarget(target);
      setShowRating(true);
    }
  };

  const handleOpenChat = () => {
    Haptic.tap();
    if (conversation?.id) {
      router.push(`/chat/${encodeURIComponent(String(conversation.id))}` as never);
    } else {
      showAlert('Chat', 'Open Messages tab to reach out.');
    }
  };

  if (requestQuery.isLoading) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <MaterialIcons name="error-outline" size={32} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Delivery Not Found</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>This delivery journey is unavailable.</Text>
      </View>
    );
  }

  if (!isParticipant) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <MaterialIcons name="lock-outline" size={32} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Access Restricted</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>Only sender and traveller can view this delivery flow.</Text>
      </View>
    );
  }

  return (
    <>
      {showRating && ratingTarget && request ? (
        <RatingModal
          visible={showRating}
          requestId={id}
          fromUserId={user?.id || ''}
          toUserId={ratingTarget.userId}
          toUserName={ratingTarget.name}
          onDone={() => setShowRating(false)}
        />
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          style={[styles.container, { backgroundColor: C.background }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Card customized per Role */}
          <View style={[styles.headerCard, { borderColor: C.surfaceBorder, backgroundColor: C.surface }]}>
            <View style={styles.headerTopRow}>
              <View style={[styles.headerIconWrap, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons
                  name={isSender ? 'radar' : 'local-shipping'}
                  size={24}
                  color={C.primary}
                />
              </View>
              <View style={[styles.headerBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
                <View style={[styles.pulseDot, { backgroundColor: C.primary }]} />
                <Text style={[styles.headerBadgeText, { color: C.primary }]}>
                  {isSender ? 'Live Tracking' : 'Delivery Operations'}
                </Text>
              </View>
            </View>

            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
              {isSender ? 'Track Parcel Delivery' : 'Process Delivery & Trip'}
            </Text>

            <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
              {isSender
                ? `Tracking parcel carried by ${request.travellerName}`
                : `Managing parcel for sender ${request.senderName}`}
            </Text>

            <View style={[styles.routeRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Ionicons name="location" size={14} color={C.primary} />
              <Text style={[styles.routeText, { color: C.textPrimary }]} numberOfLines={1}>
                {request.senderName} ↔ {request.travellerName}
              </Text>
            </View>
          </View>

          {/* Progress Timeline */}
          <DeliveryTimeline step={step} C={C} />

          {/* ========================================================================= */}
          {/* SENDER SCREEN VIEWS & FLOWS                                              */}
          {/* ========================================================================= */}
          {isSender && (
            <>
              {/* Stage 1: Awaiting Pickup -> Display 4-digit Pickup OTP for sender */}
              {step === 'awaiting_pickup' && (
                <SenderPickupOtpCard
                  code={pickupOtp}
                  onRefresh={handleRefreshPickupOtp}
                  loading={pickupOtpLoading}
                  C={C}
                />
              )}

              {/* Stage 2: In Transit -> Live Journey Status & Updates */}
              {step === 'in_transit' && (
                <>
                  <SenderLiveJourneyCard
                    travellerName={request.travellerName}
                    tripStatus={delivery?.tripStatus}
                    tripNote={delivery?.tripNote}
                    etaText={delivery?.etaText}
                    onChat={handleOpenChat}
                    C={C}
                  />

                  {/* Live GPS Map */}
                  {FeatureFlags.preciseLocationSharing && travellerLocation ? (
                    <DeliveryMap
                      travellerName={request.travellerName}
                      lat={travellerLocation.lat}
                      lng={travellerLocation.lng}
                      updatedAt={travellerLocation.updatedAt}
                      C={C}
                    />
                  ) : FeatureFlags.preciseLocationSharing ? (
                    <View style={[styles.locationCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                      <View style={[styles.locationIconBox, { backgroundColor: C.primarySubtle }]}>
                        <MaterialIcons name="location-searching" size={18} color={C.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.locationTitle, { color: C.textPrimary }]}>Awaiting Live GPS</Text>
                        <Text style={[styles.locationSub, { color: C.textMuted }]}>
                          Traveller has not enabled GPS broadcast yet. Auto-checks every 15s.
                        </Text>
                      </View>
                      <ActivityIndicator size="small" color={C.primary} />
                    </View>
                  ) : null}

                  {/* 6-Digit Delivery OTP Card for final handoff */}
                  <SenderOtpCard
                    code={deliveryOtp}
                    onGenerate={handleIssueDeliveryOtp}
                    loading={loading}
                    C={C}
                  />
                </>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* TRAVELLER SCREEN VIEWS & FLOWS                                           */}
          {/* ========================================================================= */}
          {isTraveller && (
            <>
              {/* Stage 1: Awaiting Pickup -> Enter 4-digit Pickup OTP from sender */}
              {step === 'awaiting_pickup' && (
                <TravellerPickupActionCard
                  enteredOtp={enteredPickupOtp}
                  onOtpChange={setEnteredPickupOtp}
                  onConfirmPickup={handleConfirmPickupWithOtp}
                  loading={loading}
                  C={C}
                />
              )}

              {/* Stage 2: In Transit -> Trip Status Controls, Notes, ETA & Live GPS */}
              {step === 'in_transit' && (
                <>
                  <TravellerTripControlsCard
                    currentStatus={delivery?.tripStatus || ''}
                    currentNote={delivery?.tripNote || ''}
                    currentEta={delivery?.etaText || ''}
                    onUpdateTrip={handleUpdateTripDetails}
                    locationSharing={locationSharing}
                    onToggleLocation={handleToggleLocation}
                    loading={tripUpdateLoading}
                    C={C}
                  />

                  {/* Stage 2b: Enter 6-digit Delivery Code to complete delivery */}
                  <DeliveryOtpActionCard
                    enteredOtp={enteredDeliveryOtp}
                    onOtpChange={setEnteredDeliveryOtp}
                    onConfirmDelivery={handleDeliveryOTP}
                    loading={loading}
                    C={C}
                  />
                </>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* COMMON: Delivered Success Card                                            */}
          {/* ========================================================================= */}
          {step === 'delivered' && (
            <DeliverySuccessCard
              onRate={handleRateFromSuccess}
              onViewPayment={() => router.push({ pathname: '/payment/[id]', params: { id } })}
              showPayment={FeatureFlags.payments}
              C={C}
            />
          )}

          {/* Journey Summary Details Card */}
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.detailCardHeader}>
              <View style={[styles.detailCardIcon, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="info-outline" size={16} color={C.primary} />
              </View>
              <Text style={[styles.detailCardTitle, { color: C.textPrimary }]}>Journey Details</Text>
            </View>

            {[
              { label: 'Sender', value: request.senderName, icon: 'person' as const, color: C.textSecondary },
              { label: 'Traveller', value: request.travellerName, icon: 'directions-car' as const, color: C.textSecondary },
              { label: 'Agreed Price', value: `₹${request.price}`, icon: 'payments' as const, color: C.success },
              {
                label: 'Status',
                value: step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                icon: 'flag' as const,
                color: STEPS[stepIndex(step)]?.color || C.primary,
              },
            ].map((row, idx) => (
              <View key={idx} style={[styles.detailRow, { borderBottomColor: C.surfaceBorder }]}>
                <View style={styles.detailRowLeft}>
                  <MaterialIcons name={row.icon} size={14} color={C.textMuted} />
                  <Text style={[styles.detailLabel, { color: C.textMuted }]}>{row.label}</Text>
                </View>
                <Text style={[styles.detailValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.mdl, gap: Spacing.mdl },
  headerCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  routeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyStateTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyStateSub: { fontSize: FontSize.sm, textAlign: 'center' },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.mdl,
  },
  alertIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  alertSub: { fontSize: FontSize.xs, marginTop: 3, lineHeight: 18 },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.mdl,
  },
  locationIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, letterSpacing: -0.2 },
  locationSub: { fontSize: FontSize.xs, marginTop: 3, lineHeight: 18 },

  detailCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.mdl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  detailCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: FontSize.sm },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
