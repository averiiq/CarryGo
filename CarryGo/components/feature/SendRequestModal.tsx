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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

export function normalizeCity(val?: string) {
  return (val || '').trim().toLowerCase();
}

export function calculateParcelDeliveryPrice(
  weight: number,
  pricePerKg?: number,
  minFloor: number = 80
): number {
  const safeWeight = Math.max(0.1, weight || 0);
  const safeRate = pricePerKg && pricePerKg > 0 ? pricePerKg : 50;
  return Math.max(minFloor, Math.round(safeWeight * safeRate));
}

export function partitionMatchingParcels(
  parcels: Parcel[],
  trip: Pick<Trip, 'fromCity' | 'toCity' | 'availableCapacity'>
): { eligible: Parcel[]; overweight: Parcel[] } {
  const normFrom = normalizeCity(trip.fromCity);
  const normTo = normalizeCity(trip.toCity);
  const maxCap = trip.availableCapacity || 0;

  const eligible: Parcel[] = [];
  const overweight: Parcel[] = [];

  for (const parcel of parcels) {
    if (parcel.status !== 'open') continue;
    if (normalizeCity(parcel.fromCity) !== normFrom || normalizeCity(parcel.toCity) !== normTo) {
      continue;
    }
    if (parcel.weight <= maxCap) {
      eligible.push(parcel);
    } else {
      overweight.push(parcel);
    }
  }

  return { eligible, overweight };
}

const CATEGORY_ITEMS: { id: Parcel['category']; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'documents', label: 'Documents', icon: 'description' },
  { id: 'electronics', label: 'Tech & Gadgets', icon: 'devices' },
  { id: 'clothing', label: 'Clothing', icon: 'checkroom' },
  { id: 'medicine', label: 'Medicine', icon: 'medical-services' },
  { id: 'food', label: 'Food / Packaged', icon: 'restaurant' },
  { id: 'other', label: 'Other', icon: 'inventory-2' },
];

export interface QuickCreateParcelParams {
  category: Parcel['category'];
  weight: number;
  description: string;
}

interface SendRequestModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
  userParcels: Parcel[];
  onConfirmRequest: (parcelId: string, trip: Trip, calculatedPrice: number) => Promise<void>;
  onCreateParcel: (fromCity: string, toCity: string) => void;
  onQuickCreateAndRequest?: (params: QuickCreateParcelParams, trip: Trip, calculatedPrice: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function SendRequestModal({
  visible,
  onClose,
  trip,
  userParcels,
  onConfirmRequest,
  onCreateParcel,
  onQuickCreateAndRequest,
  isSubmitting = false,
}: SendRequestModalProps) {
  const { C } = useThemeColors();
  const maxCapacity = trip?.availableCapacity || 10;
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<'existing' | 'quick'>('quick');

  // Quick Instant Booking state with clamped default weight
  const [quickCategory, setQuickCategory] = useState<Parcel['category']>('documents');
  const [quickWeight, setQuickWeight] = useState<number>(() => Math.min(1, Math.max(0.5, trip?.availableCapacity || 1)));
  const [quickDescription, setQuickDescription] = useState<string>('');

  const { eligible: matchingParcels, overweight: overweightParcels } = useMemo(() => {
    if (!trip) return { eligible: [], overweight: [] };
    return partitionMatchingParcels(userParcels, trip);
  }, [trip, userParcels]);

  useEffect(() => {
    if (matchingParcels.length > 0) {
      setBookingMode('existing');
      setSelectedParcelId(matchingParcels[0].id);
    } else {
      setBookingMode('quick');
      setSelectedParcelId(null);
    }
  }, [matchingParcels]);

  const weightPresets = useMemo(() => {
    const raw = [0.5, 1, 2, 3, 5];
    const filtered = raw.filter((w) => w <= maxCapacity);
    if (maxCapacity > 0.5 && !filtered.includes(maxCapacity) && maxCapacity <= 10) {
      filtered.push(maxCapacity);
      filtered.sort((a, b) => a - b);
    }
    return filtered.length > 0 ? filtered : [Math.min(0.5, maxCapacity)];
  }, [maxCapacity]);

  if (!trip) return null;

  const selectedParcel = matchingParcels.find((p) => p.id === selectedParcelId) || matchingParcels[0];
  const calculatedCost = selectedParcel
    ? calculateParcelDeliveryPrice(selectedParcel.weight, trip.pricePerKg)
    : 0;

  const quickCalculatedCost = calculateParcelDeliveryPrice(quickWeight, trip.pricePerKg);

  const handleAdjustWeight = (delta: number) => {
    Haptic.select();
    setQuickWeight((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      if (next < 0.5) return 0.5;
      if (next > maxCapacity) return maxCapacity;
      return next;
    });
  };

  const handleConfirm = async () => {
    if (bookingMode === 'existing') {
      if (!selectedParcelId || isSubmitting) return;
      Haptic.confirm();
      await onConfirmRequest(selectedParcelId, trip, calculatedCost);
    } else {
      if (isSubmitting) return;
      Haptic.confirm();
      if (onQuickCreateAndRequest) {
        await onQuickCreateAndRequest(
          {
            category: quickCategory,
            weight: quickWeight,
            description: quickDescription.trim() || `${quickCategory.toUpperCase()} package delivery`,
          },
          trip,
          quickCalculatedCost
        );
      } else {
        onClose();
        onCreateParcel(trip.fromCity, trip.toCity);
      }
    }
  };

  const activeCost = bookingMode === 'existing' ? calculatedCost : quickCalculatedCost;

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
    >
      <View style={styles.sheetContainer}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.avatarWrap, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.avatarText, { color: C.primary }]}>
                {trip.userName ? trip.userName.charAt(0).toUpperCase() : 'T'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>
                  Request {trip.userName}
                </Text>
                <View style={styles.ratingPill}>
                  <MaterialIcons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{(trip.userRating || 4.8).toFixed(1)}</Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: C.textMuted }]}>
                {trip.date} • {trip.availableCapacity} kg space available
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
            accessibilityLabel="Close request modal"
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
              <Text style={[styles.routeCityName, { color: C.textPrimary }]}>{trip.fromCity}</Text>
            </View>
            <View style={[styles.routeArrowCircle, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
            </View>
            <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.routeCityLabel, { color: C.textMuted }]}>DESTINATION</Text>
              <Text style={[styles.routeCityName, { color: C.textPrimary }]}>{trip.toCity}</Text>
            </View>
          </View>

          {/* Mode Switcher if user has pre-existing parcels */}
          {matchingParcels.length > 0 ? (
            <View style={[styles.modeToggleWrap, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setBookingMode('existing');
                }}
                style={[
                  styles.modeToggleTab,
                  bookingMode === 'existing' && { backgroundColor: C.primary },
                ]}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={14}
                  color={bookingMode === 'existing' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: bookingMode === 'existing' ? '#FFFFFF' : C.textSecondary },
                  ]}
                >
                  My Saved Parcels ({matchingParcels.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setBookingMode('quick');
                }}
                style={[
                  styles.modeToggleTab,
                  bookingMode === 'quick' && { backgroundColor: C.primary },
                ]}
              >
                <MaterialIcons
                  name="bolt"
                  size={14}
                  color={bookingMode === 'quick' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: bookingMode === 'quick' ? '#FFFFFF' : C.textSecondary },
                  ]}
                >
                  New Package
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Existing Parcels List View */}
          {bookingMode === 'existing' && matchingParcels.length > 0 ? (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Choose Parcel to Send</Text>
              <View style={styles.parcelList}>
                {matchingParcels.map((parcel) => {
                  const isSel = selectedParcelId === parcel.id;
                  const itemCost = calculateParcelDeliveryPrice(parcel.weight, trip.pricePerKg);
                  return (
                    <Pressable
                      key={parcel.id}
                      onPress={() => {
                        Haptic.tap();
                        setSelectedParcelId(parcel.id);
                      }}
                      style={[
                        styles.parcelItemCard,
                        {
                          backgroundColor: isSel ? C.primarySubtle : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <View style={styles.parcelItemLeft}>
                        <View style={[styles.radioDotCircle, { borderColor: isSel ? C.primary : C.textMuted }]}>
                          {isSel ? <View style={[styles.radioDotInner, { backgroundColor: C.primary }]} /> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.parcelItemTitle, { color: C.textPrimary }]}>
                            {parcel.category.toUpperCase()} • {parcel.weight} kg
                          </Text>
                          <Text style={[styles.parcelItemDesc, { color: C.textMuted }]} numberOfLines={1}>
                            {parcel.description || 'Package delivery'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.parcelItemRight}>
                        <Text style={[styles.parcelItemCost, { color: C.primaryDark }]}>₹{itemCost}</Text>
                        <Text style={[styles.parcelItemCostSub, { color: C.textMuted }]}>Total</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {overweightParcels.length > 0 ? (
                <View style={[styles.overweightNotice, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <MaterialIcons name="info-outline" size={14} color={C.textMuted} />
                  <Text style={[styles.overweightNoticeText, { color: C.textMuted }]}>
                    {overweightParcels.length} saved {overweightParcels.length === 1 ? 'parcel exceeds' : 'parcels exceed'} traveler's available capacity ({trip.availableCapacity} kg)
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            /* Quick Package Form */
            <View style={styles.sectionWrap}>
              {overweightParcels.length > 0 ? (
                <View style={[styles.overweightNotice, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, marginBottom: Spacing.md }]}>
                  <MaterialIcons name="info-outline" size={14} color={C.warning} />
                  <Text style={[styles.overweightNoticeText, { color: C.textSecondary }]}>
                    Your saved {overweightParcels.length === 1 ? 'parcel' : 'parcels'} on this route exceed the traveler's space ({trip.availableCapacity} kg). Specify a package that fits below:
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Package Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_ITEMS.map((cat) => {
                  const isSel = quickCategory === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        Haptic.select();
                        setQuickCategory(cat.id);
                      }}
                      style={[
                        styles.catCard,
                        {
                          backgroundColor: isSel ? C.primarySubtle : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <MaterialIcons name={cat.icon} size={18} color={isSel ? C.primary : C.textSecondary} />
                      <Text
                        style={[
                          styles.catLabel,
                          { color: isSel ? C.primaryDark : C.textSecondary, fontWeight: isSel ? '700' : '500' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Weight Stepper */}
              <View style={styles.weightSection}>
                <View style={styles.weightHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: C.textPrimary, marginBottom: 0 }]}>
                    Weight (kg)
                  </Text>
                  <Text style={[styles.rateNote, { color: C.textMuted }]}>
                    ₹{trip.pricePerKg}/kg (Max: {maxCapacity}kg)
                  </Text>
                </View>

                <View style={[styles.stepperContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  <Pressable
                    onPress={() => handleAdjustWeight(-0.5)}
                    style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                    hitSlop={8}
                  >
                    <MaterialIcons name="remove" size={20} color={C.textPrimary} />
                  </Pressable>
                  <View style={styles.stepperValueCol}>
                    <Text style={[styles.stepperValueText, { color: C.primary }]}>{quickWeight.toFixed(1)} kg</Text>
                  </View>
                  <Pressable
                    onPress={() => handleAdjustWeight(0.5)}
                    style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                    hitSlop={8}
                  >
                    <MaterialIcons name="add" size={20} color={C.textPrimary} />
                  </Pressable>
                </View>

                {/* Quick Weight Chips */}
                <View style={styles.chipRow}>
                  {weightPresets.map((w) => {
                    const isSel = quickWeight === w;
                    return (
                      <Pressable
                        key={w}
                        onPress={() => {
                          Haptic.select();
                          setQuickWeight(w);
                        }}
                        style={[
                          styles.weightChip,
                          {
                            backgroundColor: isSel ? C.primary : C.surfaceElevated,
                            borderColor: isSel ? C.primary : C.surfaceBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.weightChipText, { color: isSel ? '#FFFFFF' : C.textSecondary }]}>
                          {w} kg
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Optional Package Note */}
              <View style={styles.noteSection}>
                <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Brief Note (Optional)</Text>
                <TextInput
                  value={quickDescription}
                  onChangeText={setQuickDescription}
                  placeholder="e.g. Legal documents in waterproof envelope"
                  placeholderTextColor={C.textMuted}
                  maxLength={100}
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.surfaceBorder,
                      color: C.textPrimary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Pricing & Escrow Trust Guarantee */}
          <View style={[styles.pricingCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={styles.pricingLeft}>
              <View style={styles.escrowHeaderRow}>
                <MaterialIcons name="verified-user" size={16} color="#059669" />
                <Text style={styles.escrowTitle}>100% Escrow Protected</Text>
              </View>
              <Text style={styles.escrowSub}>
                Funds are held safely and only released after delivery OTP is verified.
              </Text>
            </View>
            <View style={styles.pricingRight}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalPrice}>₹{activeCost}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA Button */}
        <View style={[styles.footer, { borderTopColor: C.surfaceBorder }]}>
          <Pressable
            onPress={handleConfirm}
            disabled={isSubmitting || (bookingMode === 'existing' && !selectedParcelId)}
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
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  Send Delivery Request • ₹{activeCost}
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
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#92400E',
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
  parcelList: {
    gap: 8,
  },
  parcelItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  parcelItemLeft: {
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
  parcelItemTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  parcelItemDesc: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
  },
  parcelItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  parcelItemCost: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  parcelItemCostSub: {
    fontSize: 9,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  catLabel: {
    fontSize: FontSize.xs,
  },
  weightSection: {
    marginBottom: Spacing.md,
  },
  weightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rateNote: {
    fontSize: FontSize.xs - 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueCol: {
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weightChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  weightChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  noteSection: {
    marginBottom: Spacing.md,
  },
  noteInput: {
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    fontSize: FontSize.xs,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  pricingLeft: {
    flex: 1,
    paddingRight: 10,
  },
  escrowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  escrowTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  escrowSub: {
    fontSize: 10,
    color: '#047857',
    lineHeight: 14,
  },
  pricingRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#047857',
  },
  totalPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: '#065F46',
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
  overweightNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 8,
  },
  overweightNoticeText: {
    fontSize: FontSize.xs - 1,
    flex: 1,
  },
});
