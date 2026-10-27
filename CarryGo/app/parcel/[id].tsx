import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import {
  useParcelQuery,
  useUpdateParcelStatusMutation,
  useTripsQuery,
  useCreateTripMutation,
  flattenInfiniteData,
} from '@/features/listings/queries';
import {
  useRequestsByParcelQuery,
  useUpdateRequestStatusMutation,
  useCreateRequestMutation,
} from '@/features/requests/queries';
import { CarryParcelModal, QuickCarryTripParams } from '@/components/feature/CarryParcelModal';
import { TravelerCounterOfferSheet } from '@/components/feature/parcel/TravelerCounterOfferSheet';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { resolveImageUrl, getCategoryFallbackImage } from '@/constants/images';

const CATEGORY_META: Record<
  string,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }
> = {
  documents: { label: 'Documents', icon: 'description', color: '#D97706', bg: '#FEF3C7' },
  electronics: { label: 'Electronics', icon: 'devices', color: '#0284C7', bg: '#E0F2FE' },
  clothing: { label: 'Clothing', icon: 'checkroom', color: '#7C3AED', bg: '#F5F3FF' },
  food: { label: 'Food', icon: 'restaurant', color: '#EA580C', bg: '#FFEDD5' },
  medicine: { label: 'Medicine', icon: 'medical-services', color: '#DC2626', bg: '#FEE2E2' },
  other: { label: 'Box / General', icon: 'inventory-2', color: '#104BB9', bg: '#EEF4FF' },
};

type TabFilter = 'all' | 'pending' | 'active' | 'done';

interface ProposalCardProps {
  request: Request;
  viewerRole: 'sender' | 'traveller' | 'observer';
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel: () => void;
  onChat: () => void;
  onTrack: () => void;
  onPayment: () => void;
  C: ThemeColors;
}

function ProposalCard({
  request,
  viewerRole,
  onAccept,
  onDecline,
  onCancel,
  onChat,
  onTrack,
  onPayment,
  C,
}: ProposalCardProps) {
  const isSender = viewerRole === 'sender';
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';

  return (
    <View style={[styles.proposalCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.carrierHeader}>
        <View style={styles.carrierLeft}>
          <View style={[styles.carrierAvatar, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.carrierAvatarText, { color: C.primary }]}>
              {(request.travellerName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.carrierMeta}>
            <View style={styles.carrierNameRow}>
              <Text style={[styles.carrierName, { color: C.textPrimary }]}>
                {request.travellerName}
              </Text>
              <View style={[styles.verifiedPill, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="verified" size={11} color={C.success} />
                <Text style={[styles.verifiedPillText, { color: C.success }]}>Verified</Text>
              </View>
            </View>
            <Text style={[styles.carrierDate, { color: C.textMuted }]}>
              Offered on {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.bidAmountBox}>
          <Text style={[styles.bidAmount, { color: C.success }]}>₹{request.price}</Text>
          <Text style={[styles.bidLabel, { color: C.textMuted }]}>Proposed</Text>
        </View>
      </View>

      {request.message ? (
        <View style={[styles.carrierMessageBox, { backgroundColor: C.surfaceElevated }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primary} />
          <Text style={[styles.carrierMessageText, { color: C.textSecondary }]}>
            {`"${request.message}"`}
          </Text>
        </View>
      ) : null}

      {isSender && isPending ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelOfferBtn,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onDecline || onCancel}
          >
            <MaterialIcons name="close" size={15} color={C.error} />
            <Text style={[styles.cancelOfferText, { color: C.error }]}>Decline</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.chatOfferBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 },
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.chatOfferText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {onAccept ? (
            <Pressable
              style={({ pressed }) => [
                styles.acceptOfferBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onAccept}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.acceptOfferText}>Accept</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isAccepted ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.chatOfferBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 },
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.chatOfferText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {isSender ? (
            <Pressable
              style={({ pressed }) => [
                styles.escrowBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.75 },
              ]}
              onPress={onPayment}
            >
              <MaterialIcons name="account-balance-wallet" size={15} color={C.warning} />
              <Text style={[styles.escrowBtnText, { color: C.warning }]}>Escrow</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.trackLiveBtn,
              pressed && { opacity: 0.9 },
            ]}
            onPress={onTrack}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <MaterialIcons name={isSender ? 'radar' : 'fact-check'} size={16} color="#fff" />
            <Text style={styles.trackLiveText}>
              {isSender ? 'Track Delivery' : 'Process Shipment'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.deliveryCompletedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={[styles.deliveryCompletedText, { color: C.success }]}>
            Successfully Delivered
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ParcelDetailScreen() {
  const { id, travelerFlow } = useLocalSearchParams<{ id: string; travelerFlow?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C, S } = useThemeColors();

  const parcelQuery = useParcelQuery(id);
  const requestsQuery = useRequestsByParcelQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);
  const tripsQuery = useTripsQuery(true);
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);
  const { mutateAsync: createConversationAsync } = useCreateConversationMutation(user?.id);
  const createTripMutation = useCreateTripMutation();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabFilter>('all');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCarryModal, setShowCarryModal] = useState(false);
  const [showCounterSheet, setShowCounterSheet] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [imgError, setImgError] = useState(false);

  const parcel = (parcelQuery.data ?? undefined) as Parcel | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const allTrips = flattenInfiniteData(tripsQuery.data);
  const userTrips = useMemo(
    () => allTrips.filter((t: Trip) => t.userId === user?.id && t.status === 'active'),
    [allTrips, user?.id]
  );
  const myRequest = useMemo(
    () => requests.find((r) => r.travellerId === user?.id && ['pending', 'accepted'].includes(r.status)),
    [requests, user?.id]
  );
  const loading = parcelQuery.isLoading || requestsQuery.isLoading;

  const isSender = parcel?.userId === user?.id;

  // Dedicated Traveler Flow condition
  const isTravelerMode = travelerFlow === 'true' || (!isSender && Boolean(user));

  const visibleRequests = useMemo(() => {
    if (isSender) return requests;
    return requests.filter((request) => request.travellerId === user?.id);
  }, [isSender, requests, user?.id]);

  const viewerRole: 'sender' | 'traveller' | 'observer' = isSender
    ? 'sender'
    : visibleRequests.length > 0
      ? 'traveller'
      : 'observer';

  const catMeta = parcel ? (CATEGORY_META[parcel.category] || CATEGORY_META.other) : CATEGORY_META.other;

  const rawPhoto = parcel?.imageUri || parcel?.imageUris?.[0];
  const resolvedPhoto = resolveImageUrl(rawPhoto);
  const fallbackImage = parcel ? getCategoryFallbackImage(parcel.category) : undefined;

  const formattedDeliveryDate = parcel?.deliveryDate
    ? formatScheduleDate(parcel.deliveryDate)
    : 'Flexible Timeline';

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      parcelQuery.refetch(),
      requestsQuery.refetch(),
      conversationsQuery.refetch(),
      tripsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  // Helper to resolve or auto-create trip for parcel route
  const getOrCreateTripForRoute = async (targetParcel: Parcel): Promise<Trip> => {
    if (!user) throw new Error('Authentication required');

    // 1. Check if user already has an active trip for this corridor
    const matchedTrip = userTrips.find(
      (t: Trip) =>
        t.fromCity.toLowerCase().includes(targetParcel.fromCity.toLowerCase()) &&
        t.toCity.toLowerCase().includes(targetParcel.toCity.toLowerCase())
    );
    if (matchedTrip) return matchedTrip;

    // 2. Use first active trip if available
    if (userTrips.length > 0) return userTrips[0];

    // 3. Auto-create a linked trip for this exact corridor
    const todayKey = new Date().toISOString().split('T')[0];
    const travelDate = targetParcel.deliveryDate || todayKey;

    return await createTripMutation.mutateAsync({
      userId: user.id,
      userName: user.fullName || user.name || 'Traveler',
      userRating: user.totalRatings && user.totalRatings > 0 ? (user.rating || 5.0) : 0,
      fromCity: targetParcel.fromCity,
      toCity: targetParcel.toCity,
      date: travelDate,
      time: '10:00 AM',
      vehicleType: 'car',
      availableCapacity: Math.max(10, Math.ceil(targetParcel.weight + 5)),
      pricePerKg: Math.max(50, Math.round(targetParcel.priceOffer / Math.max(1, targetParcel.weight))),
      status: 'active',
    });
  };

  // Pre-Booking Chat: Chat with Sender before offer is accepted
  const handleChatWithSender = async () => {
    if (!user) {
      showAlert('Sign In Required', 'Please sign in to message the sender.');
      return;
    }
    if (!parcel) return;

    setIsStartingChat(true);
    try {
      // 1. Check existing direct conversation
      const existingConv = conversations.find(
        (c) => c.participants.includes(user.id) && c.participants.includes(parcel.userId)
      );
      if (existingConv) {
        Haptic.tap();
        router.push(`/chat/${encodeURIComponent(String(existingConv.id))}` as never);
        return;
      }

      // 2. If a request already exists between user and parcel
      if (myRequest) {
        const conv = await createConversationAsync({
          requestId: myRequest.id,
          participantIds: [user.id, parcel.userId],
          participantNames: {
            [user.id]: user.fullName || user.name || 'Traveler',
            [parcel.userId]: parcel.userName,
          },
          route: `${parcel.fromCity} → ${parcel.toCity}`,
          parcelDescription: parcel.description,
        });
        if (conv?.id) {
          Haptic.tap();
          router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
          return;
        }
      }

      // 3. Pre-booking chat enquiry: Link or create lightweight enquiry request
      const trip = await getOrCreateTripForRoute(parcel);
      const preReq = await createRequestAsync({
        parcelId: parcel.id,
        tripId: trip.id,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: user.id,
        travellerName: user.fullName || user.name || 'Traveler',
        status: 'pending',
        price: parcel.priceOffer,
        message: `Hi ${parcel.userName}! I am travelling from ${parcel.fromCity} to ${parcel.toCity} and have a quick question about your ${parcel.category} package.`,
      });

      if (preReq?.id) {
        const conv = await createConversationAsync({
          requestId: preReq.id,
          participantIds: [user.id, parcel.userId],
          participantNames: {
            [user.id]: user.fullName || user.name || 'Traveler',
            [parcel.userId]: parcel.userName,
          },
          route: `${parcel.fromCity} → ${parcel.toCity}`,
          parcelDescription: parcel.description,
        });
        if (conv?.id) {
          Haptic.tap();
          router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
          return;
        }
      }

      showAlert('Chat Connected', `You can now coordinate pickup details directly with ${parcel.userName}.`);
    } catch (err: any) {
      Haptic.error();
      showAlert('Chat Notice', getUserErrorMessage(err, 'Unable to initiate chat. Please try making an offer.'));
    } finally {
      setIsStartingChat(false);
    }
  };

  // Instant 1-Tap 'Accept at ₹X'
  const handleInstantAccept = async () => {
    if (!user) {
      showAlert('Sign In Required', 'Please sign in to accept delivery requests.');
      return;
    }
    if (!parcel) return;

    Haptic.confirm();
    setIsSubmittingOffer(true);
    try {
      const trip = await getOrCreateTripForRoute(parcel);
      const result = await createRequestAsync({
        parcelId: parcel.id,
        tripId: trip.id,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: user.id,
        travellerName: user.fullName || user.name || 'Traveler',
        status: 'pending',
        price: parcel.priceOffer,
        message: `Hi ${parcel.userName}! I accepted your delivery offer for ₹${parcel.priceOffer} and can deliver your ${parcel.category} package (${parcel.weight}kg) from ${parcel.fromCity} to ${parcel.toCity}.`,
      });

      if (result) {
        Haptic.success();
        showAlert(
          'Offer Accepted! 🎉',
          `You agreed to carry this parcel for the sender's expected budget of ₹${parcel.priceOffer}. We notified ${parcel.userName}!`,
          [
            { text: 'Chat with Sender', onPress: handleChatWithSender },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        showAlert('Error', 'Could not send offer. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not send offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Counter Offer Submit
  const handleCounterOfferSubmit = async (counterPrice: number, counterNote?: string) => {
    if (!user) {
      showAlert('Sign In Required', 'Please sign in to propose counter offers.');
      return;
    }
    if (!parcel) return;

    setIsSubmittingOffer(true);
    try {
      const trip = await getOrCreateTripForRoute(parcel);
      const result = await createRequestAsync({
        parcelId: parcel.id,
        tripId: trip.id,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: user.id,
        travellerName: user.fullName || user.name || 'Traveler',
        status: 'pending',
        price: counterPrice,
        message:
          counterNote ||
          `Hi ${parcel.userName}! I proposed a counter offer of ₹${counterPrice} to carry your ${parcel.category} package (${parcel.weight}kg) from ${parcel.fromCity} to ${parcel.toCity}.`,
      });

      if (result) {
        setShowCounterSheet(false);
        Haptic.success();
        showAlert(
          'Counter Offer Sent! 🎉',
          `Your counter offer of ₹${counterPrice} was sent to ${parcel.userName}. You will be notified when they respond.`,
          [
            { text: 'Chat with Sender', onPress: handleChatWithSender },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        showAlert('Error', 'Could not send counter offer. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not send counter offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleShareParcel = async () => {
    if (!parcel) return;
    try {
      await Share.share({
        message: `CarryGo Shipment: ${parcel.description} from ${parcel.fromCity} to ${parcel.toCity}! Weight: ${parcel.weight}kg, Reward: ₹${parcel.priceOffer}. Connect with me on CarryGo.`,
      });
    } catch {
      // Ignored
    }
  };

  if (!parcel) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  const isParcelOpen = parcel.status === 'open';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Floating App Bar strictly matching index.styles.ts */}
      <View
        style={[
          styles.topNavBar,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: C.surface,
            borderBottomColor: C.surfaceBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          style={[
            styles.roundNavBtn,
            { backgroundColor: C.card, borderColor: C.surfaceBorder },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isTravelerMode ? 'Parcel Details' : 'Manage Shipment'}
          </Text>
          <View style={styles.navSubRow}>
            <View
              style={[
                styles.navStatusDot,
                { backgroundColor: isParcelOpen ? '#10B981' : C.primary },
              ]}
            />
            <Text style={[styles.navSubtitle, { color: C.textMuted }]}>
              {isTravelerMode ? 'SENDER REQUEST' : parcel.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.navRightRow}>
          {/* Pre-Booking Chat Icon in Header */}
          {isTravelerMode && !isSender ? (
            <Pressable
              onPress={handleChatWithSender}
              style={[
                styles.roundNavBtn,
                { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
              ]}
              hitSlop={6}
              disabled={isStartingChat}
              accessibilityRole="button"
              accessibilityLabel="Chat with sender"
            >
              {isStartingChat ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#10B981" />
              )}
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleShareParcel}
            style={[
              styles.roundNavBtn,
              { backgroundColor: C.card, borderColor: C.surfaceBorder },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Share parcel"
          >
            <MaterialIcons name="share" size={18} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingBottom: isTravelerMode && !isSender ? insets.bottom + 110 : insets.bottom + 36,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {/* 1. Parcel Information Review: Larger Image Showcase with fallback & Zoom */}
        <View
          style={[
            styles.packageCard,
            S.card,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptic.tap();
              setShowImageModal(true);
            }}
            style={styles.packageImageContainer}
            accessibilityRole="button"
            accessibilityLabel="View full photo"
          >
            <Image
              source={resolvedPhoto && !imgError ? { uri: resolvedPhoto } : fallbackImage}
              style={styles.packageImage}
              contentFit="cover"
              onError={() => setImgError(true)}
              transition={200}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.65)']}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Overlays on photo: Category chip + Inspect hint */}
            <View style={styles.imageOverlayTop}>
              <View style={[styles.categoryBadgePill, { backgroundColor: catMeta.bg }]}>
                <MaterialIcons name={catMeta.icon} size={14} color={catMeta.color} />
                <Text style={[styles.categoryBadgeText, { color: catMeta.color }]}>
                  {catMeta.label}
                </Text>
              </View>

              <View style={styles.weightOverlayBadge}>
                <MaterialIcons name="fitness-center" size={12} color="#FFFFFF" />
                <Text style={styles.weightOverlayBadgeText}>{parcel.weight} kg</Text>
              </View>
            </View>

            <View style={styles.imageOverlayBottom}>
              <Text style={styles.packageImageTitle} numberOfLines={2}>
                {parcel.description || `${catMeta.label} Package`}
              </Text>
              <View style={styles.tapToZoomRow}>
                <MaterialIcons name="fullscreen" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.tapToZoomText}>Tap to inspect full photo</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* 2. Sender's Expected Price Card strictly matching index.styles.ts */}
        <View
          style={[
            styles.priceOfferCard,
            S.card,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <View style={styles.priceOfferHeader}>
            <View style={styles.priceOfferTitleCol}>
              <Text style={[styles.priceOfferSubLabel, { color: C.textMuted }]}>
                SENDER'S EXPECTED REWARD
              </Text>
              <Text style={[styles.priceOfferAmount, { color: '#064E3B' }]}>
                ₹{parcel.priceOffer}
              </Text>
              <Text style={[styles.priceOfferDetails, { color: C.textSecondary }]}>
                Budget proposed by sender for carrying {parcel.weight} kg
              </Text>
            </View>

            <View style={[styles.escrowShieldBadge, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="security" size={18} color="#10B981" />
              <Text style={styles.escrowShieldText}>100% Escrow</Text>
            </View>
          </View>
        </View>

        {/* 3. Precise Pickup & Drop-Off Requirements Card strictly matching index.styles.ts */}
        <View
          style={[
            styles.requirementsCard,
            S.card,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>
            Route & Requirements
          </Text>

          {/* Route Flow */}
          <View style={styles.routeFlow}>
            {/* Origin Step */}
            <View style={styles.routeStep}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.pickupDot, { backgroundColor: '#10B981' }]} />
                <View style={[styles.verticalLine, { backgroundColor: C.surfaceBorder }]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, { color: C.textMuted }]}>PICKUP LOCATION</Text>
                <Text style={[styles.stepCity, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
                <Text style={[styles.stepDetail, { color: C.textSecondary }]}>
                  Doorstep / agreed rendezvous in {parcel.fromCity}
                </Text>
              </View>
            </View>

            {/* Destination Step */}
            <View style={styles.routeStep}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.dropoffPin, { backgroundColor: '#EF4444' }]}>
                  <MaterialIcons name="location-on" size={12} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, { color: C.textMuted }]}>
                  DELIVERY DESTINATION
                </Text>
                <Text style={[styles.stepCity, { color: C.textPrimary }]}>{parcel.toCity}</Text>
                <Text style={[styles.stepDetail, { color: '#047857' }]}>
                  Deliver by: {formattedDeliveryDate}
                </Text>
              </View>
            </View>
          </View>

          {/* Package Details Breakdown */}
          <View style={[styles.specsGrid, { backgroundColor: C.surfaceElevated }]}>
            <View style={styles.specItem}>
              <Text style={[styles.specLabel, { color: C.textMuted }]}>WEIGHT</Text>
              <Text style={[styles.specVal, { color: C.textPrimary }]}>{parcel.weight} kg</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.specItem}>
              <Text style={[styles.specLabel, { color: C.textMuted }]}>CATEGORY</Text>
              <Text style={[styles.specVal, { color: C.textPrimary, textTransform: 'capitalize' }]}>
                {parcel.category}
              </Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.specItem}>
              <Text style={[styles.specLabel, { color: C.textMuted }]}>TIER</Text>
              <Text style={[styles.specVal, { color: C.textPrimary }]}>
                {parcel.weight <= 2 ? 'Small' : parcel.weight <= 5 ? 'Medium' : 'Large'}
              </Text>
            </View>
          </View>

          {/* Sender Special Instructions */}
          {parcel.description ? (
            <View style={[styles.notesBox, { borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="notes" size={16} color={C.textMuted} />
              <Text style={[styles.notesText, { color: C.textSecondary }]}>
                {parcel.description}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 4. Sender Information & Pre-Booking Chat Card */}
        <View
          style={[
            styles.senderCard,
            S.card,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <View style={styles.senderLeft}>
            <View style={[styles.senderAvatarBox, { backgroundColor: C.surfaceElevated }]}>
              {parcel.userAvatar ? (
                <Image
                  source={{ uri: resolveImageUrl(parcel.userAvatar) }}
                  style={styles.senderAvatarImg}
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.senderAvatarInitial, { color: '#10B981' }]}>
                  {(parcel.userName || 'S').trim().charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.senderMetaCol}>
              <View style={styles.senderNameRow}>
                <Text style={[styles.senderNameText, { color: C.textPrimary }]}>
                  {parcel.userName || 'Verified Sender'}
                </Text>
                <MaterialIcons name="verified" size={14} color="#10B981" />
              </View>
              <Text style={[styles.senderRatingSub, { color: C.textMuted }]}>
                Verified Sender • Prompt responder
              </Text>
            </View>
          </View>

          {/* Pre-Booking Chat Button */}
          {isTravelerMode && !isSender ? (
            <Pressable
              style={[
                styles.preBookingChatBtn,
                { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
              ]}
              onPress={handleChatWithSender}
              disabled={isStartingChat}
              accessibilityRole="button"
              accessibilityLabel="Chat with sender before offer"
            >
              {isStartingChat ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Ionicons name="chatbubble-ellipses" size={15} color="#10B981" />
                  <Text style={styles.preBookingChatText}>Chat</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        {/* Active Offer Banner (if traveler has already submitted an offer) */}
        {myRequest ? (
          <View
            style={[
              styles.existingOfferCard,
              {
                backgroundColor: myRequest.status === 'accepted' ? '#ECFDF5' : '#FFFBEB',
                borderColor: myRequest.status === 'accepted' ? '#10B981' : '#F59E0B',
              },
            ]}
          >
            <View style={styles.existingOfferIconCircle}>
              <MaterialIcons
                name={myRequest.status === 'accepted' ? 'check-circle' : 'schedule'}
                size={22}
                color={myRequest.status === 'accepted' ? '#10B981' : '#D97706'}
              />
            </View>
            <View style={styles.existingOfferTextCol}>
              <Text
                style={[
                  styles.existingOfferTitle,
                  { color: myRequest.status === 'accepted' ? '#064E3B' : '#92400E' },
                ]}
              >
                {myRequest.status === 'accepted'
                  ? 'Your Offer Was Accepted!'
                  : `Offer Sent: ₹${myRequest.price}`}
              </Text>
              <Text
                style={[
                  styles.existingOfferSub,
                  { color: myRequest.status === 'accepted' ? '#047857' : '#B45309' },
                ]}
              >
                {myRequest.status === 'accepted'
                  ? 'You are matched to carry this parcel! Coordinate pickup details in chat.'
                  : `Waiting for ${parcel.userName}'s response. You can also chat or update your price.`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Sender-Only: Carrier Bids & Proposals Management Section */}
        {isSender ? (
          <View style={styles.proposalsSection}>
            <View style={styles.proposalsHeaderRow}>
              <View style={styles.proposalsTitleRow}>
                <Text style={[styles.proposalsTitle, { color: C.textPrimary }]}>
                  Carrier Bids
                </Text>
                <View style={[styles.proposalsCountBadge, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.proposalsCountText, { color: C.primary }]}>
                    {visibleRequests.length}
                  </Text>
                </View>
              </View>

              <View style={styles.filterPillsRow}>
                {[
                  { key: 'all' as TabFilter, label: 'All' },
                  { key: 'pending' as TabFilter, label: 'Pending' },
                  { key: 'active' as TabFilter, label: 'Active' },
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
                        },
                      ]}
                      onPress={() => {
                        Haptic.select();
                        setSelectedTab(tab.key);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: isSelected ? '#fff' : C.textMuted },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color="#10B981" style={{ marginVertical: 32 }} />
            ) : visibleRequests.length === 0 ? (
              <View style={[styles.emptyBidsCard, { backgroundColor: C.card, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="radar" size={32} color="#10B981" />
                <Text style={[styles.emptyBidsTitle, { color: C.textPrimary }]}>
                  Waiting for Carrier Offers
                </Text>
                <Text style={[styles.emptyBidsSub, { color: C.textMuted }]}>
                  Your parcel is active on the marketplace. Travellers on this route can submit offers to deliver it.
                </Text>
              </View>
            ) : (
              <View style={styles.proposalsList}>
                {visibleRequests.map((req) => (
                  <ProposalCard
                    key={req.id}
                    request={req}
                    viewerRole={viewerRole}
                    onAccept={() => {
                      updateRequestStatusAsync({ requestId: req.id, status: 'accepted' });
                      Haptic.success();
                    }}
                    onDecline={() => {
                      updateRequestStatusAsync({ requestId: req.id, status: 'rejected' });
                      Haptic.tap();
                    }}
                    onCancel={() => {
                      updateRequestStatusAsync({ requestId: req.id, status: 'cancelled' });
                    }}
                    onChat={handleChatWithSender}
                    onTrack={() => router.push({ pathname: '/delivery/[id]', params: { id: req.id } })}
                    onPayment={() => router.push({ pathname: '/payment/[id]', params: { id: req.id } })}
                    C={C}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* 5. Dual Action Footer strictly matching index.styles.ts theme (Negotiation Mechanics) */}
      {isTravelerMode && !isSender ? (
        <View
          style={[
            styles.actionFooter,
            {
              backgroundColor: C.card,
              borderTopColor: C.surfaceBorder,
              paddingBottom: Math.max(insets.bottom, 12) + Spacing.xs,
            },
          ]}
        >
          {myRequest && myRequest.status === 'accepted' ? (
            <Pressable
              style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleChatWithSender}
              accessibilityRole="button"
              accessibilityLabel="Open chat with sender"
            >
              <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Coordinate in Chat</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.dualActionRow}>
              {/* Button 1: Send Counter Offer */}
              <Pressable
                style={[
                  styles.counterOfferBtn,
                  {
                    backgroundColor: '#ECFDF5',
                    borderColor: '#10B981',
                  },
                ]}
                onPress={() => {
                  Haptic.select();
                  setShowCounterSheet(true);
                }}
                disabled={isSubmittingOffer}
                accessibilityRole="button"
                accessibilityLabel="Send counter offer"
              >
                <MaterialIcons name="edit" size={16} color="#064E3B" />
                <Text style={styles.counterOfferBtnText}>Send Counter Offer</Text>
              </Pressable>

              {/* Button 2: Quick 1-Tap 'Accept at ₹X' */}
              <Pressable
                style={[
                  styles.acceptOriginalBtn,
                  {
                    backgroundColor: '#10B981',
                    opacity: isSubmittingOffer ? 0.7 : 1,
                  },
                ]}
                onPress={handleInstantAccept}
                disabled={isSubmittingOffer}
                accessibilityRole="button"
                accessibilityLabel={`Accept at ${parcel.priceOffer} rupees`}
              >
                {isSubmittingOffer ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.acceptOriginalBtnText}>
                      Accept at ₹{parcel.priceOffer}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {/* 6. Counter Offer Bottom Sheet (GestureBottomSheet) */}
      <TravelerCounterOfferSheet
        visible={showCounterSheet}
        onClose={() => setShowCounterSheet(false)}
        originalPrice={parcel.priceOffer}
        parcelWeight={parcel.weight}
        senderName={parcel.userName || 'Sender'}
        onSubmitCounterOffer={handleCounterOfferSubmit}
        isSubmitting={isSubmittingOffer}
      />

      {/* Full Photo Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={({ pressed }) => [
              styles.modalCloseBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }], opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => {
              Haptic.tap();
              setShowImageModal(false);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
          <Image
            source={resolvedPhoto && !imgError ? { uri: resolvedPhoto } : fallbackImage}
            style={styles.modalImg}
            contentFit="contain"
          />
        </View>
      </Modal>

      {/* Carry Parcel Modal (for quick trip creation if needed) */}
      <CarryParcelModal
        visible={showCarryModal}
        onClose={() => setShowCarryModal(false)}
        parcel={parcel}
        userTrips={userTrips}
        onConfirmCarry={(_tripId, _targetParcel) => handleInstantAccept()}
        onPostTrip={(from, to, minCap) =>
          router.push({
            pathname: '/create-trip',
            params: { fromCity: from, toCity: to, capacity: String(minCap) },
          })
        }
        onQuickCreateAndCarry={(_params, _targetParcel) => handleInstantAccept()}
        isSubmitting={isSubmittingOffer || isCreatingRequest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Navigation Bar strictly matching index.styles.ts
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  roundNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitleContainer: {
    alignItems: 'center',
    gap: 2,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  navSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  navStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navSubtitle: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  navRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scrollBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // 1. Package Image Showcase Card
  packageCard: {
    borderRadius: BorderRadius.xl, // 24 from index.styles.ts
    borderWidth: 1,
    overflow: 'hidden',
  },
  packageImageContainer: {
    height: 250,
    position: 'relative',
  },
  packageImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  weightOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  weightOverlayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  imageOverlayBottom: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    gap: 4,
  },
  packageImageTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: FontWeight.extrabold,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  tapToZoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToZoomText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },

  // 2. Sender's Expected Price Card
  priceOfferCard: {
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    padding: Spacing.md,
  },
  priceOfferHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  priceOfferTitleCol: {
    flex: 1,
    gap: 2,
  },
  priceOfferSubLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  priceOfferAmount: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  priceOfferDetails: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  escrowShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  escrowShieldText: {
    color: '#064E3B',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // 3. Requirements Card
  requirementsCard: {
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  routeFlow: {
    gap: 4,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  verticalLine: {
    width: 2,
    height: 36,
    marginTop: 4,
    borderRadius: 1,
  },
  dropoffPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  stepCity: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stepDetail: {
    fontSize: 11,
  },
  specsGrid: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  specVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  specDivider: {
    width: 1,
    height: 24,
    alignSelf: 'center',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
  },
  notesText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },

  // 4. Sender Information Card
  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  senderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  senderAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  senderAvatarImg: {
    width: '100%',
    height: '100%',
  },
  senderAvatarInitial: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  senderMetaCol: {
    flex: 1,
    gap: 2,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  senderNameText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  senderRatingSub: {
    fontSize: 11,
  },
  preBookingChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  preBookingChatText: {
    color: '#064E3B',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Existing offer card
  existingOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  existingOfferIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingOfferTextCol: {
    flex: 1,
    gap: 2,
  },
  existingOfferTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  existingOfferSub: {
    fontSize: 11,
    lineHeight: 15,
  },

  // 5. Dual Action Footer strictly matching index.styles.ts
  actionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  counterOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minHeight: 48,
  },
  counterOfferBtnText: {
    color: '#064E3B',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  acceptOriginalBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptOriginalBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Sender Proposals Section
  proposalsSection: {
    gap: Spacing.md,
  },
  proposalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proposalsTitle: {
    fontSize: 18,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  proposalsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proposalsCountText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  emptyBidsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyBidsTitle: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  emptyBidsSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  proposalsList: {
    gap: Spacing.md,
  },
  proposalCard: {
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  carrierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carrierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carrierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierAvatarText: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  carrierMeta: {
    gap: 2,
  },
  carrierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carrierName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  carrierDate: {
    fontSize: 11,
  },
  bidAmountBox: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  bidLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  carrierMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  carrierMessageText: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  proposalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelOfferText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  chatOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  chatOfferText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  acceptOfferBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
  },
  acceptOfferText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  escrowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  escrowBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  trackLiveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    overflow: 'hidden',
  },
  trackLiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  deliveryCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryCompletedText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Full photo modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImg: {
    width: '94%',
    height: '75%',
  },
});
