import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  AppErrorBoundary,
  AsyncStateCard,
  FeedSkeletonList,
  OfflineBanner,
  ParcelCard,
  TripCard,
} from '@/components';
import { FilterOptions, Parcel, Trip } from '@/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { EmptyParcelsSVG, EmptyTripsSVG } from '@/components/ui/EmptyState';
import { PostTripHero, SendParcelHero } from '@/components/illustrations';
import { FeatureFlags } from '@/constants/featureFlags';
import {
  filterParcels,
  filterTrips,
  flattenInfiniteData,
  useListingsRealtime,
  useParcelsQuery,
  useTripsQuery,
} from '@/features/listings/queries';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBreathing, useFadeIn, useHeartbeat, usePulse } from '@/hooks/useAnimations';
import { FilterPanel } from '@/components/feature/FilterPanel';
import { NotificationPanel } from '@/components/feature/NotificationPanel';

const DEFAULT_FILTERS: FilterOptions = {
  fromCity: '',
  toCity: '',
  vehicleType: '',
  dateFrom: '',
  dateTo: '',
};

type FeedItem = { type: 'trip'; data: Trip } | { type: 'parcel'; data: Parcel };

type NeutralPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  strong: string;
  strongMuted: string;
  accent: string;
  accentSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  inverse: string;
};

function ActionTile({
  title,
  subtitle,
  icon,
  onPress,
  palette,
  dark,
  badge,
  illustration,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  palette: NeutralPalette;
  dark?: boolean;
  badge?: string;
  illustration?: React.ReactNode;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 320, friction: 22 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 240, friction: 16 }).start();

  return (
    <Pressable
      onPress={() => {
        Haptic.confirm();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          homeStyles.actionTile,
          {
            backgroundColor: dark ? palette.strong : palette.surface,
            borderColor: dark ? palette.strong : palette.border,
            transform: [{ scale }],
          },
        ]}
      >
        {dark ? (
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        ) : null}

        <View style={homeStyles.actionTopRow}>
          <View
            style={[
              homeStyles.actionIcon,
              { backgroundColor: dark ? 'rgba(255,255,255,0.15)' : palette.surfaceMuted },
            ]}
          >
            <MaterialIcons name={icon} size={18} color={dark ? '#fff' : palette.strong} />
          </View>
          {badge ? (
            <View style={[homeStyles.actionBadge, { backgroundColor: dark ? 'rgba(255,255,255,0.14)' : palette.accentSubtle }]}>
              <Text style={[homeStyles.actionBadgeText, { color: dark ? '#fff' : palette.accent }]}>{badge}</Text>
            </View>
          ) : null}
        </View>

        {illustration ? <View style={homeStyles.actionIllustration}>{illustration}</View> : null}

        <Text style={[homeStyles.actionTitle, { color: dark ? '#fff' : palette.text }]}>{title}</Text>
        <Text style={[homeStyles.actionSubtitle, { color: dark ? 'rgba(255,255,255,0.75)' : palette.textMuted }]}>{subtitle}</Text>
      </Animated.View>
    </Pressable>
  );
}

function StatTile({
  label,
  value,
  icon,
  palette,
  tone,
  pulse,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  palette: NeutralPalette;
  tone?: 'accent' | 'warning';
  pulse?: Animated.Value;
}) {
  const iconColor = tone === 'warning' ? palette.warning : tone === 'accent' ? palette.accent : palette.strong;
  const iconBg = tone === 'warning' ? palette.warningSubtle : tone === 'accent' ? palette.accentSubtle : palette.surfaceMuted;

  return (
    <View style={[homeStyles.statTile, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Animated.View
        style={[
          homeStyles.statIcon,
          { backgroundColor: iconBg, transform: pulse ? [{ scale: pulse }] : undefined },
        ]}
      >
        <MaterialIcons name={icon} size={14} color={iconColor} />
      </Animated.View>
      <Text style={[homeStyles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[homeStyles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

type ProgressStep = { label: string; done: boolean };

function GrowthPathCard({
  palette,
  steps,
  primaryLabel,
  onPrimary,
}: {
  palette: NeutralPalette;
  steps: ProgressStep[];
  primaryLabel: string;
  onPrimary: () => void;
}) {
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.max(0.08, completed / steps.length);

  return (
    <View style={[homeStyles.pathCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={homeStyles.pathHeader}>
        <View style={[homeStyles.pathIcon, { backgroundColor: palette.accentSubtle }]}>
          <MaterialIcons name="track-changes" size={14} color={palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[homeStyles.pathTitle, { color: palette.text }]}>Set up your profile for better matches</Text>
          <Text style={[homeStyles.pathSubtitle, { color: palette.textMuted }]}>Complete these quick steps to unlock smoother delivery flow.</Text>
        </View>
        <Text style={[homeStyles.pathCount, { color: palette.accent }]}>{completed}/{steps.length}</Text>
      </View>

      <View style={[homeStyles.pathTrack, { backgroundColor: palette.surfaceMuted }]}>
        <View style={[homeStyles.pathFill, { width: `${progress * 100}%`, backgroundColor: palette.accent }]} />
      </View>

      <View style={homeStyles.pathStepsRow}>
        {steps.map((step) => (
          <View
            key={step.label}
            style={[
              homeStyles.pathStep,
              {
                backgroundColor: step.done ? palette.accentSubtle : palette.surfaceMuted,
                borderColor: step.done ? palette.accent + '55' : palette.border,
              },
            ]}
          >
            <MaterialIcons
              name={step.done ? 'check-circle' : 'radio-button-unchecked'}
              size={13}
              color={step.done ? palette.accent : palette.textMuted}
            />
            <Text style={[homeStyles.pathStepText, { color: step.done ? palette.accent : palette.textMuted }]}>{step.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          Haptic.confirm();
          onPrimary();
        }}
        style={({ pressed }) => [homeStyles.pathPrimaryBtn, { backgroundColor: palette.strong, opacity: pressed ? 0.86 : 1 }]}
      >
        <Text style={[homeStyles.pathPrimaryText, { color: palette.inverse }]}>{primaryLabel}</Text>
        <MaterialIcons name="arrow-forward" size={15} color={palette.inverse} />
      </Pressable>
    </View>
  );
}

function EmptyFeed({
  svg,
  title,
  subtitle,
  ctaLabel,
  ctaIcon,
  onCta,
  showCta,
  palette,
  onClear,
}: {
  svg: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaIcon: keyof typeof MaterialIcons.glyphMap;
  onCta: () => void;
  showCta: boolean;
  palette: NeutralPalette;
  onClear?: () => void;
}) {
  return (
    <View style={[homeStyles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {svg}
      <Text style={[homeStyles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[homeStyles.emptySubtitle, { color: palette.textMuted }]}>{subtitle}</Text>

      {onClear ? (
        <Pressable
          onPress={() => {
            Haptic.tap();
            onClear();
          }}
          style={({ pressed }) => [
            homeStyles.emptySecondaryBtn,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border, opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <MaterialIcons name="filter-list-off" size={14} color={palette.textMuted} />
          <Text style={[homeStyles.emptySecondaryText, { color: palette.textMuted }]}>Clear filters</Text>
        </Pressable>
      ) : null}

      {showCta ? (
        <Pressable
          onPress={() => {
            Haptic.confirm();
            onCta();
          }}
          style={({ pressed }) => [homeStyles.emptyPrimaryBtn, { backgroundColor: palette.accent, opacity: pressed ? 0.88 : 1 }]}
        >
          <MaterialIcons name={ctaIcon} size={15} color={palette.inverse} />
          <Text style={[homeStyles.emptyPrimaryText, { color: palette.inverse }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatFilterSummary(filters: FilterOptions) {
  return [filters.fromCity, filters.toCity, filters.vehicleType].filter(Boolean).join(' / ');
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'trips' | 'parcels'>('trips');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const badgePulse = usePulse(1800);
  const liveDotPulse = useBreathing(0.82, 1.12, 1600);
  const earningsPulse = useHeartbeat(4200, 1.08);
  const heroEntrance = useFadeIn(0, 500);
  const actionsEntrance = useFadeIn(110, 500);
  const statsEntrance = useFadeIn(200, 450);

  const palette = useMemo<NeutralPalette>(() => ({
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    strong: '#1F2937',
    strongMuted: '#374151',
    accent: '#16A34A',
    accentSubtle: 'rgba(22,163,74,0.12)',
    warning: '#D97706',
    warningSubtle: 'rgba(217,119,6,0.12)',
    danger: '#DC2626',
    dangerSubtle: 'rgba(220,38,38,0.12)',
    inverse: '#FFFFFF',
  }), []);

  const userCity = user?.city;
  const firstName = user?.name?.split(' ')[0] || 'User';

  const tripsQuery = useTripsQuery(Boolean(user), userCity);
  const parcelsQuery = useParcelsQuery(Boolean(user), userCity);

  useListingsRealtime(Boolean(user), userCity || filters.fromCity || undefined);

  const allTrips = useMemo(() => (user ? flattenInfiniteData(tripsQuery.data) : []), [tripsQuery.data, user]);
  const allParcels = useMemo(() => (user ? flattenInfiniteData(parcelsQuery.data) : []), [parcelsQuery.data, user]);
  const trips = useMemo(() => filterTrips(allTrips, filters), [allTrips, filters]);
  const parcels = useMemo(() => filterParcels(allParcels, filters), [allParcels, filters]);

  const myTrips = allTrips.filter((trip) => trip.userId === user?.id);
  const myParcels = allParcels.filter((parcel) => parcel.userId === user?.id);
  const otherTrips = trips.filter((trip) => trip.userId !== user?.id && trip.status === 'active');
  const otherParcels = parcels.filter((parcel) => parcel.userId !== user?.id && parcel.status === 'open');

  const hasActiveFilter = Boolean(filters.fromCity || filters.toCity || filters.vehicleType);
  const isLoading = tripsQuery.isLoading || parcelsQuery.isLoading;
  const listingsError = tripsQuery.error || parcelsQuery.error;
  const openMarketplaceCount = otherTrips.length + otherParcels.length;

  const growthSteps = useMemo<ProgressStep[]>(() => [
    { label: 'Add city', done: Boolean(userCity) },
    { label: 'Create listing', done: myTrips.length + myParcels.length > 0 },
    { label: 'View matches', done: openMarketplaceCount > 0 },
  ], [myParcels.length, myTrips.length, openMarketplaceCount, userCity]);

  const primaryPathActionLabel = useMemo(() => {
    if (!userCity) return 'Set your city';
    if (myTrips.length + myParcels.length === 0) return 'Post first listing';
    return 'Open best matches';
  }, [myParcels.length, myTrips.length, userCity]);

  const handlePrimaryPathAction = useCallback(() => {
    if (!userCity) {
      router.push('/(tabs)/profile');
      return;
    }

    if (myTrips.length + myParcels.length === 0) {
      router.push('/create-parcel');
      return;
    }

    router.push('/search');
  }, [myParcels.length, myTrips.length, router, userCity]);

  const applyQuickPreset = useCallback((preset: 'trips_from_city' | 'parcels_to_city' | 'all_live') => {
    Haptic.select();

    if ((preset === 'trips_from_city' || preset === 'parcels_to_city') && !userCity) {
      router.push('/(tabs)/profile');
      return;
    }

    if (preset === 'trips_from_city') {
      setActiveTab('trips');
      setFilters({ ...DEFAULT_FILTERS, fromCity: userCity || '' });
      return;
    }

    if (preset === 'parcels_to_city') {
      setActiveTab('parcels');
      setFilters({ ...DEFAULT_FILTERS, toCity: userCity || '' });
      return;
    }

    setFilters(DEFAULT_FILTERS);
  }, [router, userCity]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const feedData = useMemo<FeedItem[]>(() => {
    if (activeTab === 'trips') {
      return otherTrips.map((trip) => ({ type: 'trip' as const, data: trip }));
    }
    return otherParcels.map((parcel) => ({ type: 'parcel' as const, data: parcel }));
  }, [activeTab, otherParcels, otherTrips]);

  const retryListings = useCallback(() => {
    void tripsQuery.refetch();
    void parcelsQuery.refetch();
  }, [parcelsQuery, tripsQuery]);

  const onRefresh = useCallback(async () => {
    Haptic.tap();
    setRefreshing(true);
    try {
      await Promise.all([tripsQuery.refetch(), parcelsQuery.refetch()]);
      Haptic.success();
    } catch {
      Haptic.error();
    } finally {
      setRefreshing(false);
    }
  }, [parcelsQuery, tripsQuery]);

  const onEndReached = useCallback(() => {
    if (activeTab === 'trips') {
      if (tripsQuery.hasNextPage && !tripsQuery.isFetchingNextPage) {
        void tripsQuery.fetchNextPage();
      }
      return;
    }

    if (parcelsQuery.hasNextPage && !parcelsQuery.isFetchingNextPage) {
      void parcelsQuery.fetchNextPage();
    }
  }, [activeTab, parcelsQuery, tripsQuery]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type === 'trip') {
        return (
          <TripCard
            trip={item.data}
            onPress={() => {
              Haptic.tap();
              router.push({ pathname: '/trip/[id]', params: { id: item.data.id } });
            }}
          />
        );
      }

      return (
        <ParcelCard
          parcel={item.data}
          onPress={() => {
            Haptic.tap();
            router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } });
          }}
        />
      );
    },
    [router]
  );

  const listFooter = useCallback(() => {
    const query = activeTab === 'trips' ? tripsQuery : parcelsQuery;
    if (!query.isFetchingNextPage) return null;

    return (
      <View style={homeStyles.listFooterLoading}>
        <ActivityIndicator size="small" color={palette.accent} />
      </View>
    );
  }, [activeTab, palette.accent, parcelsQuery, tripsQuery]);

  const listEmpty = useCallback(() => {
    if (isLoading) return <FeedSkeletonList count={3} />;

    if (listingsError) {
      return (
        <AsyncStateCard
          C={C}
          icon="cloud-off"
          title="Marketplace unavailable"
          message={listingsError instanceof Error ? listingsError.message : 'Please refresh and try again.'}
          actionLabel="Retry"
          onAction={retryListings}
        />
      );
    }

    if (activeTab === 'trips') {
      return (
        <EmptyFeed
          svg={<EmptyTripsSVG width={200} height={140} />}
          title="No trips found"
          subtitle={hasActiveFilter ? 'Try broader filters to see more trips.' : 'No traveller listings yet. Start with your first trip post.'}
          ctaLabel="Post trip"
          ctaIcon="directions-car"
          onCta={() => router.push('/create-trip')}
          showCta={!hasActiveFilter}
          palette={palette}
          onClear={hasActiveFilter ? () => setFilters(DEFAULT_FILTERS) : undefined}
        />
      );
    }

    return (
      <EmptyFeed
        svg={<EmptyParcelsSVG width={200} height={140} />}
        title="No parcels found"
        subtitle={hasActiveFilter ? 'Try broader filters to see more parcel requests.' : 'No parcel requests yet. Start with your first parcel post.'}
        ctaLabel="Send parcel"
        ctaIcon="inventory-2"
        onCta={() => router.push('/create-parcel')}
        showCta={!hasActiveFilter}
        palette={palette}
        onClear={hasActiveFilter ? () => setFilters(DEFAULT_FILTERS) : undefined}
      />
    );
  }, [isLoading, listingsError, C, retryListings, activeTab, hasActiveFilter, router, palette]);

  const listHeader = useMemo(
    () => (
      <View style={homeStyles.listHeaderWrap}>
        {!isOnline ? <OfflineBanner C={C} /> : null}

        <Animated.View
          style={[
            homeStyles.heroCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: heroEntrance.opacity,
              transform: heroEntrance.transform,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.04)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={homeStyles.liveRow}>
            <Animated.View style={[homeStyles.liveDot, { backgroundColor: palette.accent, transform: [{ scale: liveDotPulse }] }]} />
            <Text style={[homeStyles.liveText, { color: palette.accent }]}>Marketplace is live</Text>
          </View>

          <Text style={[homeStyles.heroTitle, { color: palette.text }]}>Move parcels. Share trips. Earn smarter.</Text>
          <Text style={[homeStyles.heroSubtitle, { color: palette.textMuted }]}>Discover trusted route matches with fewer taps and faster decisions.</Text>

          <View style={homeStyles.vibeRow}>
            <View style={[homeStyles.vibePill, { backgroundColor: palette.surfaceMuted }]}>
              <MaterialIcons name="local-shipping" size={12} color={palette.textMuted} />
              <Text style={[homeStyles.vibeText, { color: palette.textMuted }]}>Delivery</Text>
            </View>
            <View style={[homeStyles.vibePill, { backgroundColor: palette.surfaceMuted }]}>
              <MaterialIcons name="directions-car" size={12} color={palette.textMuted} />
              <Text style={[homeStyles.vibeText, { color: palette.textMuted }]}>Travel</Text>
            </View>
            <Animated.View style={[homeStyles.vibePill, { backgroundColor: palette.accentSubtle, transform: [{ scale: earningsPulse }] }]}>
              <MaterialIcons name="savings" size={12} color={palette.accent} />
              <Text style={[homeStyles.vibeText, { color: palette.accent }]}>Earning</Text>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[homeStyles.actionRow, { opacity: actionsEntrance.opacity, transform: actionsEntrance.transform }]}>
          <ActionTile
            title="Send parcel"
            subtitle="Create a request and match with verified travellers quickly."
            icon="inventory-2"
            badge="Fast"
            onPress={() => router.push('/create-parcel')}
            palette={palette}
            illustration={<SendParcelHero size={66} />}
          />
          <ActionTile
            title="Offer a trip"
            subtitle="Publish your route and earn from available luggage space."
            icon="directions-car"
            badge="Earn"
            onPress={() => router.push('/create-trip')}
            palette={palette}
            illustration={<PostTripHero size={64} color={palette.strongMuted} />}
          />
        </Animated.View>

        <Animated.View style={[homeStyles.statRow, { opacity: statsEntrance.opacity, transform: statsEntrance.transform }]}>
          <StatTile label="Live Trips" value={String(otherTrips.length)} icon="alt-route" palette={palette} />
          <StatTile label="Open Parcels" value={String(otherParcels.length)} icon="inbox" palette={palette} tone="warning" />
          <StatTile label="My Trips" value={String(myTrips.length)} icon="directions-car" palette={palette} />
          <StatTile label="My Parcels" value={String(myParcels.length)} icon="inventory-2" palette={palette} tone="accent" pulse={earningsPulse} />
        </Animated.View>

        <GrowthPathCard
          palette={palette}
          steps={growthSteps}
          primaryLabel={primaryPathActionLabel}
          onPrimary={handlePrimaryPathAction}
        />

        {user && FeatureFlags.kycProvider && (!user.kycStatus || user.kycStatus === 'pending') ? (
          <Pressable
            onPress={() => {
              Haptic.tap();
              router.push('/(tabs)/profile');
            }}
            style={[homeStyles.kycCard, { backgroundColor: palette.warningSubtle, borderColor: palette.warning + '55' }]}
          >
            <View style={[homeStyles.kycIcon, { backgroundColor: palette.warning + '22' }]}>
              <MaterialIcons name="verified-user" size={16} color={palette.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[homeStyles.kycTitle, { color: palette.warning }]}>Verify your profile for secure deliveries</Text>
              <Text style={[homeStyles.kycSubtitle, { color: palette.warning }]}>Verification improves trust and keeps payments safer.</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={12} color={palette.warning} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            Haptic.tap();
            router.push('/search');
          }}
          style={({ pressed }) => [
            homeStyles.searchCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <View style={{ flex: 1 }}>
            {hasActiveFilter ? (
              <Text style={[homeStyles.searchValue, { color: palette.text }]} numberOfLines={1}>
                {formatFilterSummary(filters)}
              </Text>
            ) : (
              <Text style={[homeStyles.searchPlaceholder, { color: palette.textMuted }]}>Search routes, dates, or vehicle type</Text>
            )}
          </View>
          <View style={[homeStyles.searchTune, { backgroundColor: palette.surfaceMuted }]}>
            <MaterialIcons name="tune" size={15} color={palette.textMuted} />
          </View>
        </Pressable>

        <View style={homeStyles.quickPresetRow}>
          <Pressable
            style={({ pressed }) => [
              homeStyles.quickPreset,
              { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.84 : 1 },
            ]}
            onPress={() => applyQuickPreset('trips_from_city')}
          >
            <MaterialIcons name="alt-route" size={14} color={palette.textMuted} />
            <Text style={[homeStyles.quickPresetText, { color: palette.textMuted }]}>Trips near me</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              homeStyles.quickPreset,
              { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.84 : 1 },
            ]}
            onPress={() => applyQuickPreset('parcels_to_city')}
          >
            <MaterialIcons name="move-to-inbox" size={14} color={palette.textMuted} />
            <Text style={[homeStyles.quickPresetText, { color: palette.textMuted }]}>Parcels near me</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              homeStyles.quickPreset,
              { backgroundColor: palette.accentSubtle, borderColor: palette.accent + '55', opacity: pressed ? 0.84 : 1 },
            ]}
            onPress={() => applyQuickPreset('all_live')}
          >
            <MaterialIcons name="flare" size={14} color={palette.accent} />
            <Text style={[homeStyles.quickPresetText, { color: palette.accent }]}>Show all</Text>
          </Pressable>
        </View>

        <View style={homeStyles.feedHeaderRow}>
          <View style={[homeStyles.feedTabsWrap, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
            {(['trips', 'parcels'] as const).map((tab) => {
              const selected = activeTab === tab;
              const count = tab === 'trips' ? otherTrips.length : otherParcels.length;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    Haptic.select();
                    setActiveTab(tab);
                  }}
                  style={[
                    homeStyles.feedTab,
                    selected && {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={tab === 'trips' ? 'directions-car' : 'inventory-2'}
                    size={13}
                    color={selected ? palette.text : palette.textMuted}
                  />
                  <Text style={[homeStyles.feedTabText, { color: selected ? palette.text : palette.textMuted }]}>
                    {tab === 'trips' ? `Trips (${count})` : `Parcels (${count})`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              Haptic.tap();
              setShowFilters(true);
            }}
            style={({ pressed }) => [
              homeStyles.filterBtn,
              {
                backgroundColor: hasActiveFilter ? palette.accentSubtle : palette.surface,
                borderColor: hasActiveFilter ? palette.accent : palette.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <MaterialIcons name="tune" size={16} color={hasActiveFilter ? palette.accent : palette.textMuted} />
            {hasActiveFilter ? <View style={[homeStyles.filterDot, { backgroundColor: palette.accent }]} /> : null}
          </Pressable>
        </View>

        {hasActiveFilter ? (
          <Pressable
            onPress={() => {
              Haptic.select();
              setFilters(DEFAULT_FILTERS);
            }}
            style={[homeStyles.activeFilterBar, { backgroundColor: palette.accentSubtle, borderColor: palette.accent + '66' }]}
          >
            <MaterialIcons name="filter-list" size={13} color={palette.accent} />
            <Text style={[homeStyles.activeFilterText, { color: palette.accent }]} numberOfLines={1}>
              {formatFilterSummary(filters)}
            </Text>
            <MaterialIcons name="close" size={14} color={palette.accent} />
          </Pressable>
        ) : null}
      </View>
    ),
    [
      C,
      activeTab,
      actionsEntrance.opacity,
      actionsEntrance.transform,
      earningsPulse,
      filters,
      growthSteps,
      handlePrimaryPathAction,
      hasActiveFilter,
      heroEntrance.opacity,
      heroEntrance.transform,
      isOnline,
      liveDotPulse,
      myParcels.length,
      myTrips.length,
      otherParcels.length,
      otherTrips.length,
      palette,
      primaryPathActionLabel,
      applyQuickPreset,
      router,
      statsEntrance.opacity,
      statsEntrance.transform,
      user,
    ]
  );

  return (
    <>
      <NotificationPanel
        visible={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        markAllRead={markAllRead}
        C={C}
      />

      <FilterPanel
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
        C={C}
      />

      <View style={[homeStyles.screen, { backgroundColor: palette.background }]}>
        <View style={[homeStyles.header, { paddingTop: insets.top + 10 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.03)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={homeStyles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[homeStyles.greeting, { color: palette.textMuted }]}>{greeting}</Text>
              <Text style={[homeStyles.name, { color: palette.text }]}>{firstName}</Text>
              <View style={homeStyles.headerMetaRow}>
                <View style={[homeStyles.headerMetaPill, { backgroundColor: palette.surfaceMuted }]}>
                  <MaterialIcons name="bolt" size={12} color={palette.warning} />
                  <Text style={[homeStyles.headerMetaText, { color: palette.textMuted }]}>{openMarketplaceCount} live matches</Text>
                </View>
                {userCity ? (
                  <View style={[homeStyles.headerMetaPill, { backgroundColor: palette.surfaceMuted }]}>
                    <MaterialIcons name="location-on" size={12} color={palette.textMuted} />
                    <Text style={[homeStyles.headerMetaText, { color: palette.textMuted }]}>{userCity}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={homeStyles.headerActions}>
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  router.push('/search');
                }}
                style={({ pressed }) => [
                  homeStyles.iconBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Ionicons name="search" size={17} color={palette.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptic.tap();
                  setShowNotifs(true);
                }}
                style={({ pressed }) => [
                  homeStyles.iconBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Ionicons name="notifications-outline" size={17} color={palette.textMuted} />
                {unreadCount > 0 ? (
                  <Animated.View style={[homeStyles.notifBadge, { backgroundColor: palette.danger, transform: [{ scale: badgePulse }] }]}>
                    <Text style={homeStyles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </Animated.View>
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptic.tap();
                  router.push('/(tabs)/profile');
                }}
                style={({ pressed }) => [
                  homeStyles.avatarBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Text style={[homeStyles.avatarText, { color: palette.text }]}>{firstName.charAt(0).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <AppErrorBoundary>
            <FlashList
              data={feedData}
              renderItem={renderItem}
              estimatedItemSize={150}
              keyExtractor={(item) => item.data.id}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={listEmpty}
              ListFooterComponent={listFooter}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.4}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={palette.accent}
                  colors={[palette.accent]}
                  progressBackgroundColor={palette.surface}
                />
              }
            />
          </AppErrorBoundary>
        </View>
      </View>
    </>
  );
}

const homeStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  greeting: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  name: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.9,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  headerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerMetaText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  listHeaderWrap: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  vibeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  vibePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  vibeText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionTile: {
    minHeight: 184,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 8,
    overflow: 'hidden',
  },
  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  actionIllustration: {
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },

  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pathCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pathIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.1,
  },
  pathSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  pathCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  pathTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pathFill: {
    height: '100%',
    borderRadius: 999,
  },
  pathStepsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pathStepText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  pathPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.md,
    paddingVertical: 11,
    marginTop: 2,
  },
  pathPrimaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  kycCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  kycIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  kycSubtitle: {
    fontSize: 11,
    marginTop: 1,
    opacity: 0.85,
  },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  searchValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  searchTune: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPreset: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  quickPresetText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },

  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  feedTabsWrap: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 4,
    gap: 4,
  },
  feedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  feedTabText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activeFilterText: {
    flex: 1,
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },

  emptyCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 270,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    marginTop: 6,
  },
  emptyPrimaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  emptySecondaryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  listFooterLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
