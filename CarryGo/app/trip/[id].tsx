import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { useParcelsByIdsQuery, useParcelQuery, useTripQuery, useUpdateTripStatusMutation, useParcelsQuery, useCreateParcelMutation, flattenInfiniteData } from '@/features/listings/queries';
import { useRequestsByTripQuery, useUpdateRequestStatusMutation, useCreateRequestMutation } from '@/features/requests/queries';
import { SendRequestModal, QuickCreateParcelParams } from '@/components/feature/SendRequestModal';
import { NegotiateTripModal, NegotiationParams } from '@/components/feature/NegotiateTripModal';
import { estimateTripDuration, formatDurationLabel, getRouteTimelineMeta } from '@/components/feature/matching/blaBlaHelpers';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Trip, Parcel, ParcelCategory } from '@/types';
import { isRequestIncoming } from '@/services/requests.service';
import { createDelivery } from '@/services/deliveries.service';
import { sendLocalNotification } from '@/services/notifications.service';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
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
  car: ['#059669', '#064E3B'],
  bus: ['#7C3AED', '#5B21B6'],
  train: ['#0F766E', '#115E59'],
  flight: ['#0284C7', '#075985'],
};

type TabFilter = 'all' | 'pending' | 'active' | 'done';

export default function TripDetailScreen() {
  const {
    id,
    parcelId,
    draftFromCity,
    draftToCity,
    draftWeight,
    draftCategory,
    draftPrice,
    draftDesc,
  } = useLocalSearchParams<{
    id: string;
    parcelId?: string;
    draftFromCity?: string;
    draftToCity?: string;
    draftWeight?: string;
    draftCategory?: string;
    draftPrice?: string;
    draftDesc?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();

  const tripQuery = useTripQuery(id);
  const requestsQuery = useRequestsByTripQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const allParcelsQuery = useParcelsQuery(true);
  const singleParcelQuery = useParcelQuery(parcelId);
  const createParcelMutation = useCreateParcelMutation();
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const { mutateAsync: createConversationAsync } = useCreateConversationMutation(user?.id);
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);
  const updateTripStatusMutation = useUpdateTripStatusMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabFilter>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [openingChatRequestId, setOpeningChatRequestId] = useState<string | null>(null);

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
  const allParcels = useMemo(() => flattenInfiniteData(allParcelsQuery.data), [allParcelsQuery.data]);
  const userParcels = useMemo(() => allParcels.filter(p => p.userId === user?.id && p.status === 'open'), [allParcels, user?.id]);

  const draftParcel = useMemo<Parcel | null>(() => {
    if (!draftCategory && !draftWeight) return null;
    return {
      id: 'draft-parcel',
      userId: user?.id || 'draft-sender',
      userName: user?.fullName || user?.name || 'Sender',
      fromCity: draftFromCity || trip?.fromCity || '',
      toCity: draftToCity || trip?.toCity || '',
      category: (draftCategory as ParcelCategory) || 'documents',
      weight: Number(draftWeight) || 1,
      priceOffer: Number(draftPrice) || 180,
      description: draftDesc || 'Parcel delivery',
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }, [draftCategory, draftWeight, draftPrice, draftFromCity, draftToCity, draftDesc, user, trip]);

  const activeParcel = useMemo(() => {
    if (draftParcel) return draftParcel;
    if (singleParcelQuery.data) return singleParcelQuery.data;
    if (parcelId) {
      const found = userParcels.find(p => p.id === parcelId);
      if (found) return found;
    }
    return userParcels.length > 0 ? userParcels[0] : null;
  }, [draftParcel, singleParcelQuery.data, parcelId, userParcels]);

  const timeline = useMemo(() => (trip ? getRouteTimelineMeta(trip) : null), [trip]);

  const calculatedPrice = useMemo(() => {
    if (!trip) return 180;
    if (activeParcel) {
      return Math.max(80, Math.round(trip.pricePerKg * (activeParcel.weight || 1)));
    }
    return Math.max(80, Math.round(trip.pricePerKg * 2));
  }, [trip, activeParcel]);

  const myRequest = useMemo(() => requests.find(r => r.senderId === user?.id && ['pending', 'accepted'].includes(r.status)), [requests, user?.id]);
  const loading = tripQuery.isLoading || requestsQuery.isLoading || parcelsQuery.isLoading;

  const vGradient: [string, string] = trip
    ? (vehicleGradients[trip.vehicleType] || ['#059669', '#064E3B'])
    : ['#059669', '#064E3B'];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      tripQuery.refetch(),
      requestsQuery.refetch(),
      conversationsQuery.refetch(),
      allParcelsQuery.refetch(),
      requestedParcelIds.length > 0 ? parcelsQuery.refetch() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleConfirmRequest = async (parcelIdToBook: string, targetTrip: Trip, priceToUse: number) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to send delivery requests.');
      return;
    }
    const chosenParcel = userParcels.find(p => p.id === parcelIdToBook) || (activeParcel?.id === parcelIdToBook ? activeParcel : null);
    if (!chosenParcel) {
      setShowRequestModal(true);
      return;
    }

    try {
      let resolvedParcelId = chosenParcel.id;
      if (resolvedParcelId === 'draft-parcel') {
        const created = await createParcelMutation.mutateAsync({
          userId: user.id,
          userName: user.fullName || user.name || 'Sender',
          fromCity: chosenParcel.fromCity || targetTrip.fromCity,
          toCity: chosenParcel.toCity || targetTrip.toCity,
          category: chosenParcel.category || 'documents',
          weight: chosenParcel.weight || 1,
          description: chosenParcel.description || `Delivery from ${targetTrip.fromCity} to ${targetTrip.toCity}`,
          priceOffer: priceToUse,
          status: 'open',
        });
        resolvedParcelId = created.id;
      }

      const result = await createRequestAsync({
        parcelId: resolvedParcelId,
        tripId: targetTrip.id,
        senderId: user.id,
        senderName: user.fullName || user.name || 'Sender',
        travellerId: targetTrip.userId,
        travellerName: targetTrip.userName,
        status: 'pending',
        price: priceToUse,
        message: `Hi ${targetTrip.userName}! I booked your trip from ${targetTrip.fromCity} to ${targetTrip.toCity} on ${targetTrip.date} for my ${chosenParcel.category} package (${chosenParcel.weight}kg).`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        await sendLocalNotification('Trip Booked! 🎉', `Your delivery request was sent to ${targetTrip.userName}`);
        showAlert(
          'Trip Booked! 🎉',
          `Your delivery request was sent to ${targetTrip.userName}.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        showAlert('Error', 'Could not send request. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Could not send request. Please try again.');
    }
  };

  const handleNegotiateSubmit = async (params: NegotiationParams) => {
    if (!user || !trip) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to negotiate trips.');
      return;
    }

    try {
      let parcelToUse = activeParcel;
      if (!parcelToUse || parcelToUse.id === 'draft-parcel') {
        parcelToUse = await createParcelMutation.mutateAsync({
          userId: user.id,
          userName: user.fullName || user.name || 'Sender',
          fromCity: trip.fromCity,
          toCity: trip.toCity,
          category: activeParcel?.category || 'documents',
          weight: activeParcel?.weight || 1,
          description: activeParcel?.description || `Negotiated delivery on trip ${trip.fromCity} → ${trip.toCity}`,
          priceOffer: params.offeredPrice,
          status: 'open',
        });
      }

      const result = await createRequestAsync({
        parcelId: parcelToUse.id,
        tripId: trip.id,
        senderId: user.id,
        senderName: user.fullName || user.name || 'Sender',
        travellerId: trip.userId,
        travellerName: trip.userName,
        status: 'pending',
        price: params.offeredPrice,
        message: params.message,
      });

      if (result) {
        setShowNegotiateModal(false);
        Haptic.success();
        await sendLocalNotification('Counter-Offer Sent!', `Your counter-offer of ₹${params.offeredPrice} was sent to ${trip.userName}`);
        showAlert(
          'Counter-Offer Sent! 🤝',
          `${trip.userName} has been notified of your proposed pickup/drop spots and price offer.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        showAlert('Error', 'Could not submit counter-offer.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', getUserErrorMessage(err, 'Could not submit counter-offer.'));
    }
  };

  const handleStartNegotiateChat = async (params: NegotiationParams) => {
    if (!user || !trip) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to chat with travelers.');
      return;
    }

    try {
      let parcelToUse = activeParcel;
      if (!parcelToUse || parcelToUse.id === 'draft-parcel') {
        parcelToUse = await createParcelMutation.mutateAsync({
          userId: user.id,
          userName: user.fullName || user.name || 'Sender',
          fromCity: trip.fromCity,
          toCity: trip.toCity,
          category: activeParcel?.category || 'documents',
          weight: activeParcel?.weight || 1,
          description: activeParcel?.description || `Delivery inquiry on trip ${trip.fromCity} → ${trip.toCity}`,
          priceOffer: params.offeredPrice,
          status: 'open',
        });
      }

      let targetRequestId = myRequest?.id;
      if (!targetRequestId) {
        const newReq = await createRequestAsync({
          parcelId: parcelToUse.id,
          tripId: trip.id,
          senderId: user.id,
          senderName: user.fullName || user.name || 'Sender',
          travellerId: trip.userId,
          travellerName: trip.userName,
          status: 'pending',
          price: params.offeredPrice,
          message: params.message,
        });
        targetRequestId = newReq?.id;
      }

      if (targetRequestId) {
        setShowNegotiateModal(false);
        const existingConv = conversations.find(c => c.requestId === targetRequestId);
        if (existingConv?.id) {
          router.push(`/chat/${encodeURIComponent(String(existingConv.id))}` as never);
          return;
        }

        const newConv = await createConversationAsync({
          requestId: targetRequestId,
          participantIds: [user.id, trip.userId],
          participantNames: {
            [user.id]: user.fullName || user.name || 'You',
            [trip.userId]: trip.userName,
          },
          parcelDescription: parcelToUse.description || 'Parcel delivery',
          route: `${trip.fromCity} → ${trip.toCity}`,
        });

        if (newConv?.id) {
          router.push(`/chat/${encodeURIComponent(String(newConv.id))}` as never);
        } else {
          router.push('/(tabs)/requests');
        }
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Chat Error', getUserErrorMessage(err, 'Could not initiate chat with traveler.'));
    }
  };

  const handleQuickCreateAndRequest = async (
    quickParams: QuickCreateParcelParams,
    targetTrip: Trip,
    calculatedPrice: number
  ) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to send delivery requests.');
      return;
    }

    try {
      const newParcel = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'Sender',
        fromCity: targetTrip.fromCity,
        toCity: targetTrip.toCity,
        category: quickParams.category,
        weight: quickParams.weight,
        description: quickParams.description,
        priceOffer: calculatedPrice,
        status: 'open',
      });

      const result = await createRequestAsync({
        parcelId: newParcel.id,
        tripId: targetTrip.id,
        senderId: user.id,
        senderName: user.fullName || user.name || 'Sender',
        travellerId: targetTrip.userId,
        travellerName: targetTrip.userName,
        status: 'pending',
        price: calculatedPrice,
        message: `Hi ${targetTrip.userName}! Could you please carry my ${quickParams.category} package (${quickParams.weight}kg) on your trip from ${targetTrip.fromCity} to ${targetTrip.toCity} on ${targetTrip.date}?`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        showAlert(
          'Parcel Created & Request Sent! 🎉',
          `Your ${quickParams.category} parcel was listed and your request was sent to ${targetTrip.userName}!`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await Promise.all([requestsQuery.refetch(), allParcelsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send delivery request. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Failed to create parcel and send request.');
    }
  };

  const handleCreateParcelForTrip = (fromCity: string, toCity: string) => {
    router.push({
      pathname: '/create-parcel',
      params: { fromCity, toCity },
    });
  };

  const handleAccept = (req: Request) => {
    if (!user || !isRequestIncoming(req, user.id)) {
      showAlert('Not Allowed', 'Only the intended recipient can accept this request.');
      return;
    }

    showAlert('Accept Request?', `Accept delivery for Rs ${req.price} from ${req.senderName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          try {
            await updateRequestStatusAsync({ requestId: req.id, status: 'accepted' });
            try {
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
            } catch (auxError) {
              console.warn('Post-accept auxiliary step error (non-fatal):', auxError);
            }
            await Promise.all([
              requestsQuery.refetch(),
              conversationsQuery.refetch(),
              requestedParcelIds.length > 0 ? parcelsQuery.refetch() : Promise.resolve(),
            ]);
            showAlert('Accepted!', 'Chat opened to coordinate pickup details.');
          } catch (error) {
            showAlert('Could Not Accept', getUserErrorMessage(error, 'Could not accept request. Please try again.'));
          }
        },
      },
    ]);
  };

  const handleReject = (req: Request) => {
    if (!user || !isRequestIncoming(req, user.id)) {
      showAlert('Not Allowed', 'Only the intended recipient can reject this request.');
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

  const handleChat = async (req: Request) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to view and send messages.');
      return;
    }

    if (openingChatRequestId === req.id) return;

    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) {
      router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
      return;
    }

    try {
      setOpeningChatRequestId(req.id);
      const parcel = parcels.find(p => p.id === req.parcelId);
      const route = parcel ? `${parcel.fromCity} → ${parcel.toCity}` : trip ? `${trip.fromCity} → ${trip.toCity}` : 'Route';
      const otherUserId = req.senderId === user.id ? req.travellerId : req.senderId;
      const otherUserName = req.senderId === user.id ? (trip?.userName || req.travellerName || 'Traveler') : (req.senderName || 'Sender');

      const newConv = await createConversationAsync({
        requestId: req.id,
        participantIds: [user.id, otherUserId],
        participantNames: {
          [user.id]: user.fullName || user.name || 'You',
          [otherUserId]: otherUserName,
        },
        parcelDescription: parcel?.description || 'Parcel delivery',
        route,
      });

      if (newConv?.id) {
        router.push(`/chat/${encodeURIComponent(String(newConv.id))}` as never);
      } else {
        const refetched = await conversationsQuery.refetch();
        const found = refetched.data?.find(c => c.requestId === req.id);
        if (found?.id) {
          router.push(`/chat/${encodeURIComponent(String(found.id))}` as never);
        } else {
          showAlert('Chat Error', 'Could not open conversation. Please try again.');
        }
      }
    } catch (err: any) {
      showAlert('Chat Error', getUserErrorMessage(err, 'Could not open chat. Please try again.'));
    } finally {
      setOpeningChatRequestId(null);
    }
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
            showAlert('Trip Not Cancelled', getUserErrorMessage(error, 'Could not cancel trip. Please try again.'));
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
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: !isOwner && isTripActive && !myRequest ? insets.bottom + 90 : insets.bottom + 36 }
        ]}
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
                <MaterialIcons name={vehicleIcons[trip.vehicleType?.toLowerCase() || 'car'] || 'directions-car'} size={14} color="#fff" />
                <Text style={styles.vehicleChipText}>{(trip.vehicleType || 'CAR').toUpperCase()}</Text>
              </View>

              <View style={styles.statusChip}>
                <View style={[styles.statusDot, { backgroundColor: isTripActive ? '#10B981' : '#E2E8F0' }]} />
                <Text style={styles.statusChipText}>{(trip.status || 'ACTIVE').toUpperCase()}</Text>
              </View>
            </View>

            {/* Ticket Route */}
            <View style={styles.ticketRouteRow}>
              <View style={styles.routeCityCol}>
                <Text style={styles.routeLabel}>DEPARTURE</Text>
                <Text style={styles.routeTimeText}>{timeline?.departureTime || trip.time}</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.fromCity}</Text>
              </View>

              <View style={styles.transportCapsuleWrap}>
                <View style={styles.transportCapsule}>
                  <MaterialIcons name={vehicleIcons[trip.vehicleType?.toLowerCase() || 'car'] || 'arrow-forward'} size={20} color="#fff" />
                </View>
                <Text style={styles.transportDurationText}>{timeline?.durationLabel || 'Direct'}</Text>
              </View>

              <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeLabel}>DESTINATION</Text>
                <Text style={styles.routeTimeText}>{timeline?.arrivalTime || 'Est. Arrival'}</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.toCity}</Text>
              </View>
            </View>

            {/* Departure Time Ribbon */}
            <View style={styles.departureStrip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="event" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.departureStripText}>
                  {trip.date} • {trip.time}
                </Text>
              </View>
              <View style={styles.departureBadgePill}>
                <MaterialIcons name="bolt" size={13} color="#FBBF24" />
                <Text style={styles.departureConfirmedBadge}>CONFIRMED</Text>
              </View>
            </View>
          </View>

          {/* Fare Overview Banner for Senders */}
          {!isOwner ? (
            <View style={[styles.fareOverviewBanner, { backgroundColor: C.surfaceElevated, borderBottomColor: C.surfaceBorder }]}>
              <View>
                <Text style={[styles.fareOverviewLabel, { color: C.textMuted }]}>
                  {activeParcel ? `Fare for ${activeParcel.weight}kg ${activeParcel.category}` : 'Estimated Delivery Fare'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={[styles.fareOverviewRupee, { color: C.textPrimary }]}>₹</Text>
                  <Text style={[styles.fareOverviewAmount, { color: C.textPrimary }]}>{calculatedPrice}</Text>
                  <Text style={[styles.fareOverviewRate, { color: C.textMuted }]}>· ₹{trip.pricePerKg}/kg</Text>
                </View>
              </View>
              <View style={[styles.instantBookPill, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="verified" size={13} color={C.success} />
                <Text style={[styles.instantBookPillText, { color: C.success }]}>Space Guaranteed</Text>
              </View>
            </View>
          ) : null}

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

        {/* Traveler Trust Profile (when viewer is sender) */}
        {!isOwner ? (
          <View style={[styles.travelerProfileCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.travelerTopRow}>
              <View style={styles.travelerAvatarWrap}>
                {trip.userAvatar ? (
                  <Image source={{ uri: trip.userAvatar }} style={styles.travelerAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.travelerAvatarPlaceholder, { backgroundColor: C.surfaceElevated }]}>
                    <Text style={[styles.travelerAvatarInitials, { color: C.textPrimary }]}>
                      {(trip.userName || 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.travelerVerifiedBadge}>
                  <MaterialIcons name="check" size={11} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.travelerInfoCol}>
                <View style={styles.travelerNameRow}>
                  <Text style={[styles.travelerName, { color: C.textPrimary }]}>{trip.userName}</Text>
                  <View style={styles.kycChip}>
                    <MaterialIcons name="verified-user" size={12} color="#2563EB" />
                    <Text style={styles.kycChipText}>ID VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.travelerRatingRow}>
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                    <Text style={[styles.ratingNumber, { color: C.textPrimary }]}>
                      {trip.userRating && trip.userRating > 0 ? trip.userRating.toFixed(1) : '5.0'}
                    </Text>
                  </View>
                  <Text style={[styles.travelerTripsCount, { color: C.textMuted }]}>
                    · Verified Traveler
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.trustPointsRow, { borderTopColor: C.surfaceBorder }]}>
              <View style={styles.trustPointItem}>
                <MaterialIcons name="shield" size={14} color={C.primary} />
                <Text style={[styles.trustPointText, { color: C.textSecondary }]}>CarryGo Protected</Text>
              </View>
              <View style={styles.trustPointItem}>
                <MaterialIcons name="bolt" size={16} color="#F59E0B" />
                <Text style={[styles.trustPointText, { color: C.textSecondary }]}>Instant Booking</Text>
              </View>
              <View style={styles.trustPointItem}>
                <MaterialIcons name="schedule" size={14} color={C.success} />
                <Text style={[styles.trustPointText, { color: C.textSecondary }]}>Fast Handover</Text>
              </View>
            </View>

            {/* Vehicle amenities row */}
            <View style={styles.vehicleAmenitiesRow}>
              <View style={[styles.amenityChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name={vehicleIcons[trip.vehicleType?.toLowerCase() || 'car'] || 'directions-car'} size={14} color={C.primary} />
                <Text style={[styles.amenityChipText, { color: C.textPrimary }]}>
                  {(trip.vehicleType || 'Car').toUpperCase()}
                </Text>
              </View>

              {['car', 'flight', 'train'].includes(trip.vehicleType?.toLowerCase() || 'car') ? (
                <View style={[styles.amenityChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <MaterialIcons name="ac-unit" size={13} color="#0284C7" />
                  <Text style={[styles.amenityChipText, { color: C.textPrimary }]}>AC Comfort</Text>
                </View>
              ) : null}

              <View style={[styles.amenityChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="luggage" size={13} color={C.success} />
                <Text style={[styles.amenityChipText, { color: C.textPrimary }]}>Trunk Space</Text>
              </View>

              <View style={[styles.amenityChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="bolt" size={14} color="#D97706" />
                <Text style={[styles.amenityChipText, { color: C.textPrimary }]}>Instant Confirm</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* What Traveler Allows To Carry Section */}
        {!isOwner ? (
          <View style={[styles.allowsToCarryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.allowsHeaderRow}>
              <View style={styles.allowsIconWrap}>
                <MaterialIcons name="luggage" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.allowsHeaderTitle, { color: C.textPrimary }]}>
                  What Traveler Allows to Carry
                </Text>
                <Text style={[styles.allowsHeaderSub, { color: C.textMuted }]}>
                  {remainingWeight > 0 ? `${remainingWeight.toFixed(1)} kg space free` : 'Space full'} · {(trip.vehicleType || 'Car').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Standard dimensions badge */}
            <View style={[styles.dimensionsBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="straighten" size={16} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dimensionsTitle, { color: C.textPrimary }]}>
                  Maximum Package Dimensions
                </Text>
                <Text style={[styles.dimensionsSub, { color: C.textMuted }]}>
                  Up to 60 × 40 × 30 cm · Standard vehicle boot or seat compartment fit
                </Text>
              </View>
            </View>

            {/* Allowed Categories Grid */}
            <View style={styles.allowsGrid}>
              {[
                { label: 'Documents & Books', icon: 'description' as const },
                { label: 'Electronics & Gadgets', icon: 'devices' as const },
                { label: 'Clothes & Lifestyle', icon: 'checkroom' as const },
                { label: 'Packaged Dry Food', icon: 'restaurant' as const },
                { label: 'Prescription Medicine', icon: 'medical-services' as const },
                { label: 'Other Legal Parcels', icon: 'inventory-2' as const },
              ].map((cat) => (
                <View
                  key={cat.label}
                  style={[
                    styles.categoryCheckPill,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                    },
                  ]}
                >
                  <MaterialIcons name="check-circle" size={14} color={C.success} />
                  <Text style={[styles.categoryCheckText, { color: C.textPrimary }]}>
                    {cat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Selected Parcel Compatibility Status */}
            {activeParcel ? (
              <View style={[styles.parcelCompatibilityBox, {
                backgroundColor: remainingWeight >= activeParcel.weight ? '#ECFDF5' : '#FEF2F2',
                borderColor: remainingWeight >= activeParcel.weight ? '#A7F3D0' : '#FECACA',
              }]}>
                <Text style={[styles.parcelCompatTitle, {
                  color: remainingWeight >= activeParcel.weight ? '#065F46' : '#991B1B',
                }]}>
                  {remainingWeight >= activeParcel.weight
                    ? `✅ Your ${activeParcel.category} (${activeParcel.weight}kg) fits in available space`
                    : `⚠️ Your parcel (${activeParcel.weight}kg) exceeds available space (${remainingWeight.toFixed(1)}kg)`}
                </Text>
                <Text style={[styles.parcelCompatSub, {
                  color: remainingWeight >= activeParcel.weight ? '#047857' : '#B91C1C',
                }]}>
                  Offered: ₹{activeParcel.priceOffer || calculatedPrice} · Traveler rate: ₹{trip.pricePerKg}/kg
                </Text>
              </View>
            ) : null}

            {/* Prohibited items safety alert */}
            <View style={[styles.prohibitedBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: '#FECACA' }]}>
              <View style={styles.prohibitedTitleRow}>
                <MaterialIcons name="warning" size={15} color="#DC2626" />
                <Text style={[styles.prohibitedTitle, { color: '#DC2626' }]}>
                  Strictly Prohibited & Safety Rules
                </Text>
              </View>
              <Text style={[styles.prohibitedText, { color: isDark ? '#FCA5A5' : '#7F1D1D' }]}>
                No hazardous chemicals, flammable items, or contraband. Packages must remain accessible for traveler inspection before departure.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Existing Request Status (if sender already sent request) */}
        {!isOwner && myRequest ? (
          <View style={[styles.matchingBanner, { backgroundColor: C.surface, borderColor: myRequest.status === 'accepted' ? '#10B98155' : '#F59E0B55' }]}>
            <View style={[styles.matchingIconWrap, { backgroundColor: myRequest.status === 'accepted' ? '#10B98120' : '#F59E0B20' }]}>
              <MaterialIcons
                name={myRequest.status === 'accepted' ? 'check-circle' : 'schedule'}
                size={24}
                color={myRequest.status === 'accepted' ? '#10B981' : '#F59E0B'}
              />
            </View>
            <View style={styles.matchingTextWrap}>
              <Text style={[styles.matchingHeading, { color: C.textPrimary }]}>
                {myRequest.status === 'accepted' ? 'Request Accepted!' : 'Request Pending'}
              </Text>
              <Text style={[styles.matchingSubheading, { color: C.textMuted }]}>
                {myRequest.status === 'accepted'
                  ? `Coordinate with ${trip.userName} in chat to arrange pickup.`
                  : `Waiting for ${trip.userName} to accept your request.`}
              </Text>
            </View>
          </View>
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

      {/* Fixed Bottom Action Bar for Senders */}
      {!isOwner && isTripActive && !myRequest ? (
        <View style={[styles.fixedBottomBar, {
          backgroundColor: C.surface,
          borderTopColor: C.surfaceBorder,
          paddingBottom: insets.bottom + 12,
        }]}>
          <View style={styles.bottomBarInner}>
            <Pressable
              onPress={() => {
                if (!user) {
                  Haptic.warning();
                  showAlert('Sign In Required', 'Please sign in to negotiate trips.');
                  return;
                }
                Haptic.tap();
                setShowNegotiateModal(true);
              }}
              style={({ pressed }) => [
                styles.negotiateBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="tune" size={18} color={C.textPrimary} />
              <Text style={[styles.negotiateBtnText, { color: C.textPrimary }]}>Negotiate</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!user) {
                  Haptic.warning();
                  showAlert('Sign In Required', 'Please sign in to book trips.');
                  return;
                }
                Haptic.confirm();
                if (activeParcel) {
                  handleConfirmRequest(activeParcel.id, trip, calculatedPrice);
                } else {
                  setShowRequestModal(true);
                }
              }}
              style={({ pressed }) => [
                styles.bookTripBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <MaterialIcons name="bolt" size={20} color="#FFFFFF" />
              <Text style={styles.bookTripBtnText}>Book Trip · ₹{calculatedPrice}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <SendRequestModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        trip={trip}
        userParcels={userParcels}
        onConfirmRequest={handleConfirmRequest}
        onCreateParcel={handleCreateParcelForTrip}
        onQuickCreateAndRequest={handleQuickCreateAndRequest}
        isSubmitting={isCreatingRequest || createParcelMutation.isPending}
      />

      <NegotiateTripModal
        visible={showNegotiateModal}
        onClose={() => setShowNegotiateModal(false)}
        trip={trip || null}
        parcel={activeParcel}
        initialPrice={calculatedPrice}
        onSendCounterOffer={handleNegotiateSubmit}
        onStartChat={handleStartNegotiateChat}
        isSubmitting={isCreatingRequest}
      />
    </View>
  );
}
