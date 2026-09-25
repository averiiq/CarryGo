import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Animated, Switch, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Motion } from '@/constants/theme';
import { DeliveryOtpEntry } from './DeliveryOtpEntry';
import { DELIVERY_OTP_LENGTH } from '@/constants/security';
import { Haptic } from '@/services/haptics.service';
import { LottieAnimation } from '@/components/ui/LottieViewWrapper';

// --- 1. SENDER: Pickup OTP Display Card ---
type SenderPickupOtpCardProps = {
  code: string | null;
  onRefresh: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function SenderPickupOtpCard({ code, onRefresh, loading, C }: SenderPickupOtpCardProps) {
  const [copied, setCopied] = useState(false);
  const digits = (code || '••••').slice(0, 4).split('');

  const handleCopy = async () => {
    if (!code) return;
    Haptic.success();
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="key" size={18} color={C.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <View style={styles.badgeRow}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Pickup Handover Code</Text>
            <View style={[styles.pillBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
              <Text style={[styles.pillBadgeText, { color: C.primary }]}>Active</Text>
            </View>
          </View>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Share this 4-digit code with the traveller upon parcel handover.
          </Text>
        </View>
      </View>

      {/* Code Display Tiles */}
      <View style={styles.codeContainer}>
        {digits.map((digit, idx) => (
          <View
            key={idx}
            style={[
              styles.codeBox,
              { backgroundColor: C.surfaceElevated, borderColor: code ? C.primary + '66' : C.surfaceBorder },
            ]}
          >
            <Text style={[styles.codeBoxText, { color: code ? C.primary : C.textMuted }]}>{digit}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.btnRow}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleCopy}
          disabled={!code}
        >
          <Feather name={copied ? 'check' : 'copy'} size={14} color={copied ? C.success : C.textPrimary} />
          <Text style={[styles.secondaryBtnText, { color: copied ? C.success : C.textPrimary }]}>
            {copied ? 'Copied' : 'Copy Code'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
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
              <Feather name="refresh-cw" size={14} color={C.textPrimary} />
              <Text style={[styles.secondaryBtnText, { color: C.textPrimary }]}>Refresh</Text>
            </>
          )}
        </Pressable>
      </View>
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
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="package" size={18} color={C.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Collect & Verify Parcel</Text>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Meet sender, inspect the parcel, and enter their 4-digit code.
          </Text>
        </View>
      </View>

      <DeliveryOtpEntry value={enteredOtp} onChange={onOtpChange} C={C} length={4} />

      <Pressable
        style={({ pressed }) => [
          styles.primaryActionBtn,
          {
            backgroundColor: isReady ? C.primary : C.surfaceElevated,
            opacity: pressed && isReady ? 0.9 : 1,
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
            <Feather name="check" size={16} color={isReady ? '#fff' : C.textMuted} />
            <Text style={[styles.primaryActionBtnText, { color: isReady ? '#fff' : C.textMuted }]}>
              Verify & Start Journey
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// --- 3. TRAVELLER: Trip Details & Status Controls Card ---
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
  'On Highway',
  'Boarded Transport',
  'Approaching Destination',
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
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="navigation" size={18} color={C.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Live Journey Controls</Text>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Keep the sender updated with your current stage and ETA.
          </Text>
        </View>
      </View>

      {/* Modern Status Chips */}
      <View style={styles.chipRow}>
        {TRIP_STATUS_OPTIONS.map(opt => {
          const isSelected = selectedStatus === opt;
          return (
            <Pressable
              key={opt}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? C.primary : C.surfaceElevated,
                  borderColor: isSelected ? C.primary : C.surfaceBorder,
                },
              ]}
              onPress={() => {
                Haptic.select();
                setSelectedStatus(opt);
              }}
            >
              {isSelected ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : C.textSecondary, fontWeight: isSelected ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Note & ETA inputs */}
      <View style={styles.inputsStack}>
        <TextInput
          style={[styles.inputField, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, color: C.textPrimary }]}
          placeholder="Transit note (e.g. Highway traffic clear)"
          placeholderTextColor={C.textMuted}
          value={note}
          onChangeText={setNote}
          maxLength={80}
        />
        <TextInput
          style={[styles.inputField, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, color: C.textPrimary }]}
          placeholder="ETA (e.g. 45 mins / 6:30 PM)"
          placeholderTextColor={C.textMuted}
          value={eta}
          onChangeText={setEta}
          maxLength={40}
        />
      </View>

      {/* GPS Location Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <View style={styles.toggleInfo}>
          <Feather name="map-pin" size={15} color={locationSharing ? C.primary : C.textMuted} />
          <Text style={[styles.toggleLabel, { color: C.textPrimary }]}>Live GPS Broadcast</Text>
        </View>
        <Switch
          value={locationSharing}
          onValueChange={onToggleLocation}
          trackColor={{ false: C.surfaceBorder, true: C.primary + '88' }}
          thumbColor={locationSharing ? C.primary : '#FFFFFF'}
        />
      </View>

      {/* Submit Update */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryActionBtn,
          {
            backgroundColor: C.primary,
            opacity: pressed ? 0.9 : 1,
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
            <Feather name="send" size={15} color="#fff" />
            <Text style={styles.primaryActionBtnText}>Update Sender & Progress</Text>
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
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {/* Live Radar Header */}
      <View style={styles.liveHeaderRow}>
        <View style={[styles.liveStatusBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <Animated.View style={[styles.radarDot, { backgroundColor: C.primary, transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.liveStatusText, { color: C.primary }]}>EN ROUTE</Text>
        </View>

        {etaText ? (
          <View style={[styles.etaBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Feather name="clock" size={12} color={C.textMuted} />
            <Text style={[styles.etaBadgeText, { color: C.textPrimary }]}>{etaText}</Text>
          </View>
        ) : null}
      </View>

      {/* Main Status Headline */}
      <View style={styles.headlineWrap}>
        <Text style={[styles.headlineTitle, { color: C.textPrimary }]}>
          {tripStatus || `${travellerName} is on the journey`}
        </Text>
        {tripNote ? (
          <Text style={[styles.headlineNote, { color: C.textSecondary }]}>
            "{tripNote}"
          </Text>
        ) : null}
      </View>

      {/* Contact Traveller Row */}
      <View style={styles.contactRow}>
        <Pressable
          style={({ pressed }) => [
            styles.contactBtn,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '33', opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onChat}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={C.primary} />
          <Text style={[styles.contactBtnText, { color: C.primary }]}>Chat with Traveller</Text>
        </Pressable>

        {travellerPhone ? (
          <Pressable
            style={({ pressed }) => [
              styles.iconActionBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              Haptic.tap();
              Linking.openURL(`tel:${travellerPhone}`);
            }}
          >
            <Feather name="phone" size={15} color={C.textPrimary} />
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
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="check-square" size={18} color={C.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Complete Final Delivery</Text>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Hand over parcel to receiver and enter their 6-digit Delivery Code.
          </Text>
        </View>
      </View>

      <DeliveryOtpEntry value={enteredOtp} onChange={onOtpChange} C={C} length={DELIVERY_OTP_LENGTH} />

      <Pressable
        style={({ pressed }) => [
          styles.primaryActionBtn,
          {
            backgroundColor: isReady ? C.primary : C.surfaceElevated,
            opacity: pressed && isReady ? 0.9 : 1,
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
            <Feather name="check-circle" size={16} color={isReady ? '#fff' : C.textMuted} />
            <Text style={[styles.primaryActionBtnText, { color: isReady ? '#fff' : C.textMuted }]}>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    Haptic.success();
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="shield" size={18} color={C.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Final Delivery Code</Text>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Share this code only after inspecting & receiving your parcel.
          </Text>
        </View>
      </View>

      {code ? (
        <View style={[styles.deliveryCodeTile, { backgroundColor: C.surfaceElevated, borderColor: C.primary + '44' }]}>
          <Text selectable style={[styles.deliveryCodeText, { color: C.primary }]}>
            {code}
          </Text>
        </View>
      ) : null}

      <View style={styles.btnRow}>
        {code ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleCopy}
          >
            <Feather name={copied ? 'check' : 'copy'} size={14} color={copied ? C.success : C.textPrimary} />
            <Text style={[styles.secondaryBtnText, { color: copied ? C.success : C.textPrimary }]}>
              {copied ? 'Copied' : 'Copy Code'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.primary} size="small" />
          ) : (
            <>
              <Feather name="refresh-cw" size={14} color={C.textPrimary} />
              <Text style={[styles.secondaryBtnText, { color: C.textPrimary }]}>
                {code ? 'Regenerate' : 'Generate Code'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// --- 7. SUCCESS: Delivery Completed Card ---
type SuccessCardProps = {
  onRate: () => void;
  onViewPayment?: () => void;
  showPayment: boolean;
  hasRated?: boolean;
  C: ThemeColors;
};

export function DeliverySuccessCard({ onRate, onViewPayment, showPayment, hasRated, C }: SuccessCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.success + '44' }]}>
      <LinearGradient colors={[C.success + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.successHeader}>
        <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
          <LottieAnimation name="successCheck" loop={false} style={{ width: 110, height: 110 }} />
        </View>
        <Text style={[styles.successTitle, { color: C.textPrimary }]}>Parcel Delivered!</Text>
        <Text style={[styles.successSubtitle, { color: C.textMuted }]}>
          The journey was verified and safely completed.
        </Text>
      </View>

      {hasRated ? (
        <View style={[styles.secondaryBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Feather name="check" size={14} color={C.success} />
          <Text style={[styles.secondaryBtnText, { color: C.success, fontWeight: '600' }]}>Rating Submitted</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.primaryActionBtn,
            { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={onRate}
        >
          <Feather name="star" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionBtnText}>Rate Experience</Text>
        </Pressable>
      )}

      {showPayment && onViewPayment ? (
        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onViewPayment}
        >
          <Feather name="credit-card" size={14} color={C.textPrimary} />
          <Text style={[styles.secondaryBtnText, { color: C.textPrimary }]}>View Payment Details</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// --- MINIMAL STYLES ---
const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.mdl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  codeBox: {
    width: 54,
    height: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxText: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  primaryActionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  inputsStack: {
    gap: Spacing.xs + 2,
  },
  inputField: {
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.xs + 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.medium,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  radarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  headlineWrap: {
    gap: 4,
  },
  headlineTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  headlineNote: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  contactBtnText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryCodeTile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  deliveryCodeText: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    letterSpacing: 4,
  },
  successHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
