import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AsyncStateCard, FeedSkeletonList, OfflineBanner, ParcelCard, TripCard } from '@/components';
import { FilterPanel } from '@/components/feature/FilterPanel';
import { NotificationPanel } from '@/components/feature/NotificationPanel';
import { ProductIllustration } from '@/components/illustrations';
import { BorderRadius, FontSize, FontWeight, Gradients, Spacing } from '@/constants/theme';
import { FeatureFlags } from '@/constants/featureFlags';
import { filterParcels, filterTrips, flattenInfiniteData, useListingsRealtime, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { FilterOptions, Parcel, Trip } from '@/types';

const DEFAULT_FILTERS: FilterOptions = { fromCity: '', toCity: '', vehicleType: '', dateFrom: '', dateTo: '' };
type FeedItem = { type: 'trip'; data: Trip } | { type: 'parcel'; data: Parcel };

function HomeHeader({
  userName,
  unreadCount,
  onNotifications,
}: {
  userName: string;
  unreadCount: number;
  onNotifications: () => void;
}) {
  const { C } = useThemeColors();
  const initial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.headerTop}>
      <View style={styles.userProfileWrap}>
        <View style={[styles.avatarCircle, { backgroundColor: C.primarySubtle, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.avatarInitial, { color: C.primary }]}>{initial}</Text>
        </View>
        <View style={styles.greetingWrap}>
          <Text style={[styles.greetingSub, { color: C.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.greetingName, { color: C.textPrimary }]} numberOfLines={1}>
            {userName}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          Haptic.tap();
          onNotifications();
        }}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={({ pressed }) => [
          styles.notifyBtn,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
        ]}
      >
        <MaterialIcons name="notifications-none" size={22} color={C.textPrimary} />
        {unreadCount > 0 ? (
          <View style={[styles.notifyBadge, { backgroundColor: C.error }]}>
            <Text style={styles.notifyBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function SearchBarTrigger({
  onSearchPress,
  hasFilter,
}: {
  onSearchPress: () => void;
  hasFilter: boolean;
}) {
  const { C } = useThemeColors();

  return (
    <Pressable
      onPress={() => {
        Haptic.tap();
        onSearchPress();
      }}
      style={({ pressed }) => [
        styles.searchBar,
        { backgroundColor: C.surface, borderColor: hasFilter ? C.primary : C.surfaceBorder },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.searchIconWrap, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="search" size={20} color={C.primary} />
      </View>
      <View style={styles.searchCopyWrap}>
        <Text style={[styles.searchPlaceholder, { color: C.textPrimary }]}>Where are you sending to?</Text>
        <Text style={[styles.searchSubPlaceholder, { color: C.textMuted }]}>Search routes, cities or dates</Text>
      </View>
      <View style={[styles.filterIconBadge, { backgroundColor: hasFilter ? C.primarySubtle : C.background }]}>
        <MaterialIcons name="tune" size={18} color={hasFilter ? C.primary : C.textSecondary} />
      </View>
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
        style={({ pressed }) => [
          styles.quickActionCard,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.quickActionTop}>
          <View style={[styles.quickActionIcon, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="inventory-2" size={22} color={C.primary} />
          </View>
          <MaterialIcons name="arrow-forward" size={16} color={C.textMuted} />
        </View>
        <View style={styles.quickActionCopy}>
          <Text style={[styles.quickActionTitle, { color: C.textPrimary }]}>Send Parcel</Text>
          <Text style={[styles.quickActionSub, { color: C.textMuted }]}>Match with travelers</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          Haptic.confirm();
          router.push('/create-trip');
        }}
        style={({ pressed }) => [
          styles.quickActionCard,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.quickActionTop}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
            <MaterialIcons name="flight-takeoff" size={22} color={C.primaryDark} />
          </View>
          <MaterialIcons name="arrow-forward" size={16} color={C.textMuted} />
        </View>
        <View style={styles.quickActionCopy}>
          <Text style={[styles.quickActionTitle, { color: C.textPrimary }]}>Post a Trip</Text>
          <Text style={[styles.quickActionSub, { color: C.textMuted }]}>Earn from bag space</Text>
        </View>
      </Pressable>
    </View>
  );
}

function HomeStats({ tripsCount, parcelsCount }: { tripsCount: number; parcelsCount: number }) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.statsContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.statCol}>
        <Text style={[styles.statNumber, { color: C.primary }]}>{tripsCount}</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Live Trips</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: C.surfaceBorder }]} />
      <View style={styles.statCol}>
        <Text style={[styles.statNumber, { color: C.textPrimary }]}>{parcelsCount}</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Open Parcels</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: C.surfaceBorder }]} />
      <View style={styles.statCol}>
        <Text style={[styles.statNumber, { color: C.success }]}>100%</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Verified</Text>
      </View>
    </View>
  );
}

function EmptyMarketplace({
  activeTab,
  hasFilter,
  onClear,
  onCreate,
}: {
  activeTab: 'trips' | 'parcels';
  hasFilter: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons
          name={activeTab === 'trips' ? 'explore' : 'local-shipping'}
          size={36}
          color={C.primary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
        {hasFilter ? 'No route matches found' : activeTab === 'trips' ? 'No live trips available' : 'No open parcels yet'}
      </Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        {hasFilter
          ? 'Try adjusting your destination, vehicle or date filters.'
          : activeTab === 'trips'
            ? 'Be the first traveler to post a route and earn on this trip.'
            : 'Post your package request and get matched with verified travelers.'}
      </Text>
      <Pressable
        onPress={hasFilter ? onClear : onCreate}
        style={({ pressed }) => [
          styles.emptyCta,
          { backgroundColor: C.primary },
          pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.emptyCtaText}>
          {hasFilter ? 'Reset Filters' : activeTab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const { notifications, unreadCount, markAllRead, markNotificationsAsRead, openNotification } = useNotifications();

  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'parcels'>('trips');
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [refreshing, setRefreshing] = useState(false);
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

  const tripsQuery = useTripsQuery(true, user?.city);
  const parcelsQuery = useParcelsQuery(true, user?.city);
  useListingsRealtime();

  const trips = flattenInfiniteData(tripsQuery.data);
  const parcels = flattenInfiniteData(parcelsQuery.data);

  const filteredTrips = useMemo(() => filterTrips(trips, filters), [trips, filters]);
  const filteredParcels = useMemo(() => filterParcels(parcels, filters), [parcels, filters]);
  const hasFilter = useMemo(() => Object.values(filters).some((value) => String(value).trim().length > 0), [filters]);

  const feedData = useMemo<FeedItem[]>(() => {
    if (activeTab === 'trips') return filteredTrips.map((trip) => ({ type: 'trip', data: trip }));
    return filteredParcels.map((parcel) => ({ type: 'parcel', data: parcel }));
  }, [activeTab, filteredParcels, filteredTrips]);

  const isLoading = tripsQuery.isLoading || parcelsQuery.isLoading;
  const hasError = tripsQuery.error || parcelsQuery.error;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([tripsQuery.refetch(), parcelsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'trip') {
      return (
        <TripCard
          trip={item.data}
          onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.data.id } })}
          showRequestButton={FeatureFlags.payments}
          onRequest={() => router.push({ pathname: '/matching', params: { mode: 'browse_trips', fromCity: item.data.fromCity, toCity: item.data.toCity } })}
        />
      );
    }

    return (
      <ParcelCard
        parcel={item.data}
        onPress={() => router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } })}
        showCarryButton
        onCarry={() => router.push({ pathname: '/matching', params: { mode: 'parcel', id: item.data.id } })}
      />
    );
  };

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
        C={C}
      />

      <FilterPanel
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(nextFilters) => setFilters(nextFilters)}
        C={C}
      />

      <FlashList
        data={feedData}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        renderItem={renderItem}
        estimatedItemSize={236}
        ListHeaderComponent={
          <View style={[styles.headerWrap, { paddingTop: insets.top + Spacing.sm }]}> 
            <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroTranslateY }] }}>
              <HomeHeader
                userName={user?.fullName || user?.name || 'there'}
                unreadCount={unreadCount}
                onNotifications={() => setShowNotifications(true)}
              />
            </Animated.View>

            <SearchBarTrigger
              onSearchPress={() => setShowFilters(true)}
              hasFilter={hasFilter}
            />

            <QuickActions />

            <HomeStats tripsCount={filteredTrips.length} parcelsCount={filteredParcels.length} />

            <View style={styles.marketplaceHead}>
              <View>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Live Marketplace</Text>
                <Text style={[styles.sectionSub, { color: C.textMuted }]}>Direct traveler-to-sender delivery routes</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  setShowFilters(true);
                }}
                style={({ pressed }) => [
                  styles.filterBtn,
                  { borderColor: hasFilter ? C.primary : C.surfaceBorder, backgroundColor: C.surface },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                ]}
              >
                <MaterialIcons name="tune" size={18} color={hasFilter ? C.primary : C.textPrimary} />
              </Pressable>
            </View>

            {!isOnline ? <OfflineBanner C={C} /> : null}

            <View style={[styles.segmented, { backgroundColor: '#F1F5F9', borderColor: C.surfaceBorder }]}> 
              {(['trips', 'parcels'] as const).map((tab) => {
                const active = activeTab === tab;
                const count = tab === 'trips' ? filteredTrips.length : filteredParcels.length;

                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      Haptic.select();
                      setActiveTab(tab);
                    }}
                    style={({ pressed }) => [
                      styles.segment,
                      {
                        backgroundColor: active ? C.primary : 'transparent',
                      },
                      pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : C.textSecondary, fontWeight: active ? FontWeight.bold : FontWeight.medium }]}>
                      {tab === 'trips' ? 'Available Trips' : 'Parcels to Carry'} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {hasFilter ? (
              <View style={[styles.filterSummary, { backgroundColor: C.primarySubtle }]}> 
                <MaterialIcons name="filter-alt" size={14} color={C.primaryDark} />
                <Text style={[styles.filterSummaryText, { color: C.primaryDark }]}>Active filters applied</Text>
                <Pressable onPress={() => setFilters(DEFAULT_FILTERS)}>
                  <Text style={[styles.clearText, { color: C.primaryDark }]}>Clear</Text>
                </Pressable>
              </View>
            ) : null}
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
              onClear={() => setFilters(DEFAULT_FILTERS)}
              onCreate={() => router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel')}
            />
          )
        }
        ListFooterComponent={tripsQuery.isFetchingNextPage || parcelsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} color={C.primary} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (activeTab === 'trips') {
            if (tripsQuery.hasNextPage && !tripsQuery.isFetchingNextPage) tripsQuery.fetchNextPage();
            return;
          }

          if (parcelsQuery.hasNextPage && !parcelsQuery.isFetchingNextPage) parcelsQuery.fetchNextPage();
        }}
        contentContainerStyle={styles.listContent}
      />
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
  notifyBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCopyWrap: {
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
  },
  searchSubPlaceholder: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  filterIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
    minHeight: 106,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCopy: {
    marginTop: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  quickActionSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 26,
  },

  marketplaceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  sectionSub: { fontSize: FontSize.xs, marginTop: 2 },
  filterBtn: {
    width: 38,
    height: 38,
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
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FontSize.sm - 0.5,
    letterSpacing: -0.1,
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

  stateWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  footerLoader: { paddingVertical: Spacing.lg },
});


