import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Share, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useParcelQuery, useUpdateParcelStatusMutation, useTripsQuery, useTripQuery, useCreateTripMutation, flattenInfiniteData } from '@/features/listings/queries';
import { useRequestsByParcelQuery, useUpdateRequestStatusMutation, useCreateRequestMutation } from '@/features/requests/queries';
import { CarryParcelModal, QuickCarryTripParams } from '@/components/feature/CarryParcelModal';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, StatusBarGeometry } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

const categoryGradients: Record<string, [string, string]> = {
  documents: ['#475569', '#1E293B'],
  electronics: ['#0284C7', '#0369A1'],
  clothing: ['#BE185D', '#831843'],
  food: ['#EA580C', '#9A3412'],
  medicine: ['#059669', '#064E3B'],
  other: ['#059669', '#064E3B'],
};

interface ProposalCardProps {
  request: Request;
  parcelCategory?: string;
  isSender: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onChat: () => void;
  onTrack: () => void;
  C: ThemeColors;
}

const CATEGORY_LABELS: Record<string, string> = {
  documents: 'Documents',
  electronics: 'Electronics',
  clothing: 'Clothing',
  food: 'Food',
  medicine: 'Medicine',
  other: 'General',
};

function ProposalCard({
  request,
  parcelCategory,
  isSender,
  onAccept,
  onDecline,
  onChat,
  onTrack,
  C,
}: ProposalCardProps) {
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';

  // Fetch trip to show carrier's allowed categories (only matters to sender)
  const tripQuery = useTripQuery(isSender && isPending ? request.tripId : undefined);
  const allowed = tripQuery.data?.allowedCategories;
  const categoryMismatch = Boolean(
    isSender && isPending && parcelCategory && allowed && allowed.length > 0 && !allowed.includes(parcelCategory as any)
  );

  const dateStr = useMemo(() => {
    const d = request.createdAt ? new Date(request.createdAt) : null;
    return d && !isNaN(d.getTime())
      ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : 'Recently';
  }, [request.createdAt]);

  return (
    <View style={[styles.proposalCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {/* Carrier Info Header */}
      <View style={styles.carrierHeader}>
        <View style={styles.carrierLeft}>
          <View style={[styles.carrierAvatar, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.carrierAvatarText, { color: C.primary }]}>
              {(request.travellerName || 'T').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.carrierMeta}>
            <View style={styles.carrierNameRow}>
              <Text style={[styles.carrierName, { color: C.textPrimary }]}>
                {request.travellerName || 'Traveler'}
              </Text>
              <View style={[styles.verifiedPill, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="verified" size={11} color={C.success} />
                <Text style={[styles.verifiedPillText, { color: C.success }]}>Verified</Text>
              </View>
            </View>
            <Text style={[styles.carrierDate, { color: C.textMuted }]}>
              Offered {dateStr}
            </Text>
          </View>
        </View>

        <View style={styles.bidAmountBox}>
          <Text style={[styles.bidAmount, { color: C.textPrimary }]}>₹{request.price}</Text>
          <Text style={[styles.bidLabel, { color: C.textMuted }]}>Offered</Text>
        </View>
      </View>

      {/* Message from Carrier (if present) */}
      {request.message ? (
        <View style={[styles.carrierMessageBox, { backgroundColor: C.surfaceElevated }]}>
          <Text style={[styles.carrierMessageText, { color: C.textSecondary }]}>
            {request.message}
          </Text>
        </View>
      ) : null}

      {/* Carrier can-carry snapshot (visible to sender on pending offer) */}
      {isSender && isPending && allowed && allowed.length > 0 ? (
        <View style={styles.carrierCanCarryRow}>
          <MaterialIcons name="inventory-2" size={12} color={C.textMuted} />
          <Text style={[styles.carrierCanCarryLabel, { color: C.textMuted }]}>CAN CARRY:</Text>
          <View style={styles.carrierCanCarryPills}>
            {allowed.map((cat) => {
              const isMatch = parcelCategory === cat;
              return (
                <View
                  key={cat}
                  style={[
                    styles.carrierCanCarryPill,
                    {
                      backgroundColor: isMatch ? C.successSubtle : C.surfaceElevated,
                      borderColor: isMatch ? C.successBorder : C.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.carrierCanCarryPillText, { color: isMatch ? C.success : C.textSecondary }]}>
                    {CATEGORY_LABELS[cat] || cat}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {categoryMismatch ? (
        <View style={[styles.carrierMismatchBox, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder }]}>
          <MaterialIcons name="warning-amber" size={14} color={C.error} />
          <Text style={[styles.carrierMismatchText, { color: C.error }]}>
            This carrier doesn't carry {parcelCategory}. Review carefully before accepting.
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      {isSender && isPending ? (
        <View style={styles.proposalActionsRow}>
          {onDecline ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                { borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7 }
              ]}
              onPress={onDecline}
            >
              <Text style={[styles.actionBtnText, { color: C.error }]}>Decline</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 }
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {onAccept ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnPrimary,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9 }
              ]}
              onPress={onAccept}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnPrimaryText}>Accept</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isAccepted ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 }
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.9 }
            ]}
            onPress={onTrack}
          >
            <MaterialIcons name="radar" size={16} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Track Delivery</Text>
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.deliveryCompletedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={[styles.deliveryCompletedText, { color: C.success }]}>
            Delivered
          </Text>
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
  const { C } = useThemeColors();

  const parcelQuery = useParcelQuery(id);
  const requestsQuery = useRequestsByParcelQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);
  const tripsQuery = useTripsQuery(true);
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);
  const createTripMutation = useCreateTripMutation();

  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCarryModal, setShowCarryModal] = useState(false);

  const parcel = (parcelQuery.data ?? undefined) as Parcel | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const allTrips = flattenInfiniteData(tripsQuery.data);
  const userTrips = useMemo(() => allTrips.filter(t => t.userId === user?.id && t.status === 'active'), [allTrips, user?.id]);
  const myRequest = useMemo(() => requests.find(r => r.travellerId === user?.id && ['pending', 'accepted'].includes(r.status)), [requests, user?.id]);
  const loading = parcelQuery.isLoading || requestsQuery.isLoading;

  const isSender = parcel?.userId === user?.id;
  const isParcelOpen = parcel?.status === 'open';

  // Visible requests: sender sees all proposals; traveler sees only their own
  const visibleRequests = useMemo(() => {
    if (isSender) return requests;
    return requests.filter(request => request.travellerId === user?.id);
  }, [isSender, requests, user?.id]);

  const catGradient: [string, string] = parcel
    ? (categoryGradients[parcel.category] || ['#1A4CA2', '#123777'])
    : ['#1A4CA2', '#123777'];

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

  const handleConfirmCarry = async (tripId: string, targetParcel: Parcel) => {
    if (!user) return;
    const chosenTrip = userTrips.find(t => t.id === tripId);
    if (!chosenTrip) return;

    try {
      const result = await createRequestAsync({
        parcelId: targetParcel.id,
        tripId: chosenTrip.id,
        senderId: targetParcel.userId,
        senderName: targetParcel.userName,
        travellerId: user.id,
        travellerName: user.name || 'Traveller',
        status: 'pending',
        price: targetParcel.priceOffer,
        message: `Hi ${targetParcel.userName}! I am travelling on ${chosenTrip.date} and can deliver your ${targetParcel.category} package (${targetParcel.weight}kg) for ₹${targetParcel.priceOffer}.`,
      });

      if (result) {
        setShowCarryModal(false);
        Haptic.success();
        showAlert(
          'Offer Sent! 🎉',
          `Your offer to carry this parcel for ₹${targetParcel.priceOffer} was sent to ${targetParcel.userName}.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
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
    }
  };

  const handlePostTripForParcel = (fromCity: string, toCity: string, minCapacity: number) => {
    router.push({
      pathname: '/create-trip',
      params: { fromCity, toCity, capacity: String(minCapacity) },
    });
  };

  const handleQuickCreateAndCarry = async (quickParams: QuickCarryTripParams, targetParcel: Parcel) => {
    if (!user) return;
    try {
      const newTrip = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'Traveller',
        userRating: user.totalRatings && user.totalRatings > 0 ? (user.rating || 5.0) : 0,
        fromCity: targetParcel.fromCity,
        toCity: targetParcel.toCity,
        date: quickParams.date,
        time: quickParams.time,
        vehicleType: quickParams.vehicleType,
        availableCapacity: quickParams.capacity,
        pricePerKg: Math.max(50, Math.round(targetParcel.priceOffer / Math.max(1, targetParcel.weight))),
        status: 'active',
      });

      const result = await createRequestAsync({
        parcelId: targetParcel.id,
        tripId: newTrip.id,
        senderId: targetParcel.userId,
        senderName: targetParcel.userName,
        travellerId: user.id,
        travellerName: user.name || 'Traveller',
        status: 'pending',
        price: targetParcel.priceOffer,
        message: `Hi ${targetParcel.userName}! I am travelling from ${targetParcel.fromCity} to ${targetParcel.toCity} on ${quickParams.date} and can deliver your ${targetParcel.category} package (${targetParcel.weight}kg) for ₹${targetParcel.priceOffer}.`,
      });

      if (result) {
        setShowCarryModal(false);
        Haptic.success();
        showAlert(
          'Trip Posted & Offer Sent! 🎉',
          `Your trip was posted and your offer (₹${targetParcel.priceOffer}) was sent to ${targetParcel.userName}.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await Promise.all([requestsQuery.refetch(), tripsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send carry offer. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not post trip and send offer.');
    }
  };

  const handleAcceptProposal = (req: Request) => {
    showAlert('Accept Offer?', `Accept ${req.travellerName}'s offer to carry this parcel for ₹${req.price}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await updateRequestStatusAsync({ requestId: req.id, status: 'accepted' });
            Haptic.success();
            await Promise.all([requestsQuery.refetch(), parcelQuery.refetch()]);
            showAlert('Offer Accepted! 🎉', 'You can now coordinate pickup details directly in chat.');
          } catch (error) {
            Haptic.error();
            showAlert('Could Not Accept', getUserErrorMessage(error, 'Failed to accept offer.'));
          }
        },
      },
    ]);
  };

  const handleDeclineProposal = (req: Request) => {
    showAlert('Decline Offer?', `Decline ${req.travellerName}'s offer to carry this parcel?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateRequestStatusAsync({ requestId: req.id, status: 'rejected' });
            Haptic.tap();
            await requestsQuery.refetch();
          } catch (error) {
            Haptic.error();
            showAlert('Could Not Decline', getUserErrorMessage(error, 'Failed to decline offer.'));
          }
        },
      },
    ]);
  };

  const handleChat = (req: Request) => {
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) {
      router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    } else {
      showAlert('Chat', 'Chat is ready once the request is accepted.');
    }
  };

  const handleCancelParcel = () => {
    if (!parcel || !isSender) return;
    showAlert('Cancel Parcel?', 'This will remove your parcel listing from the marketplace.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Parcel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'cancelled' });
            Haptic.success();
            showAlert('Parcel Cancelled', 'Your parcel listing has been cancelled.');
          } catch (error) {
            Haptic.error();
            showAlert('Error', getUserErrorMessage(error, 'Could not cancel parcel. Please try again.'));
          }
        },
      },
    ]);
  };

  const handleShareParcel = async () => {
    if (!parcel) return;
    try {
      await Share.share({
        message: `CaryGoo Parcel: ${parcel.description} from ${parcel.fromCity} to ${parcel.toCity} (${parcel.weight}kg, ₹${parcel.priceOffer}).`,
      });
    } catch {
      // Ignored
    }
  };

  if (!parcel) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const showBottomBar = !isSender && isParcelOpen && !myRequest;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.topNavBar, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top) }]}>
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
            {isSender ? 'Manage Parcel' : 'Parcel Details'}
          </Text>
          <View style={[
            styles.statusCapsule,
            { backgroundColor: isParcelOpen ? C.successSubtle : C.surfaceElevated }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isParcelOpen ? C.success : C.textMuted }
            ]} />
            <Text style={[
              styles.statusCapsuleText,
              { color: isParcelOpen ? C.success : C.textMuted }
            ]}>
              {parcel.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.navRightRow}>
          <Pressable
            onPress={handleShareParcel}
            style={({ pressed }) => [
              styles.roundNavBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            hitSlop={6}
          >
            <MaterialIcons name="share" size={18} color={C.textSecondary} />
          </Pressable>

          {isSender && isParcelOpen ? (
            <Pressable
              onPress={handleCancelParcel}
              style={({ pressed }) => [
                styles.roundNavBtn,
                { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
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
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: showBottomBar ? insets.bottom + 90 : insets.bottom + 36 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Package Card */}
        <View style={[styles.packageCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {parcel.imageUri ? (
            <Pressable onPress={() => setShowImageModal(true)} style={styles.packageImageContainer}>
              <Image source={{ uri: parcel.imageUri }} style={styles.packageImage} contentFit="cover" />
              <View style={styles.imageOverlayTop}>
                <View style={[styles.categoryBadgePill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={14} color="#fff" />
                  <Text style={styles.categoryBadgeText}>{parcel.category.toUpperCase()}</Text>
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.packageNoImageHeader}>
              <LinearGradient
                colors={catGradient}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.noImageTop}>
                <View style={styles.noImageCategoryPill}>
                  <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={14} color="#fff" />
                  <Text style={styles.noImageCategoryText}>{parcel.category.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.packageDetailsBody}>
            {/* Title / Description */}
            <Text style={[styles.parcelTitle, { color: C.textPrimary }]}>
              {parcel.description}
            </Text>

            {/* Clean Route: Origin ➔ Destination */}
            <View style={[styles.routeRow, { backgroundColor: C.surfaceElevated }]}>
              <View style={styles.routeCityBox}>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>FROM</Text>
                <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.fromCity}
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={18} color={C.primary} />
              <View style={[styles.routeCityBox, { alignItems: 'flex-end' }]}>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>TO</Text>
                <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.toCity}
                </Text>
              </View>
            </View>

            {/* 3 Metric Pills: Weight, Category, Reward */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricItem, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Weight</Text>
                <Text style={[styles.metricValue, { color: C.textPrimary }]}>{parcel.weight} kg</Text>
              </View>

              <View style={[styles.metricItem, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Category</Text>
                <Text style={[styles.metricValue, { color: C.textPrimary }]}>
                  {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
                </Text>
              </View>

              <View style={[styles.metricItem, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Reward</Text>
                <Text style={[styles.metricValue, { color: C.primary }]}>
                  {parcel.priceOffer ? `₹${parcel.priceOffer}` : 'Negotiable'}
                </Text>
              </View>
            </View>

            {/* Sender attribution (for travelers) */}
            {!isSender ? (
              <View style={[styles.senderRow, { borderTopColor: C.surfaceBorder }]}>
                <View style={[styles.senderAvatar, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.senderAvatarText, { color: C.primary }]}>
                    {(parcel.userName || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.senderLabel, { color: C.textMuted }]}>Sender</Text>
                  <Text style={[styles.senderName, { color: C.textPrimary }]}>{parcel.userName}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Traveler Perspective: Current Request Status Banner */}
        {!isSender && myRequest ? (
          <View style={[
            styles.statusBanner,
            {
              backgroundColor: myRequest.status === 'accepted' ? C.successSubtle : C.surface,
              borderColor: myRequest.status === 'accepted' ? C.successBorder : C.surfaceBorder,
            }
          ]}>
            <View style={styles.statusBannerIcon}>
              <MaterialIcons
                name={myRequest.status === 'accepted' ? 'check-circle' : 'schedule'}
                size={22}
                color={myRequest.status === 'accepted' ? C.success : C.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: C.textPrimary }]}>
                {myRequest.status === 'accepted' ? 'Offer Accepted' : 'Offer Sent'}
              </Text>
              <Text style={[styles.statusBannerSub, { color: C.textMuted }]}>
                {myRequest.status === 'accepted'
                  ? 'Coordinate pickup with the sender in chat.'
                  : `Waiting for ${parcel.userName} to accept your ₹${myRequest.price} offer.`}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.statusBannerAction,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.85 }
              ]}
              onPress={() => handleChat(myRequest)}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#FFFFFF" />
              <Text style={styles.statusBannerActionText}>Chat</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Sender Perspective: Carrier Offers */}
        {isSender ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                Carrier Offers
              </Text>
              <View style={[styles.countBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.countBadgeText, { color: C.primary }]}>
                  {visibleRequests.length}
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
            ) : visibleRequests.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="local-shipping" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                  No Offers Yet
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  We'll notify you when a traveler offers to carry your parcel.
                </Text>
                {isParcelOpen ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.findTravelersBtn,
                      { backgroundColor: C.primary },
                      pressed && { opacity: 0.9 }
                    ]}
                    onPress={() => router.push({ pathname: '/search', params: { mode: 'parcel', id: parcel.id } })}
                  >
                    <MaterialIcons name="search" size={16} color="#fff" />
                    <Text style={styles.findTravelersText}>Find Matching Travelers</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.proposalsList}>
                {visibleRequests.map((req) => (
                  <ProposalCard
                    key={req.id}
                    request={req}
                    parcelCategory={parcel.category}
                    isSender={isSender}
                    onAccept={() => handleAcceptProposal(req)}
                    onDecline={() => handleDeclineProposal(req)}
                    onChat={() => handleChat(req)}
                    onTrack={() => router.push({ pathname: '/delivery/[id]', params: { id: req.id } })}
                    C={C}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Fixed Bottom Action Bar for Traveler */}
      {showBottomBar ? (
        <View style={[
          styles.fixedBottomBar,
          {
            backgroundColor: C.surface,
            borderTopColor: C.surfaceBorder,
            paddingBottom: insets.bottom + 10,
          }
        ]}>
          <View style={styles.bottomBarInner}>
            <View>
              <Text style={[styles.bottomBarLabel, { color: C.textMuted }]}>Offered Reward</Text>
              <Text style={[styles.bottomBarPrice, { color: C.textPrimary }]}>
                {parcel.priceOffer ? `₹${parcel.priceOffer}` : 'Negotiable'}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryCtaBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9 }
              ]}
              onPress={() => {
                if (!user) {
                  Haptic.warning();
                  showAlert('Sign In Required', 'Please sign in to offer to carry this parcel.');
                  return;
                }
                Haptic.tap();
                setShowCarryModal(true);
              }}
            >
              <MaterialIcons name="local-shipping" size={18} color="#fff" />
              <Text style={styles.primaryCtaText}>Deliver This Parcel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <CarryParcelModal
        visible={showCarryModal}
        onClose={() => setShowCarryModal(false)}
        parcel={parcel}
        userTrips={userTrips}
        onConfirmCarry={handleConfirmCarry}
        onPostTrip={handlePostTripForParcel}
        onQuickCreateAndCarry={handleQuickCreateAndCarry}
        isSubmitting={isCreatingRequest || createTripMutation.isPending}
      />

      {/* Full Photo Modal */}
      {parcel.imageUri ? (
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                Haptic.tap();
                setShowImageModal(false);
              }}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
            <Image
              source={{ uri: parcel.imageUri }}
              style={styles.modalImg}
              contentFit="contain"
            />
          </View>
        </Modal>
      ) : null}
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

  // Navigation Bar
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  roundNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitleContainer: {
    alignItems: 'center',
    gap: 3,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusCapsuleText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  navRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },

  // Package Card
  packageCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  packageImageContainer: {
    height: 200,
    position: 'relative',
  },
  packageImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  categoryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  packageNoImageHeader: {
    padding: Spacing.lg,
    height: 72,
    justifyContent: 'center',
  },
  noImageTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noImageCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  noImageCategoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  packageDetailsBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  parcelTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    lineHeight: 24,
  },

  // Route Box
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mdl,
    paddingVertical: Spacing.md,
    borderRadius: 14,
  },
  routeCityBox: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  routeCity: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },

  // Sender Attribution
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderAvatarText: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  senderName: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
  },

  // Traveler Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.mdl,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  statusBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  statusBannerActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Section
  section: {
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Empty Card
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  findTravelersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  findTravelersText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  // Proposals List
  proposalsList: {
    gap: Spacing.sm,
  },
  proposalCard: {
    borderRadius: 16,
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
    gap: 10,
  },
  carrierAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierAvatarText: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  carrierMeta: {
    gap: 2,
  },
  carrierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  carrierName: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  carrierDate: {
    fontSize: 11,
  },
  bidAmountBox: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  bidLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  carrierMessageBox: {
    padding: 10,
    borderRadius: 10,
  },
  carrierMessageText: {
    fontSize: 12,
    lineHeight: 16,
  },
  carrierCanCarryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  carrierCanCarryLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  carrierCanCarryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  carrierCanCarryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  carrierCanCarryPillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  carrierMismatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  carrierMismatchText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  proposalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  actionBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnPrimaryText: {
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

  // Fixed Bottom Bar
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  bottomBarPrice: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImg: {
    width: '90%',
    height: '70%',
  },
});
