import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TripCard, ParcelCard } from '@/components';
import { Trip, Parcel } from '@/types';
import { CITIES } from '@/constants/mockData';
import { Haptic } from '@/services/haptics.service';
import { createSubscription } from '@/services/subscriptions.service';
import { useAlert } from '@/template';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { CityDropdown } from '@/components/feature/CityDropdown';
import { HistoryChip, SearchHistoryEntry } from '@/components/feature/HistoryChip';
import { RouteMapView } from '@/components/feature/RouteMapView';
import { SmartSearchBar } from '@/components/feature/SmartSearchBar';
import { useSmartSearch, SortOption } from '@/hooks/useSmartSearch';
import { styles } from '@/styles/search.styles';

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
  ['Mumbai', 'Delhi'], ['Mumbai', 'Pune'], ['Delhi', 'Jaipur'],
  ['Bangalore', 'Chennai'], ['Hyderabad', 'Vizag'], ['Kolkata', 'Patna'],
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_nearest', label: 'Nearest Date' },
  { value: 'price_low', label: 'Price: Low' },
  { value: 'price_high', label: 'Price: High' },
  { value: 'rating_best', label: 'Best Rating' },
  { value: 'distance_shortest', label: 'Shortest' },
];

type ResultTab = 'all' | 'trips' | 'parcels';
type ViewMode = 'list' | 'map';
type FocusedField = 'from' | 'to' | null;

export default function SearchScreen() {
  const { user } = useAuth();
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

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

  const trips = user ? flattenInfiniteData(tripsQuery.data) : [];
  const parcels = user ? flattenInfiniteData(parcelsQuery.data) : [];
  const sourceTrips = trips.filter(t => t.status === 'active' && t.userId !== user?.id);
  const sourceParcels = parcels.filter(p => p.status === 'open' && p.userId !== user?.id);
  const matchedTrips = sourceTrips.filter(t => {
    const matchFrom = !fromCity || t.fromCity.toLowerCase().includes(fromCity.toLowerCase());
    const matchTo = !toCity || t.toCity.toLowerCase().includes(toCity.toLowerCase());
    const matchVehicle = !vehicleType || t.vehicleType === vehicleType;
    return matchFrom && matchTo && matchVehicle;
  });

  const matchedParcels = sourceParcels.filter(p => {
    const matchFrom = !fromCity || p.fromCity.toLowerCase().includes(fromCity.toLowerCase());
    const matchTo = !toCity || p.toCity.toLowerCase().includes(toCity.toLowerCase());
    return matchFrom && matchTo;
  });

  // Sort results
  type SearchItem = { type: 'trip'; data: Trip } | { type: 'parcel'; data: Parcel };
  const sortResults = useCallback((items: SearchItem[]): SearchItem[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'price_low': {
          const priceA = a.type === 'trip' ? a.data.pricePerKg : a.data.priceOffer;
          const priceB = b.type === 'trip' ? b.data.pricePerKg : b.data.priceOffer;
          return priceA - priceB;
        }
        case 'price_high': {
          const priceA = a.type === 'trip' ? a.data.pricePerKg : a.data.priceOffer;
          const priceB = b.type === 'trip' ? b.data.pricePerKg : b.data.priceOffer;
          return priceB - priceA;
        }
        case 'rating_best': {
          const ratingA = a.type === 'trip' ? a.data.userRating : 0;
          const ratingB = b.type === 'trip' ? b.data.userRating : 0;
          return ratingB - ratingA;
        }
        case 'date_nearest':
        default:
          return new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime();
      }
    });
  }, [sortBy]);

  const allResults = sortResults([
    ...matchedTrips.map(t => ({ type: 'trip' as const, data: t })),
    ...matchedParcels.map(p => ({ type: 'parcel' as const, data: p })),
  ]);

  const displayResults = tab === 'all' ? allResults :
    tab === 'trips' ? sortResults(matchedTrips.map(t => ({ type: 'trip' as const, data: t }))) :
      sortResults(matchedParcels.map(p => ({ type: 'parcel' as const, data: p })));

  const fromSuggestions = CITIES.filter(c =>
    c.toLowerCase().includes(fromCity.toLowerCase()) && c !== toCity && fromCity.length > 0 && fromCity !== c
  );
  const toSuggestions = CITIES.filter(c =>
    c.toLowerCase().includes(toCity.toLowerCase()) && c !== fromCity && toCity.length > 0 && toCity !== c
  );

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
    if (data) {
      Haptic.success();
      showAlert('Route Alert Created!', `You'll be notified when trips or parcels appear on ${fromCity} → ${toCity}.`);
    } else {
      showAlert('Already Subscribed', `You already have an alert for ${fromCity} → ${toCity}.`);
    }
  };

  const handleRefresh = useCallback(() => {
    tripsQuery.refetch();
    parcelsQuery.refetch();
  }, [tripsQuery, parcelsQuery]);

  const canSearch = fromCity.trim().length > 0 || toCity.trim().length > 0;

  const filtersAnimHeight = filtersHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <LinearGradient colors={[C.primary + '10', 'transparent']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerRow}>
            <Pressable
              style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
              onPress={() => { Haptic.tap(); router.back(); }}
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Search Routes</Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>
                {sourceTrips.length + sourceParcels.length} listings available
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          <View style={[styles.searchCard, { backgroundColor: C.surface, borderColor: focused ? C.primary + '66' : C.surfaceBorder }]}>
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
                <Pressable onPress={() => { setFromCity(''); Haptic.tap(); }} hitSlop={8}>
                  <MaterialIcons name="close" size={17} color={C.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={[styles.swapBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}
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
                <Pressable onPress={() => { setToCity(''); Haptic.tap(); }} hitSlop={8}>
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

          <View style={styles.vehicleSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.vehicleRow}>
                <Pressable
                  style={[
                    styles.vehicleChip,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                    !vehicleType && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                  ]}
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
                    onPress={() => { Haptic.select(); setVehicleType(vehicleType === v.type ? '' : v.type); }}
                  >
                    <MaterialIcons name={v.icon as any} size={14} color={vehicleType === v.type ? C.primary : C.textMuted} />
                    <Text style={[styles.vehicleChipText, { color: vehicleType === v.type ? C.primary : C.textMuted }]}>{v.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.actionRow}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ scale: searchBtnScale }] }]}>
              <Pressable
                style={[
                  styles.searchBtn,
                  { backgroundColor: canSearch ? C.primary : C.surfaceElevated, borderColor: canSearch ? C.primary : C.surfaceBorder },
                ]}
                onPress={handleSearch}
                disabled={!canSearch}
              >
                <Ionicons name="search" size={17} color={canSearch ? '#fff' : C.textMuted} />
                <Text style={[styles.searchBtnText, { color: canSearch ? '#fff' : C.textMuted }]}>Search</Text>
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

              <View style={styles.resultTabsRow}>
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
                  style={[styles.subscribeCta, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}
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
                <View style={localStyles.mapContainer}>
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
                <View style={styles.resultsList}>
                  {displayResults.map((item, idx) => (
                    <View key={`${item.type}-${item.data.id}-${idx}`} style={styles.resultItem}>
                      {item.type === 'trip' ? (
                        <TripCard
                          trip={item.data as Trip}
                          onPress={() => { Haptic.tap(); router.push({ pathname: '/trip/[id]', params: { id: item.data.id } }); }}
                        />
                      ) : (
                        <ParcelCard
                          parcel={item.data as Parcel}
                          onPress={() => { Haptic.tap(); router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } }); }}
                        />
                      )}
                    </View>
                  ))}
                </View>
              ) : viewMode === 'list' && displayResults.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: C.surfaceElevated }]}>
                    <MaterialIcons name="search-off" size={36} color={C.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No results found</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>
                    No listings on this route right now.
                  </Text>
                  {fromCity && toCity ? (
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
                  ) : null}
                </View>
              ) : null}

              {/* Pull to refresh hint */}
              {displayResults.length > 0 && (
                <Pressable
                  style={[localStyles.refreshBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                  onPress={handleRefresh}
                >
                  <MaterialIcons name="refresh" size={14} color={C.textMuted} />
                  <Text style={[localStyles.refreshText, { color: C.textMuted }]}>Refresh results</Text>
                </Pressable>
              )}
            </Animated.View>
          ) : (
            <View style={styles.preSearch}>
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sortPanel: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
