import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Animated, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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

type Tab = 'trips' | 'parcels';

const VEHICLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler', car: 'directions-car', bus: 'directions-bus',
  train: 'train', flight: 'flight',
};
const VEHICLE_COLORS: Record<string, string> = {
  bike: '#F59E0B', car: '#22C55E', bus: '#8B5CF6', train: '#06B6D4', flight: '#7C3AED',
};
const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description', electronics: 'devices', clothing: 'checkroom',
  food: 'restaurant', medicine: 'local-pharmacy', other: 'inventory-2',
};
const CATEGORY_COLORS: Record<string, string> = {
  documents: '#8B5CF6', electronics: '#06B6D4', clothing: '#F59E0B',
  food: '#22C55E', medicine: '#EF4444', other: '#7C3AED',
};

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
    { label: 'Earned', value: `₹${totalEarned}`, icon: 'account-balance-wallet' as const, color: '#22C55E' },
    { label: 'Active trips', value: String(activeTrips), icon: 'directions-car' as const, color: C.primary },
    { label: 'Open parcels', value: String(openParcels), icon: 'inventory-2' as const, color: '#F59E0B' },
    { label: 'In transit', value: String(inTransit), icon: 'local-shipping' as const, color: '#06B6D4' },
  ];

  return (
    <View style={[styles.summaryCard, { borderColor: C.surfaceBorder }]}>
      <LinearGradient
        colors={[C.primary + '18', C.primary + '05']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIconBox, { backgroundColor: C.primary + '20' }]}>
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

// ── Trip row ────────────────────────────────────────────────────────────────
function TripRow({ trip, requests, onPress, onCancel, onDelete, C }: {
  trip: Trip;
  requests: Request[];
  onPress: () => void;
  onCancel: () => void;
  onDelete: () => void;
  C: ThemeColors;
}) {
  const vColor = VEHICLE_COLORS[trip.vehicleType] || C.primary;
  const tripRequests = requests.filter(r => r.tripId === trip.id);
  const accepted = tripRequests.filter(r => r.status === 'accepted').length;
  const completed = tripRequests.filter(r => r.status === 'completed').length;
  const earned = tripRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);
  const scale = useRef(new Animated.Value(1)).current;

  const statusConfig = {
    active: { label: 'Active', color: C.success, bg: C.successSubtle, icon: 'check-circle' as const },
    completed: { label: 'Completed', color: C.info, bg: C.infoSubtle, icon: 'verified' as const },
    cancelled: { label: 'Cancelled', color: C.error, bg: C.errorSubtle, icon: 'cancel' as const },
  };
  const sc = statusConfig[trip.status] || statusConfig.active;

  return (
    <Animated.View style={[styles.row, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
      {/* Left accent */}
      <View style={[styles.rowAccent, { backgroundColor: vColor }]} />

      <Pressable
        style={styles.rowInner}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start()}
      >
        {/* Top row */}
        <View style={styles.rowTop}>
          <View style={[styles.rowIconBox, { backgroundColor: vColor + '18' }]}>
            <MaterialIcons name={VEHICLE_ICONS[trip.vehicleType] || 'directions-car'} size={18} color={vColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowRoute, { color: C.textPrimary }]}>
              {trip.fromCity} → {trip.toCity}
            </Text>
            <Text style={[styles.rowMeta, { color: C.textSecondary }]}>
              {trip.date} · {trip.time} · {trip.availableCapacity}kg · ₹{trip.pricePerKg}/kg
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <MaterialIcons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.rowStatsBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          {[
            { label: 'Requests', value: String(tripRequests.length), icon: 'swap-horiz' as const, color: C.textSecondary },
            { label: 'Accepted', value: String(accepted), icon: 'check-circle' as const, color: C.success },
            { label: 'Done', value: String(completed), icon: 'verified' as const, color: C.info },
            { label: 'Earned', value: `₹${earned}`, icon: 'payments' as const, color: C.primary },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} /> : null}
              <View style={styles.rowStat}>
                <MaterialIcons name={s.icon} size={11} color={s.color} />
                <Text style={[styles.rowStatVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.rowStatLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Actions */}
        {trip.status === 'active' ? (
          <View style={styles.rowActions}>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.tap(); onPress(); }}
            >
              <MaterialIcons name="open-in-new" size={13} color={C.primary} />
              <Text style={[styles.rowActionText, { color: C.primary }]}>View</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onCancel(); }}
            >
              <MaterialIcons name="block" size={13} color={C.warning} />
              <Text style={[styles.rowActionText, { color: C.warning }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onDelete(); }}
            >
              <MaterialIcons name="delete-outline" size={13} color={C.error} />
              <Text style={[styles.rowActionText, { color: C.error }]}>Delete</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.rowActions}>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.tap(); onPress(); }}
            >
              <MaterialIcons name="open-in-new" size={13} color={C.textSecondary} />
              <Text style={[styles.rowActionText, { color: C.textSecondary }]}>Details</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Parcel row ───────────────────────────────────────────────────────────────
function ParcelRow({ parcel, requests, onPress, onDelete, C }: {
  parcel: Parcel;
  requests: Request[];
  onPress: () => void;
  onDelete: () => void;
  C: ThemeColors;
}) {
  const catColor = CATEGORY_COLORS[parcel.category] || C.primary;
  const parcelRequests = requests.filter(r => r.parcelId === parcel.id);
  const pending = parcelRequests.filter(r => r.status === 'pending').length;
  const accepted = parcelRequests.filter(r => r.status === 'accepted').length;
  const scale = useRef(new Animated.Value(1)).current;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    open:       { label: 'Open',       color: C.success, bg: C.successSubtle,   icon: 'check-circle' },
    matched:    { label: 'Matched',    color: C.primary, bg: C.primarySubtle,    icon: 'handshake' },
    in_transit: { label: 'In Transit', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)', icon: 'local-shipping' },
    delivered:  { label: 'Delivered',  color: C.info,    bg: C.infoSubtle,       icon: 'verified' },
    failed:     { label: 'Failed',     color: C.error,   bg: C.errorSubtle,      icon: 'error' },
  };
  const sc = statusConfig[parcel.status] || statusConfig.open;

  return (
    <Animated.View style={[styles.row, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
      <View style={[styles.rowAccent, { backgroundColor: catColor }]} />

      <Pressable
        style={styles.rowInner}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start()}
      >
        {/* Top row */}
        <View style={styles.rowTop}>
          <View style={[styles.rowIconBox, { backgroundColor: catColor + '18' }]}>
            <MaterialIcons name={CATEGORY_ICONS[parcel.category] || 'inventory-2'} size={18} color={catColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowRoute, { color: C.textPrimary }]}>
              {parcel.fromCity} → {parcel.toCity}
            </Text>
            <Text style={[styles.rowMeta, { color: C.textSecondary }]} numberOfLines={1}>
              {parcel.description} · {parcel.weight}kg · ₹{parcel.priceOffer}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <MaterialIcons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Category + stats row */}
        <View style={[styles.rowStatsBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={[styles.catChip, { backgroundColor: catColor + '15', borderColor: catColor + '40' }]}>
            <Text style={[styles.catChipText, { color: catColor }]}>
              {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
            </Text>
          </View>
          <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
          {[
            { label: 'Requests', value: String(parcelRequests.length), color: C.textSecondary },
            { label: 'Pending', value: String(pending), color: C.warning },
            { label: 'Accepted', value: String(accepted), color: C.success },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} /> : null}
              <View style={styles.rowStat}>
                <Text style={[styles.rowStatVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.rowStatLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.rowActions}>
          <Pressable
            style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
            onPress={() => { Haptic.tap(); onPress(); }}
          >
            <MaterialIcons name="open-in-new" size={13} color={C.primary} />
            <Text style={[styles.rowActionText, { color: C.primary }]}>View</Text>
          </Pressable>
          {parcel.status === 'open' ? (
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onDelete(); }}
            >
              <MaterialIcons name="delete-outline" size={13} color={C.error} />
              <Text style={[styles.rowActionText, { color: C.error }]}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyActivity({ tab, onCta, C }: { tab: Tab; onCta: () => void; C: ThemeColors }) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[styles.emptyIcon, { backgroundColor: C.primarySubtle, transform: [{ scale: bounceAnim }] }]}>
        <MaterialIcons
          name={tab === 'trips' ? 'directions-car' : 'inventory-2'}
          size={36} color={C.primary}
        />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
        No {tab === 'trips' ? 'trips' : 'parcels'} yet
      </Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        {tab === 'trips'
          ? 'Post your first trip to start carrying parcels and earning.'
          : 'List your first parcel to find travellers on your route.'}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyCta, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
        onPress={() => { Haptic.confirm(); onCta(); }}
      >
        <MaterialIcons name={tab === 'trips' ? 'add' : 'send'} size={15} color="#fff" />
        <Text style={styles.emptyCtaText}>
          {tab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}
        </Text>
      </Pressable>
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
  const updateTripStatusMutation = useUpdateTripStatusMutation();
  const updateParcelStatusMutation = useUpdateParcelStatusMutation();
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
      await Promise.all([
        tripsQuery.refetch(),
        parcelsQuery.refetch(),
        requestsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const retryActivity = () => {
    void handleRefresh();
  };

  const switchTab = (tab: Tab) => {
    Haptic.select();
    Animated.spring(tabAnim, {
      toValue: tab === 'trips' ? 0 : 1,
      tension: 220, friction: 20, useNativeDriver: true,
    }).start();
    setActiveTab(tab);
  };

  const handleCancelTrip = (trip: Trip) => {
    showAlert(
      'Cancel Trip?',
      `Cancel your trip from ${trip.fromCity} to ${trip.toCity}? Pending requests will be rejected.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Trip', style: 'destructive', onPress: async () => {
            try {
              await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' });
              Haptic.success();
            } catch (error) {
              Haptic.error();
              showAlert('Trip Not Cancelled', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTrip = (trip: Trip) => {
    showAlert(
      'Delete Trip?',
      'This will permanently remove your trip listing. This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' });
              Haptic.success();
            } catch (error) {
              Haptic.error();
              showAlert('Trip Not Removed', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteParcel = (parcel: Parcel) => {
    showAlert(
      'Remove Parcel?',
      'This will remove your parcel listing. Travellers will no longer see it.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try {
              await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'failed' });
              Haptic.success();
            } catch (error) {
              Haptic.error();
              showAlert('Parcel Not Removed', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  // Earnings for header
  const totalEarned = myRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <LinearGradient
          colors={[C.primary + '12', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
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
              {myTrips.length} trips · {myParcels.length} parcels · ₹{totalEarned} earned
            </Text>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.primary }]}
            onPress={() => {
              Haptic.confirm();
              router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel');
            }}
            hitSlop={4}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          {(['trips', 'parcels'] as Tab[]).map((tab, i) => (
            <Pressable
              key={tab}
              style={[
                styles.tabBtn,
                activeTab === tab && { backgroundColor: C.primary },
              ]}
              onPress={() => switchTab(tab)}
            >
              <MaterialIcons
                name={tab === 'trips' ? 'directions-car' : 'inventory-2'}
                size={15}
                color={activeTab === tab ? '#fff' : C.textMuted}
              />
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? '#fff' : C.textMuted }]}>
                {tab === 'trips' ? `Trips (${myTrips.length})` : `Parcels (${myParcels.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      {!isOnline ? (
        <View style={styles.stateWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {activityError ? (
        <View style={styles.stateWrap}>
          <AsyncStateCard
            C={C}
            icon="error-outline"
            title="Activity unavailable"
            message={activityError instanceof Error ? activityError.message : 'Could not load your activity.'}
            actionLabel="Try again"
            onAction={retryActivity}
          />
        </View>
      ) : isInitialLoading ? (
        <View style={styles.stateWrap}>
          <AsyncStateCard
            C={C}
            icon="sync"
            title="Loading activity"
            message="Fetching your trips, parcels, and delivery requests."
            compact
          />
        </View>
      ) : activeTab === 'trips' ? (
        <FlashList
          data={myTrips}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ marginBottom: Spacing.sm }}>
              <TripRow
                trip={item}
                requests={myRequests}
                onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
                onCancel={() => handleCancelTrip(item)}
                onDelete={() => handleDeleteTrip(item)}
                C={C}
              />
            </View>
          )}
          ListHeaderComponent={
            myTrips.length > 0 ? (
              <EarningsSummary trips={myTrips} parcels={myParcels} requests={myRequests} C={C} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyActivity
              tab="trips"
              onCta={() => router.push('/create-trip')}
              C={C}
            />
          }
          contentContainerStyle={styles.list as any}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || tripsQuery.isRefetching || requestsQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
        />
      ) : (
        <FlashList
          data={myParcels}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ marginBottom: Spacing.sm }}>
              <ParcelRow
                parcel={item}
                requests={myRequests}
                onPress={() => router.push({ pathname: '/parcel/[id]', params: { id: item.id } })}
                onDelete={() => handleDeleteParcel(item)}
                C={C}
              />
            </View>
          )}
          ListHeaderComponent={
            myParcels.length > 0 ? (
              <EarningsSummary trips={myTrips} parcels={myParcels} requests={myRequests} C={C} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyActivity
              tab="parcels"
              onCta={() => router.push('/create-parcel')}
              C={C}
            />
          }
          contentContainerStyle={styles.list as any}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || parcelsQuery.isRefetching || requestsQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.md, overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', gap: 4, padding: 4,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: BorderRadius.sm - 2,
  },
  tabBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // List
  list: { padding: Spacing.md, gap: Spacing.sm },
  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  // Summary card
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

  // Row card
  row: {
    borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row',
  },
  rowAccent: { width: 4 },
  rowInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  rowIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowRoute: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  rowMeta: { fontSize: FontSize.xs, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, flexShrink: 0,
  },
  statusPillText: { fontSize: 10, fontWeight: FontWeight.bold },

  // Stats bar inside row
  rowStatsBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.sm,
    borderWidth: 1, padding: Spacing.sm, gap: 0,
  },
  rowStat: { flex: 1, alignItems: 'center', gap: 2 },
  rowStatVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  rowStatLabel: { fontSize: 9, fontWeight: FontWeight.medium },
  statDiv: { width: 1, height: 22, marginHorizontal: 2 },

  catChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, flexShrink: 0,
  },
  catChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Row actions
  rowActions: { flexDirection: 'row', gap: Spacing.sm },
  rowActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    justifyContent: 'center', paddingVertical: Spacing.sm + 1,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  rowActionText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Empty
  emptyWrap: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  emptyCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
