import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
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
  bike: 'two-wheeler', car: 'directions-car', bus: 'directions-bus',
  train: 'train', flight: 'flight',
};
const vehicleGradients: Record<string, [string, string]> = {
  bike: ['#F59E0B', '#D97706'],
  car: ['#10B981', '#059669'],
  bus: ['#8B5CF6', '#7C3AED'],
  train: ['#06B6D4', '#0891B2'],
  flight: ['#3B82F6', '#2563EB'],
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();
  const tripQuery = useTripQuery(id);
  const requestsQuery = useRequestsByTripQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const { mutateAsync: createConversationAsync } = useCreateConversationMutation(user?.id);
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);

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
  const vGradient: [string, string] = trip ? (vehicleGradients[trip.vehicleType] || ['#7C3AED', '#6D28D9']) : ['#7C3AED', '#6D28D9'];
  const vColor = vGradient[0];
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

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'accepted');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'rejected' || r.status === 'cancelled' || r.status === 'failed');
  const totalEarnings = requests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={isDark ? [vColor + '18', 'transparent'] : [vColor + '0C', 'transparent']}
          style={styles.headerGradient}
        />
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{trip.fromCity} → {trip.toCity}</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>{trip.date} · {trip.time}</Text>
        </View>
        {isOwner && trip.status === 'active' ? (
          <Pressable
            onPress={handleCancelTrip}
            style={({ pressed }) => [styles.cancelHeaderBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '30' }, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <MaterialIcons name="close" size={16} color={C.error} />
          </Pressable>
        ) : null}
        <View style={styles.vehicleBadge}>
          <LinearGradient colors={vGradient} style={{ ...StyleSheet.absoluteFillObject, borderRadius: 14 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={18} color="#fff" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Trip Hero Card */}
        <View style={[styles.tripCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <LinearGradient
            colors={isDark ? [vColor + '15', 'transparent'] : [vColor + '0A', 'transparent']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Route visualization */}
          <View style={styles.routeSection}>
            <View style={styles.routeVisual}>
              <View style={[styles.originDot, { backgroundColor: '#10B981' }]} />
              <View style={[styles.routeDash, { borderColor: C.surfaceBorderLight }]} />
              <View style={[styles.destDot, { backgroundColor: C.error }]} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.fromCity, { color: C.textPrimary }]}>{trip.fromCity}</Text>
              <Text style={[styles.toCity, { color: C.textPrimary }]}>{trip.toCity}</Text>
            </View>
          </View>

          {/* Vehicle pill */}
          <View style={styles.vehiclePill}>
            <LinearGradient colors={vGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={14} color="#fff" />
            <Text style={styles.vehiclePillText}>
              {trip.vehicleType.charAt(0).toUpperCase() + trip.vehicleType.slice(1)}
            </Text>
          </View>

          {/* Stats */}
          <View style={[styles.tripStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.tripStat}>
              <MaterialIcons name="scale" size={16} color={C.textMuted} />
              <Text style={[styles.tripStatValue, { color: C.textPrimary }]}>{trip.availableCapacity}kg</Text>
              <Text style={[styles.tripStatLabel, { color: C.textMuted }]}>Capacity</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.tripStat}>
              <MaterialIcons name="payments" size={16} color={vColor} />
              <Text style={[styles.tripStatValue, { color: vColor }]}>₹{trip.pricePerKg}</Text>
              <Text style={[styles.tripStatLabel, { color: C.textMuted }]}>Per kg</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.tripStat}>
              <MaterialIcons name="swap-horiz" size={16} color={C.textMuted} />
              <Text style={[styles.tripStatValue, { color: C.textPrimary }]}>{requests.length}</Text>
              <Text style={[styles.tripStatLabel, { color: C.textMuted }]}>Requests</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.tripStat}>
              <MaterialIcons name="verified" size={16} color="#10B981" />
              <Text style={[styles.tripStatValue, { color: '#10B981' }]}>₹{totalEarnings}</Text>
              <Text style={[styles.tripStatLabel, { color: C.textMuted }]}>Earned</Text>
            </View>
          </View>

          {/* Status + traveller */}
          <View style={styles.tripStatusRow}>
            <View style={[
              styles.tripStatusBadge,
              trip.status === 'active' ? { backgroundColor: C.successSubtle, borderColor: C.success + '44' } :
              trip.status === 'completed' ? { backgroundColor: C.infoSubtle, borderColor: C.info + '44' } :
              { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }
            ]}>
              <View style={[
                styles.tripStatusDot,
                { backgroundColor: trip.status === 'active' ? C.success : trip.status === 'completed' ? C.info : C.error }
              ]} />
              <Text style={[
                styles.tripStatusText,
                { color: trip.status === 'active' ? C.success : trip.status === 'completed' ? C.info : C.error }
              ]}>
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
              </Text>
            </View>
            <View style={styles.travellerRow}>
              <View style={styles.travellerAvatar}>
                <LinearGradient colors={vGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={styles.travellerAvatarText}>{trip.userName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[styles.travellerName, { color: C.textPrimary }]}>{trip.userName}</Text>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.travellerRating, { color: C.textMuted }]}>{trip.userRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        {canBrowseParcels ? (
          <Pressable
            style={({ pressed }) => [styles.findBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'trip', id: trip!.id } })}
          >
            <LinearGradient colors={vGradient} style={styles.findBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            <MaterialIcons name="inventory-2" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Find Parcels to Carry on This Route</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : isOwner && trip?.status === 'active' ? (
          <Pressable
            style={({ pressed }) => [styles.findBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'trip', id: trip!.id } })}
          >
            <LinearGradient colors={vGradient} style={styles.findBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Browse Parcels on Your Route</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Summary chips */}
        <View style={styles.summaryChips}>
          <SummaryChip count={pending.length} label="Pending" color={C.warning} icon="hourglass-empty" C={C} isDark={isDark} />
          <SummaryChip count={active.length} label="Active" color={C.success} icon="check-circle" C={C} isDark={isDark} />
          <SummaryChip count={done.filter(r => r.status === 'completed').length} label="Done" color={C.info} icon="verified" C={C} isDark={isDark} />
          <SummaryChip count={done.filter(r => r.status === 'rejected').length} label="Rejected" color={C.error} icon="cancel" C={C} isDark={isDark} />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="inbox" size={56} color={C.surfaceBorderLight} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No requests yet</Text>
            <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
              {isOwner
                ? 'Senders will send requests when they see your trip in the feed.'
                : 'Send a request to this traveller to get started.'}
            </Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <Section title="Pending Requests" icon="hourglass-empty" color={C.warning} count={pending.length} C={C} isDark={isDark}>
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
                    {i < pending.length - 1 && <View style={[styles.itemSpacer, { backgroundColor: C.surfaceBorder }]} />}
                  </React.Fragment>
                ))}
              </Section>
            )}

            {active.length > 0 && (
              <Section title="In Progress" icon="local-shipping" color={C.primary} count={active.length} C={C} isDark={isDark}>
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
                    {i < active.length - 1 && <View style={[styles.itemSpacer, { backgroundColor: C.surfaceBorder }]} />}
                  </React.Fragment>
                ))}
              </Section>
            )}

            {done.length > 0 && (
              <Section title="History" icon="history" color={C.textMuted} count={done.length} C={C} isDark={isDark}>
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
                    {i < done.length - 1 && <View style={[styles.itemSpacer, { backgroundColor: C.surfaceBorder }]} />}
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

function SummaryChip({ count, label, color, icon, C, isDark }: {
  count: number; label: string; color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  C: any; isDark: boolean;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '12', borderColor: color + '30' }]}>
      <MaterialIcons name={icon} size={13} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={[styles.chipLabel, { color: color + 'CC' }]}>{label}</Text>
    </View>
  );
}

function Section({ title, icon, color, count, children, C, isDark }: {
  title: string; icon: keyof typeof MaterialIcons.glyphMap;
  color: string; count: number; children: React.ReactNode;
  C: any; isDark: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: color + '15' }]}>
          <MaterialIcons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{title}</Text>
        <View style={[styles.sectionBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.sectionBadgeText, { color }]}>{count}</Text>
        </View>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder, borderLeftColor: color + '55' }]}>
        {children}
      </View>
    </View>
  );
}

