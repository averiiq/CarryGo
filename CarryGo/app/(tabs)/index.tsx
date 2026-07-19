import React, { useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Animated, RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AppErrorBoundary, AsyncStateCard, OfflineBanner, TripCard, ParcelCard, FeedSkeletonList } from '@/components';
import { FilterOptions, Trip, Parcel } from '@/types';
import { Spacing, BorderRadius, ThemeColors, Motion, Gradients } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { EmptyTripsSVG, EmptyParcelsSVG } from '@/components/ui/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { FeatureFlags } from '@/constants/featureFlags';
import { filterParcels, filterTrips, flattenInfiniteData, useListingsRealtime, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePulse, useFadeIn } from '@/hooks/useAnimations';
import { NotificationPanel } from '@/components/feature/NotificationPanel';
import { FilterPanel } from '@/components/feature/FilterPanel';
import { styles } from '@/styles/tabs/index.styles';

const DEFAULT_FILTERS: FilterOptions = { fromCity: '', toCity: '', vehicleType: '', dateFrom: '', dateTo: '' };

function ActionCard({ onPress, gradient, icon, title, sub, iconBg, iconColor, dark, C }: {
  onPress: () => void;
  gradient?: [string, string];
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string; sub: string;
  iconBg: string; iconColor: string; dark?: boolean; C: ThemeColors;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: Motion.cardScale, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => { Haptic.confirm(); onPress(); }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ flex: 1 }}
      >
        <Animated.View style={[
          styles.actionCard,
          { backgroundColor: dark ? undefined : C.surface, borderColor: dark ? 'transparent' : C.surfaceBorder },
          { transform: [{ scale }] },
        ]}>
          {gradient ? (
            <LinearGradient colors={gradient} style={[StyleSheet.absoluteFillObject, { borderRadius: BorderRadius.xl }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          ) : null}
          <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
            <MaterialIcons name={icon} size={22} color={iconColor} />
          </View>
          <Text style={[styles.actionTitle, { color: dark ? '#fff' : C.textPrimary }]}>{title}</Text>
          <Text style={[styles.actionSub, { color: dark ? 'rgba(255,255,255,0.7)' : C.textSecondary }]}>{sub}</Text>
          <View style={[styles.actionArrowWrap, { backgroundColor: dark ? 'rgba(255,255,255,0.15)' : C.surfaceElevated }]}>
            <MaterialIcons name="arrow-forward" size={14} color={dark ? '#fff' : iconColor} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function EmptyFeed({ svg, title, sub, ctaLabel, ctaIcon, onCta, showCta, C, onClearFilter }: {
  svg: React.ReactNode; title: string; sub: string;
  ctaLabel: string; ctaIcon: keyof typeof MaterialIcons.glyphMap;
  onCta: () => void; showCta: boolean; C: ThemeColors;
  onClearFilter?: () => void;
}) {
  return (
    <View style={[styles.emptyFeedCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {svg}
      <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>{sub}</Text>
      {onClearFilter ? (
        <Pressable
          style={({ pressed }) => [styles.emptyClearBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { Haptic.tap(); onClearFilter(); }}
        >
          <MaterialIcons name="filter-list-off" size={15} color={C.textSecondary} />
          <Text style={[styles.emptyClearText, { color: C.textSecondary }]}>Clear filters</Text>
        </Pressable>
      ) : null}
      {showCta ? (
        <Pressable
          style={({ pressed }) => [styles.emptyCTA, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={() => { Haptic.confirm(); onCta(); }}
        >
          <MaterialIcons name={ctaIcon} size={15} color="#fff" />
          <Text style={styles.emptyCTAText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type FeedItem = { type: 'trip'; data: Trip } | { type: 'parcel'; data: Parcel };

export default function HomeScreen() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const badgePulse = usePulse(1800);
  const actionsEntrance = useFadeIn(100, 400);
  const [filters, setFilters] = React.useState<FilterOptions>(DEFAULT_FILTERS);
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  useListingsRealtime(Boolean(user), filters.fromCity || undefined);
  const [activeTab, setActiveTab] = React.useState<'trips' | 'parcels'>('trips');
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const allTrips = user ? flattenInfiniteData(tripsQuery.data) : [];
  const allParcels = user ? flattenInfiniteData(parcelsQuery.data) : [];
  const trips = useMemo(() => filterTrips(allTrips, filters), [allTrips, filters]);
  const parcels = useMemo(() => filterParcels(allParcels, filters), [allParcels, filters]);
  const myTrips = allTrips.filter(t => t.userId === user?.id);
  const myParcels = allParcels.filter(p => p.userId === user?.id);
  const otherTrips = trips.filter(t => t.userId !== user?.id && t.status === 'active');
  const otherParcels = parcels.filter(p => p.userId !== user?.id && p.status === 'open');
  const firstName = user?.name?.split(' ')[0] || 'User';
  const hasActiveFilter = !!(filters.fromCity || filters.toCity || filters.vehicleType);
  const isLoading = tripsQuery.isLoading || parcelsQuery.isLoading;
  const listingsError = tripsQuery.error || parcelsQuery.error;
  const retryListings = () => {
    void tripsQuery.refetch();
    void parcelsQuery.refetch();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([tripsQuery.refetch(), parcelsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [tripsQuery, parcelsQuery]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const feedData = useMemo<FeedItem[]>(() => {
    if (activeTab === 'trips') {
      return otherTrips.map(t => ({ type: 'trip' as const, data: t }));
    }
    return otherParcels.map(p => ({ type: 'parcel' as const, data: p }));
  }, [activeTab, otherTrips, otherParcels]);

  const onEndReached = useCallback(() => {
    if (activeTab === 'trips') {
      if (tripsQuery.hasNextPage && !tripsQuery.isFetchingNextPage) {
        tripsQuery.fetchNextPage();
      }
    } else {
      if (parcelsQuery.hasNextPage && !parcelsQuery.isFetchingNextPage) {
        parcelsQuery.fetchNextPage();
      }
    }
  }, [activeTab, tripsQuery, parcelsQuery]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
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
        parcel={item.data as Parcel}
        onPress={() => {
          Haptic.tap();
          router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } });
        }}
      />
    );
  }, [router]);

  const ListFooter = useCallback(() => {
    const query = activeTab === 'trips' ? tripsQuery : parcelsQuery;
    if (query.isFetchingNextPage) {
      return (
        <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} size="small" />
        </View>
      );
    }
    return null;
  }, [activeTab, tripsQuery.isFetchingNextPage, parcelsQuery.isFetchingNextPage, C.primary]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return <FeedSkeletonList count={3} />;
    if (listingsError) {
      return (
        <AsyncStateCard
          C={C}
          icon="cloud-off"
          title="Could not load listings"
          message={listingsError instanceof Error ? listingsError.message : 'Refresh the marketplace and try again.'}
          actionLabel="Retry"
          onAction={retryListings}
        />
      );
    }
    if (activeTab === 'trips') {
      return (
        <EmptyFeed
          svg={<EmptyTripsSVG width={200} height={140} />}
          title="No active trips"
          sub={hasActiveFilter ? 'Try adjusting or clearing your filters' : 'Be the first to post a trip on this route!'}
          ctaLabel="Post a Trip"
          ctaIcon="directions-car"
          onCta={() => router.push('/create-trip')}
          showCta={!hasActiveFilter}
          C={C}
          onClearFilter={hasActiveFilter ? () => setFilters(DEFAULT_FILTERS) : undefined}
        />
      );
    }
    return (
      <EmptyFeed
        svg={<EmptyParcelsSVG width={200} height={140} />}
        title="No open parcels"
        sub={hasActiveFilter ? 'Try adjusting or clearing your filters' : 'Be the first to list a parcel!'}
        ctaLabel="Send a Parcel"
        ctaIcon="inventory-2"
        onCta={() => router.push('/create-parcel')}
        showCta={!hasActiveFilter}
        C={C}
        onClearFilter={hasActiveFilter ? () => setFilters(DEFAULT_FILTERS) : undefined}
      />
    );
  }, [isLoading, listingsError, activeTab, hasActiveFilter, C, router]);

  const ListHeader = useMemo(() => (
    <View style={styles.body}>
      {!isOnline ? <OfflineBanner C={C} /> : null}

      {user && FeatureFlags.kycProvider && (!user.kycStatus || user.kycStatus === 'pending') ? (
        <Pressable
          style={[styles.kycAlert, { backgroundColor: C.warningSubtle, borderColor: C.warning + '50' }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <View style={[styles.kycAlertIcon, { backgroundColor: C.warning + '20' }]}>
            <MaterialIcons name="verified-user" size={16} color={C.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycAlertTitle, { color: C.warning }]}>KYC verification needed</Text>
            <Text style={[styles.kycAlertSub, { color: C.warning + 'BB' }]}>Required to send or carry parcels</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={13} color={C.warning} />
        </Pressable>
      ) : null}

      {/* Action Cards */}
      <Animated.View style={[styles.actionRow, { opacity: actionsEntrance.opacity, transform: actionsEntrance.transform }]}>
        <ActionCard
          C={C}
          onPress={() => router.push('/create-parcel')}
          gradient={Gradients.primaryVibrant}
          icon="inventory-2"
          title="Send Parcel"
          sub="Find travellers on your route"
          iconBg="rgba(255,255,255,0.2)"
          iconColor="#fff"
          dark
        />
        <ActionCard
          C={C}
          onPress={() => router.push('/create-trip')}
          icon="directions-car"
          title="Post Trip"
          sub="Earn by carrying parcels"
          iconBg={C.primarySubtle}
          iconColor={C.primary}
        />
      </Animated.View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {[
          { val: myTrips.length.toString(), label: 'Trips', color: C.primary, icon: 'directions-car' as const },
          { val: myParcels.length.toString(), label: 'Parcels', color: C.success, icon: 'inventory-2' as const },
          { val: (user?.rating || 4.5).toFixed(1), label: 'Rating', color: C.warning, icon: 'star' as const },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name={s.icon} size={14} color={s.color} />
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Feed Tabs + Filter */}
      <View style={styles.feedHeaderRow}>
        <View style={styles.feedTabs}>
          {(['trips', 'parcels'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.feedTab,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                activeTab === tab && { backgroundColor: C.primarySubtle, borderColor: C.primary },
              ]}
              onPress={() => { Haptic.select(); setActiveTab(tab); }}
            >
              <MaterialIcons
                name={tab === 'trips' ? 'directions-car' : 'inventory-2'}
                size={13}
                color={activeTab === tab ? C.primary : C.textMuted}
              />
              <Text style={[styles.feedTabText, { color: activeTab === tab ? C.primary : C.textMuted }]}>
                {tab === 'trips' ? `Trips (${otherTrips.length})` : `Parcels (${otherParcels.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.filterBtn,
            { backgroundColor: hasActiveFilter ? C.primarySubtle : C.surfaceElevated, borderColor: hasActiveFilter ? C.primary : C.surfaceBorder },
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => { Haptic.tap(); setShowFilters(true); }}
          hitSlop={6}
        >
          <MaterialIcons name="tune" size={17} color={hasActiveFilter ? C.primary : C.textSecondary} />
          {hasActiveFilter && <View style={[styles.filterDot, { backgroundColor: C.primary }]} />}
        </Pressable>
      </View>

      {hasActiveFilter && (
        <Pressable
          style={[styles.activeFilterBar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}
          onPress={() => { Haptic.tap(); setFilters(DEFAULT_FILTERS); }}
        >
          <MaterialIcons name="filter-list" size={13} color={C.primary} />
          <Text style={[styles.activeFilterText, { color: C.primary }]} numberOfLines={1}>
            {[filters.fromCity, filters.toCity, filters.vehicleType].filter(Boolean).join(' · ')}
          </Text>
          <View style={[styles.clearFilter, { backgroundColor: C.primary + '25' }]}>
            <MaterialIcons name="close" size={12} color={C.primary} />
          </View>
        </Pressable>
      )}
    </View>
  ), [isOnline, user, C, actionsEntrance, myTrips.length, myParcels.length, activeTab, otherTrips.length, otherParcels.length, hasActiveFilter, filters, router]);

  return (
    <>
      <NotificationPanel
        visible={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        markAllRead={markAllRead}
        C={C}
      />
      <FilterPanel visible={showFilters} filters={filters} onClose={() => setShowFilters(false)} onApply={setFilters} C={C} />

      <View style={[styles.container, { backgroundColor: C.background }]}>
        {/* Header */}
        <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={[C.primary + '0A', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: C.textMuted }]}>{greeting}</Text>
              <Text style={[styles.userName, { color: C.textPrimary }]}>{firstName}</Text>
            </View>
            <View style={styles.headerBtns}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7, transform: [{ scale: 0.93 }] }]}
                onPress={() => { Haptic.tap(); router.push('/search'); }}
                hitSlop={4}
              >
                <Ionicons name="search" size={18} color={C.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7, transform: [{ scale: 0.93 }] }]}
                onPress={() => { Haptic.tap(); setShowNotifs(true); }}
                hitSlop={4}
              >
                <Ionicons name="notifications-outline" size={18} color={C.textSecondary} />
                {unreadCount > 0 && (
                  <Animated.View style={[styles.notifBadge, { backgroundColor: C.error, transform: [{ scale: badgePulse }] }]}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </Animated.View>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.avatarBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }, pressed && { opacity: 0.8, transform: [{ scale: 0.93 }] }]}
                onPress={() => { Haptic.tap(); router.push('/(tabs)/profile'); }}
                hitSlop={4}
              >
                <Text style={[styles.avatarText, { color: C.primary }]}>{firstName.charAt(0).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Feed */}
        <View style={{ flex: 1 }}>
          <AppErrorBoundary>
            <FlashList
              data={feedData}
              renderItem={renderItem}
              estimatedItemSize={140}
              keyExtractor={(item) => item.data.id}
              ListHeaderComponent={ListHeader}
              ListEmptyComponent={ListEmpty}
              ListFooterComponent={ListFooter}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={C.primary}
                  colors={[C.primary]}
                  progressBackgroundColor={C.surface}
                />
              }
            />
          </AppErrorBoundary>
        </View>
      </View>
    </>
  );
}
