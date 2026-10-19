import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

function normalizeCity(val?: string) {
  return (val || '').trim().toLowerCase();
}

const VEHICLE_OPTIONS: { id: Trip['vehicleType']; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'car', label: 'Car', icon: 'directions-car' },
  { id: 'train', label: 'Train', icon: 'train' },
  { id: 'flight', label: 'Flight', icon: 'flight' },
  { id: 'bike', label: 'Bike', icon: 'two-wheeler' },
  { id: 'bus', label: 'Bus', icon: 'directions-bus' },
];

export interface QuickCarryTripParams {
  vehicleType: Trip['vehicleType'];
  date: string;
  time: string;
  capacity: number;
}

interface CarryParcelModalProps {
  visible: boolean;
  onClose: () => void;
  parcel: Parcel | null;
  userTrips: Trip[];
  onConfirmCarry: (tripId: string, parcel: Parcel) => Promise<void>;
  onPostTrip: (fromCity: string, toCity: string, weightNeeded: number) => void;
  onQuickCreateAndCarry?: (params: QuickCarryTripParams, parcel: Parcel) => Promise<void>;
  isSubmitting?: boolean;
}

export function CarryParcelModal({
  visible,
  onClose,
  parcel,
  userTrips,
  onConfirmCarry,
  onPostTrip,
  onQuickCreateAndCarry,
  isSubmitting = false,
}: CarryParcelModalProps) {
  const { C } = useThemeColors();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [carryMode, setCarryMode] = useState<'existing' | 'quick'>('quick');

  const [quickVehicle, setQuickVehicle] = useState<Trip['vehicleType']>('car');
  const [quickDateOption, setQuickDateOption] = useState<'today' | 'tomorrow' | 'day_after'>('today');

  const matchingTrips = useMemo(() => {
    if (!parcel) return [];
    return userTrips.filter((trip) => {
      const active = trip.status === 'active';
      const routeMatch =
        normalizeCity(trip.fromCity) === normalizeCity(parcel.fromCity) &&
        normalizeCity(trip.toCity) === normalizeCity(parcel.toCity);
      const capacityMatch = (trip.availableCapacity || 0) >= parcel.weight;
      return active && routeMatch && capacityMatch;
    });
  }, [parcel, userTrips]);

  useEffect(() => {
    if (matchingTrips.length > 0) {
      setCarryMode('existing');
      setSelectedTripId(matchingTrips[0].id);
    } else {
      setCarryMode('quick');
      setSelectedTripId(null);
    }
  }, [matchingTrips]);

  if (!parcel) return null;

  const getSelectedDateIso = () => {
    const d = new Date();
    if (quickDateOption === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (quickDateOption === 'day_after') {
      d.setDate(d.getDate() + 2);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleConfirm = async () => {
    if (carryMode === 'existing') {
      if (!selectedTripId || isSubmitting) return;
      Haptic.confirm();
      await onConfirmCarry(selectedTripId, parcel);
    } else {
      if (isSubmitting) return;
      Haptic.confirm();
      if (onQuickCreateAndCarry) {
        await onQuickCreateAndCarry(
          {
            vehicleType: quickVehicle,
            date: getSelectedDateIso(),
            time: '10:00 AM',
            capacity: Math.max(10, Math.ceil(parcel.weight + 4)),
          },
          parcel
        );
      } else {
        onClose();
        onPostTrip(parcel.fromCity, parcel.toCity, parcel.weight);
      }
    }
  };

  const avatarUri =
    parcel.userAvatar ||
    (parcel as any).avatar ||
    (parcel as any).avatar_url ||
    (parcel as any).user_avatar ||
    (parcel as any).selfieUrl ||
    (parcel as any).userSelfieUrl;

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="90%"
    >
      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.avatarWrap, { backgroundColor: C.primarySubtle }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={[styles.avatarText, { color: C.primary }]}>
                  {parcel.userName ? parcel.userName.charAt(0).toUpperCase() : 'S'}
                </Text>
              )}
              <View style={styles.verifiedDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>
                Deliver for {parcel.userName}
              </Text>
              <Text style={[styles.subtitle, { color: C.textMuted }]}>
                {parcel.category.toUpperCase()} • {parcel.weight} kg
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close deliver parcel modal"
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Route Capsule */}
          <View style={[styles.routeCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.routeCityCol}>
              <Text style={[styles.routeCityLabel, { color: C.textMuted }]}>PICKUP</Text>
              <Text style={[styles.routeCityName, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
            </View>
            <View style={[styles.routeArrowCircle, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
            </View>
            <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.routeCityLabel, { color: C.textMuted }]}>DROP-OFF</Text>
              <Text style={[styles.routeCityName, { color: C.textPrimary }]}>{parcel.toCity}</Text>
            </View>
          </View>

          {/* Earnings Spotlight Card */}
          <View style={[styles.payoutCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.payoutIconCircle}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payoutLabel}>YOU WILL EARN</Text>
              <Text style={styles.payoutAmount}>₹{parcel.priceOffer}</Text>
              <Text style={styles.payoutSub}>
                Guaranteed payout released to your wallet upon delivery OTP verification.
              </Text>
            </View>
          </View>

          {/* Mode Switcher if user already has matching trips */}
          {matchingTrips.length > 0 ? (
            <View style={[styles.modeToggleWrap, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setCarryMode('existing');
                }}
                style={[
                  styles.modeToggleTab,
                  carryMode === 'existing' && { backgroundColor: C.primary },
                ]}
              >
                <MaterialIcons
                  name="flight-takeoff"
                  size={14}
                  color={carryMode === 'existing' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: carryMode === 'existing' ? '#FFFFFF' : C.textSecondary },
                  ]}
                >
                  My Routes ({matchingTrips.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setCarryMode('quick');
                }}
                style={[
                  styles.modeToggleTab,
                  carryMode === 'quick' && { backgroundColor: C.primary },
                ]}
              >
                <MaterialIcons
                  name="bolt"
                  size={14}
                  color={carryMode === 'quick' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: carryMode === 'quick' ? '#FFFFFF' : C.textSecondary },
                  ]}
                >
                  New Route Offer
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Existing Trip Selection */}
          {carryMode === 'existing' && matchingTrips.length > 0 ? (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Choose Your Trip</Text>
              <View style={styles.tripList}>
                {matchingTrips.map((trip) => {
                  const isSel = selectedTripId === trip.id;
                  return (
                    <Pressable
                      key={trip.id}
                      onPress={() => {
                        Haptic.tap();
                        setSelectedTripId(trip.id);
                      }}
                      style={[
                        styles.tripItemCard,
                        {
                          backgroundColor: isSel ? C.primarySubtle : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <View style={styles.tripItemLeft}>
                        <View style={[styles.radioDotCircle, { borderColor: isSel ? C.primary : C.textMuted }]}>
                          {isSel ? <View style={[styles.radioDotInner, { backgroundColor: C.primary }]} /> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tripItemTitle, { color: C.textPrimary }]}>
                            {trip.date} • {trip.vehicleType.toUpperCase()}
                          </Text>
                          <Text style={[styles.tripItemDesc, { color: C.textMuted }]}>
                            {trip.availableCapacity} kg capacity available
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Quick Trip Creation Form */
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>How are you traveling?</Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_OPTIONS.map((v) => {
                  const isSel = quickVehicle === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => {
                        Haptic.select();
                        setQuickVehicle(v.id);
                      }}
                      style={[
                        styles.vehicleCard,
                        {
                          backgroundColor: isSel ? C.primarySubtle : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <MaterialIcons name={v.icon} size={18} color={isSel ? C.primary : C.textSecondary} />
                      <Text
                        style={[
                          styles.vehicleLabel,
                          { color: isSel ? C.primaryDark : C.textSecondary, fontWeight: isSel ? '700' : '500' },
                        ]}
                      >
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionHeading, { color: C.textPrimary, marginTop: Spacing.sm }]}>
                Departure Schedule
              </Text>
              <View style={styles.dateOptionRow}>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'tomorrow', label: 'Tomorrow' },
                  { key: 'day_after', label: 'In 2 Days' },
                ].map((d) => {
                  const isSel = quickDateOption === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => {
                        Haptic.select();
                        setQuickDateOption(d.key as any);
                      }}
                      style={[
                        styles.dateOptionPill,
                        {
                          backgroundColor: isSel ? C.primary : C.surfaceElevated,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          { color: isSel ? '#FFFFFF' : C.textSecondary, fontWeight: isSel ? '700' : '500' },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Workflow Steps Preview */}
          <View style={[styles.flowCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.flowTitle, { color: C.textMuted }]}>HOW CARRYING WORKS</Text>
            <View style={styles.flowSteps}>
              <View style={styles.flowStepItem}>
                <View style={[styles.flowNum, { backgroundColor: C.primary }]}>
                  <Text style={styles.flowNumText}>1</Text>
                </View>
                <Text style={[styles.flowText, { color: C.textSecondary }]}>Send Offer</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepItem}>
                <View style={[styles.flowNum, { backgroundColor: C.surfaceElevated }]}>
                  <Text style={[styles.flowNumText, { color: C.textSecondary }]}>2</Text>
                </View>
                <Text style={[styles.flowText, { color: C.textSecondary }]}>Sender Accepts</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepItem}>
                <View style={[styles.flowNum, { backgroundColor: C.surfaceElevated }]}>
                  <Text style={[styles.flowNumText, { color: C.textSecondary }]}>3</Text>
                </View>
                <Text style={[styles.flowText, { color: C.textSecondary }]}>Deliver & Earn</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.footer, { borderTopColor: C.surfaceBorder }]}>
          <Pressable
            onPress={handleConfirm}
            disabled={isSubmitting || (carryMode === 'existing' && !selectedTripId)}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: C.primary },
              isSubmitting && { opacity: 0.6 },
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  Send Carry Offer • Earn ₹{parcel.priceOffer}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    paddingBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    maxHeight: 520,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  routeCityCol: {
    flex: 1,
  },
  routeCityLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  routeCityName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  routeArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 12,
  },
  payoutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  payoutAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: '#047857',
    marginVertical: 1,
  },
  payoutSub: {
    fontSize: 10,
    color: '#065F46',
    lineHeight: 14,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  modeToggleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  sectionWrap: {
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs + 2,
  },
  tripList: {
    gap: 8,
  },
  tripItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tripItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioDotCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tripItemTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  tripItemDesc: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  vehicleLabel: {
    fontSize: 10,
  },
  dateOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dateOptionPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dateOptionText: {
    fontSize: FontSize.xs,
  },
  flowCard: {
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  flowTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  flowSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  flowText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
});
