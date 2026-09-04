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

function HomeHero({ userName, unreadCount, onNotifications }: { userName: string; unreadCount: number; onNotifications: () => void }) {
  const { C } = useThemeColors();
  const statusText = unreadCount > 0 ? `${unreadCount} new alerts` : 'All updates synced';

  return (
    <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient
        colors={[C.primarySubtle, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['transparent', C.overlayLight]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.heroTop}>
        <View style={styles.heroCopyWrap}>
          <View style={[styles.heroStatusPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={[styles.heroStatusDot, { backgroundColor: unreadCount > 0 ? C.warning : C.success }]} />
            <Text style={[styles.heroStatusText, { color: C.textSecondary }]}>{statusText}</Text>
          </View>
          <Text style={[styles.heroEyebrow, { color: C.textMuted }]}>CarryGo Marketplace</Text>
          <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Hi, {userName}</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>Post, match, and deliver with confidence.</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptic.tap();
            onNotifications();
          }}
          style={({ pressed }) => [
            styles.notifyBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
        >
          <MaterialIcons name="notifications-none" size={20} color={C.textPrimary} />
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
        style={({ pressed }) => [styles.quickAction, { borderColor: C.surfaceBorder }, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
      >
        <LinearGradient colors={Gradients.primaryVibrant} style={StyleSheet.absoluteFillObject} />
        <ProductIllustration variant="parcel" size={84} />
        <Text style={[styles.quickActionTitle, { color: C.textInverse }]}>Send Parcel</Text>
        <Text style={[styles.quickActionSub, { color: 'rgba(255,255,255,0.8)' }]}>Post details and match fast</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          Haptic.confirm();
          router.push('/create-trip');
        }}
        style={({ pressed }) => [
          styles.quickAction,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.quickIcon, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="luggage" size={18} color={C.primary} />
        </View>
        <Text style={[styles.quickActionTitle, { color: C.textPrimary }]}>Post Trip</Text>
        <Text style={[styles.quickActionSub, { color: C.textMuted }]}>Earn from extra luggage space</Text>
      </Pressable>
    </View>
  );
}

function HomeStats({ tripsCount, parcelsCount }: { tripsCount: number; parcelsCount: number }) {
  const { C } = useThemeColors();

  return (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.statIcon, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="route" size={14} color={C.primary} />
        </View>
        <Text style={[styles.statValue, { color: C.textPrimary }]}>{tripsCount}</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Live Trips</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.statIcon, { backgroundColor: C.successSubtle }]}>
          <MaterialIcons name="inventory-2" size={14} color={C.success} />
        </View>
        <Text style={[styles.statValue, { color: C.textPrimary }]}>{parcelsCount}</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Open Parcels</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.statIcon, { backgroundColor: C.warningSubtle }]}>
          <MaterialIcons name="bolt" size={14} color={C.warning} />
        </View>
        <Text style={[styles.statValue, { color: C.textPrimary }]}>{Math.max(1, Math.round((tripsCount + parcelsCount) / 2))}</Text>
        <Text style={[styles.statLabel, { color: C.textMuted }]}>Fast Matches</Text>
      </View>
    </View>
  );
}

function EmptyMarketplace({ activeTab, hasFilter, onClear, onCreate }: {
  activeTab: 'trips' | 'parcels';
  hasFilter: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
      <ProductIllustration variant={activeTab === 'trips' ? 'route' : 'parcel'} size={170} />
      <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
        {hasFilter ? 'No route matches yet' : activeTab === 'trips' ? 'No live trips yet' : 'No open parcels yet'}
      </Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        {hasFilter
          ? 'Try broader locations or clear filters.'
          : activeTab === 'trips'
            ? 'Be the first to post a trip on this route.'
            : 'Be the first to post a parcel request on this route.'}
      </Text>
      <Pressable
        onPress={hasFilter ? onClear : onCreate}
        style={({ pressed }) => [styles.emptyCta, { backgroundColor: C.primaryDark }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      >
        <Text style={styles.emptyCtaText}>{hasFilter ? 'Clear Filters' : activeTab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}</Text>
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
              <HomeHero
                userName={user?.fullName || user?.name || 'there'}
                unreadCount={unreadCount}
                onNotifications={() => setShowNotifications(true)}
              />
            </Animated.View>

            <HomeStats tripsCount={filteredTrips.length} parcelsCount={filteredParcels.length} />

            <QuickActions />

            <View style={styles.marketplaceHead}>
              <View>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Marketplace</Text>
                <Text style={[styles.sectionSub, { color: C.textMuted }]}>Find best routes and delivery options</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  setShowFilters(true);
                }}
                style={({ pressed }) => [
                  styles.filterBtn,
                  { borderColor: C.surfaceBorder, backgroundColor: C.surface },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                ]}
              >
                <MaterialIcons name="tune" size={18} color={C.textPrimary} />
              </Pressable>
            </View>

            {!isOnline ? <OfflineBanner C={C} /> : null}

            <View style={[styles.segmented, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
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
                        backgroundColor: active ? C.primaryDark : 'transparent',
                        borderColor: active ? C.primaryDark : 'transparent',
                      },
                      pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: active ? C.textInverse : C.textSecondary }]}>
                      {tab === 'trips' ? 'Trips' : 'Parcels'} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {hasFilter ? (
              <View style={[styles.filterSummary, { backgroundColor: C.primarySubtle }]}> 
                <MaterialIcons name="filter-alt" size={14} color={C.primaryDark} />
                <Text style={[styles.filterSummaryText, { color: C.primaryDark }]}>Filters are active</Text>
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
  listContent: { paddingBottom: 120 },
  headerWrap: { paddingHorizontal: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.md },

  hero: {
    minHeight: 130,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.mdl,
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  heroCopyWrap: { flex: 1, gap: 2, paddingRight: Spacing.sm },
  heroStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroStatusDot: { width: 6, height: 6, borderRadius: 3 },
  heroStatusText: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
  heroEyebrow: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 1 },
  heroTitle: { fontSize: FontSize.xxl + 1, fontWeight: FontWeight.bold, letterSpacing: -0.45, marginTop: 2 },
  heroSub: { fontSize: FontSize.sm, marginTop: 5, lineHeight: 19 },
  notifyBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifyBadgeText: { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 3,
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.2 },
  statLabel: { fontSize: 10, fontWeight: FontWeight.semibold },

  quickActionsRow: { flexDirection: 'row', gap: Spacing.sm },
  quickAction: {
    flex: 1,
    minHeight: 138,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  quickIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  quickActionSub: { fontSize: FontSize.xs, lineHeight: 17, marginTop: 2 },

  marketplaceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.35 },
  sectionSub: { fontSize: FontSize.xs, marginTop: 2 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  segmented: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  filterSummary: {
    minHeight: 34,
    borderRadius: BorderRadius.sm,
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
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.sm, textAlign: 'center' },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  emptyCta: {
    marginTop: Spacing.lg,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  stateWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  footerLoader: { paddingVertical: Spacing.lg },
});


