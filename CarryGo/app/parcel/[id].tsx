import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import {
  useConversationsQuery,
} from '@/features/conversations/queries';
import {
  useParcelQuery,
  useTripsQuery,
  useUpdateParcelStatusMutation,
  flattenInfiniteData,
} from '@/features/listings/queries';
import {
  useRequestsByParcelQuery,
  useUpdateRequestStatusMutation,
  useCreateRequestMutation,
} from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { sendLocalNotification } from '@/services/notifications.service';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

const categoryGradients: Record<string, [string, string]> = {
  documents: ['#8B5CF6', '#7C3AED'],
  electronics: ['#06B6D4', '#0891B2'],
  clothing: ['#F59E0B', '#D97706'],
  food: ['#10B981', '#059669'],
  medicine: ['#EF4444', '#DC2626'],
  other: ['#3B82F6', '#2563EB'],
};

type StatusKey = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'failed';

const TIMELINE_ORDER: StatusKey[] = ['pending', 'accepted', 'completed'];

function timelineStep(status: StatusKey): number {
  if (status === 'accepted') return 1;
  if (status === 'completed') return 2;
  return 0;
}

interface RequestRowProps {
  request: Request;
  isSender: boolean;
  onCancel: () => void;
  onChat: () => void;
  onTrack: () => void;
  onPayment: () => void;
  C: ThemeColors;
  isDark: boolean;
  catGradient: [string, string];
}

function RequestRow({ request, isSender, onCancel, onChat, onTrack, onPayment, C, isDark, catGradient }: RequestRowProps) {
  const step = timelineStep(request.status as StatusKey);
  const isRejectedOrCancelled = request.status === 'rejected' || request.status === 'cancelled';

  const statusConfig = {
    pending:   { label: 'Pending',   color: C.warning,   bg: C.warningSubtle,   icon: 'hourglass-empty' as const },
    accepted:  { label: 'Accepted',  color: C.success,   bg: C.successSubtle,   icon: 'check-circle' as const },
    rejected:  { label: 'Rejected',  color: C.error,     bg: C.errorSubtle,     icon: 'cancel' as const },
    completed: { label: 'Completed', color: C.info,      bg: C.infoSubtle,      icon: 'verified' as const },
    cancelled: { label: 'Cancelled', color: C.textMuted, bg: C.surfaceElevated, icon: 'block' as const },
    failed:    { label: 'Failed',    color: C.error,     bg: C.errorSubtle,     icon: 'error' as const },
  };
  const sc = statusConfig[request.status as StatusKey] || statusConfig.pending;
  const tlos = [statusConfig.pending, statusConfig.accepted, statusConfig.completed];

  return (
    <View style={[styles.reqRow, { borderBottomColor: C.surfaceBorder }]}>
      <View style={styles.reqHeader}>
        <View style={styles.tAvatar}>
          <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={styles.tAvatarText}>{request.travellerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tName, { color: C.textPrimary }]}>{request.travellerName}</Text>
          <Text style={[styles.tTime, { color: C.textMuted }]}>
            {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {' · '}
            {new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <MaterialIcons name={sc.icon} size={11} color={sc.color} />
          <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {request.message ? (
        <View style={[styles.msgBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderLeftColor: catGradient[0] + '44' }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textMuted} />
          <Text style={[styles.msgText, { color: C.textSecondary }]} numberOfLines={2}>{request.message}</Text>
        </View>
      ) : null}

      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: C.textMuted }]}>Offered price</Text>
        <View style={styles.priceTag}>
          <LinearGradient colors={['#10B98120', '#05966905']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={styles.priceValue}>₹{request.price}</Text>
        </View>
      </View>

      {!isRejectedOrCancelled && (
        <View style={[styles.progressRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
          {TIMELINE_ORDER.map((_, i) => {
            const done = step >= i;
            const psc = tlos[i];
            return (
              <React.Fragment key={i}>
                <View style={[styles.pStep, { backgroundColor: done ? psc.color : C.surfaceBorderLight }]}>
                  {done ? <MaterialIcons name={psc.icon} size={11} color="#fff" /> : <View style={[styles.pDot, { backgroundColor: C.surfaceBorder }]} />}
                </View>
                {i < 2 ? <View style={[styles.pLine, { backgroundColor: done && i < step ? tlos[i].color : C.surfaceBorderLight }]} /> : null}
              </React.Fragment>
            );
          })}
          <Text style={[styles.pLabel, { color: C.textMuted }]}>{sc.label}</Text>
        </View>
      )}

      {isSender && request.status === 'pending' ? (
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.75 }]}
          onPress={onCancel}
        >
          <MaterialIcons name="close" size={15} color={C.error} />
          <Text style={[styles.cancelBtnText, { color: C.error }]}>Cancel Request</Text>
        </Pressable>
      ) : null}

      {request.status === 'accepted' ? (
        <View style={styles.actionRow}>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.75 }]} onPress={onPayment}>
            <MaterialIcons name="account-balance-wallet" size={14} color={C.warning} />
            <Text style={[styles.aBtnText, { color: C.warning }]}>Payment</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.75 }]} onPress={onChat}>
            <Ionicons name="chatbubble-outline" size={14} color={C.info} />
            <Text style={[styles.aBtnText, { color: C.info }]}>Chat</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }, pressed && { opacity: 0.75 }]} onPress={onTrack}>
            <MaterialIcons name="local-shipping" size={14} color={C.primary} />
            <Text style={[styles.aBtnText, { color: C.primary }]}>Track</Text>
          </Pressable>
        </View>
      ) : null}

      {request.status === 'completed' ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.success} />
          <Text style={[styles.doneText, { color: C.success }]}>Delivered successfully</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ParcelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();
  const parcelQuery = useParcelQuery(id);
  const requestsQuery = useRequestsByParcelQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const tripsQuery = useTripsQuery(Boolean(user));
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const { mutateAsync: createRequestAsync } = useCreateRequestMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [offerSending, setOfferSending] = useState(false);

  const parcel = (parcelQuery.data ?? undefined) as Parcel | undefined;
  const requests = requestsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const allTrips = flattenInfiniteData(tripsQuery.data);
  const loading = parcelQuery.isLoading || requestsQuery.isLoading;
  const isSender = parcel?.userId === user?.id;
  const canOffer = !isSender && parcel?.status === 'open';
  const catGradient: [string, string] = parcel ? (categoryGradients[parcel.category] || ['#3B82F6', '#2563EB']) : ['#3B82F6', '#2563EB'];
  const catColor = catGradient[0];

  const myActiveTrips = allTrips.filter(t => t.userId === user?.id && t.status === 'active');
  const myMatchingTrips = myActiveTrips.filter(t =>
    parcel && t.fromCity.toLowerCase() === parcel.fromCity.toLowerCase() &&
    t.toCity.toLowerCase() === parcel.toCity.toLowerCase()
  );
  const alreadyOffered = requests.some(r => r.travellerId === user?.id && r.status !== 'cancelled');

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      parcelQuery.refetch(),
      requestsQuery.refetch(),
      conversationsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleCancel = (req: Request) => {
    showAlert('Cancel Request?', 'Cancel your request to this traveller?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Request', style: 'destructive', onPress: async () => {
          await updateRequestStatusAsync({ requestId: req.id, status: 'cancelled' });
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

  const sendOffer = async (trip: Trip) => {
    if (!parcel || !user) return;
    setOfferSending(true);
    try {
      const result = await createRequestAsync({
        parcelId: parcel.id,
        tripId: trip.id,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: user.id,
        travellerName: user.name,
        status: 'pending',
        price: parcel.priceOffer,
        message: `Hi! I am travelling ${trip.fromCity} → ${trip.toCity} on ${trip.date} and can carry your parcel safely.`,
      });
      if (result) {
        await sendLocalNotification('Offer Sent!', `Your offer was sent to ${parcel.userName}`);
        Haptic.success();
        showAlert(
          'Offer Sent!',
          `${parcel.userName} will review your offer. Check the Requests tab for their response.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'Stay Here', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        Haptic.error();
        showAlert('Error', 'Could not send offer. Please try again.');
      }
    } catch (error) {
      Haptic.error();
      showAlert('Error', error instanceof Error ? error.message : 'Could not send offer. Please try again.');
    } finally {
      setOfferSending(false);
    }
  };

  const handleOfferToCarry = () => {
    if (!parcel || !user) return;

    if (alreadyOffered) {
      Haptic.warning();
      showAlert('Already Offered', 'You have already sent an offer to carry this parcel.');
      return;
    }

    if (myMatchingTrips.length === 0) {
      if (myActiveTrips.length === 0) {
        Haptic.warning();
        showAlert(
          'No Active Trips',
          'You need to post a trip first before you can offer to carry parcels.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Post a Trip', onPress: () => router.push('/create-trip') },
          ]
        );
      } else {
        Haptic.warning();
        showAlert(
          'No Matching Trip',
          `You don't have an active trip from ${parcel.fromCity} to ${parcel.toCity}. Post a trip on this route first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Post a Trip', onPress: () => router.push('/create-trip') },
          ]
        );
      }
      return;
    }

    if (myMatchingTrips.length === 1) {
      const trip = myMatchingTrips[0];
      Haptic.warning();
      showAlert(
        'Offer to Carry',
        `Offer to carry "${parcel.description}" (${parcel.weight}kg) for ₹${parcel.priceOffer} on your ${trip.vehicleType} trip (${trip.date})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Offer', onPress: () => sendOffer(trip) },
        ]
      );
    } else {
      showAlert(
        'Select Trip',
        `You have ${myMatchingTrips.length} trips on this route. Which trip would you like to use?`,
        myMatchingTrips.map(trip => ({
          text: `${trip.vehicleType.charAt(0).toUpperCase() + trip.vehicleType.slice(1)} · ${trip.date}`,
          onPress: () => sendOffer(trip),
        }))
      );
    }
  };

  const handleCancelParcel = () => {
    if (!parcel || !isSender) return;
    showAlert('Cancel Parcel?', 'This will remove your parcel listing from the marketplace.', [
      { text: 'Keep Parcel', style: 'cancel' },
      {
        text: 'Cancel Parcel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'cancelled' });
            Haptic.success();
            showAlert('Parcel Cancelled', 'Your parcel listing has been removed.');
          } catch (error) {
            Haptic.error();
            showAlert('Error', error instanceof Error ? error.message : 'Could not cancel parcel. Please try again.');
          }
        },
      },
    ]);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'accepted');
  const done = requests.filter(r => ['completed', 'rejected', 'cancelled', 'failed'].includes(r.status));

  if (!parcel) {
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
          colors={isDark ? [catColor + '18', 'transparent'] : [catColor + '0C', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{parcel.fromCity} → {parcel.toCity}</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>{parcel.description}</Text>
        </View>
        {isSender && parcel.status === 'open' ? (
          <Pressable
            onPress={handleCancelParcel}
            style={({ pressed }) => [styles.cancelBtn2, { backgroundColor: C.errorSubtle, borderColor: C.error + '30' }, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <MaterialIcons name="close" size={16} color={C.error} />
          </Pressable>
        ) : null}
        <View style={styles.catBadgeHeader}>
          <LinearGradient colors={catGradient} style={{ ...StyleSheet.absoluteFillObject, borderRadius: 14 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={18} color="#fff" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Parcel Hero Card */}
        <View style={[styles.parcelCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <LinearGradient
            colors={isDark ? [catColor + '15', 'transparent'] : [catColor + '0A', 'transparent']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Route */}
          <View style={styles.routeSection}>
            <View style={styles.routeVisual}>
              <View style={[styles.originDot, { backgroundColor: '#10B981' }]} />
              <View style={[styles.routeDash, { borderColor: C.surfaceBorderLight }]} />
              <View style={[styles.destDot, { backgroundColor: C.error }]} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.fromCity, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
              <Text style={[styles.toCity, { color: C.textPrimary }]}>{parcel.toCity}</Text>
            </View>
          </View>

          {/* Category pill */}
          <View style={styles.catPill}>
            <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={14} color="#fff" />
            <Text style={styles.catPillText}>
              {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
            </Text>
          </View>

          {/* Image */}
          {parcel.imageUri ? (
            <Image
              source={{ uri: parcel.imageUri }}
              style={styles.parcelImage}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          {/* Description */}
          <View style={[styles.descBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
            <Ionicons name="document-text-outline" size={14} color={C.textMuted} />
            <Text style={[styles.descText, { color: C.textSecondary }]}>{parcel.description}</Text>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.statItem}>
              <MaterialIcons name="scale" size={16} color={C.textMuted} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>{parcel.weight}kg</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Weight</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="payments" size={16} color={catColor} />
              <Text style={[styles.statVal, { color: catColor }]}>₹{parcel.priceOffer}</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Offered</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="swap-horiz" size={16} color={C.textMuted} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>{requests.length}</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Requests</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <View style={[styles.statusDotLg, {
                backgroundColor:
                  parcel.status === 'open' ? C.success :
                  parcel.status === 'matched' ? C.primary :
                  parcel.status === 'in_transit' ? C.warning :
                  parcel.status === 'delivered' ? C.info : C.error
              }]} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>
                {parcel.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Status</Text>
            </View>
          </View>

          {/* Owner */}
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={styles.ownerAvatarText}>{parcel.userName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.ownerName, { color: C.textPrimary }]}>{parcel.userName}</Text>
            <Text style={[styles.postedDate, { color: C.textMuted }]}>
              Posted {new Date(parcel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* CTA */}
        {canOffer && !alreadyOffered ? (
          <Pressable
            style={({ pressed }) => [styles.findBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={handleOfferToCarry}
            disabled={offerSending}
          >
            <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            {offerSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="local-shipping" size={18} color="#fff" />
                <Text style={styles.findBtnText}>Offer to Carry This Parcel</Text>
                <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>
            )}
          </Pressable>
        ) : canOffer && alreadyOffered ? (
          <View style={[styles.findBtn, { opacity: 0.6 }]}>
            <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Offer Already Sent</Text>
          </View>
        ) : isSender && parcel?.status === 'open' ? (
          <Pressable
            style={({ pressed }) => [styles.findBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'parcel', id: parcel!.id } })}
          >
            <LinearGradient colors={catGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Find Travellers for This Parcel</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Summary chips */}
        <View style={styles.chips}>
          {[
            { count: pending.length, label: 'Pending', color: C.warning, icon: 'hourglass-empty' as const },
            { count: active.length, label: 'Active', color: C.success, icon: 'check-circle' as const },
            { count: done.filter(r => r.status === 'completed').length, label: 'Done', color: C.info, icon: 'verified' as const },
          ].map(c => (
            <View key={c.label} style={[styles.chip, { backgroundColor: c.color + '12', borderColor: c.color + '30' }]}>
              <MaterialIcons name={c.icon} size={13} color={c.color} />
              <Text style={[styles.chipCount, { color: c.color }]}>{c.count}</Text>
              <Text style={[styles.chipLabel, { color: c.color + 'CC' }]}>{c.label}</Text>
            </View>
          ))}
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
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              {isSender
                ? 'Travellers on your route will send requests here.'
                : 'Send a request to this sender to carry their parcel.'}
            </Text>
          </View>
        ) : (
          <>
            {[
              { label: 'Pending', icon: 'hourglass-empty' as const, color: C.warning, items: pending },
              { label: 'In Progress', icon: 'local-shipping' as const, color: C.primary, items: active },
              { label: 'History', icon: 'history' as const, color: C.textMuted, items: done },
            ].filter(s => s.items.length > 0).map(section => (
              <View key={section.label} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: section.color + '15' }]}>
                    <MaterialIcons name={section.icon} size={16} color={section.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{section.label}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.color + '20' }]}>
                    <Text style={[styles.sectionBadgeText, { color: section.color }]}>{section.items.length}</Text>
                  </View>
                </View>
                <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder, borderLeftColor: section.color + '55' }]}>
                  {section.items.map((req) => (
                    <RequestRow
                      key={req.id}
                      request={req}
                      isSender={isSender}
                      onCancel={() => handleCancel(req)}
                      onChat={() => handleChat(req)}
                      onTrack={() => router.push({ pathname: '/delivery/[id]', params: { id: req.id } })}
                      onPayment={() => router.push({ pathname: '/payment/[id]', params: { id: req.id } })}
                      C={C}
                      isDark={isDark}
                      catGradient={catGradient}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  cancelBtn2: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  catBadgeHeader: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },

  // Hero card
  parcelCard: {
    borderRadius: 24, borderWidth: 1,
    padding: Spacing.lg, gap: Spacing.lg, overflow: 'hidden',
  },
  cardGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },

  // Route
  routeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  routeVisual: { alignItems: 'center', height: 70, justifyContent: 'space-between' },
  originDot: { width: 14, height: 14, borderRadius: 7 },
  routeDash: { height: 34, width: 0, borderLeftWidth: 2, borderStyle: 'dashed' },
  destDot: { width: 14, height: 14, borderRadius: 4 },
  routeText: { flex: 1, height: 70, justifyContent: 'space-between' },
  fromCity: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  toCity: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },

  // Category pill
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  catPillText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  parcelImage: { width: '100%', height: 180, borderRadius: 16 },

  descBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderRadius: 12, padding: Spacing.md,
  },
  descText: { flex: 1, fontSize: FontSize.sm, lineHeight: 22 },

  statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 18, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },
  statLbl: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 0.3, textTransform: 'uppercase' },
  statDiv: { width: 1, height: 32 },
  statusDotLg: { width: 10, height: 10, borderRadius: 5 },

  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ownerAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ownerAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  ownerName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  postedDate: { fontSize: FontSize.xs },

  // CTA
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: 16, paddingVertical: Spacing.md + 4, overflow: 'hidden',
  },
  findBtnText: { flex: 1, textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  // Summary chips
  chips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  chipCount: { fontSize: 18, fontWeight: FontWeight.extrabold },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Sections
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  sectionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionCard: { borderRadius: 20, borderWidth: 1, borderLeftWidth: 3, overflow: 'hidden' },

  // Request row
  reqRow: { padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1 },
  reqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  tAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  tName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tTime: { fontSize: FontSize.xs, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold },
  msgBox: { flexDirection: 'row', gap: Spacing.sm, borderRadius: 10, padding: Spacing.sm, borderLeftWidth: 3 },
  msgText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  priceLabel: { fontSize: FontSize.xs },
  priceTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  priceValue: { fontSize: 20, fontWeight: FontWeight.extrabold, color: '#10B981', letterSpacing: -0.3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: 10 },
  pStep: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pDot: { width: 6, height: 6, borderRadius: 3 },
  pLine: { flex: 1, height: 2 },
  pLabel: { marginLeft: Spacing.sm, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm + 2, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  aBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm + 2, borderRadius: 12, borderWidth: 1 },
  aBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  doneText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Empty / Loading
  loadingState: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm },
  emptyState: { borderRadius: 24, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: FontWeight.bold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
});
