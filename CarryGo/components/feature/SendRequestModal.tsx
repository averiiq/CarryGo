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
import { resolveImageUrl, getUserAvatarSource, DEFAULT_AVATAR_ASSET } from '@/constants/images';
import { findCity, getDistance } from '@/constants/indian-cities';
import { areCitiesEquivalent } from '@/services/route-compatibility.service';
import { calculateLegPrice } from '@/components/feature/matching/blaBlaHelpers';

export function normalizeCity(val?: string) {
  return (val || '').trim().toLowerCase();
}

export function isParcelOnTripRoute(
  parcelFrom: string,
  parcelTo: string,
  tripFrom: string,
  tripTo: string,
  stopovers: string[] = []
): { isMatch: boolean; matchedFrom: string; matchedTo: string; isSubSegment: boolean } {
  const fullSequence = [tripFrom, ...stopovers, tripTo].filter(Boolean);
  let fromIndex = -1;
  let toIndex = -1;
  let matchedFrom = tripFrom;
  let matchedTo = tripTo;

  for (let i = 0; i < fullSequence.length; i++) {
    if (areCitiesEquivalent(fullSequence[i], parcelFrom)) {
      fromIndex = i;
      matchedFrom = fullSequence[i];
      break;
    }
  }

  for (let j = fullSequence.length - 1; j >= 0; j--) {
    if (areCitiesEquivalent(fullSequence[j], parcelTo)) {
      toIndex = j;
      matchedTo = fullSequence[j];
      break;
    }
  }

  if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
    const isSubSegment = !(fromIndex === 0 && toIndex === fullSequence.length - 1);
    return { isMatch: true, matchedFrom, matchedTo, isSubSegment };
  }

  return { isMatch: false, matchedFrom: tripFrom, matchedTo: tripTo, isSubSegment: false };
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
  trip: Pick<Trip, 'fromCity' | 'toCity' | 'availableCapacity'> & { stopovers?: string[]; allowedCategories?: Parcel['category'][] }
): { eligible: Parcel[]; overweight: Parcel[]; incompatibleCategory: Parcel[] } {
  const maxCap = trip.availableCapacity || 0;
  const eligible: Parcel[] = [];
  const overweight: Parcel[] = [];
  const incompatibleCategory: Parcel[] = [];

  const allowedSet = trip.allowedCategories && trip.allowedCategories.length > 0
    ? new Set(trip.allowedCategories.map((c) => String(c).trim().toLowerCase()))
    : null;

  for (const parcel of parcels) {
    if (parcel.status !== 'open') continue;
    const match = isParcelOnTripRoute(
      parcel.fromCity,
      parcel.toCity,
      trip.fromCity,
      trip.toCity,
      trip.stopovers || []
    );
    if (!match.isMatch) continue;

    if (allowedSet && !allowedSet.has(String(parcel.category || '').trim().toLowerCase())) {
      incompatibleCategory.push(parcel);
      continue;
    }

    if (parcel.weight <= maxCap) {
      eligible.push(parcel);
    } else {
      overweight.push(parcel);
    }
  }

  return { eligible, overweight, incompatibleCategory };
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
  fromCity?: string;
  toCity?: string;
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
  initialFromCity?: string;
  initialToCity?: string;
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
  initialFromCity,
  initialToCity,
}: SendRequestModalProps) {
  const { C, isDark } = useThemeColors();
  const maxCapacity = trip?.availableCapacity || 10;
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<'existing' | 'quick'>('quick');

  const allRouteStops = useMemo(() => {
    if (!trip) return [];
    const stops = (trip.stopovers || []).map((s) => String(s || '').trim()).filter(Boolean);
    return [trip.fromCity, ...stops, trip.toCity];
  }, [trip]);

  const [pickupCity, setPickupCity] = useState<string>(() => {
    if (initialFromCity && allRouteStops.includes(initialFromCity)) return initialFromCity;
    return trip?.fromCity || '';
  });

  const [dropoffCity, setDropoffCity] = useState<string>(() => {
    if (initialToCity && allRouteStops.includes(initialToCity)) return initialToCity;
    return trip?.toCity || '';
  });

  useEffect(() => {
    if (initialFromCity && allRouteStops.includes(initialFromCity)) {
      setPickupCity(initialFromCity);
    } else if (trip?.fromCity) {
      setPickupCity(trip.fromCity);
    }
  }, [initialFromCity, trip?.fromCity, allRouteStops]);

  useEffect(() => {
    if (initialToCity && allRouteStops.includes(initialToCity)) {
      setDropoffCity(initialToCity);
    } else if (trip?.toCity) {
      setDropoffCity(trip.toCity);
    }
  }, [initialToCity, trip?.toCity, allRouteStops]);

  const pickupIndex = allRouteStops.indexOf(pickupCity);
  const availableDropoffStops = useMemo(() => {
    if (pickupIndex === -1) return allRouteStops.slice(1);
    return allRouteStops.slice(pickupIndex + 1);
  }, [allRouteStops, pickupIndex]);

  useEffect(() => {
    if (availableDropoffStops.length > 0 && !availableDropoffStops.includes(dropoffCity)) {
      setDropoffCity(availableDropoffStops[availableDropoffStops.length - 1]);
    }
  }, [availableDropoffStops, dropoffCity]);

  const isSubSegment = Boolean(
    trip && (pickupCity !== trip.fromCity || dropoffCity !== trip.toCity)
  );

  const legDistanceKm = useMemo(() => {
    const c1 = findCity(pickupCity);
    const c2 = findCity(dropoffCity);
    if (c1 && c2) return Math.round(getDistance(c1, c2));
    return 0;
  }, [pickupCity, dropoffCity]);

  const selectableCategoryItems = useMemo(() => {
    if (trip?.allowedCategories && trip.allowedCategories.length > 0) {
      const allowed = new Set(trip.allowedCategories.map((c) => String(c).trim().toLowerCase()));
      const filtered = CATEGORY_ITEMS.filter((item) => allowed.has(item.id.toLowerCase()));
      if (filtered.length > 0) return filtered;
    }
    return CATEGORY_ITEMS;
  }, [trip?.allowedCategories]);

  // Quick Instant Booking state with clamped default weight
  const [quickCategory, setQuickCategory] = useState<Parcel['category']>(() => selectableCategoryItems[0]?.id || 'documents');
  const [quickWeight, setQuickWeight] = useState<number>(() => Math.min(1, Math.max(0.5, trip?.availableCapacity || 1)));
  const [quickDescription, setQuickDescription] = useState<string>('');

  useEffect(() => {
    if (selectableCategoryItems.length > 0) {
      const isAllowed = selectableCategoryItems.some((item) => item.id === quickCategory);
      if (!isAllowed) {
        setQuickCategory(selectableCategoryItems[0].id);
      }
    }
  }, [selectableCategoryItems, quickCategory]);

  const { eligible: matchingParcels, overweight: overweightParcels } = useMemo(() => {
    if (!trip) return { eligible: [], overweight: [] };
    return partitionMatchingParcels(userParcels, trip);
  }, [trip, userParcels]);

  // v2 (BlaBlaCar-style): single-path booking — always quick. The `existing`
  // branch below is unreachable and will be pruned in Phase 2 along with the
  // saved-parcels concept.

  const weightPresets = useMemo(() => {
    const raw = [0.5, 1, 2, 3, 5];
    const filtered = raw.filter((w) => w <= maxCapacity);
    if (maxCapacity > 0.5 && !filtered.includes(maxCapacity) && maxCapacity <= 10) {
      filtered.push(maxCapacity);
      filtered.sort((a, b) => a - b);
    }
    return filtered.length > 0 ? filtered : [Math.min(0.5, maxCapacity)];
  }, [maxCapacity]);

  const [avatarError, setAvatarError] = useState(false);

  if (!trip) return null;

  const rawAvatar =
    trip.userAvatar ||
    (trip as any).avatar ||
    (trip as any).avatar_url ||
    (trip as any).user_avatar ||
    (trip as any).selfieUrl ||
    (trip as any).userSelfieUrl;
  const resolvedAvatar = resolveImageUrl(rawAvatar);
  const selectedParcel = matchingParcels.find((p) => p.id === selectedParcelId) || matchingParcels[0];
  const calculatedCost = selectedParcel
    ? calculateParcelDeliveryPrice(selectedParcel.weight, trip.pricePerKg)
    : 0;

  const activePickup = bookingMode === 'existing' && selectedParcel ? selectedParcel.fromCity : pickupCity;
  const activeDropoff = bookingMode === 'existing' && selectedParcel ? selectedParcel.toCity : dropoffCity;

  const quickCalculatedCost = useMemo(() => {
    const base = calculateParcelDeliveryPrice(quickWeight, trip.pricePerKg);
    return calculateLegPrice(base, activePickup, activeDropoff, trip.fromCity, trip.toCity);
  }, [quickWeight, trip, activePickup, activeDropoff]);

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
      if (selectedParcel && trip?.allowedCategories && trip.allowedCategories.length > 0) {
        const allowed = new Set(trip.allowedCategories.map((c) => String(c).trim().toLowerCase()));
        if (!allowed.has(String(selectedParcel.category).toLowerCase())) {
          Haptic.warning();
          return;
        }
      }
      Haptic.confirm();
      await onConfirmRequest(selectedParcelId, trip, calculatedCost);
    } else {
      if (isSubmitting) return;
      if (selectableCategoryItems.length > 0 && !selectableCategoryItems.some((item) => item.id === quickCategory)) {
        Haptic.warning();
        return;
      }
      Haptic.confirm();
      if (onQuickCreateAndRequest) {
        await onQuickCreateAndRequest(
          {
            category: quickCategory,
            weight: quickWeight,
            description: quickDescription.trim() || `${quickCategory.toUpperCase()} package delivery`,
            fromCity: activePickup,
            toCity: activeDropoff,
          },
          trip,
          quickCalculatedCost
        );
      } else {
        onClose();
        onCreateParcel(activePickup, activeDropoff);
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
              <Image
                source={avatarError ? DEFAULT_AVATAR_ASSET : getUserAvatarSource(rawAvatar, trip.userId || trip.id || trip.userName)}
                style={styles.avatarImage}
                contentFit="cover"
                onError={() => setAvatarError(true)}
              />
              <View style={styles.verifiedDot} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>
                  Book with {trip.userName}
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
          {/* Route Capsule or Stopover Selector */}
          {allRouteStops.length > 2 ? (
            <View style={[styles.stopSelectorCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={styles.stopSelectorHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="alt-route" size={15} color="#008B48" />
                  <Text style={[styles.stopSelectorTitle, { color: C.textPrimary }]}>Choose Delivery Segment</Text>
                </View>
                {isSubSegment && legDistanceKm > 0 ? (
                  <View style={styles.subSegmentPill}>
                    <Text style={styles.subSegmentPillText}>{legDistanceKm} km leg</Text>
                  </View>
                ) : null}
              </View>

              {/* Pickup Stop row */}
              <View style={styles.stopPickRow}>
                <View style={styles.stopPickHeader}>
                  <Text style={[styles.stopPickLabel, { color: C.textMuted }]}>PICKUP AT</Text>
                  <Text style={[styles.stopPickVal, { color: '#004AAD' }]}>{pickupCity}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopsScroll}>
                  {allRouteStops.slice(0, allRouteStops.length - 1).map((stop) => {
                    const isSel = stop === pickupCity;
                    return (
                      <Pressable
                        key={`pick-${stop}`}
                        onPress={() => {
                          Haptic.tap();
                          setPickupCity(stop);
                        }}
                        style={[
                          styles.stopChip,
                          {
                            backgroundColor: isSel ? '#004AAD' : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                            borderColor: isSel ? '#004AAD' : C.surfaceBorder,
                          }
                        ]}
                      >
                        <Text style={[styles.stopChipText, { color: isSel ? '#FFFFFF' : C.textPrimary, fontWeight: isSel ? '700' : '500' }]}>
                          {stop}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Dropoff Stop row */}
              <View style={[styles.stopPickRow, { marginTop: 10 }]}>
                <View style={styles.stopPickHeader}>
                  <Text style={[styles.stopPickLabel, { color: C.textMuted }]}>DELIVER TO</Text>
                  <Text style={[styles.stopPickVal, { color: '#008B48' }]}>{dropoffCity}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopsScroll}>
                  {availableDropoffStops.map((stop) => {
                    const isSel = stop === dropoffCity;
                    return (
                      <Pressable
                        key={`drop-${stop}`}
                        onPress={() => {
                          Haptic.tap();
                          setDropoffCity(stop);
                        }}
                        style={[
                          styles.stopChip,
                          {
                            backgroundColor: isSel ? '#008B48' : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                            borderColor: isSel ? '#008B48' : C.surfaceBorder,
                          }
                        ]}
                      >
                        <Text style={[styles.stopChipText, { color: isSel ? '#FFFFFF' : C.textPrimary, fontWeight: isSel ? '700' : '500' }]}>
                          {stop}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          ) : (
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
          )}

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

              <View style={styles.categoryHeadingWrap}>
                <Text style={[styles.sectionHeading, { color: C.textPrimary, marginBottom: 0 }]}>Package Category</Text>
                {trip.allowedCategories && trip.allowedCategories.length > 0 ? (
                  <View style={[styles.allowedPillStrip, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                    <MaterialIcons name="check-circle" size={12} color={C.success} />
                    <Text style={[styles.allowedPillText, { color: C.textPrimary }]}>
                      {trip.userName || 'Traveller'} accepts {selectableCategoryItems.length === 1 ? 'only ' : ''}
                      <Text style={{ fontWeight: FontWeight.bold, color: C.success }}>
                        {selectableCategoryItems.map((c) => c.label).join(', ')}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.categoryGrid}>
                {selectableCategoryItems.map((cat) => {
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

          {/* Pricing & Booking Trust Guarantee */}
          <View style={[styles.pricingCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={styles.pricingLeft}>
              <View style={styles.trustHeaderRow}>
                <MaterialIcons name="verified-user" size={16} color="#008B48" />
                <Text style={styles.trustTitle}>100% Booking Protected</Text>
              </View>
              <Text style={styles.trustSub}>
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
                  Book Delivery • ₹{activeCost}
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
  stopSelectorCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.md,
  },
  stopSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stopSelectorTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  subSegmentPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  subSegmentPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  stopPickRow: {
    width: '100%',
  },
  stopPickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stopPickLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stopPickVal: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  stopsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  stopChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  stopChipText: {
    fontSize: 12,
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
  categoryHeadingWrap: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  allowedPillStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  allowedPillText: {
    fontSize: FontSize.xs - 1,
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
  trustHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  trustTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  trustSub: {
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
