import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { getUserAvatarSource } from '@/constants/images';

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
  onConfirmCarry: (tripId: string, parcel: Parcel, chargeAmount: number, message?: string) => Promise<void>;
  onPostTrip: (fromCity: string, toCity: string, weightNeeded: number) => void;
  onQuickCreateAndCarry?: (params: QuickCarryTripParams, parcel: Parcel, chargeAmount: number, message?: string) => Promise<void>;
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

  const [chargeText, setChargeText] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [chargeError, setChargeError] = useState<string | null>(null);

  useEffect(() => {
    if (parcel) {
      const defaultCharge =
        parcel.priceOffer && parcel.priceOffer > 0
          ? parcel.priceOffer
          : Math.max(100, Math.round((parcel.weight || 1) * 50));
      setChargeText(String(defaultCharge));
      setCustomNote('');
      setChargeError(null);
    }
  }, [parcel, visible]);

  const parsedCharge = useMemo(() => {
    const num = parseInt(chargeText.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }, [chargeText]);

  const isValidCharge = parsedCharge >= 1 && parsedCharge <= 100000;

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
    if (!isValidCharge) {
      setChargeError('Please enter a delivery charge between ₹1 and ₹1,00,000');
      Haptic.error();
      return;
    }
    setChargeError(null);

    if (carryMode === 'existing') {
      if (!selectedTripId || isSubmitting) return;
      Haptic.confirm();
      await onConfirmCarry(selectedTripId, parcel, parsedCharge, customNote.trim() || undefined);
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
          parcel,
          parsedCharge,
          customNote.trim() || undefined
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
              <Image
                source={getUserAvatarSource(avatarUri, parcel.userId || parcel.id || parcel.userName)}
                style={styles.avatarImage}
                contentFit="cover"
              />
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

          {/* Custom Delivery Charge Input Card */}
          <View style={[styles.chargeCard, { backgroundColor: C.surface, borderColor: chargeError ? C.error : C.surfaceBorder }]}>
            <View style={styles.chargeHeader}>
              <View style={[styles.chargeIconWrap, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="payments" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chargeTitle, { color: C.textPrimary }]}>How much will you charge?</Text>
                <Text style={[styles.chargeSubtitle, { color: C.textMuted }]}>
                  {parcel.priceOffer && parcel.priceOffer > 0
                    ? `Sender offered ₹${parcel.priceOffer} • You can adjust or accept`
                    : 'Set your delivery fee for carrying this package'}
                </Text>
              </View>
            </View>

            <View style={[styles.chargeInputRow, { backgroundColor: C.surfaceElevated, borderColor: chargeError ? C.error : C.surfaceBorder }]}>
              <Text style={[styles.currencyPrefix, { color: C.primary }]}>₹</Text>
              <TextInput
                style={[styles.chargeInput, { color: C.textPrimary }]}
                keyboardType="number-pad"
                value={chargeText}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setChargeText(cleaned);
                  if (chargeError) setChargeError(null);
                }}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                maxLength={6}
              />
              <Text style={[styles.chargeUnit, { color: C.textMuted }]}>total fee</Text>
            </View>

            {chargeError ? (
              <Text style={[styles.errorText, { color: C.error }]}>{chargeError}</Text>
            ) : null}

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {parcel.priceOffer && parcel.priceOffer > 0 && parcel.priceOffer !== parsedCharge ? (
                <Pressable
                  onPress={() => {
                    Haptic.select();
                    setChargeText(String(parcel.priceOffer));
                    if (chargeError) setChargeError(null);
                  }}
                  style={[styles.presetChip, { backgroundColor: C.primarySubtle, borderColor: C.primary }]}
                >
                  <MaterialIcons name="done" size={13} color={C.primary} />
                  <Text style={[styles.presetChipText, { color: C.primary, fontWeight: '700' }]}>
                    Match ₹{parcel.priceOffer}
                  </Text>
                </Pressable>
              ) : null}
              {[100, 200, 300, 500].map((amt) => {
                const isSelected = parsedCharge === amt;
                return (
                  <Pressable
                    key={amt}
                    onPress={() => {
                      Haptic.select();
                      setChargeText(String(amt));
                      if (chargeError) setChargeError(null);
                    }}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? C.primary : C.surfaceElevated,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: isSelected ? '#FFFFFF' : C.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      ₹{amt}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setChargeText(String(Math.min(100000, (parsedCharge || 0) + 50)));
                  if (chargeError) setChargeError(null);
                }}
                style={[styles.presetChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              >
                <Text style={[styles.presetChipText, { color: C.textSecondary }]}>+₹50</Text>
              </Pressable>
            </View>

            {/* Optional note to sender */}
            <View style={styles.noteWrap}>
              <TextInput
                style={[styles.noteInput, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, color: C.textPrimary }]}
                placeholder="Add a note to sender (pickup time, flexible stops)..."
                placeholderTextColor={C.textMuted}
                value={customNote}
                onChangeText={setCustomNote}
                maxLength={200}
              />
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
            disabled={isSubmitting || !isValidCharge || (carryMode === 'existing' && !selectedTripId)}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: C.primary },
              (isSubmitting || !isValidCharge) && { opacity: 0.6 },
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  Send Carry Offer • ₹{parsedCharge > 0 ? parsedCharge : 0}
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
  chargeCard: {
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs + 2,
  },
  chargeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  chargeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  chargeSubtitle: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
  },
  chargeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    height: 48,
  },
  currencyPrefix: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginRight: 6,
  },
  chargeInput: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    paddingVertical: 0,
  },
  chargeUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  errorText: {
    fontSize: FontSize.xs - 1,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: FontSize.xs,
  },
  noteWrap: {
    marginTop: 4,
  },
  noteInput: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
