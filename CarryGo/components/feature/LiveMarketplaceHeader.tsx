import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import type { Trip, Parcel } from '@/types';

export type MarketplaceSortOption = 'recent' | 'price' | 'capacity' | 'urgent';

export function formatCorridorLabel(fromCity?: string, toCity?: string): string | null {
  const f = fromCity?.trim();
  const t = toCity?.trim();
  if (!f && !t) return null;
  if (f && t) return `${f} ➔ ${t}`;
  if (f) return `From ${f}`;
  return `To ${t}`;
}

export function sortMarketplaceTrips(trips: Trip[], sortBy: MarketplaceSortOption): Trip[] {
  if (sortBy === 'price') {
    return [...trips].sort((a, b) => (a.pricePerKg || 0) - (b.pricePerKg || 0));
  }
  if (sortBy === 'capacity') {
    return [...trips].sort((a, b) => (b.availableCapacity || 0) - (a.availableCapacity || 0));
  }
  return trips;
}

export function sortMarketplaceParcels(parcels: Parcel[], sortBy: MarketplaceSortOption): Parcel[] {
  if (sortBy === 'price') {
    return [...parcels].sort((a, b) => (b.priceOffer || 0) - (a.priceOffer || 0));
  }
  if (sortBy === 'urgent') {
    return [...parcels].sort((a, b) => {
      const aUrgent = a.category === 'medicine' || a.category === 'documents' || (a.priceOffer || 0) >= 400 ? 1 : 0;
      const bUrgent = b.category === 'medicine' || b.category === 'documents' || (b.priceOffer || 0) >= 400 ? 1 : 0;
      return bUrgent - aUrgent;
    });
  }
  return parcels;
}

interface LiveMarketplaceHeaderProps {
  activeTab: 'trips' | 'parcels';
  onSelectTab: (tab: 'trips' | 'parcels') => void;
  tripsCount: number;
  parcelsCount: number;
  locationCity: string | null;
  onOpenCityPicker: () => void;
  onToggleAllIndia?: () => void;
  hasFilter: boolean;
  onOpenFilters: () => void;
  // Quick Filters
  selectedVehicle?: string;
  onSelectVehicle?: (vehicle: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  sortBy?: MarketplaceSortOption;
  onSelectSort?: (sort: MarketplaceSortOption) => void;
  // Route corridor info
  activeCorridor?: { fromCity?: string; toCity?: string };
  onClearCorridor?: () => void;
  onClearAllFilters?: () => void;
  tabIndicatorAnim: Animated.Value;
}

const VEHICLE_OPTIONS = [
  { id: '', label: 'All Modes', icon: 'apps' as const },
  { id: 'car', label: 'Car', icon: 'directions-car' as const },
  { id: 'train', label: 'Train', icon: 'train' as const },
  { id: 'flight', label: 'Flight', icon: 'flight' as const },
  { id: 'bike', label: 'Bike', icon: 'two-wheeler' as const },
];

const CATEGORY_OPTIONS = [
  { id: '', label: 'All Parcels', icon: 'category' as const },
  { id: 'documents', label: 'Docs', icon: 'description' as const },
  { id: 'electronics', label: 'Tech', icon: 'devices' as const },
  { id: 'clothing', label: 'Clothing', icon: 'checkroom' as const },
  { id: 'medicine', label: 'Medicine', icon: 'medical-services' as const },
];

export const LiveMarketplaceHeader = React.memo(function LiveMarketplaceHeader({
  activeTab,
  onSelectTab,
  tripsCount,
  parcelsCount,
  locationCity,
  onOpenCityPicker,
  onToggleAllIndia,
  hasFilter,
  onOpenFilters,
  selectedVehicle = '',
  onSelectVehicle,
  selectedCategory = '',
  onSelectCategory,
  sortBy = 'recent',
  onSelectSort,
  activeCorridor,
  onClearCorridor,
  onClearAllFilters,
  tabIndicatorAnim,
}: LiveMarketplaceHeaderProps) {
  const { C } = useThemeColors();

  // Pulse animation for live radar dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim, pulseOpacity]);

  const corridorLabel = formatCorridorLabel(activeCorridor?.fromCity, activeCorridor?.toCity);
  const hasActiveCorridor = Boolean(corridorLabel);

  return (
    <View style={styles.container}>
      {/* 1. Header Bar: Title with live radar indicator, plus Location & Filter Pills */}
      <View style={styles.topHeader}>
        <View style={styles.titleColumn}>
          <View style={styles.liveTagRow}>
            <View style={styles.radarWrapper}>
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  {
                    backgroundColor: C.primary,
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <View style={[styles.radarCoreDot, { backgroundColor: C.primary }]} />
            </View>
            <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Live Marketplace</Text>
          </View>
          {locationCity ? (
            <Text style={[styles.sectionSubtitle, { color: C.textMuted }]} numberOfLines={1}>
              Active in {locationCity}
            </Text>
          ) : null}
        </View>

        {/* Top Action Pills: Location City & Filter Settings */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={() => {
              Haptic.tap();
              onOpenCityPicker();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Location filter: ${locationCity || 'Choose City'}. Tap to switch city.`}
            style={({ pressed }) => [
              styles.locationPill,
              {
                backgroundColor: C.primarySubtle,
                borderColor: C.primary + '33',
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons
              name="place"
              size={13}
              color={C.primary}
            />
            <Text
              style={[
                styles.locationPillText,
                { color: C.primaryDark },
              ]}
              numberOfLines={1}
            >
              {locationCity || 'All India'}
            </Text>
            <MaterialIcons
              name="expand-more"
              size={14}
              color={C.primary}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptic.tap();
              onOpenFilters();
            }}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityRole="button"
            accessibilityLabel="Filter marketplace listings"
            style={({ pressed }) => [
              styles.filterIconBtn,
              {
                backgroundColor: hasFilter ? C.primarySubtle : C.surfaceElevated,
                borderColor: hasFilter ? C.primary : C.surfaceBorder,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
          >
            <MaterialIcons
              name="tune"
              size={17}
              color={hasFilter ? C.primary : C.textSecondary}
            />
            {hasFilter ? <View style={[styles.filterActiveDot, { backgroundColor: C.primary }]} /> : null}
          </Pressable>
        </View>
      </View>

      {/* 2. Corridor Filter Pill if Active */}
      {hasActiveCorridor ? (
        <View style={styles.corridorBarRow}>
          <View
            style={[
              styles.corridorPill,
              {
                backgroundColor: C.surface,
                borderColor: C.primary + '55',
              },
            ]}
          >
            <MaterialIcons name="alt-route" size={13} color={C.primary} />
            <Text style={[styles.corridorPillText, { color: C.textPrimary }]} numberOfLines={1}>
              {corridorLabel}
            </Text>
            {onClearCorridor ? (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  onClearCorridor();
                }}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Clear corridor"
                style={styles.corridorCloseBtn}
              >
                <MaterialIcons name="close" size={13} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 3. Segmented Tab Switcher (Trips vs Parcels) with Animated Indicator */}
      <View
        style={[styles.segmentedWrapper, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
        accessibilityRole="tablist"
      >
        <Animated.View
          style={[
            styles.animatedTabIndicator,
            {
              backgroundColor: C.primary,
              left: tabIndicatorAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '50%'],
              }) as any,
            },
          ]}
        />

        {/* Trips Tab */}
        <Pressable
          onPress={() => onSelectTab('trips')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'trips' }}
          accessibilityLabel={`Available Trips, ${tripsCount} active trips`}
          style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons
            name="flight-takeoff"
            size={16}
            color={activeTab === 'trips' ? '#FFFFFF' : C.textSecondary}
          />
          <Text
            style={[
              styles.tabTitleText,
              {
                color: activeTab === 'trips' ? '#FFFFFF' : C.textSecondary,
                fontWeight: activeTab === 'trips' ? FontWeight.bold : FontWeight.medium,
              },
            ]}
          >
            Trips
          </Text>
          <View
            style={[
              styles.tabCountPill,
              {
                backgroundColor: activeTab === 'trips' ? 'rgba(255,255,255,0.25)' : C.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                { color: activeTab === 'trips' ? '#FFFFFF' : C.textMuted },
              ]}
            >
              {tripsCount}
            </Text>
          </View>
        </Pressable>

        {/* Parcels Tab */}
        <Pressable
          onPress={() => onSelectTab('parcels')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'parcels' }}
          accessibilityLabel={`Parcels to Carry, ${parcelsCount} open packages`}
          style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons
            name="inventory-2"
            size={15}
            color={activeTab === 'parcels' ? '#FFFFFF' : C.textSecondary}
          />
          <Text
            style={[
              styles.tabTitleText,
              {
                color: activeTab === 'parcels' ? '#FFFFFF' : C.textSecondary,
                fontWeight: activeTab === 'parcels' ? FontWeight.bold : FontWeight.medium,
              },
            ]}
          >
            Parcels
          </Text>
          <View
            style={[
              styles.tabCountPill,
              {
                backgroundColor: activeTab === 'parcels' ? 'rgba(255,255,255,0.25)' : C.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                { color: activeTab === 'parcels' ? '#FFFFFF' : C.textMuted },
              ]}
            >
              {parcelsCount}
            </Text>
          </View>
        </Pressable>
      </View>


      {/* 4. Quick Micro-Filter & Sort Pills Bar */}
      <View style={styles.quickFilterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFilterScroll}
        >
          {activeTab === 'trips' ? (
            // Trips Quick Vehicle Chips
            <>
              {VEHICLE_OPTIONS.map((v) => {
                const isSelected = selectedVehicle === v.id;
                return (
                  <Pressable
                    key={v.id || 'all-vehicles'}
                    onPress={() => {
                      Haptic.select();
                      onSelectVehicle?.(isSelected && v.id !== '' ? '' : v.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by ${v.label}`}
                    style={({ pressed }) => [
                      styles.quickChip,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <MaterialIcons
                      name={v.icon}
                      size={13}
                      color={isSelected ? C.primary : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.quickChipText,
                        {
                          color: isSelected ? C.primaryDark : C.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                        },
                      ]}
                    >
                      {v.label}
                    </Text>
                  </Pressable>
                );
              })}

              <View style={[styles.chipDivider, { backgroundColor: C.surfaceBorder }]} />

              {/* Quick Sort Options for Trips */}
              <Pressable
                onPress={() => {
                  Haptic.select();
                  onSelectSort?.(sortBy === 'price' ? 'recent' : 'price');
                }}
                accessibilityRole="button"
                accessibilityLabel="Sort by lowest price per kilogram"
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    backgroundColor: sortBy === 'price' ? C.primarySubtle : C.surface,
                    borderColor: sortBy === 'price' ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialIcons
                  name="payments"
                  size={13}
                  color={sortBy === 'price' ? C.primary : C.textMuted}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: sortBy === 'price' ? C.primaryDark : C.textSecondary,
                      fontWeight: sortBy === 'price' ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  Lowest ₹/kg
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptic.select();
                  onSelectSort?.(sortBy === 'capacity' ? 'recent' : 'capacity');
                }}
                accessibilityRole="button"
                accessibilityLabel="Sort by most available capacity"
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    backgroundColor: sortBy === 'capacity' ? C.primarySubtle : C.surface,
                    borderColor: sortBy === 'capacity' ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialIcons
                  name="fitness-center"
                  size={13}
                  color={sortBy === 'capacity' ? C.primary : C.textMuted}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: sortBy === 'capacity' ? C.primaryDark : C.textSecondary,
                      fontWeight: sortBy === 'capacity' ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  Max Space
                </Text>
              </Pressable>
            </>
          ) : (
            // Parcels Quick Category Chips
            <>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id || 'all-categories'}
                    onPress={() => {
                      Haptic.select();
                      onSelectCategory?.(isSelected && cat.id !== '' ? '' : cat.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by ${cat.label}`}
                    style={({ pressed }) => [
                      styles.quickChip,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon}
                      size={13}
                      color={isSelected ? C.primary : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.quickChipText,
                        {
                          color: isSelected ? C.primaryDark : C.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}

              <View style={[styles.chipDivider, { backgroundColor: C.surfaceBorder }]} />

              {/* Quick Sort Options for Parcels */}
              <Pressable
                onPress={() => {
                  Haptic.select();
                  onSelectSort?.(sortBy === 'price' ? 'recent' : 'price');
                }}
                accessibilityRole="button"
                accessibilityLabel="Sort by highest earning bounty"
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    backgroundColor: sortBy === 'price' ? C.primarySubtle : C.surface,
                    borderColor: sortBy === 'price' ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialIcons
                  name="stars"
                  size={13}
                  color={sortBy === 'price' ? C.primary : C.textMuted}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: sortBy === 'price' ? C.primaryDark : C.textSecondary,
                      fontWeight: sortBy === 'price' ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  Highest Reward
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptic.select();
                  onSelectSort?.(sortBy === 'urgent' ? 'recent' : 'urgent');
                }}
                accessibilityRole="button"
                accessibilityLabel="Filter urgent same-day packages only"
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    backgroundColor: sortBy === 'urgent' ? '#FEF2F2' : C.surface,
                    borderColor: sortBy === 'urgent' ? '#EF4444' : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialIcons
                  name="bolt"
                  size={13}
                  color={sortBy === 'urgent' ? '#EF4444' : C.textMuted}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: sortBy === 'urgent' ? '#DC2626' : C.textSecondary,
                      fontWeight: sortBy === 'urgent' ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  ⚡ Urgent
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      {/* 5. Active Filters Dismissible Banner */}
      {(hasFilter || selectedVehicle || selectedCategory || sortBy !== 'recent') && onClearAllFilters ? (
        <View style={[styles.filterFeedbackBanner, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <View style={styles.filterFeedbackLeft}>
            <MaterialIcons name="filter-list" size={14} color={C.primaryDark} />
            <Text style={[styles.filterFeedbackText, { color: C.primaryDark }]}>
              {selectedVehicle
                ? `Filtered: ${selectedVehicle.toUpperCase()}`
                : selectedCategory
                  ? `Filtered: ${selectedCategory.toUpperCase()}`
                  : sortBy !== 'recent'
                    ? `Sorted: ${sortBy}`
                    : 'Custom filters applied'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptic.tap();
              onClearAllFilters();
            }}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityRole="button"
            accessibilityLabel="Clear all applied marketplace filters"
            style={styles.filterFeedbackClearBtn}
          >
            <Text style={[styles.filterFeedbackClearText, { color: C.primaryDark }]}>Reset All</Text>
            <MaterialIcons name="close" size={13} color={C.primaryDark} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs + 3,
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  titleColumn: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  radarWrapper: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  radarCoreDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionHeading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  liveStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  liveStatusPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#1A4CA2',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 3,
    maxWidth: 150,
  },
  locationPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    maxWidth: 95,
  },
  allIndiaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  allIndiaPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  corridorBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  corridorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  corridorPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  corridorCloseBtn: {
    marginLeft: 2,
    padding: 2,
  },

  segmentedWrapper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    flexDirection: 'row',
    position: 'relative',
    minHeight: 46,
  },
  animatedTabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '50%',
    borderRadius: BorderRadius.md - 2,
    zIndex: 1,
    shadowColor: '#1A4CA2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 6,
  },
  tabTitleText: {
    fontSize: FontSize.xs + 0.5,
    letterSpacing: -0.2,
  },
  tabCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  quickFilterStrip: {
    marginTop: 2,
  },
  quickFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  quickChipText: {
    fontSize: 11.5,
  },
  chipDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 3,
  },

  filterFeedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 2,
  },
  filterFeedbackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterFeedbackText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  filterFeedbackClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  filterFeedbackClearText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
