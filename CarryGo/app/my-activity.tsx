import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useAlert } from '@/template';
import { AsyncStateCard, OfflineBanner, RequestCard, RequestDetailModal, RatingModal } from '@/components';
import {
  useUpdateParcelStatusMutation,
  useUpdateTripStatusMutation,
  useUserParcelsQuery,
  useUserTripsQuery,
  useParcelsQuery,
  useParcelsByIdsQuery,
  flattenInfiniteData,
} from '@/features/listings/queries';
import {
  useRequestsQuery,
  useUpdateRequestStatusMutation,
  useUserRatedRequestIdsQuery,
} from '@/features/requests/queries';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { createDelivery } from '@/services/deliveries.service';
import { isRequestIncoming, isRequestOutgoing } from '@/services/requests.service';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, TouchTarget } from '@/constants/theme';
import { Trip, Parcel, Request } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { ActivityTripsList } from '@/components/feature/ActivityTripsList';
import { ActivityParcelsList } from '@/components/feature/ActivityParcelsList';
import { UNMATCHED_LISTING_EXPIRY_HOURS } from '@/constants/listingFlow';

export type ActivityTab =
  | 'incoming'
  | 'sent'
  | 'active'
  | 'history'
  | 'trips'
  | 'parcels';

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
    { label: 'Earned', value: `₹${totalEarned}`, icon: 'account-balance-wallet' as const, color: C.success },
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
        <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>Activity Overview</Text>
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

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function MyActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const { isTablet } = useResponsive();

  const userTripsQuery = useUserTripsQuery(user?.id);
  const userParcelsQuery = useUserParcelsQuery(user?.id);
  const requestsQuery = useRequestsQuery(user?.id);
  const ratedRequestIdsQuery = useUserRatedRequestIdsQuery(user?.id);
  const ratedRequestIds = useMemo(() => new Set(ratedRequestIdsQuery.data ?? []), [ratedRequestIdsQuery.data]);
  const conversationsQuery = useConversationsQuery(user?.id);
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);
  const updateRequestStatusMutation = useUpdateRequestStatusMutation(user?.id);
  const createConversationMutation = useCreateConversationMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);
  const [ratingTarget, setRatingTarget] = useState<Request | null>(null);

  const myTrips = user ? (userTripsQuery.data ?? []) : [];
  const myParcels = user ? (userParcelsQuery.data ?? []) : [];
  const rawRequests = user ? requestsQuery.data ?? [] : [];
  const conversations = user ? conversationsQuery.data ?? [] : [];
  const marketplaceParcels = user ? flattenInfiniteData(parcelsQuery.data) : [];

  const requestedParcelIds = useMemo(() => {
    return Array.from(new Set(rawRequests.map(r => r.parcelId).filter(Boolean)));
  }, [rawRequests]);

  const requestedParcelsQuery = useParcelsByIdsQuery(requestedParcelIds);
  const requestedParcels = requestedParcelsQuery.data ?? [];

  const parcelMap = useMemo(() => {
    const map = new Map<string, typeof marketplaceParcels[0]>();
    marketplaceParcels.forEach(p => map.set(p.id, p));
    requestedParcels.forEach(p => map.set(p.id, p));
    return map;
  }, [marketplaceParcels, requestedParcels]);

  // Enrich requests with parcel metadata
  const requests = useMemo(() => {
    return rawRequests.map(req => {
      const p = parcelMap.get(req.parcelId);
      return {
        ...req,
        fromCity: req.fromCity || p?.fromCity,
        toCity: req.toCity || p?.toCity,
        parcelCategory: req.parcelCategory || p?.category,
        parcelWeight: req.parcelWeight || p?.weight,
      };
    });
  }, [rawRequests, parcelMap]);

  // Role segregation
  const userRole = user?.role || 'both';

  // 1. Incoming Requests (Traveler reviews incoming requests)
  const incomingRequests = useMemo(() => {
    return requests.filter(r => isRequestIncoming(r, user?.id) && r.status === 'pending');
  }, [requests, user?.id]);

  // 2. Sent Requests (Sender reviews sent requests awaiting response)
  const sentRequests = useMemo(() => {
    return requests.filter(r => isRequestOutgoing(r, user?.id) && r.status === 'pending');
  }, [requests, user?.id]);

  // 3. Active Bookings (In-transit / accepted)
  const activeBookings = useMemo(() => {
    return requests.filter(r => r.status === 'accepted');
  }, [requests]);

  // 4. History (Completed, rejected, cancelled, expired)
  const historyRequests = useMemo(() => {
    return requests.filter(r =>
      r.status === 'completed' ||
      r.status === 'rejected' ||
      r.status === 'cancelled' ||
      r.status === 'failed'
    );
  }, [requests]);

  // Dynamic tabs according to user role
  const availableTabs = useMemo(() => {
    const tabs: { key: ActivityTab; label: string; icon: keyof typeof MaterialIcons.glyphMap; count?: number }[] = [];

    if (userRole === 'traveller' || userRole === 'both') {
      tabs.push({ key: 'incoming', label: 'Incoming', icon: 'move-to-inbox', count: incomingRequests.length });
      tabs.push({ key: 'trips', label: 'My Trips', icon: 'directions-car', count: myTrips.length });
    }

    if (userRole === 'sender' || userRole === 'both') {
      tabs.push({ key: 'sent', label: 'Sent', icon: 'outbox', count: sentRequests.length });
      tabs.push({ key: 'parcels', label: 'My Parcels', icon: 'inventory-2', count: myParcels.length });
    }

    tabs.push({ key: 'active', label: 'Active', icon: 'local-shipping', count: activeBookings.length });
    tabs.push({ key: 'history', label: 'History', icon: 'history', count: historyRequests.length });

    return tabs;
  }, [userRole, incomingRequests.length, myTrips.length, sentRequests.length, myParcels.length, activeBookings.length, historyRequests.length]);

  const [activeTab, setActiveTab] = useState<ActivityTab>(() => {
    if (userRole === 'traveller') return 'incoming';
    if (userRole === 'sender') return 'sent';
    return 'incoming';
  });

  const isInitialLoading = userTripsQuery.isLoading || userParcelsQuery.isLoading || requestsQuery.isLoading;
  const activityError = userTripsQuery.error || userParcelsQuery.error || requestsQuery.error;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        userTripsQuery.refetch(),
        userParcelsQuery.refetch(),
        requestsQuery.refetch(),
        ratedRequestIdsQuery.refetch(),
        conversationsQuery.refetch(),
        requestedParcelIds.length > 0 ? requestedParcelsQuery.refetch() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const switchTab = (tab: ActivityTab) => {
    Haptic.select();
    setActiveTab(tab);
  };

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleAccept = (requestId: string, req: Request) => {
    const isIncoming = isRequestIncoming(req, user?.id);
    if (!user || !isIncoming) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the intended traveler recipient can accept this request.');
      return;
    }

    const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;
    const otherUserId = req.senderId === user.id ? req.travellerId : req.senderId;

    Haptic.warning();
    showAlert('Accept Request?', `Accept delivery request from ${otherUserName} for ₹${req.price}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          if (!user) return;
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'accepted' });
            let convId: string | null = null;
            try {
              const parcel = parcelMap.get(req.parcelId);
              const route = parcel ? `${parcel.fromCity} to ${parcel.toCity}` : `${req.fromCity || 'Pickup'} to ${req.toCity || 'Drop'}`;
              const existing = conversations.find(c => c.requestId === requestId);
              if (!existing) {
                const newConv = await createConversationMutation.mutateAsync({
                  requestId,
                  participantIds: [user.id, otherUserId],
                  participantNames: { [user.id]: user.name || 'You', [otherUserId]: otherUserName },
                  parcelDescription: parcel?.description || 'Parcel delivery',
                  route,
                });
                convId = newConv?.id || null;
              } else {
                convId = existing.id;
              }
              await createDelivery(requestId);
            } catch (auxError) {
              console.warn('Post-accept auxiliary step error (non-fatal):', auxError);
            }
            await requestsQuery.refetch();
            Haptic.success();
            showAlert(
              'Request Accepted! 📦',
              `Delivery matched with ${otherUserName}. Open chat to coordinate pickup point and time.`,
              [
                { text: 'Done', style: 'cancel' },
                {
                  text: 'Open Chat',
                  onPress: () => {
                    if (convId) {
                      router.push(`/chat/${encodeURIComponent(String(convId))}` as never);
                    }
                  },
                },
              ]
            );
          } catch (error) {
            Haptic.error();
            showAlert('Could Not Accept', getUserErrorMessage(error, 'The request could not be accepted.'));
          }
        },
      },
    ]);
  };

  const handleReject = (requestId: string, req: Request) => {
    const isIncoming = isRequestIncoming(req, user?.id);
    if (!user || !isIncoming) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the intended traveler recipient can decline this request.');
      return;
    }

    const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;
    Haptic.warning();
    showAlert('Decline Request?', `Decline delivery request from ${otherUserName}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'rejected' });
            await requestsQuery.refetch();
            Haptic.confirm();
          } catch (error) {
            Haptic.error();
            showAlert('Could Not Decline', getUserErrorMessage(error, 'Failed to decline request.'));
          }
        },
      },
    ]);
  };

  const handleCancel = (requestId: string, req: Request) => {
    const isSender = req.senderId === user?.id;
    if (!isSender && req.travellerId !== user?.id) return;

    showAlert('Cancel Request?', 'Are you sure you want to withdraw this request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'cancelled' });
            await requestsQuery.refetch();
            Haptic.success();
          } catch (error) {
            Haptic.error();
            showAlert('Could Not Cancel', getUserErrorMessage(error, 'Failed to cancel request.'));
          }
        },
      },
    ]);
  };

  const handleChat = async (req: Request) => {
    if (!user) return;
    const otherUserId = req.senderId === user.id ? req.travellerId : req.senderId;
    const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;
    const existing = conversations.find(c => c.requestId === req.id);
    if (existing) {
      router.push(`/chat/${encodeURIComponent(String(existing.id))}` as never);
      return;
    }
    try {
      const parcel = parcelMap.get(req.parcelId);
      const route = parcel ? `${parcel.fromCity} to ${parcel.toCity}` : `${req.fromCity || 'Pickup'} to ${req.toCity || 'Drop'}`;
      const newConv = await createConversationMutation.mutateAsync({
        requestId: req.id,
        participantIds: [user.id, otherUserId],
        participantNames: { [user.id]: user.name || 'You', [otherUserId]: otherUserName },
        parcelDescription: parcel?.description || 'Parcel delivery',
        route,
      });
      if (newConv?.id) {
        router.push(`/chat/${encodeURIComponent(String(newConv.id))}` as never);
      }
    } catch (err) {
      showAlert('Error', 'Could not open chat.');
    }
  };

  const handleCancelTrip = (trip: Trip) => {
    showAlert('Cancel Trip?', `Cancel your trip from ${trip.fromCity} to ${trip.toCity}? Pending requests will be rejected.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Trip', style: 'destructive', onPress: async () => {
        try { await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Trip Not Cancelled', getUserErrorMessage(error, 'Could not cancel trip.')); }
      }},
    ]);
  };

  const handleDeleteTrip = (trip: Trip) => {
    showAlert('Delete Trip?', 'This will permanently remove your trip listing.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Trip Not Removed', getUserErrorMessage(error, 'Could not remove trip.')); }
      }},
    ]);
  };

  const handleDeleteParcel = (parcel: Parcel) => {
    showAlert('Remove Parcel?', 'This will remove your parcel listing from marketplace.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'failed' }); Haptic.success(); }
        catch (error) { Haptic.error(); showAlert('Parcel Not Removed', getUserErrorMessage(error, 'Could not remove parcel.')); }
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

  // Determine request list to display
  const currentRequestsList = useMemo(() => {
    if (activeTab === 'incoming') return incomingRequests;
    if (activeTab === 'sent') return sentRequests;
    if (activeTab === 'active') return activeBookings;
    if (activeTab === 'history') return historyRequests;
    return [];
  }, [activeTab, incomingRequests, sentRequests, activeBookings, historyRequests]);

  const listHeader = (myTrips.length > 0 || myParcels.length > 0)
    ? <EarningsSummary trips={myTrips} parcels={myParcels} requests={requests} C={C} />
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
            hitSlop={TouchTarget.smallHitSlop}
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Activity</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {incomingRequests.length > 0 ? `${incomingRequests.length} incoming · ` : ''}
              {myTrips.length} trips · {myParcels.length} parcels
            </Text>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.primary }]}
            onPress={() => {
              Haptic.confirm();
              router.push(activeTab === 'trips' ? '/create-trip' : '/create-parcel');
            }}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityLabel="Create listing"
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Dynamic Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollWrap}
        >
          {availableTabs.map((t) => {
            const isSelected = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isSelected ? C.primary : C.surfaceElevated,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
                  },
                ]}
                onPress={() => switchTab(t.key)}
              >
                <MaterialIcons
                  name={t.icon}
                  size={15}
                  color={isSelected ? '#FFFFFF' : C.textMuted}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isSelected ? '#FFFFFF' : C.textPrimary },
                    isSelected && styles.tabPillTextActive,
                  ]}
                >
                  {t.label}
                </Text>
                {t.count !== undefined && t.count > 0 ? (
                  <View
                    style={[
                      styles.tabCountBadge,
                      { backgroundColor: isSelected ? '#FFFFFF' : (t.key === 'incoming' ? C.error : C.primarySubtle) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        { color: isSelected ? C.primary : (t.key === 'incoming' ? '#FFFFFF' : C.primary) },
                      ]}
                    >
                      {t.count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
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
          requests={requests}
          onTripPress={(trip) => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
          onCancelTrip={handleCancelTrip}
          onDeleteTrip={handleDeleteTrip}
          onRepostTrip={handleRepostTrip}
          onEmptyCta={() => router.push('/create-trip')}
          refreshing={refreshing || userTripsQuery.isRefetching || requestsQuery.isRefetching}
          onRefresh={handleRefresh}
          listHeader={listHeader}
          C={C}
        />
      ) : activeTab === 'parcels' ? (
        <ActivityParcelsList
          parcels={myParcels}
          requests={requests}
          onParcelPress={(parcel) => router.push({ pathname: '/parcel/[id]', params: { id: parcel.id } })}
          onDeleteParcel={handleDeleteParcel}
          onRepostParcel={handleRepostParcel}
          onEmptyCta={() => router.push('/create-parcel')}
          refreshing={refreshing || userParcelsQuery.isRefetching || requestsQuery.isRefetching}
          onRefresh={handleRefresh}
          listHeader={listHeader}
          C={C}
        />
      ) : (
        <View style={[{ flex: 1 }, isTablet && styles.tabletContainer]}>
          <FlashList
            data={currentRequestsList}
            keyExtractor={(item) => item.id}
            estimatedItemSize={210}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons
                  name={activeTab === 'incoming' ? 'move-to-inbox' : activeTab === 'sent' ? 'outbox' : activeTab === 'active' ? 'local-shipping' : 'history'}
                  size={32}
                  color={C.textMuted}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                {activeTab === 'incoming'
                  ? 'No Incoming Requests'
                  : activeTab === 'sent'
                  ? 'No Sent Requests'
                  : activeTab === 'active'
                  ? 'No Active Deliveries'
                  : 'No History Yet'}
              </Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>
                {activeTab === 'incoming'
                  ? 'When senders choose your trip to carry their parcel, requests will appear here for you to accept or reject.'
                  : activeTab === 'sent'
                  ? 'Requests you send to travelers for parcel delivery will appear here awaiting their response.'
                  : activeTab === 'active'
                  ? 'Accepted deliveries in progress and tracking appear here.'
                  : 'Completed, rejected, or expired deliveries will be archived here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              type={isRequestIncoming(item, user?.id) ? 'incoming' : 'outgoing'}
              currentUserId={user?.id}
              onPress={() => setDetailRequest(item)}
              onAccept={() => handleAccept(item.id, item)}
              onReject={() => handleReject(item.id, item)}
              onCancel={() => handleCancel(item.id, item)}
              onChat={() => handleChat(item)}
              onDelivery={() => router.push({ pathname: '/delivery/[id]', params: { id: item.id } })}
              onPayment={() => router.push({ pathname: '/payment/[id]', params: { id: item.id } })}
              onReview={() => setRatingTarget(item)}
            />
          )}
        />
        </View>
      )}

      {/* Detail Modal */}
      {detailRequest ? (
        <RequestDetailModal
          visible={Boolean(detailRequest)}
          request={detailRequest}
          currentUserId={user?.id}
          onClose={() => setDetailRequest(null)}
          onAccept={() => {
            const req = detailRequest;
            setDetailRequest(null);
            handleAccept(req.id, req);
          }}
          onReject={() => {
            const req = detailRequest;
            setDetailRequest(null);
            handleReject(req.id, req);
          }}
          onCancel={() => {
            const req = detailRequest;
            setDetailRequest(null);
            handleCancel(req.id, req);
          }}
          onChat={() => {
            const req = detailRequest;
            setDetailRequest(null);
            handleChat(req);
          }}
          onDelivery={() => {
            const req = detailRequest;
            setDetailRequest(null);
            router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
          }}
          onPayment={() => {
            const req = detailRequest;
            setDetailRequest(null);
            router.push({ pathname: '/payment/[id]', params: { id: req.id } });
          }}
        />
      ) : null}

      {/* Rating Modal */}
      {ratingTarget && user ? (
        <RatingModal
          visible={Boolean(ratingTarget)}
          requestId={ratingTarget.id}
          fromUserId={user.id}
          toUserId={ratingTarget.senderId === user.id ? ratingTarget.travellerId : ratingTarget.senderId}
          toUserName={ratingTarget.senderId === user.id ? ratingTarget.travellerName : ratingTarget.senderName}
          onDone={() => {
            setRatingTarget(null);
            void handleRefresh();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabScrollWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingRight: Spacing.md,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  tabPillTextActive: {
    fontWeight: FontWeight.bold,
  },
  tabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summaryStats: { flexDirection: 'row', gap: Spacing.sm },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  summaryStatIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  summaryStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  summaryStatLabel: { fontSize: 9, fontWeight: FontWeight.medium, textAlign: 'center' },
  requestsListContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  tabletContainer: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
