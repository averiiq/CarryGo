import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { createSubscription } from '@/services/subscriptions.service';
import { detectCurrentCity } from '@/services/location.service';
import { useAlert } from '@/template';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { CitySelectModal } from '@/components/feature/CitySelectModal';
import {
  SevenDaySchedulePicker,
  formatScheduleDate,
} from '@/components/feature/SevenDaySchedulePicker';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { TravelerParcelCard } from '@/components/feature/search/TravelerParcelCard';
import { TripCard } from '@/components/feature/TripCard';
import {
  filterTravelerParcels,
  sortTravelerParcels,
  filterSearchResults,
  sortSearchResults,
  type TravelerSortOption,
  type WeightFilterRange,
} from '@/components/feature/search/searchHelpers';

const WEIGHT_OPTIONS: { id: WeightFilterRange; label: string }[] = [
  { id: 'all', label: 'All Weights' },
  { id: 'under_2', label: '< 2 kg' },
  { id: '2_5', label: '2–5 kg' },
  { id: '5_10', label: '5–10 kg' },
  { id: 'over_10', label: '10+ kg' },
];

const CATEGORY_OPTIONS: { id: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'all', label: 'All Items', icon: 'all-inclusive' },
  { id: 'documents', label: 'Documents', icon: 'description' },
  { id: 'electronics', label: 'Electronics', icon: 'devices' },
  { id: 'clothing', label: 'Clothing', icon: 'checkroom' },
  { id: 'food', label: 'Food', icon: 'restaurant' },
  { id: 'medicine', label: 'Medicine', icon: 'medical-services' },
  { id: 'other', label: 'Other', icon: 'inventory-2' },
];

const SORT_OPTIONS: { id: TravelerSortOption; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'offer_high', label: 'Highest Offer', icon: 'arrow-upward' },
  { id: 'date_nearest', label: 'Nearest Date', icon: 'schedule' },
  { id: 'weight_low', label: 'Lowest Weight', icon: 'fitness-center' },
  { id: 'offer_low', label: 'Lowest Offer', icon: 'arrow-downward' },
];

export default function SearchScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();
  const searchParams = useLocalSearchParams<{
    fromCity?: string;
    toCity?: string;
    date?: string;
    mode?: string;
  }>();

  // Queries
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const tripsQuery = useTripsQuery(Boolean(user));

  // Search Route State
  const [fromCity, setFromCity] = useState(
    typeof searchParams.fromCity === 'string' ? searchParams.fromCity : ''
  );
  const [toCity, setToCity] = useState(
    typeof searchParams.toCity === 'string' ? searchParams.toCity : ''
  );
  const [travelDate, setTravelDate] = useState(
    typeof searchParams.date === 'string' ? searchParams.date : ''
  );

  // Filters State
  const [selectedWeight, setSelectedWeight] = useState<WeightFilterRange>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<TravelerSortOption>('offer_high');
  const [activeTab, setActiveTab] = useState<'parcels' | 'trips'>(
    searchParams.mode === 'trips' ? 'trips' : 'parcels'
  );

  // Modals & Detection State
  const [showPickModal, setShowPickModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Animations
  const swapRotation = useRef(new Animated.Value(0)).current;

  // Sync external search params if changed
  useEffect(() => {
    if (searchParams.fromCity && typeof searchParams.fromCity === 'string') {
      setFromCity(searchParams.fromCity);
    }
    if (searchParams.toCity && typeof searchParams.toCity === 'string') {
      setToCity(searchParams.toCity);
    }
    if (searchParams.date && typeof searchParams.date === 'string') {
      setTravelDate(searchParams.date);
    }
  }, [searchParams.fromCity, searchParams.toCity, searchParams.date]);

  // Senders' active parcels
  const allParcels: Parcel[] = useMemo(() => {
    return user ? flattenInfiniteData(parcelsQuery.data) : [];
  }, [user, parcelsQuery.data]);

  // All active trips
  const allTrips: Trip[] = useMemo(() => {
    return user ? flattenInfiniteData(tripsQuery.data) : [];
  }, [user, tripsQuery.data]);

  // Filtered & Sorted Parcels matching traveler route, travel date, weight, and category
  const filteredParcels: Parcel[] = useMemo(() => {
    const filtered = filterTravelerParcels(allParcels, {
      fromCity,
      toCity,
      travelDate,
      weightRange: selectedWeight,
      category: selectedCategory,
      excludeUserId: user?.id,
    });
    return sortTravelerParcels(filtered, selectedSort);
  }, [allParcels, fromCity, toCity, travelDate, selectedWeight, selectedCategory, selectedSort, user?.id]);

  // Filtered Trips (for secondary trips view)
  const filteredTrips: Trip[] = useMemo(() => {
    const { matchedTrips } = filterSearchResults(allTrips, [], {
      fromCity,
      toCity,
      excludeUserId: user?.id,
    });
    return matchedTrips;
  }, [allTrips, fromCity, toCity, user?.id]);

  const hasActiveFilters = Boolean(
    fromCity ||
    toCity ||
    travelDate ||
    selectedWeight !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSort !== 'offer_high'
  );

  // Actions
  const handleSwapRoute = useCallback(() => {
    Haptic.select();
    Animated.sequence([
      Animated.timing(swapRotation, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(swapRotation, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();

    const currentFrom = fromCity;
    setFromCity(toCity);
    setToCity(currentFrom);
  }, [fromCity, toCity, swapRotation]);

  const handleSelectCorridor = useCallback((origin: string, dest: string) => {
    Haptic.confirm();
    setFromCity(origin);
    setToCity(dest);
  }, []);

  const handleClearFilters = useCallback(() => {
    Haptic.tap();
    setFromCity('');
    setToCity('');
    setTravelDate('');
    setSelectedWeight('all');
    setSelectedCategory('all');
    setSelectedSort('offer_high');
  }, []);

  const handleDetectGPS = useCallback(async () => {
    Haptic.select();
    setIsDetectingLocation(true);
    try {
      const { data, error } = await detectCurrentCity();
      if (data) {
        Haptic.success();
        setFromCity(data);
      } else if (error) {
        showAlert('Location Notice', error);
      }
    } catch {
      showAlert('Location Error', 'Unable to detect your current location.');
    } finally {
      setIsDetectingLocation(false);
    }
  }, [showAlert]);

  const handleSubscribeAlert = useCallback(async () => {
    if (!fromCity || !toCity) {
      showAlert('Select Route', 'Please specify both Pick and Drop cities to set a route alert.');
      return;
    }
    if (!user) {
      showAlert('Sign In Required', 'Please sign in to subscribe to route alerts.');
      return;
    }

    Haptic.tap();
    setIsSubscribing(true);
    try {
      const { data } = await createSubscription(user.id, fromCity, toCity);
      if (data) {
        Haptic.success();
        showAlert(
          'Route Alert Created! 🔔',
          `You will be instantly notified when senders post parcels along ${fromCity} → ${toCity}.`
        );
      } else {
        showAlert('Alert Exists', `You already have an active alert for ${fromCity} → ${toCity}.`);
      }
    } catch {
      showAlert('Error', 'Failed to create route alert. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  }, [fromCity, toCity, user, showAlert]);

  const handleRefresh = useCallback(() => {
    Haptic.tap();
    parcelsQuery.refetch();
    tripsQuery.refetch();
  }, [parcelsQuery, tripsQuery]);

  const handleParcelPress = useCallback(
    (parcel: Parcel) => {
      Haptic.select();
      router.push({
        pathname: '/parcel/[id]',
        params: {
          id: parcel.id,
          travelerFlow: 'true',
          fromCity: parcel.fromCity,
          toCity: parcel.toCity,
        },
      });
    },
    [router]
  );

  const handleTripPress = useCallback(
    (trip: Trip) => {
      Haptic.select();
      router.push({
        pathname: '/trip/[id]',
        params: { id: trip.id },
      });
    },
    [router]
  );

  const spinInterpolate = swapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Render Header Component inside FlashList
  const renderListHeader = () => (
    <View style={styles.headerComponentWrap}>
      {/* Search & Route Card strictly matching index.styles.ts */}
      <View
        style={[
          styles.routeCard,
          S.card,
          {
            backgroundColor: C.card,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        {/* Source (Pick) Input Row */}
        <Pressable
          style={styles.locationRow}
          onPress={() => {
            Haptic.select();
            setShowPickModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Pickup city: ${fromCity || 'Select pickup city'}`}
        >
          <View style={[styles.locationIndicatorDot, { backgroundColor: '#10B981' }]} />
          <View style={styles.locationContentWrap}>
            <Text style={[styles.fieldSubLabel, { color: C.textMuted }]}>SOURCE / PICKUP</Text>
            <Text
              style={[
                styles.cityDisplayInput,
                { color: fromCity ? C.textPrimary : C.textMuted },
              ]}
              numberOfLines={1}
            >
              {fromCity || 'Select starting pickup city'}
            </Text>
          </View>

          {fromCity ? (
            <Pressable
              style={styles.clearFieldBtn}
              onPress={(e) => {
                e.stopPropagation();
                Haptic.tap();
                setFromCity('');
              }}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={16} color={C.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.gpsAutoDetectBtn, { backgroundColor: C.primarySubtle }]}
              onPress={(e) => {
                e.stopPropagation();
                handleDetectGPS();
              }}
              hitSlop={6}
            >
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <MaterialIcons name="my-location" size={13} color="#10B981" />
                  <Text style={[styles.gpsAutoDetectText, { color: '#064E3B' }]}>Current</Text>
                </>
              )}
            </Pressable>
          )}
        </Pressable>

        {/* Route Divider with Spring Swap Button */}
        <View style={styles.dividerWrap}>
          <View style={[styles.dividerDashedLine, { borderColor: C.surfaceBorder }]} />
          <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
            <Pressable
              style={[
                styles.swapRouteButton,
                {
                  backgroundColor: C.card,
                  borderColor: C.surfaceBorder,
                },
              ]}
              onPress={handleSwapRoute}
              accessibilityRole="button"
              accessibilityLabel="Swap pickup and destination cities"
            >
              <MaterialIcons name="swap-vert" size={20} color="#10B981" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Destination (Drop) Input Row */}
        <Pressable
          style={styles.locationRow}
          onPress={() => {
            Haptic.select();
            setShowDropModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Drop city: ${toCity || 'Select destination city'}`}
        >
          <View style={[styles.locationIndicatorDot, { backgroundColor: '#EF4444' }]} />
          <View style={styles.locationContentWrap}>
            <Text style={[styles.fieldSubLabel, { color: C.textMuted }]}>DESTINATION / DROP</Text>
            <Text
              style={[
                styles.cityDisplayInput,
                { color: toCity ? C.textPrimary : C.textMuted },
              ]}
              numberOfLines={1}
            >
              {toCity || 'Select final drop destination'}
            </Text>
          </View>

          {toCity ? (
            <Pressable
              style={styles.clearFieldBtn}
              onPress={(e) => {
                e.stopPropagation();
                Haptic.tap();
                setToCity('');
              }}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={16} color={C.textMuted} />
            </Pressable>
          ) : (
            <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
          )}
        </Pressable>
      </View>

      {/* Quick Haryana Corridor Chips for 1-Tap Route Prefill */}
      <HaryanaCorridorChips
        activeFromCity={fromCity}
        activeToCity={toCity}
        onSelectCorridor={handleSelectCorridor}
        onClear={() => {
          setFromCity('');
          setToCity('');
        }}
        title="Popular Corridors (1-Tap Route)"
        compactPadding
      />

      {/* Filter Chips Bar (Horizontal Scroll strictly matching index.styles.ts) */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {/* 'Date of Travel' Filter Chip */}
          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: travelDate ? '#ECFDF5' : C.card,
                borderColor: travelDate ? '#10B981' : C.surfaceBorder,
              },
            ]}
            onPress={() => {
              Haptic.select();
              setShowDatePicker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Select date of travel"
          >
            <MaterialIcons
              name="event"
              size={15}
              color={travelDate ? '#10B981' : C.textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                {
                  color: travelDate ? '#064E3B' : C.textPrimary,
                  fontWeight: travelDate ? FontWeight.bold : FontWeight.medium,
                },
              ]}
            >
              {travelDate ? formatScheduleDate(travelDate) : 'Date of Travel'}
            </Text>
            {travelDate ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptic.tap();
                  setTravelDate('');
                }}
                hitSlop={8}
              >
                <MaterialIcons name="close" size={14} color="#064E3B" />
              </Pressable>
            ) : null}
          </Pressable>

          {/* Weight Range Chips */}
          {WEIGHT_OPTIONS.map((w) => {
            const isSelected = selectedWeight === w.id;
            return (
              <Pressable
                key={w.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? '#ECFDF5' : C.card,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                  },
                ]}
                onPress={() => {
                  Haptic.select();
                  setSelectedWeight(w.id);
                }}
              >
                <MaterialIcons
                  name="fitness-center"
                  size={13}
                  color={isSelected ? '#10B981' : C.textMuted}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#064E3B' : C.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Category Filter Chips */}
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? '#ECFDF5' : C.card,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                  },
                ]}
                onPress={() => {
                  Haptic.select();
                  setSelectedCategory(cat.id);
                }}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={13}
                  color={isSelected ? '#10B981' : C.textMuted}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#064E3B' : C.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Sort By Chips */}
          {SORT_OPTIONS.map((sort) => {
            const isSelected = selectedSort === sort.id;
            return (
              <Pressable
                key={sort.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? '#F0FDF4' : C.card,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                  },
                ]}
                onPress={() => {
                  Haptic.select();
                  setSelectedSort(sort.id);
                }}
              >
                <MaterialIcons
                  name={sort.icon}
                  size={13}
                  color={isSelected ? '#10B981' : C.textMuted}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#064E3B' : C.textSecondary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {sort.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Clear Filters Button (if active) */}
          {hasActiveFilters ? (
            <Pressable
              style={[styles.clearAllChip, { borderColor: '#EF4444' }]}
              onPress={handleClearFilters}
            >
              <MaterialIcons name="refresh" size={14} color="#EF4444" />
              <Text style={styles.clearAllChipText}>Reset</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {/* Route Alert Subscription Banner (if route entered) */}
      {fromCity && toCity ? (
        <Pressable
          style={[
            styles.alertBanner,
            {
              backgroundColor: '#ECFDF5',
              borderColor: '#A7F3D0',
            },
          ]}
          onPress={handleSubscribeAlert}
          disabled={isSubscribing}
        >
          <View style={styles.alertBannerIcon}>
            <Ionicons name="notifications" size={16} color="#10B981" />
          </View>
          <View style={styles.alertBannerTextWrap}>
            <Text style={[styles.alertBannerTitle, { color: '#064E3B' }]}>
              Get Notified on {fromCity} → {toCity}
            </Text>
            <Text style={[styles.alertBannerSub, { color: '#047857' }]}>
              Instant push alert whenever senders request parcel delivery
            </Text>
          </View>
          {isSubscribing ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <MaterialIcons name="arrow-forward-ios" size={12} color="#10B981" />
          )}
        </Pressable>
      ) : null}

      {/* Feed Sub-Header: Active Listings Counter & Mode Pill */}
      <View style={styles.feedHeaderRow}>
        <View style={styles.feedTabsWrap}>
          <Pressable
            style={[
              styles.feedTab,
              {
                backgroundColor: activeTab === 'parcels' ? '#10B981' : C.card,
                borderColor: activeTab === 'parcels' ? '#10B981' : C.surfaceBorder,
              },
            ]}
            onPress={() => {
              Haptic.select();
              setActiveTab('parcels');
            }}
          >
            <MaterialIcons
              name="inventory-2"
              size={14}
              color={activeTab === 'parcels' ? '#FFFFFF' : C.textSecondary}
            />
            <Text
              style={[
                styles.feedTabText,
                { color: activeTab === 'parcels' ? '#FFFFFF' : C.textPrimary },
              ]}
            >
              Parcels ({filteredParcels.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.feedTab,
              {
                backgroundColor: activeTab === 'trips' ? '#10B981' : C.card,
                borderColor: activeTab === 'trips' ? '#10B981' : C.surfaceBorder,
              },
            ]}
            onPress={() => {
              Haptic.select();
              setActiveTab('trips');
            }}
          >
            <MaterialIcons
              name="directions-car"
              size={14}
              color={activeTab === 'trips' ? '#FFFFFF' : C.textSecondary}
            />
            <Text
              style={[
                styles.feedTabText,
                { color: activeTab === 'trips' ? '#FFFFFF' : C.textPrimary },
              ]}
            >
              Trips ({filteredTrips.length})
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.feedCountLabel, { color: C.textMuted }]}>
          {activeTab === 'parcels'
            ? `${filteredParcels.length} requests`
            : `${filteredTrips.length} available`}
        </Text>
      </View>
    </View>
  );

  // Render Empty State strictly matching index.styles.ts emptyFeedCard
  const renderListEmpty = () => {
    if (parcelsQuery.isLoading) {
      return (
        <View
          style={[
            styles.emptyCard,
            S.card,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            Searching Active Parcels...
          </Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>
            Scanning active sender requests along your corridor
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.emptyCard,
          S.card,
          {
            backgroundColor: C.card,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <View style={[styles.emptyIconBg, { backgroundColor: C.surfaceElevated }]}>
          <MaterialIcons name="search-off" size={40} color={C.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
          No Active Parcels Found
        </Text>
        <Text style={[styles.emptySub, { color: C.textSecondary }]}>
          {fromCity && toCity
            ? `No open parcel requests on ${fromCity} → ${toCity} right now. Set a route alert or clear filters to see more.`
            : 'No active parcel requests match the current filters. Try resetting your search parameters.'}
        </Text>

        {fromCity && toCity ? (
          <Pressable
            style={[styles.emptyGreenActionBtn, { backgroundColor: '#10B981' }]}
            onPress={handleSubscribeAlert}
          >
            <Ionicons name="notifications" size={17} color="#FFFFFF" />
            <Text style={styles.emptyGreenActionBtnText}>Set Route Alert</Text>
          </Pressable>
        ) : null}

        {hasActiveFilters ? (
          <Pressable
            style={[
              styles.emptyResetBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
              },
            ]}
            onPress={handleClearFilters}
          >
            <MaterialIcons name="refresh" size={16} color={C.textPrimary} />
            <Text style={[styles.emptyResetBtnText, { color: C.textPrimary }]}>
              Clear All Filters
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Header strictly matching index.styles.ts */}
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: C.surface,
            borderBottomColor: C.surfaceBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[C.primarySubtle, 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.headerBackBtn,
              {
                backgroundColor: C.card,
                borderColor: C.surfaceBorder,
              },
            ]}
            onPress={() => {
              Haptic.tap();
              router.back();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
              Explore Parcels
            </Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              Find sender delivery requests along your travel route
            </Text>
          </View>

          {hasActiveFilters ? (
            <Pressable
              style={[
                styles.headerClearPill,
                {
                  backgroundColor: C.surfaceElevated,
                  borderColor: C.surfaceBorder,
                },
              ]}
              onPress={handleClearFilters}
              hitSlop={8}
            >
              <MaterialIcons name="refresh" size={14} color={C.textSecondary} />
              <Text style={[styles.headerClearPillText, { color: C.textSecondary }]}>Reset</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Parcel Feed List using FlashList strictly matching index.styles.ts theme */}
      {activeTab === 'parcels' ? (
        <FlashList<Parcel>
          data={filteredParcels}
          renderItem={({ item }) => (
            <TravelerParcelCard
              parcel={item}
              onPress={() => handleParcelPress(item)}
              testID={`traveler-parcel-card-${item.id}`}
            />
          )}
          estimatedItemSize={210}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderListEmpty}
          contentContainerStyle={{
            paddingBottom: insets.bottom + Spacing.xxl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={parcelsQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      ) : (
        <FlashList<Trip>
          data={filteredTrips}
          renderItem={({ item }) => (
            <View style={styles.tripCardWrap}>
              <TripCard
                trip={item}
                isOwner={Boolean(user?.id && item.userId === user.id)}
                showRequestButton={false}
                onPress={() => handleTripPress(item)}
              />
            </View>
          )}
          estimatedItemSize={190}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderListEmpty}
          contentContainerStyle={{
            paddingBottom: insets.bottom + Spacing.xxl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={tripsQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      )}

      {/* City Select Modals for Source & Destination */}
      <CitySelectModal
        visible={showPickModal}
        onClose={() => setShowPickModal(false)}
        onSelect={(city) => {
          setFromCity(city);
          setShowPickModal(false);
        }}
        title="Select Pickup City (Source)"
        subtitle="Where are you starting your travel journey?"
        selectedCity={fromCity}
        oppositeCity={toCity}
        dotColor="#10B981"
        onUseCurrentLocation={handleDetectGPS}
        isDetectingLocation={isDetectingLocation}
      />

      <CitySelectModal
        visible={showDropModal}
        onClose={() => setShowDropModal(false)}
        onSelect={(city) => {
          setToCity(city);
          setShowDropModal(false);
        }}
        title="Select Drop City (Destination)"
        subtitle="Where is your final travel stop?"
        selectedCity={toCity}
        oppositeCity={fromCity}
        dotColor="#EF4444"
      />

      {/* 7-Day Schedule Picker for Date of Travel */}
      <SevenDaySchedulePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setTravelDate(date);
          setShowDatePicker(false);
        }}
        C={C}
        initialDate={travelDate}
        includeTime={false}
        title="Select Date of Travel"
        subtitle="Find parcel delivery requests for this travel date"
        confirmLabel="Apply Travel Date"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header strictly matching index.styles.ts
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  headerClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  headerClearPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // List Header wrapper
  headerComponentWrap: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // Route Selection White Card strictly matching index.styles.ts
  routeCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    padding: Spacing.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
  },
  locationIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  locationContentWrap: {
    flex: 1,
  },
  fieldSubLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cityDisplayInput: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  clearFieldBtn: {
    padding: 6,
  },
  gpsAutoDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  gpsAutoDetectText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Route divider with spring swap button
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
    position: 'relative',
  },
  dividerDashedLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 9,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  swapRouteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Filter chips row
  filterSection: {
    marginVertical: 2,
  },
  filterChipsScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 38,
  },
  filterChipText: {
    fontSize: FontSize.xs,
  },
  clearAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 38,
  },
  clearAllChipText: {
    color: '#EF4444',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Alert Banner
  alertBanner: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  alertBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  alertBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  alertBannerSub: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Feed Header Row
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  feedTabsWrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  feedTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  feedTabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  feedCountLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Empty state card strictly matching index.styles.ts emptyFeedCard
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
    borderRadius: 24, // index.styles.ts
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  emptyIconBg: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginTop: 2,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  // Green action button strictly matching index.styles.ts emptyCTA
  emptyGreenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl + 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  emptyGreenActionBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  emptyResetBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Trip item wrapper
  tripCardWrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
});
