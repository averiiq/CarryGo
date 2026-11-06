import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery } from '@/features/conversations/queries';
import {
  useParcelQuery,
  useUpdateParcelStatusMutation,
  useTripsQuery,
  useTripQuery,
  useCreateTripMutation,
  flattenInfiniteData,
} from '@/features/listings/queries';
import {
  useRequestsByParcelQuery,
  useUpdateRequestStatusMutation,
  useCreateRequestMutation,
} from '@/features/requests/queries';
import { CarryParcelModal, QuickCarryTripParams } from '@/components/feature/CarryParcelModal';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, StatusBarGeometry } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { findCity, getDistance } from '@/constants/indian-cities';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { getUserAvatarSource, getCategoryFallbackImage, resolveImageUrl } from '@/constants/images';
import { useResponsive } from '@/hooks/useResponsive';
import { styles } from '@/styles/parcel/[id].styles';

interface CategoryConfig {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bg: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  documents: { label: 'Documents', icon: 'description', color: '#004AAD', bg: 'rgba(0, 74, 173, 0.12)' },
  electronics: { label: 'Electronics', icon: 'devices', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' },
  clothing: { label: 'Clothing', icon: 'checkroom', color: '#9333EA', bg: 'rgba(147, 51, 234, 0.12)' },
  food: { label: 'Food & Edibles', icon: 'restaurant', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.12)' },
  medicine: { label: 'Medicine', icon: 'local-pharmacy', color: '#008B48', bg: 'rgba(0, 139, 72, 0.12)' },
  other: { label: 'General Goods', icon: 'inventory-2', color: '#008B48', bg: 'rgba(0, 139, 72, 0.12)' },
};

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  documents: ['#004AAD', '#002B66'],
  electronics: ['#0284C7', '#0369A1'],
  clothing: ['#9333EA', '#581C87'],
  food: ['#EA580C', '#9A3412'],
  medicine: ['#008B48', '#004D28'],
  other: ['#004AAD', '#008B48'],
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
          <Image
            source={getUserAvatarSource((request as any).travellerAvatar, request.travellerId || request.travellerName)}
            style={[styles.carrierAvatar, { borderColor: C.surfaceBorder }]}
            contentFit="cover"
          />
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
          <Text style={[styles.bidAmount, { color: C.primary }]}>₹{request.price}</Text>
          <Text style={[styles.bidLabel, { color: C.textMuted }]}>Offered Fare</Text>
        </View>
      </View>

      {/* Message from Carrier */}
      {request.message ? (
        <View style={[styles.carrierMessageBox, { backgroundColor: C.surfaceElevated }]}>
          <Text style={[styles.carrierMessageText, { color: C.textSecondary }]}>
            "{request.message}"
          </Text>
        </View>
      ) : null}

      {/* Carrier Can Carry Pills */}
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
                    {CATEGORY_CONFIGS[cat]?.label || cat}
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
            This carrier usually carries other categories. Review carefully before accepting.
          </Text>
        </View>
      ) : null}

      {/* Sender Actions for Pending Offer */}
      {isSender && isPending ? (
        <View style={styles.proposalActionsRow}>
          {onDecline ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                { borderColor: C.errorBorder, backgroundColor: C.surfaceElevated },
                pressed && { opacity: 0.75 },
              ]}
              onPress={onDecline}
            >
              <MaterialIcons name="close" size={14} color={C.error} />
              <Text style={[styles.actionBtnText, { color: C.error }]}>Decline</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              { borderColor: C.surfaceBorder, backgroundColor: C.surfaceElevated },
              pressed && { opacity: 0.75 },
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={14} color={C.textPrimary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {onAccept ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnPrimary,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9 },
              ]}
              onPress={onAccept}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnPrimaryText}>Accept Offer</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Accepted Status Actions */}
      {isAccepted ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              { borderColor: C.surfaceBorder, backgroundColor: C.surfaceElevated },
              pressed && { opacity: 0.75 },
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Open Chat</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              { backgroundColor: C.success },
              pressed && { opacity: 0.9 },
            ]}
            onPress={onTrack}
          >
            <MaterialIcons name="radar" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnPrimaryText}>Track Delivery</Text>
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.deliveryCompletedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={[styles.deliveryCompletedText, { color: C.success }]}>
            Delivered Successfully
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
  const { isSmallDevice, isTablet } = useResponsive();

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

  const catConfig = useMemo(() => {
    const key = (parcel?.category || 'other').toLowerCase();
    return CATEGORY_CONFIGS[key] || CATEGORY_CONFIGS.other;
  }, [parcel?.category]);

  const catGradient = useMemo((): [string, string] => {
    const key = (parcel?.category || 'other').toLowerCase();
    return CATEGORY_GRADIENTS[key] || ['#004AAD', '#002B66'];
  }, [parcel?.category]);

  const distanceKm = useMemo(() => {
    if (!parcel?.fromCity || !parcel?.toCity) return null;
    const c1 = findCity(parcel.fromCity);
    const c2 = findCity(parcel.toCity);
    if (!c1 || !c2) return null;
    const dist = getDistance(c1, c2);
    return dist > 0 ? Math.round(dist) : null;
  }, [parcel?.fromCity, parcel?.toCity]);

  const resolvedImage = useMemo(() => {
    return resolveImageUrl(parcel?.imageUri);
  }, [parcel?.imageUri]);

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
        text: 'Accept Offer',
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
      { text: 'Keep Offer', style: 'cancel' },
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
      { text: 'Keep Listing', style: 'cancel' },
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
    if (parcelQuery.isLoading) {
      return (
        <View style={[styles.center, { backgroundColor: C.background }]}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
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
            <Text style={[styles.navTitle, { color: C.textPrimary }]}>Parcel Details</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.center, { padding: Spacing.xl, gap: Spacing.md }]}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="inventory-2" size={32} color={C.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: FontWeight.bold, color: C.textPrimary, textAlign: 'center' }}>
            Parcel Not Available
          </Text>
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 18 }}>
            This parcel listing might have been completed, expired, or removed.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={() => handleRefresh()}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.surfaceBorder, backgroundColor: C.surface }}
            >
              <Text style={{ fontSize: 13, fontWeight: FontWeight.semibold, color: C.textPrimary }}>Retry</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary }}
            >
              <Text style={{ fontSize: 13, fontWeight: FontWeight.bold, color: '#fff' }}>Browse Marketplace</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const showBottomBar = !isSender && isParcelOpen && !myRequest;
  const statusColor = isParcelOpen ? C.success : parcel.status === 'in_transit' || parcel.status === 'matched' ? C.primary : C.textMuted;
  const statusBg = isParcelOpen ? C.successSubtle : parcel.status === 'in_transit' || parcel.status === 'matched' ? C.primarySubtle : C.surfaceElevated;
  const statusBorder = isParcelOpen ? C.successBorder : parcel.status === 'in_transit' || parcel.status === 'matched' ? C.primaryBorder : C.surfaceBorder;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.topNavBar, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top) }, isTablet && styles.tabletCentered]}>
        <Pressable
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          style={({ pressed }) => [
            styles.roundNavBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.75 },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isSender ? 'Manage Parcel' : 'Parcel Details'}
          </Text>
          <View style={[styles.statusCapsule, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusCapsuleText, { color: statusColor }]}>
              {parcel.status === 'open' ? 'OPEN FOR OFFERS' : parcel.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.navRightRow}>
          <Pressable
            onPress={() => {
              Haptic.tap();
              handleShareParcel();
            }}
            style={({ pressed }) => [
              styles.roundNavBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Share parcel"
          >
            <MaterialIcons name="share" size={18} color={C.textSecondary} />
          </Pressable>

          {isSender && isParcelOpen ? (
            <Pressable
              onPress={() => {
                Haptic.tap();
                handleCancelParcel();
              }}
              style={({ pressed }) => [
                styles.roundNavBtn,
                { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Cancel listing"
            >
              <MaterialIcons name="delete-outline" size={18} color={C.error} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: showBottomBar ? insets.bottom + 96 : insets.bottom + 36 },
          isTablet && styles.tabletCentered,
          isSmallDevice && { paddingHorizontal: Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Creative Digital Waybill Showcase Card */}
        <View style={[styles.showcaseCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Media Header Window */}
          <View style={[styles.mediaContainer, isSmallDevice && { height: 180 }]}>
            {resolvedImage ? (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  setShowImageModal(true);
                }}
                style={{ width: '100%', height: '100%' }}
              >
                <Image
                  source={{ uri: resolvedImage }}
                  style={styles.mediaImage}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.mediaGradientOverlay}
                />
                <View style={styles.zoomBadge}>
                  <MaterialIcons name="zoom-in" size={14} color="#FFFFFF" />
                  <Text style={styles.zoomBadgeText}>Tap to preview</Text>
                </View>
              </Pressable>
            ) : (
              <View style={{ width: '100%', height: '100%' }}>
                <Image
                  source={getCategoryFallbackImage(parcel.category)}
                  style={styles.mediaImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['rgba(0, 74, 173, 0.4)', 'rgba(0, 0, 0, 0.7)']}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            )}

            {/* Badges Over Media */}
            <View style={styles.mediaBadgesTop}>
              <View style={styles.mediaCategoryPill}>
                <MaterialIcons name={catConfig.icon} size={14} color="#FFFFFF" />
                <Text style={styles.mediaCategoryText}>{catConfig.label}</Text>
              </View>

              <View style={styles.mediaWeightPill}>
                <MaterialIcons name="fitness-center" size={13} color="#FFFFFF" />
                <Text style={styles.mediaWeightText}>{parcel.weight} kg</Text>
              </View>
            </View>
          </View>

          {/* Showcase Details Body */}
          <View style={styles.showcaseBody}>
            {/* Header Meta Row */}
            <View style={styles.titleRow}>
              <View style={styles.parcelHeaderMetaRow}>
                <View style={[styles.categoryLabelPill, { backgroundColor: catConfig.bg }]}>
                  <MaterialIcons name={catConfig.icon} size={13} color={catConfig.color} />
                  <Text style={[styles.categoryLabelText, { color: catConfig.color }]}>
                    {catConfig.label}
                  </Text>
                </View>

                <View style={[styles.verifiedBadge, { backgroundColor: C.successSubtle }]}>
                  <MaterialIcons name="verified" size={12} color={C.success} />
                  <Text style={[styles.verifiedBadgeText, { color: C.success }]}>
                    Verified Listing
                  </Text>
                </View>
              </View>

              {/* Title / Description */}
              <Text style={[styles.parcelTitle, { color: C.textPrimary }]}>
                {parcel.description}
              </Text>
            </View>

            {/* Journey / Route Visualizer */}
            <View style={[styles.routeCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.routeHeader}>
                <Text style={[styles.routeHeaderTitle, { color: C.textMuted }]}>Transit Route</Text>
                {distanceKm ? (
                  <View style={[styles.routeDistanceBadge, { backgroundColor: C.primarySubtle }]}>
                    <MaterialIcons name="navigation" size={11} color={C.primary} />
                    <Text style={[styles.routeDistanceText, { color: C.primary }]}>
                      {distanceKm} km
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.routeVisualizer}>
                <View style={styles.routeNode}>
                  <View style={[styles.routeDotOrigin, { backgroundColor: C.success }]} />
                  <Text style={[styles.routeCityName, { color: C.textPrimary }]} numberOfLines={1}>
                    {parcel.fromCity}
                  </Text>
                  <Text style={[styles.routeCitySub, { color: C.textMuted }]}>Pickup Location</Text>
                </View>

                <View style={styles.routeConnector}>
                  <View style={[styles.routeIconCircle, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                    <MaterialIcons name="east" size={16} color={C.primary} />
                  </View>
                </View>

                <View style={[styles.routeNode, { alignItems: 'flex-end' }]}>
                  <View style={[styles.routeDotDest, { backgroundColor: C.primary }]} />
                  <Text style={[styles.routeCityName, { color: C.textPrimary, textAlign: 'right' }]} numberOfLines={1}>
                    {parcel.toCity}
                  </Text>
                  <Text style={[styles.routeCitySub, { color: C.textMuted, textAlign: 'right' }]}>Dropoff City</Text>
                </View>
              </View>
            </View>

            {/* 4 Specifications Cards */}
            <View style={styles.specsGrid}>
              {/* 1. Weight */}
              <View style={[styles.specCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={styles.specHeaderRow}>
                  <View style={[styles.specIconWrap, { backgroundColor: 'rgba(0, 74, 173, 0.1)' }]}>
                    <MaterialIcons name="fitness-center" size={14} color={C.primary} />
                  </View>
                  <Text style={[styles.specLabel, { color: C.textMuted }]}>Package Weight</Text>
                </View>
                <Text style={[styles.specValue, { color: C.textPrimary }]}>{parcel.weight} kg</Text>
              </View>

              {/* 2. Category */}
              <View style={[styles.specCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={styles.specHeaderRow}>
                  <View style={[styles.specIconWrap, { backgroundColor: catConfig.bg }]}>
                    <MaterialIcons name={catConfig.icon} size={14} color={catConfig.color} />
                  </View>
                  <Text style={[styles.specLabel, { color: C.textMuted }]}>Category</Text>
                </View>
                <Text style={[styles.specValue, { color: C.textPrimary }]}>{catConfig.label}</Text>
              </View>

              {/* 3. Send By */}
              <View style={[styles.specCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={styles.specHeaderRow}>
                  <View style={[styles.specIconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.1)' }]}>
                    <MaterialIcons name="event" size={14} color="#EA580C" />
                  </View>
                  <Text style={[styles.specLabel, { color: C.textMuted }]}>Send By</Text>
                </View>
                <Text style={[styles.specValue, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.deliveryDate ? formatScheduleDate(parcel.deliveryDate) : 'Today / Flexible'}
                </Text>
              </View>

              {/* 4. Reward Offering */}
              <View style={[styles.specCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={styles.specHeaderRow}>
                  <View style={[styles.specIconWrap, { backgroundColor: 'rgba(0, 139, 72, 0.12)' }]}>
                    <MaterialIcons name="payments" size={14} color={C.success} />
                  </View>
                  <Text style={[styles.specLabel, { color: C.textMuted }]}>Delivery Reward</Text>
                </View>
                <Text style={[styles.specValue, { color: C.success }]}>
                  {parcel.priceOffer ? `₹${parcel.priceOffer}` : 'Negotiable'}
                </Text>
              </View>
            </View>

            {/* Safe Delivery Guarantee Banner */}
            <View style={[styles.guaranteeBanner, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={[styles.guaranteeIconWrap, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="security" size={20} color={C.success} />
              </View>
              <View style={styles.guaranteeContent}>
                <Text style={[styles.guaranteeTitle, { color: C.textPrimary }]}>
                  CaryGoo Safe Delivery Guarantee
                </Text>
                <Text style={[styles.guaranteeText, { color: C.textMuted }]}>
                  Live package handover verified with sender & recipient OTPs. Safe booking payout protection upon delivery.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sender Attribution Card (Visible to Traveler) */}
        {!isSender ? (
          <View style={[styles.senderCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.senderCardHeader}>
              <View style={styles.senderCardLeft}>
                <Image
                  source={getUserAvatarSource(parcel.userAvatar, parcel.userId || parcel.userName)}
                  style={[styles.senderAvatar, { borderColor: C.surfaceBorder }]}
                  contentFit="cover"
                />
                <View style={styles.senderMeta}>
                  <View style={styles.senderNameRow}>
                    <Text style={[styles.senderName, { color: C.textPrimary }]}>
                      {parcel.userName}
                    </Text>
                    <View style={[styles.senderVerifiedPill, { backgroundColor: C.successSubtle }]}>
                      <MaterialIcons name="verified" size={10} color={C.success} />
                      <Text style={[styles.senderVerifiedText, { color: C.success }]}>Sender</Text>
                    </View>
                  </View>
                  <Text style={[styles.senderSub, { color: C.textMuted }]}>
                    Parcel Owner • Origin: {parcel.fromCity}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Traveler Perspective: Live Offer Status Banner */}
        {!isSender && myRequest ? (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: myRequest.status === 'accepted' ? C.successSubtle : C.surface,
                borderColor: myRequest.status === 'accepted' ? C.successBorder : C.warning,
              },
            ]}
          >
            <View
              style={[
                styles.statusBannerIcon,
                { backgroundColor: myRequest.status === 'accepted' ? C.success : C.warning },
              ]}
            >
              <MaterialIcons
                name={myRequest.status === 'accepted' ? 'check-circle' : 'schedule'}
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.statusBannerContent}>
              <Text style={[styles.statusBannerTitle, { color: C.textPrimary }]}>
                {myRequest.status === 'accepted' ? 'Your Offer Was Accepted! 🎉' : 'Delivery Offer Submitted'}
              </Text>
              <Text style={[styles.statusBannerSub, { color: C.textMuted }]}>
                {myRequest.status === 'accepted'
                  ? 'Coordinate pickup details and timing directly with the sender in chat.'
                  : `Waiting for ${parcel.userName} to review your ₹${myRequest.price} offer.`}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.statusBannerAction,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptic.tap();
                handleChat(myRequest);
              }}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#FFFFFF" />
              <Text style={styles.statusBannerActionText}>Chat</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Sender Perspective: Manage Offers */}
        {isSender ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                  Traveler Carrier Offers
                </Text>
                <View style={[styles.countBadge, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.countBadgeText, { color: C.primary }]}>
                    {visibleRequests.length}
                  </Text>
                </View>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
            ) : visibleRequests.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <View style={[styles.emptyRadarWrap, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="radar" size={32} color={C.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                  Waiting for Carrier Offers
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  Your parcel is live on CaryGoo! When travelers travelling towards {parcel.toCity} make an offer, it will appear here.
                </Text>
                {isParcelOpen ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.findTravelersBtn,
                      { backgroundColor: C.primary },
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      router.push({ pathname: '/search', params: { mode: 'parcel', id: parcel.id } });
                    }}
                  >
                    <MaterialIcons name="search" size={17} color="#FFFFFF" />
                    <Text style={styles.findTravelersText}>Find Matching Travelers Now</Text>
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

      {/* Fixed Bottom Action Bar for Travelers */}
      {showBottomBar ? (
        <View
          style={[
            styles.fixedBottomBar,
            {
              backgroundColor: C.surface,
              borderTopColor: C.surfaceBorder,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.bottomBarInner, isTablet && styles.tabletCentered]}>
            <View style={styles.bottomPriceCol}>
              <Text style={[styles.bottomBarLabel, { color: C.textMuted }]}>Delivery Reward</Text>
              <Text style={[styles.bottomBarPrice, isSmallDevice && { fontSize: 18 }, { color: C.primary }]}>
                {parcel.priceOffer ? `₹${parcel.priceOffer}` : 'Negotiable'}
              </Text>
              <Text style={[styles.bottomRateSub, { color: C.textMuted }]}>Paid upon delivery</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryCtaBtn,
                isSmallDevice && styles.primaryCtaBtnSmall,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                if (!user) {
                  Haptic.warning();
                  showAlert('Sign In Required', 'Please sign in to offer to carry this parcel.');
                  return;
                }
                Haptic.confirm();
                setShowCarryModal(true);
              }}
            >
              <MaterialIcons name="local-shipping" size={isSmallDevice ? 16 : 18} color="#FFFFFF" />
              <Text style={[styles.primaryCtaText, isSmallDevice && styles.primaryCtaTextSmall]}>Deliver This Parcel</Text>
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

      {/* Full Photo Preview Modal */}
      {resolvedImage ? (
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
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Image
              source={{ uri: resolvedImage }}
              style={styles.modalImg}
              contentFit="contain"
            />
            <View style={styles.modalCaptionWrap}>
              <Text style={styles.modalCaption}>{parcel.description}</Text>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
