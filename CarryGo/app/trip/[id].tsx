import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { useParcelsByIdsQuery, useTripQuery, useUpdateTripStatusMutation } from '@/features/listings/queries';
import { useRequestsByTripQuery, useUpdateRequestStatusMutation } from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Trip } from '@/types';
import { createDelivery } from '@/services/deliveries.service';
import { sendLocalNotification } from '@/services/notifications.service';
import { Haptic } from '@/services/haptics.service';
import { RequestItem } from '@/components/feature/RequestItem';
import { styles } from '@/styles/trip/[id].styles';

const vehicleIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

const vehicleGradients: Record<string, [string, string]> = {
  bike: ['#D97706', '#92400E'],
  car: ['#4F46E5', '#312E81'],
  bus: ['#7C3AED', '#5B21B6'],
  train: ['#0F766E', '#115E59'],
  flight: ['#0284C7', '#075985'],
};

type TabFilter = 'all' | 'pending' | 'active' | 'done';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();

  const tripQuery = useTripQuery(id);
  const requestsQuery = useRequestsByTripQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const { mutateAsync: createConversationAsync } = useCreateConversationMutation(user?.id);
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabFilter>('all');

  const trip = (tripQuery.data ?? undefined) as Trip | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const isOwner = trip?.userId === user?.id;

  const visibleRequests = useMemo(() => {
    if (isOwner) return requests;
    return requests.filter(request => request.senderId === user?.id);
  }, [isOwner, requests, user?.id]);

  const viewerRole: 'traveller' | 'sender' | 'observer' = isOwner
    ? 'traveller'
    : visibleRequests.length > 0
      ? 'sender'
      : 'observer';

  const requestedParcelIds = useMemo(
    () => [...new Set(visibleRequests.map(request => request.parcelId))].sort(),
    [visibleRequests]
  );
  const parcelsQuery = useParcelsByIdsQuery(requestedParcelIds);
  const parcels = parcelsQuery.data ?? [];
  const loading = tripQuery.isLoading || requestsQuery.isLoading || parcelsQuery.isLoading;

  const vGradient: [string, string] = trip
    ? (vehicleGradients[trip.vehicleType] || ['#4F46E5', '#312E81'])
    : ['#4F46E5', '#312E81'];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      tripQuery.refetch(),
      requestsQuery.refetch(),
      conversationsQuery.refetch(),
      requestedParcelIds.length > 0 ? parcelsQuery.refetch() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleAccept = (req: Request) => {
    if (!user || req.travellerId !== user.id) {
      showAlert('Not Allowed', 'Only the assigned traveller can accept this request.');
      return;
    }

    showAlert('Accept Request?', `Accept delivery for Rs ${req.price} from ${req.senderName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          await updateRequestStatusAsync({ requestId: req.id, status: 'accepted' });
          const parcel = parcels.find(p => p.id === req.parcelId);
          const route = parcel ? `${parcel.fromCity} → ${parcel.toCity}` : trip ? `${trip.fromCity} → ${trip.toCity}` : 'Route';
          const existingConversation = conversations.find(conversation => conversation.requestId === req.id);
          if (!existingConversation) {
            await createConversationAsync({
              requestId: req.id,
              participantIds: [user?.id || '', req.senderId],
              participantNames: { [user?.id || '']: user?.name || 'You', [req.senderId]: req.senderName },
              parcelDescription: parcel?.description || 'Parcel delivery',
              route,
            });
          }
          await createDelivery(req.id);
          await sendLocalNotification('Request Accepted', `You accepted delivery from ${req.senderName}`);
          await Promise.all([
            requestsQuery.refetch(),
            conversationsQuery.refetch(),
            requestedParcelIds.length > 0 ? parcelsQuery.refetch() : Promise.resolve(),
          ]);
          showAlert('Accepted!', 'Chat opened to coordinate pickup details.');
        },
      },
    ]);
  };

  const handleReject = (req: Request) => {
    if (!user || req.travellerId !== user.id) {
      showAlert('Not Allowed', 'Only the assigned traveller can reject this request.');
      return;
    }

    showAlert('Reject Request?', 'Reject this delivery request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          await updateRequestStatusAsync({ requestId: req.id, status: 'rejected' });
          await requestsQuery.refetch();
        },
      },
    ]);
  };

  const handleChat = (req: Request) => {
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    else showAlert('No Chat', 'Chat opens once the request is accepted.');
  };

  const handleDelivery = (req: Request) => {
    router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
  };

  const handlePayment = (req: Request) => {
    router.push({ pathname: '/payment/[id]', params: { id: req.id } });
  };

  const handleCancelTrip = () => {
    if (!trip || !isOwner) return;
    showAlert('Cancel Trip?', 'This will remove your trip from the marketplace. Any pending requests will be automatically rejected.', [
      { text: 'Keep Trip', style: 'cancel' },
      {
        text: 'Cancel Trip',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' });
            Haptic.success();
            showAlert('Trip Cancelled', 'Your trip has been removed from the marketplace.');
          } catch (error) {
            Haptic.error();
            showAlert('Error', error instanceof Error ? error.message : 'Could not cancel trip. Please try again.');
          }
        },
      },
    ]);
  };

  const handleShareTrip = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `CarryGo Trip: Travelling from ${trip.fromCity} to ${trip.toCity} on ${trip.date} at ${trip.time}. Space available for parcels! Connect with me on CarryGo.`,
      });
    } catch {
      // Ignored
    }
  };

  const pending = visibleRequests.filter(r => r.status === 'pending');
  const active = visibleRequests.filter(r => r.status === 'accepted');
  const done = visibleRequests.filter(r => ['completed', 'rejected', 'cancelled', 'failed'].includes(r.status));
  const totalEarnings = visibleRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  // Compute booked weight
  const bookedWeight = useMemo(() => {
    const acceptedRequests = visibleRequests.filter(r => r.status === 'accepted');
    return acceptedRequests.reduce((acc, req) => {
      const p = parcels.find(item => item.id === req.parcelId);
      return acc + (p?.weight || 0);
    }, 0);
  }, [visibleRequests, parcels]);

  const capacityRatio = trip?.availableCapacity ? Math.min(1, bookedWeight / trip.availableCapacity) : 0;
  const remainingWeight = trip?.availableCapacity ? Math.max(0, trip.availableCapacity - bookedWeight) : 0;

  const displayedRequests = useMemo(() => {
    if (selectedTab === 'pending') return pending;
    if (selectedTab === 'active') return active;
    if (selectedTab === 'done') return done;
    return visibleRequests;
  }, [selectedTab, visibleRequests, pending, active, done]);

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isTripActive = trip.status === 'active';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Floating App Bar */}
      <View style={[styles.topNavBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.roundNavBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.75 }
          ]}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isOwner ? 'Manage Trip' : 'Trip Details'}
          </Text>
          <View style={styles.navSubRow}>
            <View style={[
              styles.navStatusDot,
              { backgroundColor: isTripActive ? C.success : C.textMuted }
            ]} />
            <Text style={[styles.navSubtitle, { color: C.textMuted }]}>
              {trip.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.navRightRow}>
          <Pressable
            onPress={handleShareTrip}
            style={({ pressed }) => [
              styles.roundNavBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            hitSlop={6}
          >
            <MaterialIcons name="share" size={18} color={C.textSecondary} />
          </Pressable>

          {isOwner && isTripActive ? (
            <Pressable
              onPress={handleCancelTrip}
              style={({ pressed }) => [
                styles.roundNavBtn,
                { backgroundColor: C.errorSubtle, borderColor: C.error + '30' },
                pressed && { opacity: 0.75 }
              ]}
              hitSlop={6}
            >
              <MaterialIcons name="delete-outline" size={18} color={C.error} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Travel Ticket Board Card */}
        <View style={[styles.ticketCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Header Ticket Zone with Vehicle Gradient */}
          <View style={styles.ticketHeader}>
            <LinearGradient
              colors={vGradient}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={styles.ticketTopRow}>
              <View style={styles.vehicleChip}>
                <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={14} color="#fff" />
                <Text style={styles.vehicleChipText}>{trip.vehicleType.toUpperCase()}</Text>
              </View>

              <View style={styles.statusChip}>
                <View style={[styles.statusDot, { backgroundColor: isTripActive ? '#10B981' : '#E2E8F0' }]} />
                <Text style={styles.statusChipText}>{trip.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Ticket Route */}
            <View style={styles.ticketRouteRow}>
              <View style={styles.routeCityCol}>
                <Text style={styles.routeLabel}>DEPARTURE</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.fromCity}</Text>
              </View>

              <View style={styles.transportCapsule}>
                <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'arrow-forward'} size={22} color="#fff" />
              </View>

              <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeLabel}>DESTINATION</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.toCity}</Text>
              </View>
            </View>

            {/* Departure Time Ribbon */}
            <View style={styles.departureStrip}>
              <Text style={styles.departureStripText}>
                {trip.date} • {trip.time}
              </Text>
              <Text style={styles.departureConfirmedBadge}>CONFIRMED</Text>
            </View>
          </View>

          {/* Ticket Body with Luggage Trunk & Stats */}
          <View style={styles.ticketBody}>
            {/* Capacity Trunk Meter */}
            <View style={[styles.capacityWidget, { backgroundColor: C.surfaceElevated }]}>
              <View style={styles.capacityHeader}>
                <View style={styles.capacityTitleRow}>
                  <MaterialIcons name="luggage" size={16} color={C.primary} />
                  <Text style={[styles.capacityTitle, { color: C.textPrimary }]}>
                    Luggage Capacity
                  </Text>
                </View>
                <Text style={[styles.capacityRemaining, { color: C.textPrimary }]}>
                  {remainingWeight > 0 ? `${remainingWeight.toFixed(1)} kg available` : 'Full'}
                </Text>
              </View>

              <View style={[styles.capacityTrack, { backgroundColor: C.background }]}>
                <View
                  style={[
                    styles.capacityFill,
                    {
                      width: `${Math.max(6, Math.min(100, capacityRatio * 100))}%`,
                      backgroundColor: capacityRatio > 0.85 ? C.warning : C.primary,
                    }
                  ]}
                />
              </View>

              <View style={styles.capacityFooter}>
                <Text style={[styles.capacityFooterText, { color: C.textMuted }]}>
                  {bookedWeight.toFixed(1)} kg / {trip.availableCapacity} kg booked
                </Text>
                <View style={[styles.rateHighlightPill, { backgroundColor: C.successSubtle }]}>
                  <Text style={[styles.rateHighlightText, { color: C.success }]}>
                    ₹{trip.pricePerKg}/kg
                  </Text>
                </View>
              </View>
            </View>

            {/* Highlights Row */}
            <View style={styles.highlightsRow}>
              <View style={styles.highlightItem}>
                <Text style={[styles.highlightVal, { color: C.textPrimary }]}>{trip.availableCapacity} kg</Text>
                <Text style={[styles.highlightLbl, { color: C.textMuted }]}>Total Space</Text>
              </View>

              <View style={[styles.highlightDiv, { backgroundColor: C.surfaceBorder }]} />

              <View style={styles.highlightItem}>
                <Text style={[styles.highlightVal, { color: C.primary }]}>{visibleRequests.length}</Text>
                <Text style={[styles.highlightLbl, { color: C.textMuted }]}>Requests</Text>
              </View>

              <View style={[styles.highlightDiv, { backgroundColor: C.surfaceBorder }]} />

              <View style={styles.highlightItem}>
                <Text style={[styles.highlightVal, { color: C.success }]}>₹{totalEarnings}</Text>
                <Text style={[styles.highlightLbl, { color: C.textMuted }]}>Earned</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Find Parcels Smart Action Card (when open & owned) */}
        {isOwner && isTripActive ? (
          <Pressable
            style={({ pressed }) => [
              styles.matchingBanner,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }
            ]}
            onPress={() => router.push({
              pathname: '/search',
              params: {
                fromCity: trip.fromCity,
                toCity: trip.toCity,
                mode: 'parcels',
              }
            })}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
            />
            <View style={styles.matchingIconWrap}>
              <MaterialIcons name="search" size={24} color="#fff" />
            </View>
            <View style={styles.matchingTextWrap}>
              <Text style={styles.matchingHeading}>Find Parcels to Carry</Text>
              <Text style={styles.matchingSubheading}>
                Pick up parcels along your route from {trip.fromCity} to {trip.toCity}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Requests Feed */}
        <View style={styles.requestsSection}>
          <View style={styles.requestsHeaderRow}>
            <View style={styles.requestsTitleRow}>
              <Text style={[styles.requestsTitle, { color: C.textPrimary }]}>
                Parcel Requests
              </Text>
              <View style={[styles.requestsCountBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.requestsCountText, { color: C.primary }]}>
                  {visibleRequests.length}
                </Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { key: 'all' as TabFilter, label: 'All' },
                { key: 'pending' as TabFilter, label: `Pending (${pending.length})` },
                { key: 'active' as TabFilter, label: `Active (${active.length})` },
              ].map((tab) => {
                const isSelected = selectedTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? C.primary : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      }
                    ]}
                    onPress={() => {
                      Haptic.select();
                      setSelectedTab(tab.key);
                    }}
                  >
                    <Text style={[
                      styles.filterPillText,
                      { color: isSelected ? '#fff' : C.textMuted }
                    ]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Requests Feed */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 32 }} />
          ) : displayedRequests.length === 0 ? (
            <View style={[styles.emptyRequestsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="inbox" size={32} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Parcel Requests Yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>
                {isOwner
                  ? 'Senders will send requests when they see your trip in the marketplace.'
                  : 'No requests submitted on this trip.'}
              </Text>
              {isOwner && isTripActive ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.findParcelsEmptyBtn,
                    { backgroundColor: C.primary },
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={() => router.push({
                    pathname: '/search',
                    params: { fromCity: trip.fromCity, toCity: trip.toCity, mode: 'parcels' }
                  })}
                >
                  <MaterialIcons name="explore" size={16} color="#fff" />
                  <Text style={styles.findParcelsEmptyText}>Browse Parcels on Route</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.requestsList}>
              {displayedRequests.map((req) => (
                <RequestItem
                  key={req.id}
                  request={req}
                  parcel={parcels.find(p => p.id === req.parcelId)}
                  viewerRole={viewerRole}
                  onAccept={() => handleAccept(req)}
                  onReject={() => handleReject(req)}
                  onChat={() => handleChat(req)}
                  onDelivery={() => handleDelivery(req)}
                  onPayment={() => handlePayment(req)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
