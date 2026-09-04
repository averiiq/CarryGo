import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAlert } from '@/template';
import { AsyncStateCard, OfflineBanner } from '@/components';
import {
  flattenInfiniteData,
  useParcelsQuery,
  useTripsQuery,
  useUpdateParcelStatusMutation,
  useUpdateTripStatusMutation,
} from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Trip, Parcel, Request } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { ActivityTripsList } from '@/components/feature/ActivityTripsList';
import { ActivityParcelsList } from '@/components/feature/ActivityParcelsList';
import { UNMATCHED_LISTING_EXPIRY_HOURS } from '@/constants/listingFlow';

type Tab = 'trips' | 'parcels';

// ── Earnings summary ────────────────────────────────────────────────────────
function EarningsSummary({ trips, parcels, requests, C }: {
  trips: Trip[]; parcels: Parcel[]; requests: Request[]; C: ThemeColors;
}) {
  const totalEarned = requests
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + r.price, 0);

  const activeTrips = trips.filter(t => t.status === 'active').length;
  const openParcels = parcels.filter(p => p.status === 'open').length;
  const inTransit = requests.filter(r => r.status === 'accepted').length;

  const stats = [
    { label: 'Earned', value: `Rs ${totalEarned}`, icon: 'account-balance-wallet' as const, color: C.success },
    { label: 'Active trips', value: String(activeTrips), icon: 'directions-car' as const, color: C.primary },
    { label: 'Open parcels', value: String(openParcels), icon: 'inventory-2' as const, color: C.warning },
    { label: 'In transit', value: String(inTransit), icon: 'local-shipping' as const, color: C.primaryDark },
  ];

  return (
    <View style={[styles.summaryCard, { borderColor: C.surfaceBorder }]}>
      <LinearGradient
        colors={[C.primarySubtle, 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="bar-chart" size={18} color={C.primary} />
        </View>
        <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>Activity Summary</Text>
      </View>
      <View style={styles.summaryStats}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.summaryStat, { backgroundColor: C.surface + 'CC', borderColor: C.surfaceBorder }]}>
            <View style={[styles.summaryStatIcon, { backgroundColor: s.color + '18' }]}>
              <MaterialIcons name={s.icon} size={14} color={s.color} />
            </View>
            <Text style={[styles.summaryStatValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.summaryStatLabel, { color: C.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function MyActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const requestsQuery = useRequestsQuery(user?.id);
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const [refreshing, setRefreshing] = useState(false);
  const tabAnim = useRef(new Animated.Value(0)).current;

  const trips = user ? flattenInfiniteData(tripsQuery.data) : [];
  const parcels = user ? flattenInfiniteData(parcelsQuery.data) : [];
  const requests = user ? requestsQuery.data ?? [] : [];
  const myTrips = trips.filter(t => t.userId === user?.id);
  const myParcels = parcels.filter(p => p.userId === user?.id);
  const myRequests = requests.filter(r => r.senderId === user?.id || r.travellerId === user?.id);
  const isInitialLoading = tripsQuery.isLoading || parcelsQuery.isLoading || requestsQuery.isLoading;
  const activityError = tripsQuery.error || parcelsQuery.error || requestsQuery.error;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([tripsQuery.refetch(), parcelsQuery.refetch(), requestsQuery.refetch()]);
    } finally { setRefreshing(false); }
  };

  const switchTab = (tab: Tab) => {
    Haptic.select();
    Animated.spring(tabAnim, { toValue: tab === 'trips' ? 0 : 1, tension: 220, friction: 20, useNativeDriver: true }).start();
    setActiveTab(tab);
  };

  const handleCancelTrip = (trip: Trip) => {
    showAlert('Cancel Trip?', `Cancel your trip from ${trip.fromCity} to ${trip.toCity}? Pending requests will be rejected.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Trip', style: 'destructive', onPress: async () => {
        try { await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Trip Not Cancelled', error instanceof Error ? error.message : 'Please try again.'); }
      }},
    ]);
  };

  const handleDeleteTrip = (trip: Trip) => {
    showAlert('Delete Trip?', 'This will permanently remove your trip listing. This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Trip Not Removed', error instanceof Error ? error.message : 'Please try again.'); }
      }},
    ]);
  };

  const handleDeleteParcel = (parcel: Parcel) => {
    showAlert('Remove Parcel?', 'This will remove your parcel listing. Travellers will no longer see it.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'failed' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Parcel Not Removed', error instanceof Error ? error.message : 'Please try again.'); }
      }},
    ]);
  };

  const handleRepostTrip = (trip: Trip) => {
    router.push({
      pathname: '/create-trip',
      params: {
        repost: '1',
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        date: trip.date,
        time: trip.time,
        vehicle: trip.vehicleType,
        capacity: String(trip.availableCapacity),
        price: String(trip.pricePerKg),
      },
    });
  };

  const handleRepostParcel = (parcel: Parcel) => {
    router.push({
      pathname: '/create-parcel',
      params: {
        repost: '1',
        fromCity: parcel.fromCity,
        toCity: parcel.toCity,
        deliveryDate: parcel.deliveryDate ?? '',
        category: parcel.category,
        description: parcel.description,
        weight: String(parcel.weight),
        priceOffer: String(parcel.priceOffer),
      },
    });
  };

  const totalEarned = myRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  const listHeader = (activeTab === 'trips' ? myTrips.length > 0 : myParcels.length > 0)
    ? <EarningsSummary trips={myTrips} parcels={myParcels} requests={myRequests} C={C} />
    : null;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <LinearGradient colors={[C.primarySubtle, 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={() => { Haptic.tap(); router.back(); }}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Activity</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {myTrips.length} trips · {myParcels.length} parcels · Rs {totalEarned} earned
            </Text>
            <Text style={[styles.headerHint, { color: C.textMuted }]}>
              Unmatched posts auto-disable after {UNMATCHED_LISTING_EXPIRY_HOURS}h. Repost anytime.
            </Text>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.primaryDark }]}
            onPress={() => { Haptic.confirm(); router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel'); }}
            hitSlop={4}
          >
            <MaterialIcons name="add" size={18} color={C.textInverse} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          {(['trips', 'parcels'] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: C.primaryDark }]}
              onPress={() => switchTab(tab)}
            >
              <MaterialIcons
                name={tab === 'trips' ? 'directions-car' : 'inventory-2'}
                size={15}
                color={activeTab === tab ? C.textInverse : C.textMuted}
              />
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? C.textInverse : C.textMuted }]}> 
                {tab === 'trips' ? `Trips (${myTrips.length})` : `Parcels (${myParcels.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      {!isOnline ? <View style={styles.stateWrap}><OfflineBanner C={C} /></View> : null}

      {activityError ? (
        <View style={styles.stateWrap}>
          <AsyncStateCard
            C={C}
            icon="error-outline"
            title="Activity unavailable"
            message={activityError instanceof Error ? activityError.message : 'Could not load your activity.'}
            actionLabel="Try again"
            onAction={handleRefresh}
          />
        </View>
      ) : isInitialLoading ? (
        <View style={styles.stateWrap}>
          <AsyncStateCard C={C} icon="sync" title="Loading activity" message="Fetching your trips, parcels, and delivery requests." compact />
        </View>
      ) : activeTab === 'trips' ? (
        <ActivityTripsList
          trips={myTrips}
          requests={myRequests}
          onTripPress={(trip) => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
          onCancelTrip={handleCancelTrip}
          onDeleteTrip={handleDeleteTrip}
          onRepostTrip={handleRepostTrip}
          onEmptyCta={() => router.push('/create-trip')}
          refreshing={refreshing || tripsQuery.isRefetching || requestsQuery.isRefetching}
          onRefresh={handleRefresh}
          listHeader={listHeader}
          C={C}
        />
      ) : (
        <ActivityParcelsList
          parcels={myParcels}
          requests={myRequests}
          onParcelPress={(parcel) => router.push({ pathname: '/parcel/[id]', params: { id: parcel.id } })}
          onDeleteParcel={handleDeleteParcel}
          onRepostParcel={handleRepostParcel}
          onEmptyCta={() => router.push('/create-parcel')}
          refreshing={refreshing || parcelsQuery.isRefetching || requestsQuery.isRefetching}
          onRefresh={handleRefresh}
          listHeader={listHeader}
          C={C}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.md, overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  headerHint: { fontSize: 10, marginTop: 3 },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  tabBar: {
    flexDirection: 'row', gap: 4, padding: 4,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: BorderRadius.sm - 2,
  },
  tabBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  summaryCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summaryStats: { flexDirection: 'row', gap: Spacing.sm },
  summaryStat: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  summaryStatIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  summaryStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  summaryStatLabel: { fontSize: 9, fontWeight: FontWeight.medium, textAlign: 'center' },
});
