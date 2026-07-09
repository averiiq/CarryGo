import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { useParcelsByIdsQuery, useTripQuery, useUpdateTripStatusMutation } from '@/features/listings/queries';
import { useRequestsByTripQuery, useUpdateRequestStatusMutation } from '@/features/requests/queries';
import { useAlert } from '@/template';
import { Request, Trip } from '@/types';
import { createDelivery } from '@/services/deliveries.service';
import { sendLocalNotification } from '@/services/notifications.service';
import { Colors, Shadow } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { RequestItem, STATUS_CONFIG, timelineStep } from '@/components/feature/RequestItem';
import { styles } from './[id].styles';

const vehicleIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler', car: 'directions-car', bus: 'directions-bus',
  train: 'train', flight: 'flight',
};
const vehicleColors: Record<string, string> = {
  bike: '#F59E0B', car: '#22C55E', bus: '#8B5CF6',
  train: '#06B6D4', flight: '#3B82F6',
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const tripQuery = useTripQuery(id);
  const requestsQuery = useRequestsByTripQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const { mutateAsync: createConversationAsync } = useCreateConversationMutation(user?.id);
  const updateTripStatusMutation = useUpdateTripStatusMutation();

  const [refreshing, setRefreshing] = useState(false);

  const trip = (tripQuery.data ?? undefined) as Trip | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const requestedParcelIds = useMemo(
    () => [...new Set(requests.map(request => request.parcelId))].sort(),
    [requests]
  );
  const parcelsQuery = useParcelsByIdsQuery(requestedParcelIds);
  const parcels = parcelsQuery.data ?? [];
  const loading = tripQuery.isLoading || requestsQuery.isLoading || parcelsQuery.isLoading;
  const isOwner = trip?.userId === user?.id;
  const vColor = trip ? (vehicleColors[trip.vehicleType] || Colors.primary) : Colors.primary;
  // Non-owner travellers can browse parcels to carry on this route
  const canBrowseParcels = !isOwner && trip?.status === 'active';

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
    showAlert('Accept Request?', `Accept delivery for ₹${req.price} from ${req.senderName}?`, [
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
          /* await createNotification({
            userId: req.senderId,
            title: 'Request Accepted!',
            body: `${req.travellerName} accepted your delivery. Open chat to coordinate pickup.`,
            type: 'request_accepted',
            relatedId: req.id,
          }); */
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
    showAlert('Reject Request?', 'Reject this delivery request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          await updateRequestStatusAsync({ requestId: req.id, status: 'rejected' });
          /* await createNotification({
            userId: req.senderId,
            title: 'Request Rejected',
            body: `${req.travellerName} is unable to carry your parcel this time.`,
            type: 'request_rejected',
            relatedId: req.id,
          }); */
          await requestsQuery.refetch();
        },
      },
    ]);
  };

  const handleChat = (req: Request) => {
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv) router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
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

  // Grouped by status
  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'accepted');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'rejected' || r.status === 'cancelled' || r.status === 'failed');

  const totalEarnings = requests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  if (!trip) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: vColor + '33' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{trip.fromCity} → {trip.toCity}</Text>
          <Text style={styles.headerSub}>{trip.date} · {trip.time}</Text>
        </View>
        {isOwner && trip.status === 'active' ? (
          <Pressable
            onPress={handleCancelTrip}
            style={({ pressed }) => [styles.cancelHeaderBtn, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <MaterialIcons name="close" size={16} color={Colors.error} />
          </Pressable>
        ) : null}
        <View style={[styles.vehicleBadge, { backgroundColor: `${vColor}18`, borderColor: `${vColor}44` }]}>
          <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={16} color={vColor} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* Trip Hero Card */}
        <View style={[styles.tripCard, Shadow.card, { borderTopColor: vColor, borderTopWidth: 3 }]}>
          {/* Route */}
          <View style={styles.routeRow}>
            <View style={styles.routeCity}>
              <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.routeCityName}>{trip.fromCity}</Text>
            </View>
            <View style={styles.routeMiddle}>
              <View style={styles.routeLine} />
              <View style={[styles.routeVehicle, { backgroundColor: `${vColor}18`, borderColor: `${vColor}44` }]}>
                <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={14} color={vColor} />
                <Text style={[styles.routeVehicleText, { color: vColor }]}>
                  {trip.vehicleType.charAt(0).toUpperCase() + trip.vehicleType.slice(1)}
                </Text>
              </View>
              <View style={styles.routeLine} />
            </View>
            <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
              <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.routeCityName}>{trip.toCity}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.tripStats}>
            <View style={styles.tripStat}>
              <MaterialIcons name="scale" size={14} color={Colors.textMuted} />
              <Text style={styles.tripStatValue}>{trip.availableCapacity}kg</Text>
              <Text style={styles.tripStatLabel}>Capacity</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.tripStat}>
              <MaterialIcons name="payments" size={14} color={Colors.primary} />
              <Text style={[styles.tripStatValue, { color: Colors.primary }]}>₹{trip.pricePerKg}</Text>
              <Text style={styles.tripStatLabel}>Per kg</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.tripStat}>
              <MaterialIcons name="swap-horiz" size={14} color={Colors.textMuted} />
              <Text style={styles.tripStatValue}>{requests.length}</Text>
              <Text style={styles.tripStatLabel}>Requests</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.tripStat}>
              <MaterialIcons name="verified" size={14} color={Colors.success} />
              <Text style={[styles.tripStatValue, { color: Colors.success }]}>₹{totalEarnings}</Text>
              <Text style={styles.tripStatLabel}>Earned</Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.tripStatusRow}>
            <View style={[
              styles.tripStatusBadge,
              trip.status === 'active' ? { backgroundColor: Colors.successSubtle, borderColor: Colors.success + '44' } :
              trip.status === 'completed' ? { backgroundColor: Colors.infoSubtle, borderColor: Colors.info + '44' } :
              { backgroundColor: Colors.errorSubtle, borderColor: Colors.error + '44' }
            ]}>
              <View style={[
                styles.tripStatusDot,
                { backgroundColor: trip.status === 'active' ? Colors.success : trip.status === 'completed' ? Colors.info : Colors.error }
              ]} />
              <Text style={[
                styles.tripStatusText,
                { color: trip.status === 'active' ? Colors.success : trip.status === 'completed' ? Colors.info : Colors.error }
              ]}>
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
              </Text>
            </View>
            <View style={styles.travellerRow}>
              <View style={styles.travellerAvatar}>
                <Text style={styles.travellerAvatarText}>{trip.userName.charAt(0)}</Text>
              </View>
              <Text style={styles.travellerName}>{trip.userName}</Text>
              <Ionicons name="star" size={11} color={Colors.warning} />
              <Text style={styles.travellerRating}>{trip.userRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* CTA to browse parcels on this route */}
        {canBrowseParcels ? (
          <Pressable
            style={[styles.findBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'trip', id: trip!.id } })}
          >
            <MaterialIcons name="inventory-2" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Find Parcels to Carry on This Route</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : isOwner && trip?.status === 'active' ? (
          <Pressable
            style={[styles.findBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'trip', id: trip!.id } })}
          >
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Browse Parcels on Your Route</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Summary chips */}
        <View style={styles.summaryChips}>
          <SummaryChip count={pending.length} label="Pending" color={Colors.warning} icon="hourglass-empty" />
          <SummaryChip count={active.length} label="Active" color={Colors.success} icon="check-circle" />
          <SummaryChip count={done.filter(r => r.status === 'completed').length} label="Done" color={Colors.info} icon="verified" />
          <SummaryChip count={done.filter(r => r.status === 'rejected').length} label="Rejected" color={Colors.error} icon="cancel" />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={60} color={Colors.surfaceBorderLight} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySubtext}>
              {isOwner
                ? 'Senders will send requests when they see your trip in the feed.'
                : 'Send a request to this traveller to get started.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <Section title="Pending Requests" icon="hourglass-empty" color={Colors.warning} count={pending.length}>
                {pending.map((req, i) => (
                  <React.Fragment key={req.id}>
                    <RequestItem
                      request={req}
                      parcel={parcels.find(p => p.id === req.parcelId)}
                      isOwner={isOwner}
                      onAccept={() => handleAccept(req)}
                      onReject={() => handleReject(req)}
                      onChat={() => handleChat(req)}
                      onDelivery={() => handleDelivery(req)}
                      onPayment={() => handlePayment(req)}
                    />
                    {i < pending.length - 1 && <View style={styles.itemSpacer} />}
                  </React.Fragment>
                ))}
              </Section>
            )}

            {/* Active / Accepted section */}
            {active.length > 0 && (
              <Section title="In Progress" icon="local-shipping" color={Colors.primary} count={active.length}>
                {active.map((req, i) => (
                  <React.Fragment key={req.id}>
                    <RequestItem
                      request={req}
                      parcel={parcels.find(p => p.id === req.parcelId)}
                      isOwner={isOwner}
                      onAccept={() => handleAccept(req)}
                      onReject={() => handleReject(req)}
                      onChat={() => handleChat(req)}
                      onDelivery={() => handleDelivery(req)}
                      onPayment={() => handlePayment(req)}
                    />
                    {i < active.length - 1 && <View style={styles.itemSpacer} />}
                  </React.Fragment>
                ))}
              </Section>
            )}

            {/* Completed / Done section */}
            {done.length > 0 && (
              <Section title="History" icon="history" color={Colors.textMuted} count={done.length}>
                {done.map((req, i) => (
                  <React.Fragment key={req.id}>
                    <RequestItem
                      request={req}
                      parcel={parcels.find(p => p.id === req.parcelId)}
                      isOwner={isOwner}
                      onAccept={() => handleAccept(req)}
                      onReject={() => handleReject(req)}
                      onChat={() => handleChat(req)}
                      onDelivery={() => handleDelivery(req)}
                      onPayment={() => handlePayment(req)}
                    />
                    {i < done.length - 1 && <View style={styles.itemSpacer} />}
                  </React.Fragment>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryChip({ count, label, color, icon }: { count: number; label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${color}12`, borderColor: `${color}33` }]}>
      <MaterialIcons name={icon} size={13} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

function Section({ title, icon, color, count, children }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${color}15` }]}>
          <MaterialIcons name={icon} size={15} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.sectionBadge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.sectionBadgeText, { color }]}>{count}</Text>
        </View>
      </View>
      <View style={[styles.sectionCard, { borderLeftColor: color + '55' }]}>
        {children}
      </View>
    </View>
  );
}
