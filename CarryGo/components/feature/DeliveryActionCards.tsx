import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Animated, Switch, Linking } from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Motion } from '@/constants/theme';
import { DeliveryOtpEntry } from './DeliveryOtpEntry';
import { DELIVERY_OTP_LENGTH } from '@/constants/security';
import { Haptic } from '@/services/haptics.service';

// --- 1. SENDER: Pickup OTP Display Card ---
type SenderPickupOtpCardProps = {
  code: string | null;
  onRefresh: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function SenderPickupOtpCard({ code, onRefresh, loading, C }: SenderPickupOtpCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const digits = (code || '----').slice(0, 4).split('');

  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '10', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="vpn-key" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Pickup Handover Code</Text>
            <View style={[styles.statusChipActive, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
              <Text style={[styles.statusChipActiveText, { color: C.primary }]}>Active</Text>
            </View>
          </View>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Give this 4-digit code to the traveller when they collect your parcel.
          </Text>
        </View>
      </View>

      {/* Stylized 4-digit display */}
      <View style={styles.codeContainer}>
        {digits.map((digit, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.codeBox,
              { backgroundColor: C.surfaceElevated, borderColor: code ? C.primary : C.surfaceBorder },
              code ? { transform: [{ scale: pulseAnim }] } : null,
            ]}
          >
            <Text style={[styles.codeBoxText, { color: C.primary }]}>{digit}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.securityNoteRow}>
        <MaterialIcons name="verified-user" size={15} color={C.success} />
        <Text style={[styles.securityNoteText, { color: C.textMuted }]}>
          The traveller cannot start the delivery until they enter this code.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.outlineBtn,
          { borderColor: C.primary + '55', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={() => {
          Haptic.tap();
          onRefresh();
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={C.primary} size="small" />
        ) : (
          <>
            <MaterialIcons name="refresh" size={16} color={C.primary} />
            <Text style={[styles.outlineBtnText, { color: C.primary }]}>Refresh Code</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 2. TRAVELLER: Pickup OTP Input & Action Card ---
type TravellerPickupActionCardProps = {
  enteredOtp: string;
  onOtpChange: (v: string) => void;
  onConfirmPickup: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function TravellerPickupActionCard({
  enteredOtp,
  onOtpChange,
  onConfirmPickup,
  loading,
  C,
}: TravellerPickupActionCardProps) {
  const isReady = enteredOtp.trim().length === 4;

  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0C', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="inventory" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Collect & Verify Parcel</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Meet sender, inspect the parcel, and enter their 4-digit Pickup OTP to start transit.
          </Text>
        </View>
      </View>

      <DeliveryOtpEntry value={enteredOtp} onChange={onOtpChange} C={C} length={4} />

      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: isReady ? C.primary : C.surfaceElevated,
            opacity: pressed && isReady ? 0.88 : 1,
            transform: [{ scale: pressed && isReady ? Motion.pressScale : 1 }],
          },
        ]}
        onPress={() => {
          if (!isReady) return;
          Haptic.tap();
          onConfirmPickup();
        }}
        disabled={!isReady || loading}
      >
        {loading ? (
          <ActivityIndicator color={isReady ? '#fff' : C.textMuted} size="small" />
        ) : (
          <>
            <MaterialIcons name="check-circle" size={18} color={isReady ? '#fff' : C.textMuted} />
            <Text style={[styles.primaryBtnText, { color: isReady ? '#fff' : C.textMuted }]}>
              Verify & Start Transit
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 3. TRAVELLER: Trip Details, Controls & GPS Card ---
type TravellerTripControlsCardProps = {
  currentStatus: string;
  currentNote: string;
  currentEta: string;
  onUpdateTrip: (status: string, note: string, eta: string) => void;
  locationSharing: boolean;
  onToggleLocation: (enabled: boolean) => void;
  loading: boolean;
  C: ThemeColors;
};

const TRIP_STATUS_OPTIONS = [
  'Picked up - On Journey',
  'Boarded Bus/Train',
  'On Highway',
  'Approaching Destination City',
  'Arriving in 15 Mins',
  'At Drop-off Location',
];

export function TravellerTripControlsCard({
  currentStatus,
  currentNote,
  currentEta,
  onUpdateTrip,
  locationSharing,
  onToggleLocation,
  loading,
  C,
}: TravellerTripControlsCardProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || TRIP_STATUS_OPTIONS[0]);
  const [note, setNote] = useState(currentNote || '');
  const [eta, setEta] = useState(currentEta || '');

  useEffect(() => {
    if (currentStatus) setSelectedStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    if (currentNote) setNote(currentNote);
  }, [currentNote]);

  useEffect(() => {
    if (currentEta) setEta(currentEta);
  }, [currentEta]);

  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="tune" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Trip Status & Updates</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Keep the sender updated with your current transit stage and arrival estimate.
          </Text>
        </View>
      </View>

      {/* Status Chips */}
      <View style={styles.chipsContainer}>
        {TRIP_STATUS_OPTIONS.map(opt => {
          const isSelected = selectedStatus === opt;
          return (
            <Pressable
              key={opt}
              style={[
                styles.chipBtn,
                {
                  backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                  borderColor: isSelected ? C.primary : C.surfaceBorder,
                },
              ]}
              onPress={() => {
                Haptic.select();
                setSelectedStatus(opt);
              }}
            >
              {isSelected ? <MaterialIcons name="check" size={13} color={C.primary} /> : null}
              <Text
                style={[
                  styles.chipBtnText,
                  { color: isSelected ? C.primary : C.textSecondary, fontWeight: isSelected ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Note & ETA inputs */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Transit Note (Optional)</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, color: C.textPrimary }]}
          placeholder="e.g., Highway traffic clear, travelling smoothly"
          placeholderTextColor={C.textMuted}
          value={note}
          onChangeText={setNote}
          maxLength={100}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Estimated Arrival (ETA)</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, color: C.textPrimary }]}
          placeholder="e.g., 45 minutes / 6:30 PM"
          placeholderTextColor={C.textMuted}
          value={eta}
          onChangeText={setEta}
          maxLength={40}
        />
      </View>

      {/* GPS Location Switch */}
      <View style={[styles.locationRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
          <MaterialIcons name="my-location" size={18} color={locationSharing ? C.primary : C.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationLabel, { color: C.textPrimary }]}>Live GPS Sharing</Text>
            <Text style={[styles.locationSubLabel, { color: C.textMuted }]}>
              {locationSharing ? 'Sender sees live location on map' : 'Location updates paused'}
            </Text>
          </View>
        </View>
        <Switch
          value={locationSharing}
          onValueChange={onToggleLocation}
          trackColor={{ false: C.surfaceBorder, true: C.primary + '88' }}
          thumbColor={locationSharing ? C.primary : '#FFFFFF'}
        />
      </View>

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: C.primary,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? Motion.pressScale : 1 }],
          },
        ]}
        onPress={() => {
          Haptic.tap();
          onUpdateTrip(selectedStatus, note, eta);
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialIcons name="send" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Update Sender & Progress</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 4. SENDER: Live Journey Tracker Card ---
type SenderLiveJourneyCardProps = {
  travellerName: string;
  tripStatus?: string;
  tripNote?: string;
  etaText?: string;
  onChat: () => void;
  travellerPhone?: string;
  C: ThemeColors;
};

export function SenderLiveJourneyCard({
  travellerName,
  tripStatus,
  tripNote,
  etaText,
  onChat,
  travellerPhone,
  C,
}: SenderLiveJourneyCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0B', 'transparent']} style={StyleSheet.absoluteFillObject} />
      
      {/* Live Badge Top */}
      <View style={styles.liveTopRow}>
        <View style={[styles.livePill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <Animated.View
            style={[
              styles.radarDot,
              { backgroundColor: C.primary, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={[styles.livePillText, { color: C.primary }]}>LIVE IN TRANSIT</Text>
        </View>

        {etaText ? (
          <View style={[styles.etaPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="schedule" size={13} color={C.textSecondary} />
            <Text style={[styles.etaPillText, { color: C.textPrimary }]}>{etaText}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.travellerHeaderTitle, { color: C.textPrimary }]}>
        {travellerName} is on the way
      </Text>

      {/* Trip Status Pill */}
      <View style={[styles.statusHighlightBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <MaterialIcons name="navigation" size={16} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusHighlightTitle, { color: C.textPrimary }]}>
            {tripStatus || 'In Transit towards Destination'}
          </Text>
          {tripNote ? (
            <Text style={[styles.statusHighlightSub, { color: C.textSecondary }]}>
              "{tripNote}"
            </Text>
          ) : null}
        </View>
      </View>

      {/* Quick Action Contacts */}
      <View style={styles.contactRow}>
        <Pressable
          style={({ pressed }) => [
            styles.contactBtn,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '33', opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onChat}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
          <Text style={[styles.contactBtnText, { color: C.primary }]}>Chat with Traveller</Text>
        </Pressable>

        {travellerPhone ? (
          <Pressable
            style={({ pressed }) => [
              styles.contactBtnSmall,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              Haptic.tap();
              Linking.openURL(`tel:${travellerPhone}`);
            }}
          >
            <Feather name="phone-call" size={16} color={C.textPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// --- 5. TRAVELLER: Final Delivery OTP Entry Card ---
type DeliveryOtpCardProps = {
  enteredOtp: string;
  onOtpChange: (v: string) => void;
  onConfirmDelivery: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function DeliveryOtpActionCard({
  enteredOtp,
  onOtpChange,
  onConfirmDelivery,
  loading,
  C,
}: DeliveryOtpCardProps) {
  const isReady = enteredOtp.length === DELIVERY_OTP_LENGTH;

  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="lock-open" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Confirm Final Delivery</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Hand over parcel to recipient and enter their 6-digit Delivery Code to finish.
          </Text>
        </View>
      </View>
      <DeliveryOtpEntry value={enteredOtp} onChange={onOtpChange} C={C} length={DELIVERY_OTP_LENGTH} />
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: isReady ? C.primary : C.surfaceElevated,
            opacity: pressed && isReady ? 0.88 : 1,
            transform: [{ scale: pressed && isReady ? Motion.pressScale : 1 }],
          },
        ]}
        onPress={onConfirmDelivery}
        disabled={!isReady || loading}
      >
        {loading ? (
          <ActivityIndicator color={isReady ? '#fff' : C.textMuted} size="small" />
        ) : (
          <>
            <MaterialIcons
              name="verified"
              size={18}
              color={isReady ? '#fff' : C.textMuted}
            />
            <Text style={[styles.primaryBtnText, { color: isReady ? '#fff' : C.textMuted }]}>
              Verify & Complete Delivery
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 6. SENDER: Final Delivery OTP Display Card ---
type SenderOtpCardProps = {
  code: string | null;
  onGenerate: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function SenderOtpCard({ code, onGenerate, loading, C }: SenderOtpCardProps) {
  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="password" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Final Delivery Code</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Share this 6-digit code ONLY after inspecting and receiving your parcel at the destination.
          </Text>
        </View>
      </View>

      {code ? (
        <View style={[styles.senderCodeWrapper, { backgroundColor: C.surfaceElevated, borderColor: C.primary + '44' }]}>
          <Text selectable style={[styles.senderCode, { color: C.primary }]}>
            {code}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? Motion.pressScale : 1 }] },
        ]}
        onPress={onGenerate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialIcons name="vpn-key" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {code ? 'Generate New Delivery Code' : 'Generate Delivery Code'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 7. SUCCESS: Delivery Completed Card ---
type SuccessCardProps = {
  onRate: () => void;
  onViewPayment?: () => void;
  showPayment: boolean;
  C: ThemeColors;
};

export function DeliverySuccessCard({ onRate, onViewPayment, showPayment, C }: SuccessCardProps) {
  return (
    <View style={[styles.successCard, { backgroundColor: C.surface, borderColor: C.success + '44' }]}>
      <LinearGradient colors={[C.success + '15', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.successIconBox, { backgroundColor: C.successSubtle }]}>
        <Ionicons name="checkmark-circle" size={48} color={C.success} />
      </View>
      <Text style={[styles.successTitle, { color: C.textPrimary }]}>Parcel Delivered!</Text>
      <Text style={[styles.successSub, { color: C.textSecondary }]}>
        The journey was successfully completed and safely verified.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: C.success, opacity: pressed ? 0.88 : 1, alignSelf: 'stretch', transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={onRate}
      >
        <MaterialIcons name="star" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Rate Experience</Text>
      </Pressable>
      {showPayment && onViewPayment ? (
        <Pressable
          style={({ pressed }) => [
            styles.outlineBtn,
            { borderColor: C.success + '55', opacity: pressed ? 0.8 : 1, alignSelf: 'stretch' },
          ]}
          onPress={onViewPayment}
        >
          <MaterialIcons name="account-balance-wallet" size={16} color={C.success} />
          <Text style={[styles.outlineBtnText, { color: C.success }]}>View Payment Details</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  actionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.mdl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  actionIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  actionSub: { fontSize: FontSize.sm, lineHeight: 20, marginTop: 3 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  statusChipActive: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusChipActiveText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  codeBox: {
    width: 58,
    height: 64,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxText: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 2,
  },

  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  securityNoteText: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    flex: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md - 1,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md - 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  senderCodeWrapper: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  senderCode: { fontSize: 32, fontWeight: FontWeight.extrabold, letterSpacing: 8, textAlign: 'center' },

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipBtnText: {
    fontSize: FontSize.xs,
  },

  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.sm,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  locationLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  locationSubLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },

  // Live card
  liveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  livePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  etaPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  travellerHeaderTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  statusHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statusHighlightTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  statusHighlightSub: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 17,
  },
  contactRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  contactBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  contactBtnSmall: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },

  // Success
  successCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },
  successSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
