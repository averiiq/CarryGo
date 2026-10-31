import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AsyncStateCard, FeedSkeletonList, LottieAnimation, OfflineBanner, ParcelCard, SwipeableCard, TripCard, LiveMarketplaceHeader, MarketplaceSortOption, RequestSuccessModal, AnimatedIcon, type AnimatedIconRef } from '@/components';
import { FilterPanel } from '@/components/feature/FilterPanel';
import { NotificationPanel } from '@/components/feature/NotificationPanel';
import { CarryParcelModal, QuickCarryTripParams } from '@/components/feature/CarryParcelModal';
import { SendRequestModal, QuickCreateParcelParams } from '@/components/feature/SendRequestModal';
import { CitySelectModal } from '@/components/feature/CitySelectModal';
import { LiveActivityCompactPill } from '@/components/feature/LiveActivityCompactPill';
import { PromotionalBannerCarousel } from '@/components/feature/PromotionalBannerCarousel';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget, TabBarGeometry, StatusBarGeometry } from '@/constants/theme';
import { FeatureFlags } from '@/constants/featureFlags';
import { filterParcels, filterTrips, flattenInfiniteData, useListingsRealtime, useParcelsQuery, useTripsQuery, useCreateTripMutation, useCreateParcelMutation, usePromotionalBannersQuery } from '@/features/listings/queries';
import { useRequestsQuery, useCreateRequestMutation } from '@/features/requests/queries';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNotifications } from '@/hooks/useNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAlert } from '@/template';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import { checkTripParcelRoute } from '@/services/route-compatibility.service';
import { FilterOptions, Parcel, Trip, Request } from '@/types';
import { resolveImageUrl } from '@/constants/images';

const DEFAULT_FILTERS: FilterOptions = { fromCity: '', toCity: '', vehicleType: '', dateFrom: '', dateTo: '' };
type FeedItem = { type: 'trip'; data: Trip } | { type: 'parcel'; data: Parcel };

function HomeHeader({
  userName,
  avatarUri,
  unreadCount,
  onNotifications,
  onProfilePress,
  locationCity,
  onCityPress,
}: {
  userName: string;
  avatarUri?: string;
  unreadCount: number;
  onNotifications: () => void;
  onProfilePress?: () => void;
  locationCity?: string;
  onCityPress?: () => void;
}) {
  const { C } = useThemeColors();
  const [imgError, setImgError] = useState(false);
  const resolvedAvatar = resolveImageUrl(avatarUri);

  useEffect(() => {
    setImgError(false);
  }, [avatarUri]);

  const initial = (userName || 'U').charAt(0).toUpperCase();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const bellRef = useRef<AnimatedIconRef>(null);

  return (
    <View style={styles.headerTop}>
      <Pressable
        onPress={() => {
          Haptic.tap();
          onProfilePress?.();
        }}
        style={({ pressed }) => [
          styles.userProfileWrap,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="View profile"
      >
        <View style={[styles.avatarCircle, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
          {resolvedAvatar && !imgError ? (
            <Image
              source={{ uri: resolvedAvatar }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              contentFit="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={[styles.avatarInitial, { color: C.primary }]}>{initial}</Text>
          )}
          <View style={[styles.onlineDot, { backgroundColor: C.success, borderColor: C.card, borderWidth: 1.5 }]} />
        </View>
        <View style={styles.greetingWrap}>
          <Text style={[styles.greetingSub, { color: C.textMuted }]}>{greeting} 👋</Text>
          <Text style={[styles.greetingName, { color: C.textPrimary }]} numberOfLines={1}>
            {userName}
          </Text>
        </View>
      </Pressable>

      <View style={styles.headerRightActions}>
        {onCityPress ? (
          <Pressable
            onPress={() => {
              Haptic.tap();
              onCityPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Active transit hub: ${locationCity || 'Choose City'}`}
            style={({ pressed }) => [
              styles.hubSelectorPill,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="place" size={13} color={C.primary} />
            <Text style={[styles.hubSelectorText, { color: C.textPrimary }]} numberOfLines={1}>
              {locationCity || 'India'}
            </Text>
            <MaterialIcons name="expand-more" size={14} color={C.textMuted} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            Haptic.tap();
            bellRef.current?.play();
            onNotifications();
          }}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={TouchTarget.smallHitSlop}
          style={({ pressed }) => [
            styles.notifyBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
          ]}
        >
          <AnimatedIcon ref={bellRef} name="notification" size={22} color={C.textPrimary} />
          {unreadCount > 0 ? (
            <View style={[styles.notifyBadge, { backgroundColor: C.error }]}>
              <Text style={styles.notifyBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

function SearchBarTrigger({
  onSearchPress,
  onFilterPress,
  hasFilter,
}: {
  onSearchPress: () => void;
  onFilterPress: () => void;
  hasFilter: boolean;
}) {
  const { C } = useThemeColors();
  const searchRef = useRef<AnimatedIconRef>(null);
  const filterRef = useRef<AnimatedIconRef>(null);

  return (
    <Pressable
      onPress={() => {
        Haptic.tap();
        searchRef.current?.play();
        onSearchPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Search routes and deliveries"
      style={({ pressed }) => [
        styles.searchBar,
        { backgroundColor: C.card, borderColor: hasFilter ? C.primary : C.surfaceBorder },
        pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={[styles.searchIconWrap, { backgroundColor: C.primarySubtle }]}>
        <AnimatedIcon ref={searchRef} name="searchToX" size={20} color={C.primary} />
      </View>
      <View style={styles.searchCopyWrap}>
        <Text style={[styles.searchPlaceholder, { color: C.textPrimary }]}>Where are you traveling or sending?</Text>
        <Text style={[styles.searchSubPlaceholder, { color: C.textMuted }]}>Search routes, cities or dates</Text>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          Haptic.tap();
          filterRef.current?.play();
          onFilterPress();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Filter listings"
        style={({ pressed }) => [
          styles.filterIconBadge,
          {
            backgroundColor: hasFilter ? C.primarySubtle : C.surfaceElevated,
            borderColor: hasFilter ? C.primary : C.surfaceBorder,
            borderWidth: 1,
          },
          pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
        ]}
      >
        <AnimatedIcon ref={filterRef} name="filter" size={17} color={hasFilter ? C.primary : C.textSecondary} />
        {hasFilter ? <View style={[styles.activeFilterDotOnTrigger, { backgroundColor: C.primary }]} /> : null}
      </Pressable>
    </Pressable>
  );
}

function QuickActions() {
  const router = useRouter();
  const { C } = useThemeColors();

  return (
    <View style={styles.quickActionsRow}>
      <Pressable
        onPress={() => {
          Haptic.confirm();
          router.push('/create-parcel');
        }}
        accessibilityRole="button"
        accessibilityLabel="Send Parcel"
        style={({ pressed }) => [
          styles.quickActionTile,
          { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder },
          pressed && { opacity: 0.92, transform: [{ scale: 0.978 }] },
        ]}
      >
        <View style={styles.quickActionTileTop}>
          <View style={[styles.quickActionIconBubble, { backgroundColor: C.primary }]}>
            <MaterialIcons name="inventory-2" size={18} color="#FFFFFF" />
          </View>
          <View style={[styles.quickActionMiniArrow, { backgroundColor: '#FFFFFF' }]}>
            <MaterialIcons name="arrow-outward" size={13} color={C.primary} />
          </View>
        </View>
        <View style={styles.quickActionCopy}>
          <Text style={[styles.quickActionTitle, { color: C.textPrimary }]}>Send Parcel</Text>
          <Text style={[styles.quickActionSub, { color: C.textSecondary }]}>Get items delivered fast</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          Haptic.confirm();
          router.push('/create-trip');
        }}
        accessibilityRole="button"
        accessibilityLabel="Post a Trip"
        style={({ pressed }) => [
          styles.quickActionTile,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          pressed && { opacity: 0.92, transform: [{ scale: 0.978 }] },
        ]}
      >
        <View style={styles.quickActionTileTop}>
          <View style={[styles.quickActionIconBubble, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="flight-takeoff" size={18} color={C.primary} />
          </View>
          <View style={[styles.quickActionMiniArrow, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="arrow-outward" size={13} color={C.textMuted} />
          </View>
        </View>
        <View style={styles.quickActionCopy}>
          <Text style={[styles.quickActionTitle, { color: C.textPrimary }]}>Post a Trip</Text>
          <Text style={[styles.quickActionSub, { color: C.textMuted }]}>Earn cash while traveling</Text>
        </View>
      </Pressable>
    </View>
  );
}

function EmptyMarketplace({
  activeTab,
  hasFilter,
  locationCity,
  onClear,
  onCreate,
  onShowAllIndia,
  onChangeCity,
}: {
  activeTab: 'trips' | 'parcels';
  hasFilter: boolean;
  locationCity?: string | null;
  onClear: () => void;
  onCreate: () => void;
  onShowAllIndia?: () => void;
  onChangeCity?: () => void;
}) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}>
        <LottieAnimation
          name={hasFilter ? 'searchEmpty' : activeTab === 'trips' ? 'deliveryCar' : 'packageBox'}
          style={{ width: 140, height: 110 }}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
        {hasFilter
          ? 'No route matches found'
          : locationCity
            ? activeTab === 'trips'
              ? `No live trips in ${locationCity}`
              : `No open parcels in ${locationCity}`
            : activeTab === 'trips'
              ? 'No live trips available'
              : 'No open parcels yet'}
      </Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        {hasFilter
          ? 'Try adjusting your destination, vehicle or date filters.'
          : locationCity
            ? `No active listings found for ${locationCity} right now. Select a neighboring city hub or be the first to create one.`
            : activeTab === 'trips'
              ? 'Be the first traveler to post a route and earn on this trip.'
              : 'Post your package request and get matched with verified travelers.'}
      </Text>

      {hasFilter ? (
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [
            styles.emptyCta,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.emptyCtaText}>Reset Filters</Text>
        </Pressable>
      ) : locationCity ? (
        <View style={styles.emptyActionRow}>
          {onChangeCity ? (
            <Pressable
              onPress={onChangeCity}
              style={({ pressed }) => [
                styles.emptyOutlineBtn,
                { borderColor: C.surfaceBorder, backgroundColor: C.surfaceElevated },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.emptyOutlineBtnText, { color: C.textPrimary }]}>Change City</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onCreate}
            style={({ pressed }) => [
              styles.emptyOutlineBtn,
              { borderColor: C.primary + '55', backgroundColor: C.primarySubtle },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.emptyOutlineBtnText, { color: C.primaryDark }]}>
              {activeTab === 'trips' ? 'Post Trip' : 'Send Parcel'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [
            styles.emptyCta,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.emptyCtaText}>
            {activeTab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const FeedTripItem = React.memo(function FeedTripItem({
  trip,
  isTablet,
  isOwner,
  onPress,
  onRequest,
  onShare,
  existingRequest,
  onTrackDelivery,
  onViewRequest,
}: {
  trip: Trip;
  isTablet: boolean;
  isOwner: boolean;
  onPress: (id: string) => void;
  onRequest: (tripId: string) => void;
  onShare: (trip: Trip) => void;
  existingRequest?: Request | null;
  onTrackDelivery?: (requestId: string) => void;
  onViewRequest?: (requestId: string) => void;
}) {
  const handlePress = useCallback(() => onPress(trip.id), [onPress, trip.id]);
  const handleRequest = useCallback(
    () => onRequest(trip.id),
    [onRequest, trip.id]
  );
  const handleShare = useCallback(() => onShare(trip), [onShare, trip]);

  return (
    <View style={isTablet ? styles.tabletCardWrap : styles.feedCardWrap}>
      <SwipeableCard
        onShare={handleShare}
        onSecondaryAction={!isOwner && trip.status === 'active' && FeatureFlags.payments && !existingRequest ? handleRequest : undefined}
        secondaryLabel="Request"
        secondaryIcon="send"
      >
        <TripCard
          trip={trip}
          isOwner={isOwner}
          existingRequest={existingRequest}
          onPress={handlePress}
          showRequestButton={!isOwner && trip.status === 'active' && FeatureFlags.payments && !existingRequest}
          onRequest={handleRequest}
          onTrackDelivery={onTrackDelivery}
          onViewRequest={onViewRequest}
        />
      </SwipeableCard>
    </View>
  );
});

const FeedParcelItem = React.memo(function FeedParcelItem({
  parcel,
  isTablet,
  isOwner,
  onPress,
  onCarry,
  onShare,
  existingRequest,
  onTrackDelivery,
  onViewRequest,
}: {
  parcel: Parcel;
  isTablet: boolean;
  isOwner: boolean;
  onPress: (id: string) => void;
  onCarry: (id: string) => void;
  onShare: (parcel: Parcel) => void;
  existingRequest?: Request | null;
  onTrackDelivery?: (requestId: string) => void;
  onViewRequest?: (requestId: string) => void;
}) {
  const handlePress = useCallback(() => onPress(parcel.id), [onPress, parcel.id]);
  const handleCarry = useCallback(() => onCarry(parcel.id), [onCarry, parcel.id]);
  const handleShare = useCallback(() => onShare(parcel), [onShare, parcel]);

  return (
    <View style={isTablet ? styles.tabletCardWrap : styles.feedCardWrap}>
      <SwipeableCard
        onShare={handleShare}
        onSecondaryAction={!isOwner && parcel.status === 'open' && !existingRequest ? handleCarry : undefined}
        secondaryLabel="Carry"
        secondaryIcon="luggage"
      >
        <ParcelCard
          parcel={parcel}
          isOwner={isOwner}
          existingRequest={existingRequest}
          onPress={handlePress}
          showCarryButton={!isOwner && parcel.status === 'open' && !existingRequest}
          onCarry={handleCarry}
          onTrackDelivery={onTrackDelivery}
          onViewRequest={onViewRequest}
        />
      </SwipeableCard>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { C } = useThemeColors();
  const { showAlert } = useAlert();
  const { isOnline } = useNetworkStatus();
  const { notifications, unreadCount, markAllRead, markNotificationsAsRead, openNotification } = useNotifications();
  const { isSmallDevice, isTablet } = useResponsive();

  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'parcels'>('trips');
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [quickVehicle, setQuickVehicle] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [marketplaceSort, setMarketplaceSort] = useState<MarketplaceSortOption>('recent');
  const stickyFilterRef = useRef<AnimatedIconRef>(null);
  const stickyBellRef = useRef<AnimatedIconRef>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [carryParcelTarget, setCarryParcelTarget] = useState<Parcel | null>(null);
  const [requestTripTarget, setRequestTripTarget] = useState<Trip | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<{
    type: 'request_sent' | 'offer_sent';
    recipientName: string;
    price: number;
    fromCity: string;
    toCity: string;
  } | null>(null);

  const listRef = useRef<FlatList<FeedItem>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const handleSelectTab = useCallback((tab: 'trips' | 'parcels') => {
    Haptic.select();
    setActiveTab(tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'trips' ? 0 : 1,
      useNativeDriver: false,
      tension: 260,
      friction: 20,
    }).start();
  }, [tabIndicatorAnim]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const y = event?.nativeEvent?.contentOffset?.y || 0;
        if (y > 200 && !isScrolledDown) {
          setIsScrolledDown(true);
        } else if (y <= 200 && isScrolledDown) {
          setIsScrolledDown(false);
        }
      },
    }
  );

  const handleShareTrip = useCallback((trip: Trip) => {
    Haptic.confirm();
    Share.share({
      title: `CaryGoo Trip: ${trip.fromCity} to ${trip.toCity}`,
      message: `Traveler going from ${trip.fromCity} to ${trip.toCity} on ${trip.date}. Capacity: ${trip.availableCapacity}kg available (₹${trip.pricePerKg}/kg). Check it out on CaryGoo!`,
    }).catch(() => {});
  }, []);

  const handleShareParcel = useCallback((parcel: Parcel) => {
    Haptic.confirm();
    Share.share({
      title: `CaryGoo Parcel: ${parcel.fromCity} to ${parcel.toCity}`,
      message: `Parcel delivery request from ${parcel.fromCity} to ${parcel.toCity} (${parcel.weight}kg, ${parcel.category}). Earn ₹${parcel.priceOffer} carrying this package on CaryGoo!`,
    }).catch(() => {});
  }, []);

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroFade, heroTranslateY]);

  const defaultCity = useMemo(() => user?.city?.trim() || 'Gurugram', [user?.city]);
  const [locationCity, setLocationCity] = useState<string>(defaultCity);
  const [hasManuallySelectedCity, setHasManuallySelectedCity] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isDetectingCity, setIsDetectingCity] = useState(false);

  useEffect(() => {
    if (!hasManuallySelectedCity && user?.city?.trim()) {
      setLocationCity(user.city.trim());
    }
  }, [user?.city, hasManuallySelectedCity]);

  const handleSelectLocationCity = useCallback((cityName: string) => {
    Haptic.select();
    setHasManuallySelectedCity(true);
    setLocationCity(cityName);
    setShowCityPicker(false);
  }, []);

  const handleToggleAllIndia = useCallback(() => {
    Haptic.select();
    setShowCityPicker(true);
  }, []);

  const handleDetectCurrentLocation = useCallback(async () => {
    if (isDetectingCity) return;
    setIsDetectingCity(true);
    Haptic.tap();
    const { data, error } = await detectCurrentCity();
    setIsDetectingCity(false);
    if (data && !error) {
      Haptic.success();
      setLocationCity(data);
      setHasManuallySelectedCity(true);
      setShowCityPicker(false);
    } else {
      Haptic.warning();
      showAlert('Location Detection', error || 'Could not detect your current city. Please choose from the list.');
    }
  }, [isDetectingCity, showAlert]);

  const effectiveCity = locationCity || defaultCity;
  const tripsQuery = useTripsQuery(true, effectiveCity);
  const parcelsQuery = useParcelsQuery(true, effectiveCity);
  const requestsQuery = useRequestsQuery(user?.id);
  const promotionalBannersQuery = usePromotionalBannersQuery();
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);
  const createTripMutation = useCreateTripMutation();
  const createParcelMutation = useCreateParcelMutation();
  useListingsRealtime(true, effectiveCity);

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

  const activeDeliveryRequest = useMemo(() => {
    const inTransit = userRequests.find((r) => r.status === 'accepted');
    if (inTransit) return inTransit;
    const pendingAction = userRequests.find((r) => r.status === 'pending' && r.travellerId === user?.id);
    if (pendingAction) return pendingAction;
    return userRequests.find((r) => r.status === 'pending');
  }, [userRequests, user?.id]);

  const liveDeliveryRequests = useMemo(() => {
    return userRequests.filter(
      (r) => r.status === 'accepted' || (r.status === 'pending' && r.travellerId === user?.id)
    );
  }, [userRequests, user?.id]);

  const trips = useMemo(() => flattenInfiniteData(tripsQuery.data), [tripsQuery.data]);
  const parcels = useMemo(() => flattenInfiniteData(parcelsQuery.data), [parcelsQuery.data]);

  const urgentParcels = useMemo(() => {
    return parcels.filter(
      (p) =>
        p.status === 'open' &&
        (p.category === 'medicine' ||
          p.category === 'documents' ||
          p.priceOffer >= 400 ||
          /urgent|emergency|express|today|fast|asap/i.test(p.description || ''))
    );
  }, [parcels]);

  const filteredTrips = useMemo(() => {
    let list = filterTrips(trips, filters, effectiveCity);
    if (quickVehicle) {
      list = list.filter((t) => t.vehicleType?.toLowerCase() === quickVehicle.toLowerCase());
    }
    if (marketplaceSort === 'price') {
      list = [...list].sort((a, b) => (a.pricePerKg || 0) - (b.pricePerKg || 0));
    } else if (marketplaceSort === 'capacity') {
      list = [...list].sort((a, b) => (b.availableCapacity || 0) - (a.availableCapacity || 0));
    }
    return list;
  }, [trips, filters, effectiveCity, quickVehicle, marketplaceSort]);

  const filteredParcels = useMemo(() => {
    let list = filterParcels(parcels, filters, effectiveCity);
    if (quickCategory) {
      list = list.filter((p) => p.category?.toLowerCase() === quickCategory.toLowerCase());
    }
    if (marketplaceSort === 'price') {
      list = [...list].sort((a, b) => (b.priceOffer || 0) - (a.priceOffer || 0));
    } else if (marketplaceSort === 'urgent') {
      list = [...list].sort((a, b) => {
        const aUrgent = a.category === 'medicine' || a.category === 'documents' || (a.priceOffer || 0) >= 400 ? 1 : 0;
        const bUrgent = b.category === 'medicine' || b.category === 'documents' || (b.priceOffer || 0) >= 400 ? 1 : 0;
        return bUrgent - aUrgent;
      });
    }
    return list;
  }, [parcels, filters, effectiveCity, quickCategory, marketplaceSort]);

  const hasFilter = useMemo(
    () =>
      Object.values(filters).some((value) => String(value).trim().length > 0) ||
      Boolean(quickVehicle) ||
      Boolean(quickCategory) ||
      marketplaceSort !== 'recent',
    [filters, quickVehicle, quickCategory, marketplaceSort],
  );

  const handleClearAllFilters = useCallback(() => {
    Haptic.confirm();
    setFilters(DEFAULT_FILTERS);
    setQuickVehicle('');
    setQuickCategory('');
    setMarketplaceSort('recent');
  }, []);

  const feedData = useMemo<FeedItem[]>(() => {
    if (activeTab === 'trips') return filteredTrips.map((trip) => ({ type: 'trip', data: trip }));
    return filteredParcels.map((parcel) => ({ type: 'parcel', data: parcel }));
  }, [activeTab, filteredParcels, filteredTrips]);

  const isLoading = tripsQuery.isLoading || parcelsQuery.isLoading || requestsQuery.isLoading;
  const hasError = tripsQuery.error || parcelsQuery.error;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        tripsQuery.refetch(),
        parcelsQuery.refetch(),
        requestsQuery.refetch(),
        promotionalBannersQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePressTrip = useCallback((tripId: string) => {
    router.push({ pathname: '/trip/[id]', params: { id: tripId } });
  }, [router]);

  const handleRequestTrip = useCallback((tripId: string) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to send delivery requests.');
      return;
    }
    const target = trips.find(t => t.id === tripId);
    if (!target) return;
    if (target.userId === user.id) {
      router.push({ pathname: '/trip/[id]', params: { id: tripId } });
      return;
    }
    if (target.status !== 'active') {
      showAlert('Trip Not Active', 'This trip is no longer active.');
      return;
    }
    setRequestTripTarget(target);
  }, [router, showAlert, trips, user]);

  const handlePressParcel = useCallback((parcelId: string) => {
    router.push({ pathname: '/parcel/[id]', params: { id: parcelId } });
  }, [router]);

  const handleCarryParcel = useCallback((parcelId: string) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to carry parcels.');
      return;
    }
    const target = parcels.find(p => p.id === parcelId);
    if (!target) return;
    if (target.userId === user.id) {
      router.push({ pathname: '/parcel/[id]', params: { id: parcelId } });
      return;
    }
    if (target.status !== 'open') {
      showAlert('Parcel Not Available', 'This parcel is already matched, in transit, or closed.');
      return;
    }
    setCarryParcelTarget(target);
  }, [parcels, router, showAlert, user]);

  const handleConfirmCarry = useCallback(async (tripId: string, targetParcel: Parcel) => {
    if (!user) return;
    const chosenTrip = trips.find(t => t.id === tripId);
    if (!chosenTrip) return;

    const routeCheck = checkTripParcelRoute(chosenTrip, targetParcel);
    if (!routeCheck.isCompatible) {
      Haptic.error();
      showAlert('Incompatible Route', routeCheck.rejectionReason || 'This trip route does not match the parcel journey.');
      return;
    }

    try {
      const result = await createRequestAsync({
        parcelId: targetParcel.id,
        tripId: chosenTrip.id,
        senderId: targetParcel.userId,
        senderName: targetParcel.userName,
        travellerId: user.id,
        travellerName: user.name || 'Traveller',
        status: 'pending',
        price: targetParcel.priceOffer,
        message: `Hi ${targetParcel.userName}! I am travelling on ${chosenTrip.date} and can deliver your ${targetParcel.category} package (${targetParcel.weight}kg) for ₹${targetParcel.priceOffer}.`,
      });

      if (result) {
        setCarryParcelTarget(null);
        Haptic.success();
        setRequestSuccess({
          type: 'offer_sent',
          recipientName: targetParcel.userName,
          price: targetParcel.priceOffer,
          fromCity: targetParcel.fromCity,
          toCity: targetParcel.toCity,
        });
        await Promise.all([requestsQuery.refetch(), parcelsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send offer. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not send offer. Please try again.');
    }
  }, [createRequestAsync, parcelsQuery, requestsQuery, showAlert, trips, user]);

  const handleConfirmTripRequest = useCallback(async (parcelId: string, targetTrip: Trip, calculatedPrice: number) => {
    if (!user) return;
    const chosenParcel = parcels.find(p => p.id === parcelId);
    if (!chosenParcel) return;

    const routeCheck = checkTripParcelRoute(targetTrip, chosenParcel);
    if (!routeCheck.isCompatible) {
      Haptic.error();
      showAlert('Incompatible Route', routeCheck.rejectionReason || 'This parcel journey does not match the trip route.');
      return;
    }

    try {
      const result = await createRequestAsync({
        parcelId: chosenParcel.id,
        tripId: targetTrip.id,
        senderId: user.id,
        senderName: user.name || 'Sender',
        travellerId: targetTrip.userId,
        travellerName: targetTrip.userName,
        status: 'pending',
        price: calculatedPrice,
        message: `Hi ${targetTrip.userName}! Could you please carry my ${chosenParcel.category} package (${chosenParcel.weight}kg) on your trip from ${targetTrip.fromCity} to ${targetTrip.toCity} on ${targetTrip.date}?`,
      });

      if (result) {
        setRequestTripTarget(null);
        Haptic.success();
        setRequestSuccess({
          type: 'request_sent',
          recipientName: targetTrip.userName,
          price: calculatedPrice,
          fromCity: targetTrip.fromCity,
          toCity: targetTrip.toCity,
        });
        await Promise.all([requestsQuery.refetch(), tripsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send request. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not send request. Please try again.');
    }
  }, [createRequestAsync, parcels, requestsQuery, router, showAlert, tripsQuery, user]);

  const handlePostTripForParcel = useCallback((fromCity: string, toCity: string, minCapacity: number) => {
    router.push({
      pathname: '/create-trip',
      params: {
        fromCity,
        toCity,
        capacity: String(minCapacity),
      },
    });
  }, [router]);

  const handleQuickCreateAndCarry = useCallback(async (
    quickParams: QuickCarryTripParams,
    targetParcel: Parcel
  ) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to carry parcels.');
      return;
    }

    try {
      // 1. Post trip for the exact parcel route automatically
      const newTrip = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'Traveller',
        userRating: user.totalRatings && user.totalRatings > 0 ? (user.rating || 5.0) : 0,
        fromCity: targetParcel.fromCity,
        toCity: targetParcel.toCity,
        date: quickParams.date,
        time: quickParams.time,
        vehicleType: quickParams.vehicleType,
        availableCapacity: quickParams.capacity,
        pricePerKg: Math.max(50, Math.round(targetParcel.priceOffer / Math.max(1, targetParcel.weight))),
        status: 'active',
      });

      // 2. Immediately dispatch carry offer with parcel's reward
      const result = await createRequestAsync({
        parcelId: targetParcel.id,
        tripId: newTrip.id,
        senderId: targetParcel.userId,
        senderName: targetParcel.userName,
        travellerId: user.id,
        travellerName: user.name || 'Traveller',
        status: 'pending',
        price: targetParcel.priceOffer,
        message: `Hi ${targetParcel.userName}! I am travelling ${targetParcel.fromCity} to ${targetParcel.toCity} on ${quickParams.date} and can deliver your ${targetParcel.category} package (${targetParcel.weight}kg) for ₹${targetParcel.priceOffer}.`,
      });

      if (result) {
        setCarryParcelTarget(null);
        Haptic.success();
        setRequestSuccess({
          type: 'offer_sent',
          recipientName: targetParcel.userName,
          price: targetParcel.priceOffer,
          fromCity: targetParcel.fromCity,
          toCity: targetParcel.toCity,
        });
        await Promise.all([requestsQuery.refetch(), parcelsQuery.refetch(), tripsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send carry offer. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Failed to post trip and send offer.');
    }
  }, [createRequestAsync, createTripMutation, parcelsQuery, requestsQuery, router, showAlert, tripsQuery, user]);

  const handleCreateParcelForTrip = useCallback((fromCity: string, toCity: string) => {
    router.push({
      pathname: '/create-parcel',
      params: {
        fromCity,
        toCity,
      },
    });
  }, [router]);

  const handleQuickCreateAndRequest = useCallback(async (
    quickParams: QuickCreateParcelParams,
    targetTrip: Trip,
    calculatedPrice: number
  ) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to send delivery requests.');
      return;
    }

    try {
      // 1. Post parcel for the exact trip route automatically
      const newParcel = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'Sender',
        fromCity: targetTrip.fromCity,
        toCity: targetTrip.toCity,
        category: quickParams.category,
        weight: quickParams.weight,
        description: quickParams.description,
        priceOffer: calculatedPrice,
        status: 'open',
      });

      // 2. Immediately dispatch delivery request to the traveller
      const result = await createRequestAsync({
        parcelId: newParcel.id,
        tripId: targetTrip.id,
        senderId: user.id,
        senderName: user.fullName || user.name || 'Sender',
        travellerId: targetTrip.userId,
        travellerName: targetTrip.userName,
        status: 'pending',
        price: calculatedPrice,
        message: `Hi ${targetTrip.userName}! Could you please carry my ${newParcel.category} package (${newParcel.weight}kg) on your trip from ${targetTrip.fromCity} to ${targetTrip.toCity} on ${targetTrip.date}?`,
      });

      if (result) {
        setRequestTripTarget(null);
        Haptic.success();
        setRequestSuccess({
          type: 'request_sent',
          recipientName: targetTrip.userName,
          price: calculatedPrice,
          fromCity: targetTrip.fromCity,
          toCity: targetTrip.toCity,
        });
        await Promise.all([requestsQuery.refetch(), parcelsQuery.refetch(), tripsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send delivery request. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Failed to create parcel and send request.');
    }
  }, [createParcelMutation, createRequestAsync, parcelsQuery, requestsQuery, router, showAlert, tripsQuery, user]);

  const handleTrackDelivery = useCallback((requestId: string) => {
    Haptic.tap();
    router.push({ pathname: '/delivery/[id]', params: { id: requestId } });
  }, [router]);

  const handleViewRequest = useCallback((_requestId: string) => {
    Haptic.tap();
    router.push('/(tabs)/requests');
  }, [router]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    const isOwner = Boolean(user?.id && item.data.userId === user.id);
    if (item.type === 'trip') {
      return (
        <FeedTripItem
          trip={item.data}
          isTablet={isTablet}
          isOwner={isOwner}
          existingRequest={requestsByTripId.get(item.data.id)}
          onPress={handlePressTrip}
          onRequest={handleRequestTrip}
          onShare={handleShareTrip}
          onTrackDelivery={handleTrackDelivery}
          onViewRequest={handleViewRequest}
        />
      );
    }

    return (
      <FeedParcelItem
        parcel={item.data}
        isTablet={isTablet}
        isOwner={isOwner}
        existingRequest={requestsByParcelId.get(item.data.id)}
        onPress={handlePressParcel}
        onCarry={handleCarryParcel}
        onShare={handleShareParcel}
        onTrackDelivery={handleTrackDelivery}
        onViewRequest={handleViewRequest}
      />
    );
  }, [handleCarryParcel, handlePressParcel, handlePressTrip, handleRequestTrip, handleShareParcel, handleShareTrip, handleTrackDelivery, handleViewRequest, isTablet, requestsByParcelId, requestsByTripId, user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        markAllRead={() => {
          void markAllRead();
        }}
        onPressNotification={(notification) => {
          void openNotification(notification);
          setShowNotifications(false);
        }}
        onMarkRead={(groupNotifications) => {
          void markNotificationsAsRead(groupNotifications);
        }}
        onPressSettings={() => router.push('/notification-settings' as any)}
        C={C}
      />

      <FilterPanel
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(nextFilters) => setFilters(nextFilters)}
        C={C}
      />

      <CarryParcelModal
        visible={Boolean(carryParcelTarget)}
        onClose={() => setCarryParcelTarget(null)}
        parcel={carryParcelTarget}
        userTrips={trips.filter(t => t.userId === user?.id)}
        onConfirmCarry={handleConfirmCarry}
        onPostTrip={handlePostTripForParcel}
        onQuickCreateAndCarry={handleQuickCreateAndCarry}
        isSubmitting={isCreatingRequest || createTripMutation.isPending}
      />

      <SendRequestModal
        visible={Boolean(requestTripTarget)}
        onClose={() => setRequestTripTarget(null)}
        trip={requestTripTarget}
        userParcels={parcels.filter(p => p.userId === user?.id)}
        onConfirmRequest={handleConfirmTripRequest}
        onCreateParcel={handleCreateParcelForTrip}
        onQuickCreateAndRequest={handleQuickCreateAndRequest}
        isSubmitting={isCreatingRequest || createParcelMutation.isPending}
      />

      <CitySelectModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onSelect={handleSelectLocationCity}
        title="Marketplace Location"
        subtitle="Filter live trips & parcels by transit hub"
        selectedCity={locationCity || undefined}
        onUseCurrentLocation={handleDetectCurrentLocation}
        isDetectingLocation={isDetectingCity}
      />

      <RequestSuccessModal
        visible={Boolean(requestSuccess)}
        onClose={() => setRequestSuccess(null)}
        type={requestSuccess?.type || 'request_sent'}
        recipientName={requestSuccess?.recipientName || ''}
        price={requestSuccess?.price || 0}
        fromCity={requestSuccess?.fromCity || ''}
        toCity={requestSuccess?.toCity || ''}
        onViewRequests={() => router.push('/(tabs)/requests')}
      />

      {/* Sticky Animated Glass Mini-Header */}
      <Animated.View
        pointerEvents={isScrolledDown ? 'auto' : 'none'}
        style={[
          styles.miniHeader,
          {
            paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top, Spacing.xs),
            backgroundColor: C.surface + 'FA',
            borderColor: C.surfaceBorder,
            opacity: scrollY.interpolate({
              inputRange: [140, 200],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [140, 200],
                  outputRange: [-24, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptic.tap();
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          style={styles.miniHeaderLeft}
          accessibilityRole="button"
          accessibilityLabel="Scroll to top"
        >
          <Image
            source={require('@/assets/images/logo-horizontal.png')}
            style={{ width: 90, height: 28 }}
            contentFit="contain"
          />
          <View>
            <Text style={[styles.miniHeaderSub, { color: C.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {activeTab === 'trips' ? `Trips (${filteredTrips.length})` : `Parcels (${filteredParcels.length})`}
            </Text>
          </View>
        </Pressable>

        <View style={[styles.miniTabGroup, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Pressable
            onPress={() => handleSelectTab('trips')}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'trips' }}
            accessibilityLabel="Show trips"
            style={[
              styles.miniTabBtn,
              activeTab === 'trips' && { backgroundColor: C.primary },
            ]}
          >
            <Text style={[styles.miniTabText, { color: activeTab === 'trips' ? '#FFF' : C.textSecondary }]}>
              Trips
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleSelectTab('parcels')}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'parcels' }}
            accessibilityLabel="Show parcels"
            style={[
              styles.miniTabBtn,
              activeTab === 'parcels' && { backgroundColor: C.primary },
            ]}
          >
            <Text style={[styles.miniTabText, { color: activeTab === 'parcels' ? '#FFF' : C.textSecondary }]}>
              Parcels
            </Text>
          </Pressable>
        </View>

        <View style={styles.miniHeaderRight}>
          <Pressable
            onPress={() => {
              Haptic.tap();
              stickyFilterRef.current?.play();
              setShowFilters(true);
            }}
            hitSlop={TouchTarget.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Filter listings"
            style={[styles.miniIconBtn, { borderColor: hasFilter ? C.primary : C.surfaceBorder, backgroundColor: C.surface }]}
          >
            <AnimatedIcon ref={stickyFilterRef} name="filter" size={17} color={hasFilter ? C.primary : C.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptic.tap();
              stickyBellRef.current?.play();
              setShowNotifications(true);
            }}
            hitSlop={TouchTarget.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={[styles.miniIconBtn, { borderColor: C.surfaceBorder, backgroundColor: C.surface }]}
          >
            <AnimatedIcon ref={stickyBellRef} name="notification" size={18} color={C.textPrimary} />
            {unreadCount > 0 ? <View style={[styles.miniBadge, { backgroundColor: C.error }]} /> : null}
          </Pressable>
        </View>
      </Animated.View>

      <FlatList
        ref={listRef}
        data={feedData}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        renderItem={renderItem}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={[styles.headerWrap, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top, Spacing.sm) }, isTablet && styles.tabletContainer]}>
            <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroTranslateY }] }}>
              <HomeHeader
                userName={user?.fullName || user?.name || 'there'}
                avatarUri={user?.avatar}
                unreadCount={unreadCount}
                onNotifications={() => setShowNotifications(true)}
                onProfilePress={() => router.push('/(tabs)/profile')}
                locationCity={locationCity}
                onCityPress={() => setShowCityPicker(true)}
              />
            </Animated.View>

            {activeDeliveryRequest ? (
              <LiveActivityCompactPill
                request={activeDeliveryRequest}
                isTraveller={activeDeliveryRequest.travellerId === user?.id}
                onTrack={handleTrackDelivery}
                onViewRequests={() => router.push('/(tabs)/requests')}
              />
            ) : null}

            <SearchBarTrigger
              onSearchPress={() => router.push('/search')}
              onFilterPress={() => setShowFilters(true)}
              hasFilter={hasFilter}
            />

            <QuickActions />

            <PromotionalBannerCarousel
              banners={promotionalBannersQuery.data}
              urgentParcels={urgentParcels}
              onCarryParcel={handleCarryParcel}
              onPressParcel={handlePressParcel}
              onCreateTrip={() => router.push('/create-trip')}
              onCreateParcel={() => router.push('/create-parcel')}
              onOpenKyc={() => router.push('/kyc')}
              onSelectCorridor={(fromCity, toCity) => setFilters((prev) => ({ ...prev, fromCity, toCity }))}
              onNavigateDeepLink={(url) => router.push(url as any)}
            />

            <LiveMarketplaceHeader
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              tripsCount={filteredTrips.length}
              parcelsCount={filteredParcels.length}
              locationCity={locationCity}
              onOpenCityPicker={() => setShowCityPicker(true)}
              onToggleAllIndia={handleToggleAllIndia}
              hasFilter={hasFilter}
              onOpenFilters={() => setShowFilters(true)}
              selectedVehicle={quickVehicle}
              onSelectVehicle={setQuickVehicle}
              selectedCategory={quickCategory}
              onSelectCategory={setQuickCategory}
              sortBy={marketplaceSort}
              onSelectSort={setMarketplaceSort}
              activeCorridor={{ fromCity: filters.fromCity, toCity: filters.toCity }}
              onClearCorridor={() => setFilters((prev) => ({ ...prev, fromCity: '', toCity: '' }))}
              onClearAllFilters={handleClearAllFilters}
              tabIndicatorAnim={tabIndicatorAnim}
            />

            {!isOnline ? <OfflineBanner C={C} /> : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateWrap}>
              <FeedSkeletonList />
            </View>
          ) : hasError ? (
            <View style={styles.stateWrap}>
              <AsyncStateCard
                C={C}
                icon="error-outline"
                title="Could not load listings"
                message="Please try again."
                actionLabel="Retry"
                onAction={onRefresh}
              />
            </View>
          ) : (
            <EmptyMarketplace
              activeTab={activeTab}
              hasFilter={hasFilter}
              locationCity={locationCity || defaultCity}
              onClear={handleClearAllFilters}
              onCreate={() => router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel')}
              onChangeCity={() => setShowCityPicker(true)}
            />
          )
        }
        ListFooterComponent={
          feedData.length > 0 ? (
            <View style={styles.feedFooterEnd}>
              <View style={[styles.feedFooterLine, { backgroundColor: C.surfaceBorder }]} />
              <View style={[styles.feedFooterPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="check-circle" size={13} color={C.primary} />
                <Text style={[styles.feedFooterText, { color: C.textSecondary }]}>
                  All {feedData.length} {activeTab === 'trips' ? 'trips' : 'parcels'} shown
                </Text>
              </View>
              <View style={[styles.feedFooterLine, { backgroundColor: C.surfaceBorder }]} />
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) }}
      />

      {/* Floating Action Button (FAB) for fast one-tap creation on scroll */}
      <Animated.View
        pointerEvents={isScrolledDown ? 'auto' : 'none'}
        style={[
          styles.fabWrap,
          {
            bottom: TabBarGeometry.getFabBottom(insets.bottom, isSmallDevice, isTablet),
            opacity: scrollY.interpolate({
              inputRange: [220, 280],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: scrollY.interpolate({
                  inputRange: [220, 280],
                  outputRange: [0.75, 1],
                  extrapolate: 'clamp',
                }),
              },
              {
                translateY: scrollY.interpolate({
                  inputRange: [220, 280],
                  outputRange: [20, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptic.confirm();
            if (activeTab === 'trips') {
              router.push('/create-trip');
            } else {
              router.push('/create-parcel');
            }
          }}
          style={({ pressed }) => [
            styles.fabBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={activeTab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}
        >
          <MaterialIcons
            name={activeTab === 'trips' ? 'flight-takeoff' : 'inventory-2'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.fabBtnText}>
            {activeTab === 'trips' ? 'Post Trip' : 'Send Parcel'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 110 },
  headerWrap: { paddingHorizontal: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.md },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  userProfileWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingSub: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    lineHeight: 16,
  },
  greetingName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  hubSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 3,
    maxWidth: 135,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  hubSelectorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  notifyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  notifyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifyBadgeText: { color: '#fff', fontSize: 9.5, fontWeight: FontWeight.bold },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCopyWrap: {
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  searchSubPlaceholder: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  filterIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDotOnTrigger: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  quickActionTile: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionMiniArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCopy: {
    gap: 2,
  },
  quickActionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  quickActionSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  marketplaceSection: {
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs,
  },
  marketplaceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketplaceTitleWrap: {
    flex: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeFilterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  locationPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: 2,
  },
  locationFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
    flexShrink: 1,
  },
  locationFilterPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  allIndiaBtn: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  allIndiaBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  sectionSub: { fontSize: FontSize.xs, marginTop: 2 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmented: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    flexDirection: 'row',
    position: 'relative',
  },
  activeIndicatorPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '50%',
    borderRadius: BorderRadius.md - 2,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentText: {
    fontSize: FontSize.sm - 0.5,
    letterSpacing: -0.1,
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  miniHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  miniHeaderTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  miniHeaderSub: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  miniTabGroup: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 2,
    alignItems: 'center',
  },
  miniTabBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  miniTabText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  miniHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  miniIconBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.1,
  },
  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  tabletCardWrap: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  feedCardWrap: {
    width: '100%',
  },

  filterSummary: {
    minHeight: 34,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSummaryText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  clearText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  emptyCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', letterSpacing: -0.2 },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20 },
  emptyCta: {
    marginTop: Spacing.lg,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyOutlineBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOutlineBtnText: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.semibold,
  },

  stateWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  footerLoader: { paddingVertical: Spacing.lg },
  feedFooterEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  feedFooterLine: {
    flex: 1,
    height: 1,
  },
  feedFooterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  feedFooterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});


