import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
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
  useUserTripsQuery,
  useParcelsQuery,
  flattenInfiniteData,
  useUpdateTripStatusMutation,
} from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Trip, Request } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { TravelerActiveTripCard } from '@/components/feature/trip/TravelerActiveTripCard';

export default function ActiveTripsDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();

  const userTripsQuery = useUserTripsQuery(user?.id);
  const requestsQuery = useRequestsQuery(user?.id);
  const allParcelsQuery = useParcelsQuery(true);
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);

  const trips = user ? (userTripsQuery.data ?? []) : [];
  const requests = user ? (requestsQuery.data ?? []) : [];
  const allParcels = useMemo(() => flattenInfiniteData(allParcelsQuery.data), [allParcelsQuery.data]);

  // 1. Filter for active trips only
  const activeTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'active');
  }, [trips]);

  // 2. Aggregate dashboard metrics for the traveler
  const dashboardStats = useMemo(() => {
    let totalCapacityKg = 0;
    let totalFilledKg = 0;
    let totalAcceptedParcels = 0;
    let totalEarnings = 0;

    activeTrips.forEach((trip) => {
      const cap = Number(trip.availableCapacity) || 0;
      totalCapacityKg += cap;

      const tripAcceptedRequests = requests.filter(
        (r) => r.tripId === trip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      totalAcceptedParcels += tripAcceptedRequests.length;

      tripAcceptedRequests.forEach((req) => {
        const parcelObj = allParcels.find((p) => p.id === req.parcelId);
        const weight = req.parcelWeight ?? parcelObj?.weight ?? 0;
        totalFilledKg += Number(weight);
        totalEarnings += Number(req.price || 0);
      });
    });

    const totalRemainingKg = Math.max(0, totalCapacityKg - totalFilledKg);
    const overallFillPercentage =
      totalCapacityKg > 0 ? Math.min(100, Math.round((totalFilledKg / totalCapacityKg) * 100)) : 0;

    return {
      totalCapacityKg,
      totalFilledKg,
      totalRemainingKg,
      totalAcceptedParcels,
      totalEarnings,
      overallFillPercentage,
    };
  }, [activeTrips, requests, allParcels]);

  const isLoading = userTripsQuery.isLoading || requestsQuery.isLoading || allParcelsQuery.isLoading;
  const hasError = userTripsQuery.error || requestsQuery.error;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        userTripsQuery.refetch(),
        requestsQuery.refetch(),
        allParcelsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Phase 5 Transition Handler
  const handleUpdateStatus = (trip: Trip, acceptedRequests: Request[]) => {
    if (acceptedRequests.length === 1) {
      // Direct 1-tap transition to Phase 5 (Escrow/Delivery tracking)
      router.push({
        pathname: '/delivery/[id]',
        params: { id: acceptedRequests[0].id },
      });
    } else if (acceptedRequests.length > 1) {
      // When multiple parcels are accepted for this journey, provide selection sheet
      showAlert(
        'Select Shipment to Update Journey',
        `You have ${acceptedRequests.length} accepted parcels on this trip (${trip.fromCity} ➔ ${trip.toCity}). Choose which shipment journey to track or update:`,
        [
          ...acceptedRequests.slice(0, 4).map((req, idx) => ({
            text: `${idx + 1}. ${req.senderName || 'Sender'} (₹${req.price})`,
            onPress: () =>
              router.push({
                pathname: '/delivery/[id]',
                params: { id: req.id },
              }),
          })),
          {
            text: 'Manage Trip Details',
            onPress: () => router.push({ pathname: '/trip/[id]', params: { id: trip.id } }),
          },
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    } else {
      // If no parcels have been accepted yet for this active trip
      showAlert(
        'No Parcels Accepted Yet',
        `Your trip from ${trip.fromCity} to ${trip.toCity} has ${trip.availableCapacity} kg capacity ready. Find and accept parcels to start delivery tracking.`,
        [
          {
            text: 'Find Parcels to Carry',
            onPress: () =>
              router.push({
                pathname: '/search',
                params: {
                  fromCity: trip.fromCity,
                  toCity: trip.toCity,
                  mode: 'parcels',
                },
              }),
          },
          {
            text: 'View Trip Details',
            onPress: () => router.push({ pathname: '/trip/[id]', params: { id: trip.id } }),
          },
          { text: 'Dismiss', style: 'cancel' as const },
        ]
      );
    }
  };

  const handleFindParcels = (trip: Trip) => {
    router.push({
      pathname: '/search',
      params: {
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        mode: 'parcels',
      },
    });
  };

  const handleChatWithSender = (req: Request) => {
    router.push(`/chat/${encodeURIComponent(String(req.id))}` as never);
  };

  const handleCancelTrip = (trip: Trip) => {
    showAlert(
      'Cancel Trip?',
      `Are you sure you want to cancel your trip from ${trip.fromCity} to ${trip.toCity}? Any pending requests will be rejected.`,
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' });
              Haptic.success();
            } catch (error) {
              Haptic.error();
              showAlert(
                'Trip Not Cancelled',
                getUserErrorMessage(error, 'Could not cancel trip. Please try again.')
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Navigation Header matching index.styles.ts */}
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + 8,
            backgroundColor: C.surface,
            borderBottomColor: C.surfaceBorder,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.08)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
            onPress={() => {
              Haptic.tap();
              router.back();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Active Trips</Text>
            <Text style={[styles.headerSubtitle, { color: C.textMuted }]}>
              Traveler Dashboard • {activeTrips.length} active {activeTrips.length === 1 ? 'trip' : 'trips'}
            </Text>
          </View>

          {/* Action Button: Post Trip strictly in #10B981 */}
          <Pressable
            style={[styles.postTripBtn, { backgroundColor: '#10B981' }]}
            onPress={() => {
              Haptic.confirm();
              router.push('/create-trip');
            }}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Post a Trip"
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.postTripBtnText}>Post Trip</Text>
          </Pressable>
        </View>
      </View>

      {!isOnline ? (
        <View style={styles.bannerWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
        }
      >
        {/* Bento Stats Row strictly matching index.styles.ts */}
        <View style={styles.statsBentoGrid}>
          <View
            style={[
              styles.bentoStatCard,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
          >
            <View style={[styles.bentoIconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="directions-car" size={16} color="#10B981" />
            </View>
            <Text style={[styles.bentoStatVal, { color: C.textPrimary }]}>
              {activeTrips.length}
            </Text>
            <Text style={[styles.bentoStatLabel, { color: C.textMuted }]}>ACTIVE TRIPS</Text>
          </View>

          <View
            style={[
              styles.bentoStatCard,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
          >
            <View style={[styles.bentoIconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="fitness-center" size={16} color="#10B981" />
            </View>
            <Text style={[styles.bentoStatVal, { color: '#064E3B' }]}>
              {dashboardStats.totalFilledKg.toFixed(1)} kg
            </Text>
            <Text style={[styles.bentoStatLabel, { color: C.textMuted }]}>CAPACITY FILLED</Text>
          </View>

          <View
            style={[
              styles.bentoStatCard,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
          >
            <View style={[styles.bentoIconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="inventory-2" size={16} color="#10B981" />
            </View>
            <Text style={[styles.bentoStatVal, { color: C.textPrimary }]}>
              {dashboardStats.totalAcceptedParcels}
            </Text>
            <Text style={[styles.bentoStatLabel, { color: C.textMuted }]}>PARCELS</Text>
          </View>

          <View
            style={[
              styles.bentoStatCard,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
          >
            <View style={[styles.bentoIconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="payments" size={16} color="#10B981" />
            </View>
            <Text style={[styles.bentoStatVal, { color: '#064E3B' }]}>
              ₹{dashboardStats.totalEarnings}
            </Text>
            <Text style={[styles.bentoStatLabel, { color: C.textMuted }]}>EARNINGS</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>
            Live Trips & Route Capacity
          </Text>
          <Text style={[styles.sectionSub, { color: C.textMuted }]}>
            {dashboardStats.totalRemainingKg.toFixed(1)} kg available space
          </Text>
        </View>

        {/* Error / Loading / Content */}
        {hasError ? (
          <AsyncStateCard
            C={C}
            icon="error-outline"
            title="Trips unavailable"
            message={
              hasError instanceof Error ? hasError.message : 'Could not load your active trips.'
            }
            actionLabel="Try again"
            onAction={handleRefresh}
          />
        ) : isLoading && activeTrips.length === 0 ? (
          <AsyncStateCard
            C={C}
            icon="sync"
            title="Loading Dashboard"
            message="Calculating capacity and fetching your accepted parcels..."
            compact
          />
        ) : activeTrips.length === 0 ? (
          /* Empty Active Trips Card strictly matching index.styles.ts */
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="directions-car" size={38} color="#10B981" />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Active Trips</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              You don&apos;t have any active travel routes posted right now. Post your upcoming journey to
              carry parcels and earn along the way.
            </Text>

            <Pressable
              style={[styles.emptyCtaBtn, { backgroundColor: '#10B981' }]}
              onPress={() => {
                Haptic.confirm();
                router.push('/create-trip');
              }}
              accessibilityRole="button"
              accessibilityLabel="Post a Trip"
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Post a Trip</Text>
            </Pressable>
          </View>
        ) : (
          /* Feed of Active Trips rendered with TravelerActiveTripCard */
          <View style={styles.tripsFeed}>
            {activeTrips.map((trip) => (
              <TravelerActiveTripCard
                key={trip.id}
                trip={trip}
                requests={requests}
                parcels={allParcels}
                onPress={() =>
                  router.push({
                    pathname: '/trip/[id]',
                    params: { id: trip.id },
                  })
                }
                onUpdateStatus={handleUpdateStatus}
                onFindParcels={handleFindParcels}
                onChatWithSender={handleChatWithSender}
                onCancelTrip={handleCancelTrip}
                testID={`active-trip-${trip.id}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  postTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  postTripBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  bannerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  scrollBody: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Bento Stats Grid strictly matching index.styles.ts
  statsBentoGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bentoStatCard: {
    flex: 1,
    borderRadius: BorderRadius.xl, // 24
    paddingVertical: Spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bentoIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bentoStatVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  bentoStatLabel: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sectionHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  tripsFeed: {
    gap: Spacing.xs,
  },

  // Empty State Card strictly matching index.styles.ts
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
});
