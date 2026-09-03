import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  Switch, ActivityIndicator, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DeliveryMap from '@/components/feature/DeliveryMap';
import { useAuth } from '@/hooks/useAuth';
import { useRequestQuery } from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RatingModal } from '@/components/feature/RatingModal';
import { DeliveryTimeline, DeliveryStep, STEPS, stepIndex } from '@/components/feature/DeliveryTimeline';
import { PickupActionCard, DeliveryOtpActionCard, DeliverySuccessCard, SenderOtpCard } from '@/components/feature/DeliveryActionCards';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { fetchDelivery, createDelivery, confirmPickup, confirmDelivery, issueDeliveryOtp } from '@/services/deliveries.service';
import { getCurrentLocation, updateDeliveryLocation, fetchDeliveryLocation } from '@/services/location.service';
import { Delivery } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { ProductIllustration } from '@/components/illustrations';

export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const requestQuery = useRequestQuery(id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ userId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
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

  const initDelivery = useCallback(async () => {
    if (!id || !request || !isParticipant) return;
    const { data } = await fetchDelivery(id);
    if (data) {
      setDelivery(data);
      return;
    }
    if (isTraveller) {
      const { data: created } = await createDelivery(id);
      if (created) setDelivery(created);
    }
  }, [id, isParticipant, isTraveller, request]);

  useEffect(() => {
    if (!id || !request || !isParticipant) return;
    void initDelivery();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fadeAnim, id, initDelivery, isParticipant, request]);

  // Poll traveller location (sender side)
  useEffect(() => {
    if (!FeatureFlags.preciseLocationSharing || !deliveryId || !isSender || step === 'delivered') return;
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const { data } = await fetchDeliveryLocation(deliveryId);
        if (data) { setTravellerLocation(data); consecutiveFailures = 0; }
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_FAILURES && intervalId) { clearInterval(intervalId); intervalId = null; }
      }
    };
    void poll();
    intervalId = setInterval(poll, 15000);
    pollInterval.current = intervalId;
    return () => { if (intervalId) clearInterval(intervalId); pollInterval.current = null; };
  }, [deliveryId, isSender, step]);

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

  const handleConfirmPickup = () => {
    if (!isTraveller || step !== 'awaiting_pickup') {
      showAlert('Not Allowed', 'Only the assigned traveller can start this ride.');
      return;
    }
    Haptic.warning();
    showAlert('Confirm Pickup', 'Confirm you have collected the parcel from the sender?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Pickup', onPress: async () => {
          if (!delivery) return;
          setLoading(true);
          const { data, error } = await confirmPickup(delivery.id);
          if (error || !data) { setLoading(false); showAlert('Pickup Unavailable', error); return; }
          setDelivery(data); Haptic.success(); setLoading(false);
        },
      },
    ]);
  };

  const handleDeliveryOTP = async () => {
    if (!delivery || !request) return;
    if (!isTraveller || step !== 'in_transit') {
      showAlert('Not Allowed', 'Only the assigned traveller can confirm delivery OTP.');
      return;
    }
    setLoading(true); Haptic.tap();
    const result = await confirmDelivery(delivery.id, enteredOtp, user?.id);
    if (!result.success || !result.data) {
      setLoading(false); Haptic.error();
      showAlert('Delivery Not Confirmed', result.error || 'The delivery code could not be verified.');
      return;
    }
    setDelivery(result.data);
    await requestQuery.refetch();
    setLoading(false); Haptic.success();
    if (locationInterval.current) clearInterval(locationInterval.current);
    if (pollInterval.current) clearInterval(pollInterval.current);
    const target = isTraveller
      ? { userId: request.senderId, name: request.senderName }
      : { userId: request.travellerId, name: request.travellerName };
    setRatingTarget(target);
    setTimeout(() => setShowRating(true), 800);
  };

  const handleIssueDeliveryOtp = async () => {
    if (!delivery || !isSender || step !== 'in_transit') return;
    setLoading(true);
    const result = await issueDeliveryOtp(delivery.id);
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
        <MaterialIcons name="error-outline" size={28} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Delivery Not Found</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>This delivery is unavailable for your account.</Text>
      </View>
    );
  }

  if (!isParticipant) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}> 
        <MaterialIcons name="lock-outline" size={28} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Access Restricted</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>Only sender and traveller can access this delivery journey.</Text>
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
          <View style={[styles.heroCard, { borderColor: C.surfaceBorder, backgroundColor: C.surface }]}> 
            <View style={styles.heroImage}><ProductIllustration variant="delivery" size={132} /></View>
            <View style={[styles.heroOverlay, { backgroundColor: C.primarySubtle }]} />
            <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Delivery Journey</Text>
            <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>
              {isTraveller
                ? 'Use OTP flow and keep live location on while in transit.'
                : 'Track traveller progress live and confirm safe handover.'}
            </Text>
          </View>

          {/* Progress Timeline */}
          <DeliveryTimeline step={step} C={C} />

          {/* Feature flag disabled banner */}
          {!FeatureFlags.secureDeliveryConfirmation && step !== 'delivered' ? (
            <View style={[styles.locationCard, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
              <View style={[styles.locationIconBox, { backgroundColor: C.warning + '20' }]}>
                <MaterialIcons name="security" size={18} color={C.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationTitle, { color: C.warning }]}>Delivery Actions Paused</Text>
                <Text style={[styles.locationSub, { color: C.textSecondary }]}>{disabledFeatureMessage.delivery}</Text>
              </View>
            </View>
          ) : null}

          {/* Live Map (sender, when location shared) */}
          {FeatureFlags.preciseLocationSharing && travellerLocation && isSender ? (
            <DeliveryMap
              travellerName={request.travellerName}
              lat={travellerLocation.lat}
              lng={travellerLocation.lng}
              updatedAt={travellerLocation.updatedAt}
              C={C}
            />
          ) : null}

          {/* Awaiting Location (sender) */}
          {FeatureFlags.preciseLocationSharing && step === 'in_transit' && isSender && !travellerLocation ? (
            <View style={[styles.locationCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={[styles.locationIconBox, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="location-searching" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationTitle, { color: C.textPrimary }]}>Awaiting Location</Text>
                <Text style={[styles.locationSub, { color: C.textMuted }]}>
                  Traveller has not enabled location sharing - auto-checks every 15s
                </Text>
              </View>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : null}

          {/* Location Sharing Toggle (traveller, in_transit) */}
          {FeatureFlags.preciseLocationSharing && step === 'in_transit' && isTraveller ? (
            <View style={[styles.locationCard, { backgroundColor: C.surface, borderColor: locationSharing ? C.primary + '55' : C.surfaceBorder }]}>
              <View style={[styles.locationIconBox, { backgroundColor: locationSharing ? C.primarySubtle : C.surfaceElevated }]}>
                <MaterialIcons name="location-on" size={18} color={locationSharing ? C.primary : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationTitle, { color: C.textPrimary }]}>Share Live Location</Text>
                <Text style={[styles.locationSub, { color: C.textMuted }]}>
                  {locationSharing ? 'Sender can see your current location' : 'Let the sender track your progress'}
                </Text>
              </View>
              <Switch
                value={locationSharing}
                onValueChange={handleToggleLocation}
                trackColor={{ false: C.surfaceBorderLight, true: C.primary + '88' }}
                thumbColor={locationSharing ? C.primary : C.surfaceBorder}
                ios_backgroundColor={C.surfaceBorderLight}
              />
            </View>
          ) : null}

          {/* Pickup Action (traveller) */}
          {FeatureFlags.secureDeliveryConfirmation && step === 'awaiting_pickup' && isTraveller ? (
            <PickupActionCard onConfirmPickup={handleConfirmPickup} loading={loading} C={C} />
          ) : null}

          {/* OTP Entry to Confirm Delivery (traveller, in_transit) */}
          {FeatureFlags.secureDeliveryConfirmation && step === 'in_transit' && isTraveller ? (
            <DeliveryOtpActionCard
              enteredOtp={enteredOtp}
              onOtpChange={setEnteredOtp}
              onConfirmDelivery={handleDeliveryOTP}
              loading={loading}
              C={C}
            />
          ) : null}

          {FeatureFlags.secureDeliveryConfirmation && step === 'in_transit' && isSender ? (
            <SenderOtpCard code={deliveryOtp} onGenerate={handleIssueDeliveryOtp} loading={loading} C={C} />
          ) : null}

          {/* Sender Waiting Banner */}
          {step === 'in_transit' && isSender ? (
            <View style={[styles.waitCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <MaterialIcons name="local-shipping" size={36} color={C.primary} />
              <Text style={[styles.waitTitle, { color: C.textPrimary }]}>Parcel On The Way</Text>
              <Text style={[styles.waitSub, { color: C.textSecondary }]}>
                {request?.travellerName} is travelling with your parcel
              </Text>
            </View>
          ) : null}

          {/* Success */}
          {step === 'delivered' ? (
            <DeliverySuccessCard
              onRate={handleRateFromSuccess}
              onViewPayment={() => router.push({ pathname: '/payment/[id]', params: { id } })}
              showPayment={FeatureFlags.payments}
              C={C}
            />
          ) : null}

          {/* Details Card */}
          {request ? (
            <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={styles.detailCardHeader}>
                <View style={[styles.detailCardIcon, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="info" size={16} color={C.primary} />
                </View>
                <Text style={[styles.detailCardTitle, { color: C.textPrimary }]}>Delivery Details</Text>
              </View>
              {[
                { label: 'Sender', value: request.senderName, icon: 'person' as const, color: C.textSecondary },
                { label: 'Traveller', value: request.travellerName, icon: 'directions-car' as const, color: C.textSecondary },
                { label: 'Agreed Price', value: `Rs ${request.price}`, icon: 'payments' as const, color: C.success },
                { label: 'Status', value: step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: 'flag' as const, color: STEPS[stepIndex(step)]?.color || C.primary },
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
          ) : null}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.mdl, gap: Spacing.mdl },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    minHeight: 138,
    padding: Spacing.mdl,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    right: -8,
    bottom: -18,
    opacity: 0.48,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.45,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyStateTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyStateSub: { fontSize: FontSize.sm, textAlign: 'center' },

  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.mdl,
  },
  locationIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, letterSpacing: -0.2 },
  locationSub: { fontSize: FontSize.xs, marginTop: 3, lineHeight: 18 },

  waitCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.sm, alignItems: 'center', overflow: 'hidden',
  },
  waitTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  waitSub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },

  detailCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.mdl, gap: Spacing.sm, overflow: 'hidden',
  },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  detailCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: FontSize.sm },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
