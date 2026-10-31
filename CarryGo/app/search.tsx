import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Animated, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TripCard, ParcelCard, BlaBlaTripCard, MatchDiagnosticCard, LottieAnimation, KeyboardAwareScrollView } from '@/components';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { Trip, Parcel, Request } from '@/types';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { Spacing, BorderRadius, FontSize, FontWeight, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { createSubscription } from '@/services/subscriptions.service';
import { useAlert } from '@/template';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery, useParcelQuery, useTripQuery } from '@/features/listings/queries';
import { useRequestsQuery, useCreateRequestMutation } from '@/features/requests/queries';
import { useMatchingTrips, useMatchingTripsOnRoute } from '@/hooks/useMatching';
import { scoreMatch, MatchScore, DiagnosticAction, checkTripParcelRoute } from '@/services/smart-matching.service';
import {
  sortMatchingTrips,
  calculateMatchPrice,
  buildRequestsByTripMap,
  MatchSortOption,
} from '@/components/feature/matching/matchingHelpers';
import { FeatureFlags } from '@/constants/featureFlags';
import { CityDropdown } from '@/components/feature/CityDropdown';
import { HistoryChip, SearchHistoryEntry } from '@/components/feature/HistoryChip';
import { RouteMapView } from '@/components/feature/RouteMapView';
import { SortOption } from '@/hooks/useSmartSearch';
import { useResponsive, TouchTarget } from '@/hooks/useResponsive';
import { styles } from '@/styles/search.styles';
import {
  filterSearchResults,
  sortSearchResults,
  formatRouteSubscriptionMessage,
  SearchItem,
} from '@/components/feature/search/searchHelpers';

const CITIES = INDIAN_CITIES.map(c => c.name);

const HISTORY_KEY = 'carrygo_search_history';
const MAX_HISTORY = 8;

const VEHICLE_TYPES = [
  { type: 'bike', label: 'Bike', icon: 'two-wheeler' },
  { type: 'car', label: 'Car', icon: 'directions-car' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus' },
  { type: 'train', label: 'Train', icon: 'train' },
  { type: 'flight', label: 'Flight', icon: 'flight' },
] as const;

const POPULAR_ROUTES = [
  ['Gurugram', 'Faridabad'], ['Gurugram', 'Panipat'], ['Ambala', 'Karnal'],
  ['Rohtak', 'Hisar'], ['Panchkula', 'Ambala'], ['Rewari', 'Gurugram'],
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_nearest', label: 'Nearest date' },
  { value: 'price_low', label: 'Price low' },
  { value: 'price_high', label: 'Price high' },
  { value: 'rating_best', label: 'Best rating' },
  { value: 'distance_shortest', label: 'Shortest route' },
];

type ResultTab = 'all' | 'trips' | 'parcels';
type ViewMode = 'list' | 'map';
type FocusedField = 'from' | 'to' | null;

export default function SearchScreen({ hideBackBtn = false }: { hideBackBtn?: boolean } = {}) {
  const { user } = useAuth();
  const { isSmallDevice, isTablet } = useResponsive();
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const requestsQuery = useRequestsQuery(user?.id);
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  // ── Smart-matches context (optional — only when caller passes params) ─────
  const { mode, id, fromCity: fcParam, toCity: tcParam } = useLocalSearchParams<{
    mode?: string; id?: string; fromCity?: string; toCity?: string;
  }>();
  const hasSmartMatchContext = mode === 'parcel' || mode === 'browse_trips' || mode === 'trip';

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [tab, setTab] = useState<ResultTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [focused, setFocused] = useState<FocusedField>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [subscribing, setSubscribing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date_nearest');
  const [showFilters, setShowFilters] = useState(false);

  const fromInputRef = useRef<TextInput>(null);
  const toInputRef = useRef<TextInput>(null);
  const searchBtnScale = useRef(new Animated.Value(1)).current;
  const resultsFade = useRef(new Animated.Value(0)).current;
  const filtersHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  // Prefill the manual search fields with the smart-match context when present
  useEffect(() => {
    if (hasSmartMatchContext) {
      if (fcParam && !fromCity) setFromCity(fcParam);
      if (tcParam && !toCity) setToCity(tcParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSmartMatchContext]);

  const saveHistory = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    const entry: SearchHistoryEntry = { fromCity: from, toCity: to, timestamp: Date.now() };
    const updated = [entry, ...history.filter(h => !(h.fromCity === from && h.toCity === to))].slice(0, MAX_HISTORY);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [history]);

  const removeHistory = useCallback(async (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [history]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const toggleFilters = useCallback(() => {
    Haptic.select();
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.spring(filtersHeight, {
      toValue,
      useNativeDriver: false,
      tension: 200,
      friction: 22,
    }).start();
  }, [showFilters, filtersHeight]);

  const trips: Trip[] = useMemo(() => (user ? flattenInfiniteData(tripsQuery.data) : []), [user, tripsQuery.data]);
  const parcels: Parcel[] = useMemo(() => (user ? flattenInfiniteData(parcelsQuery.data) : []), [user, parcelsQuery.data]);
  const userRequests = requestsQuery.data || [];

  const requestsByTripId = useMemo(() => {
    const map = new Map<string, Request>();
    userRequests.forEach((req) => {
      if (req.tripId) {
        const prev = map.get(req.tripId);
        if (!prev || req.status === 'accepted' || (req.status === 'pending' && prev.status !== 'accepted')) {
          map.set(req.tripId, req);
        }
      }
    });
    return map;
  }, [userRequests]);

  const requestsByParcelId = useMemo(() => {
    const map = new Map<string, Request>();
    userRequests.forEach((req) => {
      if (req.parcelId) {
        const prev = map.get(req.parcelId);
        if (!prev || req.status === 'accepted' || (req.status === 'pending' && prev.status !== 'accepted')) {
          map.set(req.parcelId, req);
        }
      }
    });
    return map;
  }, [userRequests]);

  const { matchedTrips, matchedParcels } = useMemo(() => {
    return filterSearchResults(trips, parcels, {
      fromCity,
      toCity,
      vehicleType,
      excludeUserId: user?.id,
    });
  }, [trips, parcels, fromCity, toCity, vehicleType, user?.id]);

  const allResults: SearchItem[] = useMemo(() => {
    return sortSearchResults(
      [
        ...matchedTrips.map((t: Trip) => ({ type: 'trip' as const, data: t })),
        ...matchedParcels.map((p: Parcel) => ({ type: 'parcel' as const, data: p })),
      ],
      sortBy
    );
  }, [matchedTrips, matchedParcels, sortBy]);

  const displayResults: SearchItem[] = useMemo(() => {
    if (tab === 'trips') {
      return sortSearchResults(
        matchedTrips.map((t: Trip) => ({ type: 'trip' as const, data: t })),
        sortBy
      );
    }
    if (tab === 'parcels') {
      return sortSearchResults(
        matchedParcels.map((p: Parcel) => ({ type: 'parcel' as const, data: p })),
        sortBy
      );
    }
    return allResults;
  }, [allResults, matchedParcels, matchedTrips, sortBy, tab]);

  const fromSuggestions = useMemo(() => {
    if (!fromCity || fromCity.length === 0) return [];
    const lower = fromCity.toLowerCase();
    return CITIES.filter(c =>
      c.toLowerCase().includes(lower) && c !== toCity && fromCity !== c
    ).slice(0, 6);
  }, [fromCity, toCity]);

  const toSuggestions = useMemo(() => {
    if (!toCity || toCity.length === 0) return [];
    const lower = toCity.toLowerCase();
    return CITIES.filter(c =>
      c.toLowerCase().includes(lower) && c !== fromCity && toCity !== c
    ).slice(0, 6);
  }, [toCity, fromCity]);

  const handleSearch = () => {
    setFocused(null);
    fromInputRef.current?.blur();
    toInputRef.current?.blur();
    Haptic.confirm();
    Animated.sequence([
      Animated.timing(searchBtnScale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.spring(searchBtnScale, { toValue: 1, tension: 300, useNativeDriver: true }),
    ]).start();
    saveHistory(fromCity, toCity);
    setHasSearched(true);
    resultsFade.setValue(0);
    Animated.timing(resultsFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleApplyHistory = (entry: SearchHistoryEntry) => {
    setFromCity(entry.fromCity);
    setToCity(entry.toCity);
    setHasSearched(true);
    resultsFade.setValue(0);
    Animated.timing(resultsFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleSwap = () => {
    Haptic.select();
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSubscribe = async () => {
    if (!fromCity || !toCity) {
      showAlert('Select Route', 'Please enter both cities first to subscribe.');
      return;
    }
    if (!user) {
      showAlert('Login Required', 'Please log in to subscribe to route alerts.');
      return;
    }
    setSubscribing(true);
    const { data } = await createSubscription(user.id, fromCity, toCity);
    setSubscribing(false);
    const msgs = formatRouteSubscriptionMessage(fromCity, toCity);
    if (data) {
      Haptic.success();
      showAlert('Route Alert Created!', msgs.createdMessage);
    } else {
      showAlert('Already Subscribed', msgs.alreadySubscribedMessage);
    }
  };

  const handleTrackDelivery = useCallback((requestId: string) => {
    Haptic.tap();
    router.push({
      pathname: '/delivery/[id]',
      params: { id: requestId },
    });
  }, [router]);

  const handleViewRequest = useCallback((_requestId: string) => {
    Haptic.tap();
    router.push('/(tabs)/requests');
  }, [router]);

  const handleRefresh = useCallback(() => {
    tripsQuery.refetch();
    parcelsQuery.refetch();
    requestsQuery.refetch();
  }, [tripsQuery, parcelsQuery, requestsQuery]);

  const canSearch = fromCity.trim().length > 0 || toCity.trim().length > 0;

  const filtersAnimHeight = filtersHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <LinearGradient colors={[C.primarySubtle, 'transparent']} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.headerRow, isTablet && styles.tabletContainer]}>
            {!hideBackBtn && (
              <Pressable
                style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
                onPress={() => {
                  Haptic.tap();
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.push('/(tabs)');
                  }
                }}
                hitSlop={TouchTarget.smallHitSlop}
              >
                <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Search Routes</Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>
                {trips.length + parcels.length} listings available
              </Text>
            </View>
            {/* View mode toggle */}
            {hasSearched && (
              <View style={[localStyles.viewToggle, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <Pressable
                  style={[localStyles.viewToggleBtn, viewMode === 'list' && { backgroundColor: C.primarySubtle }]}
                  onPress={() => { Haptic.select(); setViewMode('list'); }}
                >
                  <MaterialIcons name="view-list" size={16} color={viewMode === 'list' ? C.primary : C.textMuted} />
                </Pressable>
                <Pressable
                  style={[localStyles.viewToggleBtn, viewMode === 'map' && { backgroundColor: C.primarySubtle }]}
                  onPress={() => { Haptic.select(); setViewMode('map'); }}
                >
                  <MaterialIcons name="map" size={16} color={viewMode === 'map' ? C.primary : C.textMuted} />
                </Pressable>
              </View>
            )}
            {hasSearched && (fromCity || toCity) ? (
              <Pressable
                style={[styles.clearBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                onPress={() => { Haptic.tap(); setFromCity(''); setToCity(''); setVehicleType(''); setHasSearched(false); }}
              >
                <MaterialIcons name="clear" size={15} color={C.textSecondary} />
                <Text style={[styles.clearBtnText, { color: C.textSecondary }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          extraScrollHeight={60}
          scrollEventThrottle={16}
        >
          {hasSmartMatchContext ? (
            <SmartMatchesSection
              mode={mode as 'parcel' | 'browse_trips' | 'trip'}
              sourceId={id}
              fromCityParam={fcParam}
              toCityParam={tcParam}
              C={C}
              router={router}
              showAlert={showAlert}
              user={user}
              isTablet={isTablet}
            />
          ) : null}

          <View style={[styles.searchCard, { backgroundColor: C.surface, borderColor: focused ? C.primary + '66' : C.surfaceBorder }, isTablet && styles.tabletContainer]}>
            <View style={[styles.fieldRow, { borderBottomColor: C.surfaceBorder }]}>
              <View style={[styles.fieldDot, { backgroundColor: C.successSubtle }]}>
                <View style={[styles.fieldDotInner, { backgroundColor: C.success }]} />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={[styles.fieldLabel, { color: C.textMuted }]}>From</Text>
                <TextInput
                  ref={fromInputRef}
                  style={[styles.fieldInput, { color: C.textPrimary }]}
                  placeholder="Origin city"
                  placeholderTextColor={C.textMuted}
                  value={fromCity}
                  onChangeText={v => { setFromCity(v); setFocused('from'); setHasSearched(false); }}
                  onFocus={() => setFocused('from')}
                  onBlur={() => setTimeout(() => setFocused(f => f === 'from' ? null : f), 200)}
                  returnKeyType="next"
                  onSubmitEditing={() => toInputRef.current?.focus()}
                  accessibilityLabel="From city"
                />
              </View>
              {fromCity ? (
                <Pressable onPress={() => { setFromCity(''); Haptic.tap(); }} hitSlop={TouchTarget.smallHitSlop}>
                  <MaterialIcons name="close" size={17} color={C.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={[styles.swapBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={handleSwap}
            >
              <MaterialIcons name="swap-vert" size={18} color={C.primary} />
            </Pressable>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldDot, { backgroundColor: C.errorSubtle }]}>
                <View style={[styles.fieldDotInner, { backgroundColor: C.error }]} />
              </View>
              <View style={styles.fieldTextWrap}>
                <Text style={[styles.fieldLabel, { color: C.textMuted }]}>To</Text>
                <TextInput
                  ref={toInputRef}
                  style={[styles.fieldInput, { color: C.textPrimary }]}
                  placeholder="Destination city"
                  placeholderTextColor={C.textMuted}
                  value={toCity}
                  onChangeText={v => { setToCity(v); setFocused('to'); setHasSearched(false); }}
                  onFocus={() => setFocused('to')}
                  onBlur={() => setTimeout(() => setFocused(f => f === 'to' ? null : f), 200)}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  accessibilityLabel="To city"
                />
              </View>
              {toCity ? (
                <Pressable onPress={() => { setToCity(''); Haptic.tap(); }} hitSlop={TouchTarget.smallHitSlop}>
                  <MaterialIcons name="close" size={17} color={C.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {focused === 'from' && fromSuggestions.length > 0 ? (
            <CityDropdown suggestions={fromSuggestions} onSelect={c => { setFromCity(c); setFocused(null); }} accent={C.success} C={C} />
          ) : null}
          {focused === 'to' && toSuggestions.length > 0 ? (
            <CityDropdown suggestions={toSuggestions} onSelect={c => { setToCity(c); setFocused(null); }} accent={C.error} C={C} />
          ) : null}

          <View style={[styles.vehicleSection, isTablet && styles.tabletContainer]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.vehicleRow}>
                <Pressable
                  style={[
                    styles.vehicleChip,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                    !vehicleType && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                  ]}
                  hitSlop={TouchTarget.smallHitSlop}
                  onPress={() => { Haptic.select(); setVehicleType(''); }}
                >
                  <MaterialIcons name="all-inclusive" size={14} color={!vehicleType ? C.primary : C.textMuted} />
                  <Text style={[styles.vehicleChipText, { color: !vehicleType ? C.primary : C.textMuted }]}>All</Text>
                </Pressable>
                {VEHICLE_TYPES.map(v => (
                  <Pressable
                    key={v.type}
                    style={[
                      styles.vehicleChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      vehicleType === v.type && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                    ]}
                    hitSlop={TouchTarget.smallHitSlop}
                    onPress={() => { Haptic.select(); setVehicleType(vehicleType === v.type ? '' : v.type); }}
                  >
                    <MaterialIcons name={v.icon as any} size={14} color={vehicleType === v.type ? C.primary : C.textMuted} />
                    <Text style={[styles.vehicleChipText, { color: vehicleType === v.type ? C.primary : C.textMuted }]}>{v.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={[styles.actionRow, isTablet && styles.tabletContainer]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ scale: searchBtnScale }] }]}>
              <Pressable
                style={[
                  styles.searchBtn,
                  { backgroundColor: canSearch ? C.primary : C.surfaceElevated, borderColor: canSearch ? C.primary : C.surfaceBorder },
                ]}
                onPress={handleSearch}
                disabled={!canSearch}
              >
                <Ionicons name="search" size={17} color={canSearch ? C.textInverse : C.textMuted} />
                <Text style={[styles.searchBtnText, { color: canSearch ? C.textInverse : C.textMuted }]}>Search</Text>
              </Pressable>
            </Animated.View>
            <Pressable
              style={[
                styles.subscribeBtn,
                {
                  backgroundColor: canSearch ? C.primarySubtle : C.surfaceElevated,
                  borderColor: canSearch ? C.primary + '66' : C.surfaceBorder,
                  opacity: subscribing ? 0.7 : 1,
                },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={handleSubscribe}
              disabled={subscribing}
            >
              <Ionicons name="notifications" size={17} color={canSearch ? C.primary : C.textMuted} />
              <Text style={[styles.subscribeBtnText, { color: canSearch ? C.primary : C.textMuted }]}>
                {subscribing ? 'Saving...' : 'Alert'}
              </Text>
            </Pressable>
          </View>

          {hasSearched ? (
            <Animated.View style={{ opacity: resultsFade }}>
              {/* Results count + sorting */}
              <View style={localStyles.resultsHeader}>
                <Text style={[localStyles.resultsCount, { color: C.textSecondary }]}>
                  {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
                </Text>
                <Pressable
                  style={[localStyles.sortBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                  onPress={toggleFilters}
                >
                  <MaterialIcons name="sort" size={14} color={C.textMuted} />
                  <Text style={[localStyles.sortBtnText, { color: C.textMuted }]}>
                    {SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? 'Sort'}
                  </Text>
                  <MaterialIcons name={showFilters ? 'expand-less' : 'expand-more'} size={14} color={C.textMuted} />
                </Pressable>
              </View>

              {/* Collapsible sort options */}
              <Animated.View style={[localStyles.sortPanel, { height: filtersAnimHeight, overflow: 'hidden' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={localStyles.sortRow}>
                    {SORT_OPTIONS.map(opt => (
                      <Pressable
                        key={opt.value}
                        style={[
                          localStyles.sortChip,
                          { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                          sortBy === opt.value && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                        ]}
                        onPress={() => { Haptic.select(); setSortBy(opt.value); }}
                      >
                        <Text style={[localStyles.sortChipText, { color: sortBy === opt.value ? C.primary : C.textMuted }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </Animated.View>

              <View style={[styles.resultTabsRow, isTablet && styles.tabletContainer]}>
                {(['all', 'trips', 'parcels'] as ResultTab[]).map(t => {
                  const count = t === 'all' ? allResults.length : t === 'trips' ? matchedTrips.length : matchedParcels.length;
                  return (
                    <Pressable
                      key={t}
                      style={[
                        styles.resultTab,
                        { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                        tab === t && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                      ]}
                      hitSlop={TouchTarget.smallHitSlop}
                      onPress={() => { Haptic.select(); setTab(t); }}
                    >
                      <MaterialIcons
                        name={t === 'trips' ? 'directions-car' : t === 'parcels' ? 'inventory-2' : 'search'}
                        size={13}
                        color={tab === t ? C.primary : C.textMuted}
                      />
                      <Text style={[styles.resultTabText, { color: tab === t ? C.primary : C.textMuted }]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {(fromCity && toCity && allResults.length > 0) ? (
                <Pressable
                  style={[styles.subscribeCta, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }, isTablet && styles.tabletContainer]}
                  onPress={handleSubscribe}
                >
                  <Ionicons name="notifications-outline" size={14} color={C.primary} />
                  <Text style={[styles.subscribeCtaText, { color: C.primary }]}>
                    Alert me for new listings on {fromCity} → {toCity}
                  </Text>
                  <MaterialIcons name="arrow-forward-ios" size={11} color={C.primary} />
                </Pressable>
              ) : null}

              {/* Map View */}
              {viewMode === 'map' && displayResults.length > 0 && (
                <View style={[localStyles.mapContainer, isTablet && styles.tabletContainer]}>
                  <RouteMapView
                    trips={tab === 'parcels' ? [] : matchedTrips}
                    parcels={tab === 'trips' ? [] : matchedParcels}
                    height={280}
                    onMarkerPress={(marker) => {
                      Haptic.tap();
                    }}
                  />
                </View>
              )}

              {/* List View */}
              {viewMode === 'list' && displayResults.length > 0 ? (
                <View style={[styles.resultsList, isTablet && styles.tabletContainer]}>
                  {displayResults.map((item: SearchItem, idx: number) => {
                    const isItemOwner = Boolean(user?.id && item.data.userId === user.id);
                    const existingReq = item.type === 'trip'
                      ? requestsByTripId.get(item.data.id)
                      : requestsByParcelId.get(item.data.id);
                    return (
                      <View key={`${item.type}-${item.data.id}-${idx}`} style={styles.resultItem}>
                        {item.type === 'trip' ? (
                          <TripCard
                            trip={item.data as Trip}
                            isOwner={isItemOwner}
                            existingRequest={existingReq}
                            showRequestButton={!isItemOwner && FeatureFlags.payments && !existingReq}
                            onRequest={() => {
                              Haptic.tap();
                              router.push({ pathname: '/trip/[id]', params: { id: item.data.id } });
                            }}
                            onTrackDelivery={handleTrackDelivery}
                            onViewRequest={handleViewRequest}
                            onPress={() => { Haptic.tap(); router.push({ pathname: '/trip/[id]', params: { id: item.data.id } }); }}
                          />
                        ) : (
                          <ParcelCard
                            parcel={item.data as Parcel}
                            isOwner={isItemOwner}
                            existingRequest={existingReq}
                            showCarryButton={!isItemOwner && !existingReq}
                            onCarry={() => {
                              Haptic.tap();
                              router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } });
                            }}
                            onTrackDelivery={handleTrackDelivery}
                            onViewRequest={handleViewRequest}
                            onPress={() => { Haptic.tap(); router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } }); }}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : viewMode === 'list' && displayResults.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, isTablet && styles.tabletContainer]}>
                  <View style={[styles.emptyIcon, { backgroundColor: C.surfaceElevated }]}>
                    <MaterialIcons name="search-off" size={36} color={C.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No results found</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>
                    No listings on this route right now.
                  </Text>
                  {fromCity && toCity ? (
                    <View style={localStyles.emptyActionsWrap}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.emptySubscribeBtn,
                          { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
                        ]}
                        onPress={handleSubscribe}
                      >
                        <Ionicons name="notifications" size={15} color="#fff" />
                        <Text style={styles.emptySubscribeBtnText}>Get Notified When Available</Text>
                      </Pressable>

                      <View style={localStyles.emptyShortcutsRow}>
                        <Pressable
                          style={[localStyles.shortcutBtn, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}
                          onPress={() => router.push({ pathname: '/create-parcel', params: { fromCity, toCity } })}
                        >
                          <MaterialIcons name="inventory-2" size={13} color={C.primary} />
                          <Text style={[localStyles.shortcutBtnText, { color: C.primary }]}>List Parcel</Text>
                        </Pressable>

                        <Pressable
                          style={[localStyles.shortcutBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                          onPress={() => router.push({ pathname: '/create-trip', params: { fromCity, toCity } })}
                        >
                          <MaterialIcons name="directions-car" size={13} color={C.textPrimary} />
                          <Text style={[localStyles.shortcutBtnText, { color: C.textPrimary }]}>Offer Trip</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Pull to refresh hint */}
              {displayResults.length > 0 && (
                <Pressable
                  style={[localStyles.refreshBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, isTablet && styles.tabletContainer]}
                  onPress={handleRefresh}
                >
                  <MaterialIcons name="refresh" size={14} color={C.textMuted} />
                  <Text style={[localStyles.refreshText, { color: C.textMuted }]}>Refresh results</Text>
                </Pressable>
              )}
            </Animated.View>
          ) : (
            <View style={[styles.preSearch, isTablet && styles.tabletContainer]}>
              {history.length > 0 ? (
                <View style={styles.historySection}>
                  <View style={styles.historySectionHeader}>
                    <MaterialIcons name="history" size={14} color={C.textMuted} />
                    <Text style={[styles.historySectionTitle, { color: C.textMuted }]}>Recent Searches</Text>
                    <Pressable onPress={clearHistory} hitSlop={8}>
                      <Text style={[styles.clearHistoryText, { color: C.error }]}>Clear</Text>
                    </Pressable>
                  </View>
                  <View style={styles.historyChips}>
                    {history.map((entry, i) => (
                      <HistoryChip
                        key={`${entry.fromCity}-${entry.toCity}-${i}`}
                        entry={entry}
                        onPress={() => handleApplyHistory(entry)}
                        onRemove={() => removeHistory(i)}
                        C={C}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.popularSection}>
                <View style={styles.historySectionHeader}>
                  <MaterialIcons name="local-fire-department" size={14} color={C.warning} />
                  <Text style={[styles.historySectionTitle, { color: C.textMuted }]}>Popular Routes</Text>
                </View>
                <View style={styles.popularGrid}>
                  {POPULAR_ROUTES.map(([from, to]) => (
                    <Pressable
                      key={`${from}-${to}`}
                      style={({ pressed }) => [
                        styles.popularChip,
                        { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                        pressed && { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' },
                      ]}
                      onPress={() => {
                        Haptic.tap();
                        setFromCity(from);
                        setToCity(to);
                        setHasSearched(true);
                        resultsFade.setValue(0);
                        Animated.timing(resultsFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
                      }}
                    >
                      <View style={styles.popularChipInner}>
                        <Text style={[styles.popularFrom, { color: C.textPrimary }]}>{from}</Text>
                        <MaterialIcons name="arrow-forward" size={11} color={C.primary} />
                        <Text style={[styles.popularTo, { color: C.textSecondary }]}>{to}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.hintCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
                <Ionicons name="information-circle-outline" size={16} color={C.primary} />
                <Text style={[styles.hintText, { color: C.primary }]}>
                  Tap Alert to get notified when new trips or parcels appear on your route. Use the map view to visualize routes.
                </Text>
              </View>
            </View>
          )}
        </KeyboardAwareScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart matches section — shown only when caller passes mode/id/fromCity/toCity.
//
// Preserves the three modes from the former `app/matching.tsx`:
//   1) `mode=parcel`      — sender sees scored travellers for their parcel and
//                           can send a delivery request directly.
//   2) `mode=browse_trips`— sender browses travellers on a route (no bound parcel).
//   3) `mode=trip`        — informational: trip was posted, invites user to manage.
// Scoring, diagnostics, cards and request creation are reused unchanged.
// ─────────────────────────────────────────────────────────────────────────────
type SmartMatchesSectionProps = {
  mode: 'parcel' | 'browse_trips' | 'trip';
  sourceId?: string;
  fromCityParam?: string;
  toCityParam?: string;
  C: ThemeColors;
  router: ReturnType<typeof useRouter>;
  showAlert: ReturnType<typeof useAlert>['showAlert'];
  user: ReturnType<typeof useAuth>['user'];
  isTablet: boolean;
};

function SmartMatchesSection({
  mode, sourceId, fromCityParam, toCityParam, C, router, showAlert, user, isTablet,
}: SmartMatchesSectionProps) {
  const isParcelMode = mode === 'parcel';
  const isTripModeLegacy = mode === 'trip';
  const isBrowseMode = mode === 'browse_trips';

  const parcelQuery = useParcelQuery(isParcelMode ? sourceId : undefined);
  const tripQuery = useTripQuery(isTripModeLegacy ? sourceId : undefined);
  const requestsQuery = useRequestsQuery(user?.id);
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);

  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<MatchSortOption>('match');
  const [activeMatchDetails, setActiveMatchDetails] = useState<{ title: string; score: MatchScore } | null>(null);

  const userRequests = requestsQuery.data ?? [];
  const requestsByTripId = useMemo(() => buildRequestsByTripMap(userRequests), [userRequests]);

  const currentParcel = parcelQuery.data ?? null;
  const currentTrip = tripQuery.data ?? null;

  const matchingTripsQuery = useMatchingTrips(
    isParcelMode && currentParcel
      ? {
          parcelId: currentParcel.id,
          fromCity: currentParcel.fromCity,
          toCity: currentParcel.toCity,
          userId: currentParcel.userId,
          weight: currentParcel.weight,
          priceOffer: currentParcel.priceOffer,
          createdAt: currentParcel.createdAt,
          deliveryDate: currentParcel.deliveryDate,
          category: currentParcel.category,
          description: currentParcel.description,
        }
      : null
  );

  const browseTripsQuery = useMatchingTripsOnRoute(
    isBrowseMode && fromCityParam && toCityParam
      ? { fromCity: fromCityParam, toCity: toCityParam, excludeUserId: user?.id }
      : null
  );

  const matchingTrips = useMemo(
    () => (isParcelMode ? (matchingTripsQuery.data?.matches ?? []) : (browseTripsQuery.data?.matches ?? [])),
    [browseTripsQuery.data, isParcelMode, matchingTripsQuery.data]
  );
  const activeDiagnostic = isParcelMode
    ? matchingTripsQuery.data?.diagnostic
    : browseTripsQuery.data?.diagnostic;
  const isMatchingError = Boolean(matchingTripsQuery.isError || browseTripsQuery.isError);
  const loading = matchingTripsQuery.isLoading || browseTripsQuery.isLoading;

  // Pre-populate sentRequests from existing requests to prevent duplicate sends
  useEffect(() => {
    const existing = new Set<string>();
    userRequests.forEach(r => {
      if (r.senderId === user?.id || r.travellerId === user?.id) {
        existing.add(r.parcelId);
        existing.add(r.tripId);
      }
    });
    setSentRequests(existing);
  }, [userRequests, user?.id]);

  const sortedTrips = useMemo(() => sortMatchingTrips(matchingTrips, sortBy), [matchingTrips, sortBy]);

  const tripMatchBreakdowns = useMemo(() => {
    if (!currentParcel) return new Map<string, MatchScore>();
    return new Map(sortedTrips.map(trip => [trip.id, scoreMatch(trip, currentParcel)]));
  }, [sortedTrips, currentParcel]);

  const fromCity = currentParcel?.fromCity ?? currentTrip?.fromCity ?? fromCityParam ?? '';
  const toCity = currentParcel?.toCity ?? currentTrip?.toCity ?? toCityParam ?? '';

  const handleSendRequest = useCallback((trip: Trip) => {
    if (!currentParcel) return;
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in before sending a delivery request.');
      return;
    }
    const isSender = currentParcel.userId === user.id;
    const isTraveller = trip.userId === user.id;

    if (!isSender && !isTraveller) {
      Haptic.warning();
      showAlert('Participation Error', 'You must be either the parcel owner or the trip traveller to connect this delivery.');
      return;
    }

    const routeCheck = checkTripParcelRoute(trip, currentParcel);
    if (!routeCheck.isCompatible) {
      Haptic.error();
      showAlert('Incompatible Route', routeCheck.rejectionReason || 'This trip route does not match your parcel journey.');
      return;
    }

    if (isCreatingRequest) {
      showAlert('Request in Progress', 'Please wait while we finish your previous request.');
      return;
    }
    if (sentRequests.has(trip.id)) {
      showAlert('Already Sent', 'You have already sent a request to this counterparty for this parcel.');
      return;
    }
    const price = calculateMatchPrice(trip.pricePerKg, currentParcel.weight);
    Haptic.warning();
    showAlert(
      isSender ? 'Send Delivery Request' : 'Offer to Carry Parcel',
      isSender
        ? `Ask ${trip.userName} to carry your ${currentParcel.category} (${currentParcel.weight}kg) for ₹${price.toLocaleString('en-IN')}?`
        : `Offer to carry ${currentParcel.userName}'s ${currentParcel.category} (${currentParcel.weight}kg) for ₹${price.toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSender ? 'Send Request' : 'Send Offer',
          onPress: async () => {
            Haptic.confirm();
            try {
              const result = await createRequestAsync({
                parcelId: currentParcel.id,
                tripId: trip.id,
                senderId: currentParcel.userId,
                senderName: currentParcel.userName,
                travellerId: trip.userId,
                travellerName: trip.userName,
                status: 'pending',
                price,
                message: isSender
                  ? `Hi! I need to send my ${currentParcel.category} from ${currentParcel.fromCity} to ${currentParcel.toCity}. It weighs ${currentParcel.weight}kg.`
                  : `Hi! I can carry your ${currentParcel.category} package (${currentParcel.weight}kg) on my trip from ${trip.fromCity} to ${trip.toCity}.`,
              });
              if (result) {
                setSentRequests(prev => new Set([...prev, trip.id]));
                void requestsQuery.refetch();
                Haptic.success();
                showAlert(
                  'Request Sent!',
                  `${trip.userName} will review your request. Check the Requests tab for updates.`,
                  [
                    { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
                    { text: 'Browse More', style: 'cancel' },
                  ]
                );
              } else {
                Haptic.error();
                showAlert('Error', 'Could not send request. Please try again.');
              }
            } catch {
              Haptic.error();
              showAlert('Error', 'Could not send request. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentParcel, user, sentRequests, createRequestAsync, showAlert, router, isCreatingRequest, requestsQuery]);

  const handleRepostNow = useCallback(() => {
    if (currentParcel) {
      router.push({
        pathname: '/create-parcel',
        params: {
          repost: '1',
          fromCity: currentParcel.fromCity,
          toCity: currentParcel.toCity,
          deliveryDate: currentParcel.deliveryDate ?? '',
          category: currentParcel.category,
          description: currentParcel.description,
          weight: String(currentParcel.weight),
          priceOffer: String(currentParcel.priceOffer),
        },
      });
      return;
    }
    if (currentTrip) {
      router.push({
        pathname: '/create-trip',
        params: {
          repost: '1',
          fromCity: currentTrip.fromCity,
          toCity: currentTrip.toCity,
          date: currentTrip.date,
          time: currentTrip.time,
          vehicle: currentTrip.vehicleType,
          capacity: String(currentTrip.availableCapacity),
          price: String(currentTrip.pricePerKg),
        },
      });
    }
  }, [currentParcel, currentTrip, router]);

  const handleDiagnosticAction = useCallback((action: DiagnosticAction) => {
    Haptic.tap();
    switch (action.id) {
      case 'split_parcel':
      case 'adjust_date':
      case 'adjust_price':
      case 'repost_trip':
      case 'increase_capacity':
        handleRepostNow();
        break;
      case 'subscribe_route':
        router.push({ pathname: '/subscriptions', params: { fromCity, toCity } });
        break;
      case 'post_open_request':
        if (currentParcel) {
          showAlert(
            'Delivery Request Is Live',
            'Your parcel request is open on the marketplace. Verified travelers on this corridor will see it and can offer to carry.',
            [
              { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
              { text: 'OK' },
            ]
          );
        } else {
          router.push('/create-parcel');
        }
        break;
      default:
        handleRepostNow();
        break;
    }
  }, [handleRepostNow, router, fromCity, toCity, currentParcel, showAlert]);

  const resultCount = isTripModeLegacy ? 0 : sortedTrips.length;

  return (
    <View style={[smStyles.wrap, isTablet && styles.tabletContainer]}>
      {/* Section header */}
      <View style={smStyles.header}>
        <View style={{ flex: 1 }}>
          <View style={smStyles.titleRow}>
            <MaterialIcons name="auto-awesome" size={16} color={C.primary} />
            <Text style={[smStyles.title, { color: C.textPrimary }]}>Smart matches</Text>
          </View>
          <Text style={[smStyles.subtitle, { color: C.textMuted }]} numberOfLines={1}>
            {fromCity || 'Origin'} → {toCity || 'Destination'}
            {currentParcel ? ` · ${currentParcel.weight}kg` : ''}
            {currentParcel?.deliveryDate ? ` · ${currentParcel.deliveryDate}` : ''}
          </Text>
        </View>
      </View>

      {/* Sort chips (parcel + browse modes with >1 result) */}
      {(isParcelMode || isBrowseMode) && resultCount > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={smStyles.sortRow}>
            {([
              { key: 'match', label: 'Best match', icon: 'auto-awesome' },
              { key: 'price', label: 'Cheapest', icon: 'payments' },
              { key: 'rating', label: 'Top rated', icon: 'star' },
              { key: 'capacity', label: 'Most space', icon: 'scale' },
            ] as const).map(s => (
              <Pressable
                key={s.key}
                style={[
                  smStyles.sortChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  sortBy === s.key && { backgroundColor: C.primarySubtle, borderColor: C.primary + '88' },
                ]}
                onPress={() => { Haptic.select(); setSortBy(s.key); }}
              >
                <MaterialIcons name={s.icon as any} size={11} color={sortBy === s.key ? C.primary : C.textMuted} />
                <Text style={[smStyles.sortChipText, { color: sortBy === s.key ? C.primary : C.textMuted }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {/* Content */}
      {loading ? (
        <View style={[smStyles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <LottieAnimation name="radarMatch" style={{ width: 120, height: 120 }} />
          </View>
          <Text style={[smStyles.cardTitle, { color: C.textSecondary }]}>Finding matches...</Text>
          <Text style={[smStyles.cardSub, { color: C.textMuted }]}>
            {isTripModeLegacy
              ? 'Preparing your trip dashboard'
              : 'Looking for travellers on your route'}
          </Text>
        </View>
      ) : isMatchingError ? (
        <View style={[smStyles.card, { backgroundColor: C.surface, borderColor: C.errorBorder }]}>
          <View style={[smStyles.iconBox, { backgroundColor: C.errorSubtle }]}>
            <MaterialIcons name="cloud-off" size={32} color={C.error} />
          </View>
          <Text style={[smStyles.cardTitle, { color: C.textPrimary }]}>Unable to Connect</Text>
          <Text style={[smStyles.cardSub, { color: C.textMuted }]}>
            We had trouble loading matches. Check your connection and try again.
          </Text>
          <Pressable
            style={[smStyles.cta, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }]}
            onPress={() => {
              Haptic.confirm();
              if (isParcelMode) matchingTripsQuery.refetch();
              else browseTripsQuery.refetch();
            }}
          >
            <Ionicons name="refresh" size={15} color={C.primary} />
            <Text style={[smStyles.ctaText, { color: C.primary }]}>Retry Search</Text>
          </Pressable>
        </View>
      ) : isParcelMode || isBrowseMode ? (
        sortedTrips.length === 0 ? (
          activeDiagnostic ? (
            <View style={smStyles.diagnosticWrap}>
              <MatchDiagnosticCard
                diagnostic={activeDiagnostic}
                onActionPress={handleDiagnosticAction}
                onRetry={() => {
                  Haptic.select();
                  if (isParcelMode) matchingTripsQuery.refetch();
                  else browseTripsQuery.refetch();
                }}
                isRetrying={matchingTripsQuery.isRefetching || browseTripsQuery.isRefetching}
              />
            </View>
          ) : (
            <View style={[smStyles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={{ width: 120, height: 95, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
                <LottieAnimation name="searchEmpty" style={{ width: 120, height: 95 }} />
              </View>
              <Text style={[smStyles.cardTitle, { color: C.textSecondary }]}>No matching routes</Text>
              <Text style={[smStyles.cardSub, { color: C.textMuted }]}>
                {isParcelMode
                  ? 'No compatible traveller is on this route right now. Set an alert to be notified.'
                  : 'No compatible traveller is on this route right now. Subscribe for updates.'}
              </Text>
              <Pressable
                style={[smStyles.cta, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }]}
                onPress={() => {
                  Haptic.tap();
                  router.push({ pathname: '/subscriptions', params: { fromCity, toCity } });
                }}
              >
                <Ionicons name="notifications-outline" size={15} color={C.primary} />
                <Text style={[smStyles.ctaText, { color: C.primary }]}>
                  {isParcelMode ? 'Set Route Alert' : 'Subscribe to Route'}
                </Text>
              </Pressable>
            </View>
          )
        ) : (
          <View style={smStyles.list}>
            {sortedTrips.map((item) => {
              if (!isTripModeLegacy) {
                const matchPrice = currentParcel
                  ? calculateMatchPrice(item.pricePerKg, currentParcel.weight)
                  : Math.round(item.pricePerKg * 2 || 180);

                return (
                  <View key={item.id} style={{ marginBottom: 12 }}>
                    <BlaBlaTripCard
                      trip={item}
                      price={matchPrice}
                      onPress={() => router.push({
                        pathname: '/trip/[id]',
                        params: { id: item.id, parcelId: currentParcel?.id || '' },
                      })}
                    />
                  </View>
                );
              }

              return (
                <View key={item.id} style={{ marginBottom: Spacing.md }}>
                  <TripCard
                    trip={item}
                    existingRequest={requestsByTripId.get(item.id)}
                    matchScore={isParcelMode ? tripMatchBreakdowns.get(item.id)?.total : undefined}
                    onMatchPress={isParcelMode
                      ? () => {
                        const score = tripMatchBreakdowns.get(item.id);
                        if (!score) return;
                        setActiveMatchDetails({
                          title: `${item.fromCity} → ${item.toCity}`,
                          score,
                        });
                      }
                      : undefined}
                    showRequestButton={!sentRequests.has(item.id)}
                    onRequest={() => handleSendRequest(item)}
                    onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
                  />
                </View>
              );
            })}
          </View>
        )
      ) : (
        // Trip mode (informational)
        <View style={[smStyles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={{ width: 120, height: 95, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
            <LottieAnimation name="searchEmpty" style={{ width: 120, height: 95 }} />
          </View>
          <Text style={[smStyles.cardTitle, { color: C.textSecondary }]}>Trip posted</Text>
          <Text style={[smStyles.cardSub, { color: C.textMuted }]}>
            Senders with matching routes will send requests. You can review your trip anytime.
          </Text>
          <Pressable
            style={[smStyles.cta, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }]}
            onPress={() => {
              Haptic.tap();
              if (sourceId) router.replace({ pathname: '/trip/[id]', params: { id: sourceId } });
              else router.replace('/(tabs)');
            }}
          >
            <Ionicons name="arrow-forward" size={15} color={C.primary} />
            <Text style={[smStyles.ctaText, { color: C.primary }]}>Manage Trip</Text>
          </Pressable>
        </View>
      )}

      {/* Section divider */}
      <View style={[smStyles.divider, { borderBottomColor: C.surfaceBorder }]} />

      <MatchBreakdownSheet
        visible={Boolean(activeMatchDetails)}
        details={activeMatchDetails}
        onClose={() => setActiveMatchDetails(null)}
        C={C}
      />
    </View>
  );
}

function MatchBreakdownSheet({ visible, details, onClose, C }: {
  visible: boolean;
  details: { title: string; score: MatchScore } | null;
  onClose: () => void;
  C: ThemeColors;
}) {
  if (!details) return null;

  const rows = [
    { label: 'Route Fit', value: details.score.breakdown.routeScore, icon: 'directions' as const },
    { label: 'Time Fit', value: details.score.breakdown.dateScore, icon: 'schedule' as const },
    { label: 'Capacity Fit', value: details.score.breakdown.capacityScore, icon: 'fitness-center' as const },
    { label: 'Price Fit', value: details.score.breakdown.priceScore, icon: 'currency-rupee' as const },
    { label: 'Rating Fit', value: details.score.breakdown.ratingScore, icon: 'star' as const },
    { label: 'Reliability', value: details.score.breakdown.reliabilityScore, icon: 'verified-user' as const },
  ];

  return (
    <GestureBottomSheet visible={visible} onClose={onClose} maxHeight="80%" showHandle enablePanDownToClose>
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        <View style={smStyles.sheetHeader}>
          <Text style={[smStyles.sheetTitle, { color: C.textPrimary }]}>Why this match?</Text>
          <Pressable
            onPress={() => { Haptic.tap(); onClose(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close match details"
            style={({ pressed }) => [
              {
                width: 32, height: 32, borderRadius: 16, borderWidth: 1,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.92 : 1 }], opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textMuted} />
          </Pressable>
        </View>
        <Text style={[smStyles.sheetRoute, { color: C.textSecondary }]}>{details.title}</Text>

        <View style={[smStyles.sheetTotalCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }]}>
          <Text style={[smStyles.sheetTotalLabel, { color: C.textSecondary }]}>Overall Match</Text>
          <Text style={[smStyles.sheetTotalValue, { color: C.primary }]}>{details.score.total}%</Text>
          <Text style={[smStyles.sheetGrade, { color: C.textMuted }]}>{details.score.grade.toUpperCase()}</Text>
        </View>

        <View style={smStyles.sheetRows}>
          {rows.map((row) => (
            <View key={row.label} style={smStyles.sheetRow}>
              <View style={smStyles.sheetRowLabelWrap}>
                <MaterialIcons name={row.icon} size={14} color={C.textSecondary} />
                <Text style={[smStyles.sheetRowLabel, { color: C.textSecondary }]}>{row.label}</Text>
              </View>
              <Text style={[smStyles.sheetRowValue, { color: C.textPrimary }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </GestureBottomSheet>
  );
}

const smStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 10,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  subtitle: { fontSize: FontSize.xs, marginTop: 2 },
  sortRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  sortChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  list: { marginTop: Spacing.xs },
  diagnosticWrap: { marginTop: Spacing.xs },
  card: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg,
    alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, textAlign: 'center' },
  cardSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  iconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: Spacing.sm,
  },
  ctaText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginTop: Spacing.md, marginBottom: Spacing.xs },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sheetRoute: { fontSize: FontSize.sm, marginTop: -2 },
  sheetTotalCard: {
    borderWidth: 1, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sheetTotalLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sheetTotalValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  sheetGrade: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sheetRows: { gap: 6, marginTop: Spacing.sm },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 7,
  },
  sheetRowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetRowLabel: { fontSize: FontSize.sm },
  sheetRowValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});

const localStyles = StyleSheet.create({
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.2,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sortPanel: {
    marginHorizontal: 16,
    marginTop: 6,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  sortChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.2,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyActionsWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  emptyShortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  shortcutBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
