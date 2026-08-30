import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppErrorBoundary, AsyncStateCard, FeedSkeletonList, OfflineBanner, ParcelCard, TripCard } from '@/components';
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

function QuickAction({ title, subtitle, icon, primary, onPress }: {
  title: string;
  subtitle: string;
  icon: 'parcel' | 'route';
  primary?: boolean;
  onPress: () => void;
}) {
  const { C } = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { Haptic.confirm(); onPress(); }}
      style={({ pressed }) => [styles.quickAction, {
        backgroundColor: primary ? C.primaryDark : C.surface,
        borderColor: primary ? C.primaryDark : C.surfaceBorder,
        transform: [{ scale: pressed ? 0.975 : 1 }],
      }]}
    >
      {primary ? <LinearGradient colors={Gradients.primaryVibrant} style={StyleSheet.absoluteFillObject} /> : null}
      <View style={styles.quickActionCopy}>
        <View style={[styles.quickActionIcon, { backgroundColor: primary ? 'rgba(255,255,255,0.15)' : C.primarySubtle }]}>
          <MaterialIcons name={icon === 'parcel' ? 'inventory-2' : 'luggage'} size={18} color={primary ? C.textInverse : C.primaryDark} />
        </View>
        <Text style={[styles.quickActionTitle, { color: primary ? C.textInverse : C.textPrimary }]}>{title}</Text>
        <Text style={[styles.quickActionSubtitle, { color: primary ? 'rgba(255,255,255,0.76)' : C.textMuted }]}>{subtitle}</Text>
        <View style={styles.actionLink}>
          <Text style={[styles.actionLinkText, { color: primary ? C.textInverse : C.primaryDark }]}>Get started</Text>
          <MaterialIcons name="arrow-forward" size={15} color={primary ? C.textInverse : C.primaryDark} />
        </View>
      </View>
      <View style={styles.quickActionArt}><ProductIllustration variant={icon} size={106} /></View>
    </Pressable>
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
      <ProductIllustration variant={activeTab === 'trips' ? 'route' : 'parcel'} size={176} />
      <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
        {hasFilter ? 'No exact route matches' : activeTab === 'trips' ? 'No live trips yet' : 'No open parcels yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
        {hasFilter ? 'Clear the filters or try a nearby city.' : activeTab === 'trips'
          ? 'Post your trip and start earning from spare luggage space.'
          : 'Create a parcel request and we will help find a traveller.'}
      </Text>
      <Pressable onPress={hasFilter ? onClear : onCreate} style={({ pressed }) => [styles.emptyButton, { backgroundColor: C.primaryDark, opacity: pressed ? 0.84 : 1 }]}>
        <Text style={styles.emptyButtonText}>{hasFilter ? 'Clear filters' : activeTab === 'trips' ? 'Post a trip' : 'Send a parcel'}</Text>
        <MaterialIcons name="arrow-forward" size={15} color="#fff" />
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
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<'trips' | 'parcels'>('trips');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userCity = user?.city;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const tripsQuery = useTripsQuery(Boolean(user), userCity);
  const parcelsQuery = useParcelsQuery(Boolean(user), userCity);
  useListingsRealtime(Boolean(user), userCity || filters.fromCity || undefined);

  const allTrips = useMemo(() => user ? flattenInfiniteData(tripsQuery.data) : [], [tripsQuery.data, user]);
  const allParcels = useMemo(() => user ? flattenInfiniteData(parcelsQuery.data) : [], [parcelsQuery.data, user]);
  const trips = useMemo(() => filterTrips(allTrips, filters), [allTrips, filters]);
  const parcels = useMemo(() => filterParcels(allParcels, filters), [allParcels, filters]);
  const myTrips = useMemo(() => allTrips.filter(item => item.userId === user?.id), [allTrips, user?.id]);
  const myParcels = useMemo(() => allParcels.filter(item => item.userId === user?.id), [allParcels, user?.id]);
  const liveTrips = useMemo(() => trips.filter(item => item.userId !== user?.id && item.status === 'active'), [trips, user?.id]);
  const liveParcels = useMemo(() => parcels.filter(item => item.userId !== user?.id && item.status === 'open'), [parcels, user?.id]);
  const hasActiveFilter = Boolean(filters.fromCity || filters.toCity || filters.vehicleType || filters.dateFrom || filters.dateTo);
  const listingsError = tripsQuery.error || parcelsQuery.error;
  const isLoading = tripsQuery.isLoading || parcelsQuery.isLoading;
  const feedData = useMemo<FeedItem[]>(() => activeTab === 'trips'
    ? liveTrips.map(data => ({ type: 'trip', data }))
    : liveParcels.map(data => ({ type: 'parcel', data })), [activeTab, liveParcels, liveTrips]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const retryListings = useCallback(() => { void tripsQuery.refetch(); void parcelsQuery.refetch(); }, [parcelsQuery, tripsQuery]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([tripsQuery.refetch(), parcelsQuery.refetch()]); Haptic.success(); }
    finally { setRefreshing(false); }
  }, [parcelsQuery, tripsQuery]);
  const onEndReached = useCallback(() => {
    const query = activeTab === 'trips' ? tripsQuery : parcelsQuery;
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [activeTab, parcelsQuery, tripsQuery]);
  const renderItem = useCallback(({ item }: { item: FeedItem }) => item.type === 'trip'
    ? <TripCard trip={item.data} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.data.id } })} />
    : <ParcelCard parcel={item.data} onPress={() => router.push({ pathname: '/parcel/[id]', params: { id: item.data.id } })} />, [router]);

  const listEmpty = useCallback(() => {
    if (isLoading) return <FeedSkeletonList count={3} />;
    if (listingsError) return (
      <View style={styles.stateWrap}>
        <AsyncStateCard C={C} icon="cloud-off" title="Marketplace unavailable" message={listingsError instanceof Error ? listingsError.message : 'Refresh and try again.'} actionLabel="Retry" onAction={retryListings} />
      </View>
    );
    return <EmptyMarketplace activeTab={activeTab} hasFilter={hasActiveFilter} onClear={() => setFilters(DEFAULT_FILTERS)} onCreate={() => router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel')} />;
  }, [C, activeTab, hasActiveFilter, isLoading, listingsError, retryListings, router]);

  const listHeader = useMemo(() => (
    <View style={styles.listHeader}>
      {!isOnline ? <OfflineBanner C={C} /> : null}
      <View>
        <Text style={[styles.eyebrow, { color: C.primaryDark }]}>CHOOSE WHAT YOU NEED</Text>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Move something or earn on a trip</Text>
      </View>
      <View style={styles.actionsRow}>
        <QuickAction title="Send a parcel" subtitle="Find someone already travelling your route." icon="parcel" primary onPress={() => router.push('/create-parcel')} />
        <QuickAction title="Carry & earn" subtitle="Share your route and use spare luggage space." icon="route" onPress={() => router.push('/create-trip')} />
      </View>
      <Pressable onPress={() => router.push('/search')} style={({ pressed }) => [styles.routeSearch, { backgroundColor: C.surface, borderColor: C.surfaceBorder, opacity: pressed ? 0.82 : 1 }]}>
        <View style={[styles.searchIcon, { backgroundColor: C.primarySubtle }]}><MaterialIcons name="route" size={20} color={C.primaryDark} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.searchLabel, { color: C.textPrimary }]}>Search a route</Text>
          <Text style={[styles.searchHint, { color: C.textMuted }]} numberOfLines={1}>{userCity ? `Trips and parcels around ${userCity}` : 'Choose origin, destination, and date'}</Text>
        </View>
        <View style={[styles.searchArrow, { backgroundColor: C.surfaceElevated }]}><MaterialIcons name="arrow-forward" size={17} color={C.textSecondary} /></View>
      </Pressable>
      <View style={styles.snapshotRow}>
        <View style={[styles.snapshotCard, { backgroundColor: C.primarySubtle }]}><Text style={[styles.snapshotValue, { color: C.primaryDark }]}>{liveTrips.length}</Text><Text style={[styles.snapshotLabel, { color: C.textMuted }]}>Live trips</Text></View>
        <View style={[styles.snapshotCard, { backgroundColor: C.accentSubtle }]}><Text style={[styles.snapshotValue, { color: C.accent }]}>{liveParcels.length}</Text><Text style={[styles.snapshotLabel, { color: C.textMuted }]}>Open parcels</Text></View>
        <Pressable onPress={() => router.push('/my-activity')} style={({ pressed }) => [styles.snapshotCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder, opacity: pressed ? 0.75 : 1 }]}>
          <Text style={[styles.snapshotValue, { color: C.textPrimary }]}>{myTrips.length + myParcels.length}</Text><Text style={[styles.snapshotLabel, { color: C.textMuted }]}>My listings ›</Text>
        </Pressable>
      </View>
      {user && FeatureFlags.kycProvider && (!user.kycStatus || user.kycStatus === 'pending') ? (
        <Pressable onPress={() => router.push('/(tabs)/profile')} style={({ pressed }) => [styles.trustCard, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44', opacity: pressed ? 0.82 : 1 }]}>
          <View style={[styles.trustIcon, { backgroundColor: C.warning + '20' }]}><MaterialIcons name="verified-user" size={18} color={C.warning} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.trustTitle, { color: C.textPrimary }]}>Build trust with verification</Text><Text style={[styles.trustSubtitle, { color: C.textMuted }]}>A verified profile gets clearer, safer matches.</Text></View>
          <MaterialIcons name="arrow-forward" size={16} color={C.warning} />
        </Pressable>
      ) : null}
      <View style={styles.marketplaceHeader}>
        <View><Text style={[styles.marketplaceTitle, { color: C.textPrimary }]}>Explore nearby</Text><Text style={[styles.marketplaceSubtitle, { color: C.textMuted }]}>Fresh opportunities from the community</Text></View>
        <Pressable onPress={() => setShowFilters(true)} style={({ pressed }) => [styles.filterButton, { backgroundColor: hasActiveFilter ? C.primarySubtle : C.surface, borderColor: hasActiveFilter ? C.primary + '66' : C.surfaceBorder, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="tune" size={17} color={hasActiveFilter ? C.primaryDark : C.textSecondary} /></Pressable>
      </View>
      <View style={[styles.segmentedControl, { backgroundColor: C.surfaceElevated }]}>
        {(['trips', 'parcels'] as const).map(tab => {
          const selected = activeTab === tab;
          const count = tab === 'trips' ? liveTrips.length : liveParcels.length;
          return <Pressable key={tab} onPress={() => { Haptic.select(); setActiveTab(tab); }} style={[styles.segment, selected && { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name={tab === 'trips' ? 'directions-car' : 'inventory-2'} size={16} color={selected ? C.primaryDark : C.textMuted} />
            <Text style={[styles.segmentText, { color: selected ? C.textPrimary : C.textMuted }]}>{tab === 'trips' ? 'Trips' : 'Parcels'}</Text>
            <View style={[styles.segmentCount, { backgroundColor: selected ? C.primarySubtle : C.surfaceHigh }]}><Text style={[styles.segmentCountText, { color: selected ? C.primaryDark : C.textMuted }]}>{count}</Text></View>
          </Pressable>;
        })}
      </View>
      {hasActiveFilter ? <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} style={[styles.filterSummary, { backgroundColor: C.primarySubtle }]}><MaterialIcons name="filter-alt" size={14} color={C.primaryDark} /><Text style={[styles.filterSummaryText, { color: C.primaryDark }]}>Filters applied</Text><MaterialIcons name="close" size={15} color={C.primaryDark} /></Pressable> : null}
    </View>
  ), [C, activeTab, hasActiveFilter, isOnline, liveParcels.length, liveTrips.length, myParcels.length, myTrips.length, router, user, userCity]);

  return <>
    <NotificationPanel visible={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} markAllRead={markAllRead} C={C} />
    <FilterPanel visible={showFilters} filters={filters} onClose={() => setShowFilters(false)} onApply={setFilters} C={C} />
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}><View style={[styles.brandMark, { backgroundColor: C.primaryDark }]}><MaterialIcons name="local-shipping" size={18} color={C.textInverse} /></View><Text style={[styles.brandName, { color: C.textPrimary }]}>CarryGo</Text></View>
        <View style={[styles.headerActions, { top: insets.top + 8 }]}>
          <Pressable onPress={() => setShowNotifications(true)} style={({ pressed }) => [styles.headerButton, { backgroundColor: C.surface, borderColor: C.surfaceBorder, opacity: pressed ? 0.72 : 1 }]}><Ionicons name="notifications-outline" size={19} color={C.textSecondary} />{unreadCount > 0 ? <View style={[styles.notificationDot, { backgroundColor: C.error, borderColor: C.surface }]} /> : null}</Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={({ pressed }) => [styles.avatarButton, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33', opacity: pressed ? 0.74 : 1 }]}><Text style={[styles.avatarText, { color: C.primaryDark }]}>{firstName.charAt(0).toUpperCase()}</Text></Pressable>
        </View>
        <View style={styles.welcomeRow}><Text style={[styles.greeting, { color: C.textMuted }]}>{greeting},</Text><Text style={[styles.userName, { color: C.textPrimary }]}>{firstName}</Text><Text style={styles.wave}>👋</Text></View>
        <Text style={[styles.welcomeSubtitle, { color: C.textSecondary }]}>What would you like to do today?</Text>
      </View>
      <AppErrorBoundary>
        <FlashList data={feedData} renderItem={renderItem} estimatedItemSize={170} keyExtractor={item => item.data.id} ListHeaderComponent={listHeader} ListEmptyComponent={listEmpty}
          ListFooterComponent={(activeTab === 'trips' ? tripsQuery : parcelsQuery).isFetchingNextPage ? <View style={styles.footerLoader}><ActivityIndicator color={C.primary} /></View> : null}
          onEndReached={onEndReached} onEndReachedThreshold={0.4} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.surface} />} />
      </AppErrorBoundary>
    </View>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 104 },
  brandMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 20, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  headerActions: { position: 'absolute', right: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  avatarButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, gap: 5 },
  greeting: { fontSize: FontSize.xxl, fontWeight: FontWeight.medium, letterSpacing: -0.8 },
  userName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: -0.8 },
  wave: { fontSize: 24, marginLeft: 2 },
  welcomeSubtitle: { fontSize: FontSize.md, marginTop: 5 },
  listHeader: { paddingHorizontal: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.md },
  eyebrow: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.15, marginBottom: 5 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.35 },
  actionsRow: { gap: Spacing.md },
  quickAction: { minHeight: 150, borderRadius: BorderRadius.xl, borderWidth: 1, overflow: 'hidden', padding: Spacing.lg, justifyContent: 'center' },
  quickActionCopy: { width: '62%', zIndex: 2 },
  quickActionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  quickActionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.4 },
  quickActionSubtitle: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.md },
  actionLinkText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickActionArt: { position: 'absolute', right: 2, bottom: 2, opacity: 0.92 },
  routeSearch: { minHeight: 72, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  searchIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  searchHint: { fontSize: FontSize.xs, marginTop: 3 },
  searchArrow: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  snapshotRow: { flexDirection: 'row', gap: Spacing.sm },
  snapshotCard: { flex: 1, minHeight: 74, borderRadius: BorderRadius.md, padding: Spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  snapshotValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  snapshotLabel: { fontSize: 10, fontWeight: FontWeight.semibold, marginTop: 3 },
  trustCard: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  trustIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  trustTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  trustSubtitle: { fontSize: FontSize.xs, marginTop: 3, lineHeight: 17 },
  marketplaceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  marketplaceTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.4 },
  marketplaceSubtitle: { fontSize: FontSize.xs, marginTop: 3 },
  filterButton: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segmentedControl: { borderRadius: BorderRadius.md, padding: 4, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  segmentCount: { minWidth: 22, height: 22, borderRadius: 8, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  segmentCountText: { fontSize: 10, fontWeight: FontWeight.bold },
  filterSummary: { minHeight: 38, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filterSummaryText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  emptyCard: { marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center', marginTop: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 280 },
  emptyButton: { minHeight: 46, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  emptyButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  stateWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  footerLoader: { paddingVertical: Spacing.lg },
});
