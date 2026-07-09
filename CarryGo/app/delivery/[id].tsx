import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Switch, ActivityIndicator, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DeliveryMap from '@/components/feature/DeliveryMap';
import { useAuth } from '@/hooks/useAuth';
import { useRequestQuery } from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RatingModal } from '@/components/feature/RatingModal';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { fetchDelivery, createDelivery, confirmPickup, confirmDelivery } from '@/services/deliveries.service';
import { getCurrentLocation, updateDeliveryLocation, fetchDeliveryLocation } from '@/services/location.service';
import { Delivery } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { DELIVERY_OTP_LENGTH } from '@/constants/security';

type DeliveryStep = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';

const STEPS: {
  key: DeliveryStep;
  label: string;
  sub: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { key: 'awaiting_pickup', label: 'Awaiting Pickup', sub: 'Traveller will collect parcel', icon: 'schedule', color: '#F59E0B' },
  { key: 'picked_up',       label: 'Picked Up',       sub: 'Parcel collected from sender',   icon: 'inventory',       color: '#7C3AED' },
  { key: 'in_transit',      label: 'In Transit',      sub: 'On the way to destination',      icon: 'local-shipping',  color: '#06B6D4' },
  { key: 'delivered',       label: 'Delivered',       sub: 'Delivery complete!',              icon: 'celebration',     color: '#22C55E' },
];

function stepIndex(status: DeliveryStep) {
  return STEPS.findIndex(s => s.key === status);
}

// ── Timeline ─────────────────────────────────────────────────────────────────
function DeliveryTimeline({ step, C }: { step: DeliveryStep; C: ThemeColors }) {
  const currentIdx = stepIndex(step);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step !== 'delivered') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [step]);

  return (
    <View style={[styles.timelineCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.timelineHeader}>
        <View style={[styles.timelineIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="local-shipping" size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.timelineTitle, { color: C.textPrimary }]}>Delivery Progress</Text>
          <Text style={[styles.timelineSub, { color: C.textMuted }]}>
            Step {currentIdx + 1} of {STEPS.length}
          </Text>
        </View>
        <View style={[styles.progressPill, { backgroundColor: STEPS[currentIdx].color + '18', borderColor: STEPS[currentIdx].color + '44' }]}>
          <Text style={[styles.progressPillText, { color: STEPS[currentIdx].color }]}>
            {STEPS[currentIdx].label}
          </Text>
        </View>
      </View>

      {/* Linear progress bar */}
      <View style={[styles.progressBarBg, { backgroundColor: C.surfaceElevated }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: STEPS[currentIdx].color,
              width: `${((currentIdx) / (STEPS.length - 1)) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Step rows */}
      {STEPS.map((s, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;
        const dotColor = isDone ? s.color : isCurrent ? s.color : C.surfaceBorderLight;

        return (
          <View key={s.key} style={styles.stepRow}>
            {/* Connector + dot */}
            <View style={styles.stepLeft}>
              <View style={[
                styles.stepDot,
                { backgroundColor: dotColor, borderColor: isPending ? C.surfaceBorder : dotColor },
              ]}>
                {isDone ? (
                  <MaterialIcons name="check" size={11} color="#fff" />
                ) : isCurrent ? (
                  <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialIcons name={s.icon} size={11} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={[styles.pendingDot, { backgroundColor: C.surfaceBorder }]} />
                )}
              </View>
              {idx < STEPS.length - 1 ? (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: isDone ? s.color : C.surfaceBorderLight },
                ]} />
              ) : null}
            </View>

            {/* Content */}
            <View style={[styles.stepContent, isCurrent && [styles.stepContentActive, { backgroundColor: s.color + '08', borderColor: s.color + '25' }]]}>
              <View style={styles.stepContentInner}>
                <View style={[styles.stepIconWrap, { backgroundColor: dotColor + (isPending ? '0' : '18') }]}>
                  <MaterialIcons name={s.icon} size={15} color={isPending ? C.textMuted : dotColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.stepLabel,
                    { color: isPending ? C.textMuted : C.textPrimary },
                    isCurrent && { fontWeight: FontWeight.bold },
                  ]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.stepSub, { color: isCurrent ? s.color + 'AA' : C.textMuted }]}>
                    {isCurrent ? 'Current step' : s.sub}
                  </Text>
                </View>
                {isDone ? (
                  <View style={[styles.doneChip, { backgroundColor: s.color + '15' }]}>
                    <MaterialIcons name="check-circle" size={13} color={s.color} />
                    <Text style={[styles.doneChipText, { color: s.color }]}>Done</Text>
                  </View>
                ) : isCurrent ? (
                  <View style={[styles.activeChip, { backgroundColor: s.color }]}>
                    <Text style={styles.activeChipText}>Now</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── OTP Entry ────────────────────────────────────────────────────────────────
function OtpEntry({ value, onChange, C }: { value: string; onChange: (v: string) => void; C: ThemeColors }) {
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable style={styles.otpEntryWrap} onPress={() => inputRef.current?.focus()}>
      <View style={styles.otpEntryDigits}>
        {Array.from({ length: DELIVERY_OTP_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.otpEntryBox,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              value[i] ? { borderColor: C.primary, backgroundColor: C.primarySubtle } : null,
              i === value.length ? { borderColor: C.primary, borderWidth: 2 } : null,
            ]}
          >
            <Text style={[styles.otpEntryDigitText, { color: C.primary }]}>
              {value[i] || ''}
            </Text>
            {i === value.length && !value[i] ? (
              <View style={[styles.cursor, { backgroundColor: C.primary }]} />
            ) : null}
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, DELIVERY_OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={DELIVERY_OTP_LENGTH}
        accessibilityLabel="OTP entry"
        caretHidden
      />
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
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
  const step: DeliveryStep = (delivery?.status as DeliveryStep) || 'awaiting_pickup';

  const initDelivery = useCallback(async () => {
    if (!id) return;
    const { data } = await fetchDelivery(id);
    if (data) {
      setDelivery(data);
      return;
    }
    if (request && isTraveller) {
      const { data: created } = await createDelivery(id);
      if (created) setDelivery(created);
    }
  }, [id, isTraveller, request]);

  useEffect(() => {
    if (!id) return;
    void initDelivery();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fadeAnim, id, initDelivery]);

  // Poll traveller location (sender side)
  useEffect(() => {
    if (!FeatureFlags.preciseLocationSharing || !delivery || isTraveller || step === 'delivered') return;
    const poll = async () => {
      const { data } = await fetchDeliveryLocation(delivery.id);
      if (data) setTravellerLocation(data);
    };
    poll();
    pollInterval.current = setInterval(poll, 15000);
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [delivery?.id, isTraveller, step]);

  const handleToggleLocation = async (enabled: boolean) => {
    if (!FeatureFlags.preciseLocationSharing) {
      showAlert('Location Sharing Unavailable', disabledFeatureMessage.location);
      return;
    }
    if (!delivery) return;
    setLocationSharing(enabled);
    Haptic.select();
    if (enabled) {
      const updateLoc = async () => {
        const { data } = await getCurrentLocation();
        if (data) await updateDeliveryLocation(delivery.id, data.lat, data.lng);
      };
      await updateLoc();
      locationInterval.current = setInterval(updateLoc, 30000);
    } else {
      if (locationInterval.current) clearInterval(locationInterval.current);
    }
  };

  const handleConfirmPickup = () => {
    Haptic.warning();
    showAlert('Confirm Pickup', 'Confirm you have collected the parcel from the sender?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Pickup', onPress: async () => {
          if (!delivery) return;
          setLoading(true);
          const { data, error } = await confirmPickup(delivery.id);
          if (error || !data) {
            setLoading(false);
            showAlert('Pickup Unavailable', error);
            return;
          }
          setDelivery(data);
          Haptic.success();
          setLoading(false);
        },
      },
    ]);
  };

  const handleDeliveryOTP = async () => {
    if (!delivery || !request) return;
    setLoading(true);
    Haptic.tap();
    const result = await confirmDelivery(delivery.id, enteredOtp);
    if (!result.success || !result.data) {
      setLoading(false);
      Haptic.error();
      showAlert('Delivery Not Confirmed', result.error || 'The delivery code could not be verified.');
      return;
    }
    setDelivery(result.data);
    await requestQuery.refetch();
    /*
      title: 'Parcel Delivered! 🎉',
    */
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
          {/* ── Progress Timeline ── */}
          <DeliveryTimeline step={step} C={C} />

          {/* ── OTP Display ── */}
          {!FeatureFlags.secureDeliveryConfirmation && step !== 'delivered' ? (
            <View style={[styles.locationCard, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
              <View style={[styles.locationIconBox, { backgroundColor: C.warning + '20' }]}>
                <MaterialIcons name="security" size={18} color={C.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationTitle, { color: C.warning }]}>Delivery Actions Paused</Text>
                <Text style={[styles.locationSub, { color: C.textSecondary }]}>
                  {disabledFeatureMessage.delivery}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Live Map (sender, when location shared) ── */}
          {FeatureFlags.preciseLocationSharing && travellerLocation && !isTraveller ? (
            <DeliveryMap
              travellerName={request?.travellerName || 'Traveller'}
              lat={travellerLocation.lat}
              lng={travellerLocation.lng}
              updatedAt={travellerLocation.updatedAt}
              C={C}
            />
          ) : null}

          {/* ── Awaiting Location (sender) ── */}
          {FeatureFlags.preciseLocationSharing && step === 'in_transit' && !isTraveller && !travellerLocation ? (
            <View style={[styles.locationCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={[styles.locationIconBox, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="location-searching" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationTitle, { color: C.textPrimary }]}>Awaiting Location</Text>
                <Text style={[styles.locationSub, { color: C.textMuted }]}>
                  Traveller has not enabled location sharing · Auto-checks every 15s
                </Text>
              </View>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : null}

          {/* ── Location Sharing Toggle (traveller, in_transit) ── */}
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

          {/* ── Pickup Action (traveller) ── */}
          {FeatureFlags.secureDeliveryConfirmation && step === 'awaiting_pickup' && isTraveller ? (
            <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <LinearGradient colors={[C.warning + '0C', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.actionHeader}>
                <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B20' }]}>
                  <MaterialIcons name="inventory" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Ready to Pick Up?</Text>
                  <Text style={[styles.actionSub, { color: C.textSecondary }]}>
                    Confirm you have collected the parcel from the sender
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: '#F59E0B', opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                onPress={handleConfirmPickup}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Confirm Pickup</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* ── OTP Entry to Confirm Delivery (traveller, in_transit) ── */}
          {FeatureFlags.secureDeliveryConfirmation && step === 'in_transit' && isTraveller ? (
            <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.actionHeader}>
                <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="lock-open" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Confirm Delivery</Text>
                  <Text style={[styles.actionSub, { color: C.textSecondary }]}>
                    Enter the OTP shown to the receiver to complete delivery
                  </Text>
                </View>
              </View>
              <OtpEntry value={enteredOtp} onChange={setEnteredOtp} C={C} />
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: enteredOtp.length === DELIVERY_OTP_LENGTH ? C.primary : C.surfaceElevated,
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed && enteredOtp.length === DELIVERY_OTP_LENGTH ? 0.98 : 1 }],
                  },
                ]}
                onPress={handleDeliveryOTP}
                disabled={enteredOtp.length < DELIVERY_OTP_LENGTH || loading}
              >
                {loading ? <ActivityIndicator color={enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted} size="small" /> : (
                  <>
                    <MaterialIcons
                      name="verified"
                      size={18}
                      color={enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted}
                    />
                    <Text style={[styles.primaryBtnText, { color: enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted }]}>
                      Verify & Complete Delivery
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* ── Sender Waiting Banner ── */}
          {step === 'in_transit' && !isTraveller ? (
            <View style={[styles.waitCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <MaterialIcons name="local-shipping" size={36} color={C.primary} />
              <Text style={[styles.waitTitle, { color: C.textPrimary }]}>Parcel On The Way</Text>
              <Text style={[styles.waitSub, { color: C.textSecondary }]}>
                {request?.travellerName} is travelling with your parcel
              </Text>
            </View>
          ) : null}

          {/* ── Success ── */}
          {step === 'delivered' ? (
            <View style={[styles.successCard, { backgroundColor: C.successSubtle, borderColor: C.success + '55' }]}>
              <LinearGradient colors={[C.success + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="checkmark-circle" size={60} color={C.success} />
              <Text style={[styles.successTitle, { color: C.success }]}>Delivered!</Text>
              <Text style={[styles.successSub, { color: C.textSecondary }]}>
                Delivery is complete. Rate your experience below.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: C.success, opacity: pressed ? 0.88 : 1, alignSelf: 'stretch' },
                ]}
                onPress={() => {
                  if (request) {
                    const target = isTraveller
                      ? { userId: request.senderId, name: request.senderName }
                      : { userId: request.travellerId, name: request.travellerName };
                    setRatingTarget(target);
                    setShowRating(true);
                  }
                }}
              >
                <MaterialIcons name="star" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Rate Experience</Text>
              </Pressable>
              {FeatureFlags.payments ? <Pressable
                style={({ pressed }) => [
                  styles.outlineBtn,
                  { borderColor: C.success + '55', opacity: pressed ? 0.8 : 1, alignSelf: 'stretch' },
                ]}
                onPress={() => router.push({ pathname: '/payment/[id]', params: { id } })}
              >
                <MaterialIcons name="account-balance-wallet" size={16} color={C.success} />
                <Text style={[styles.outlineBtnText, { color: C.success }]}>View Payment</Text>
              </Pressable> : null}
            </View>
          ) : null}

          {/* ── Details Card ── */}
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
                { label: 'Agreed Price', value: `₹${request.price}`, icon: 'payments' as const, color: C.success },
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
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },

  // Timeline
  timelineCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  timelineIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  timelineSub: { fontSize: FontSize.xs, marginTop: 2 },
  progressPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, flexShrink: 0,
  },
  progressPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },

  stepRow: { flexDirection: 'row', gap: 0, alignItems: 'flex-start' },
  stepLeft: { width: 48, alignItems: 'center' },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  pulseDot: { alignItems: 'center', justifyContent: 'center' },
  pendingDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 3 },
  stepContent: {
    flex: 1, borderRadius: BorderRadius.md, marginBottom: 8, padding: 10,
  },
  stepContentActive: { borderWidth: 1 },
  stepContentInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  stepSub: { fontSize: FontSize.xs, marginTop: 2 },
  doneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  doneChipText: { fontSize: 10, fontWeight: FontWeight.bold },
  activeChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  activeChipText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#fff' },

  // OTP Entry
  otpEntryWrap: { alignItems: 'center', gap: Spacing.md },
  otpEntryDigits: { flexDirection: 'row', gap: Spacing.sm },
  otpEntryBox: {
    width: 44, height: 56, borderRadius: BorderRadius.md,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  otpEntryDigitText: { fontSize: 24, fontWeight: FontWeight.bold },
  cursor: { width: 2, height: 24, position: 'absolute' },
  hiddenInput: { height: 0, opacity: 0, position: 'absolute' },


  // Location card
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md,
  },
  locationIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  locationSub: { fontSize: FontSize.xs, marginTop: 2 },

  // Action card
  actionCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  actionIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  actionSub: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 3 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md - 2, borderRadius: BorderRadius.md, borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  // Wait card
  waitCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.sm, alignItems: 'center', overflow: 'hidden',
  },
  waitTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  waitSub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },

  // Success card
  successCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.md, alignItems: 'center', overflow: 'hidden',
  },
  successTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold },
  successSub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },

  // Detail card
  detailCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.sm, overflow: 'hidden',
  },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  detailCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: FontSize.sm },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
