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
import {
  useParcelsByIdsQuery,
  useParcelQuery,
  useTripQuery,
  useUpdateTripStatusMutation,
  useParcelsQuery,
  useCreateParcelMutation,
  flattenInfiniteData,
} from '@/features/listings/queries';
import {
  useRequestsByTripQuery,
  useUpdateRequestStatusMutation,
  useCreateRequestMutation,
} from '@/features/requests/queries';
import { SendRequestModal, QuickCreateParcelParams } from '@/components/feature/SendRequestModal';
import { NegotiateTripModal, NegotiationParams } from '@/components/feature/NegotiateTripModal';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Trip, Parcel, ParcelCategory } from '@/types';
import { isRequestIncoming } from '@/services/requests.service';
import { createDelivery } from '@/services/deliveries.service';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { RequestItem } from '@/components/feature/RequestItem';
import { StatusBarGeometry } from '@/constants/theme';
import { styles } from '@/styles/trip/[id].styles';
import { CARRY_CATEGORIES } from '@/components/feature/trip/TripDetailsStep';

const ALL_PARCEL_CATEGORIES: ParcelCategory[] = ['documents', 'electronics', 'clothing', 'food', 'medicine', 'other'];

const vehicleIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

const vehicleGradients: Record<string, [string, string]> = {
  bike: ['#D97706', '#92400E'],
  car: ['#004AAD', '#003580'],
  bus: ['#7C3AED', '#5B21B6'],
  train: ['#0F766E', '#115E59'],
  flight: ['#0284C7', '#075985'],
};

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
  const { C } = useThemeColors();

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

  const matchingRouteParcel = useMemo(() => {
    if (!trip) return null;
    const normTripFrom = (trip.fromCity || '').trim().toLowerCase();
    const normTripTo = (trip.toCity || '').trim().toLowerCase();
    return userParcels.find(
      p => p.status === 'open' &&
           (p.fromCity || '').trim().toLowerCase() === normTripFrom &&
           (p.toCity || '').trim().toLowerCase() === normTripTo &&
           p.weight <= (trip.availableCapacity || 999)
    ) || null;
  }, [trip, userParcels]);

  const activeParcel = useMemo(() => {
    if (!trip) return null;
    const normTripFrom = (trip.fromCity || '').trim().toLowerCase();
    const normTripTo = (trip.toCity || '').trim().toLowerCase();

    if (draftParcel) {
      if ((draftParcel.fromCity || '').trim().toLowerCase() === normTripFrom && (draftParcel.toCity || '').trim().toLowerCase() === normTripTo) {
        return draftParcel;
      }
    }
    if (singleParcelQuery.data) {
      const p = singleParcelQuery.data;
      if ((p.fromCity || '').trim().toLowerCase() === normTripFrom && (p.toCity || '').trim().toLowerCase() === normTripTo) {
        return p;
      }
    }
    if (parcelId) {
      const found = userParcels.find(p => p.id === parcelId);
      if (found && (found.fromCity || '').trim().toLowerCase() === normTripFrom && (found.toCity || '').trim().toLowerCase() === normTripTo) {
        return found;
      }
    }
    return matchingRouteParcel;
  }, [draftParcel, singleParcelQuery.data, parcelId, userParcels, trip, matchingRouteParcel]);

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
    ? (vehicleGradients[trip.vehicleType?.toLowerCase() || 'car'] || ['#004AAD', '#003580'])
    : ['#004AAD', '#003580'];

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
        message: `Hi ${targetTrip.userName}! I would like you to deliver my ${chosenParcel.category} package (${chosenParcel.weight}kg) on your trip from ${targetTrip.fromCity} to ${targetTrip.toCity}.`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        showAlert(
          'Request Sent! 🎉',
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

    if (user.id === trip.userId) {
      Haptic.warning();
      showAlert('Not Allowed', 'You cannot send a counter-offer on your own trip.');
      return;
    }

    const priceToOffer = Math.max(50, Math.round(Number(params.offeredPrice) || calculatedPrice || 100));

    try {
      let parcelToUse = activeParcel;
      const isRouteMatch = parcelToUse &&
        parcelToUse.fromCity.trim().toLowerCase() === trip.fromCity.trim().toLowerCase() &&
        parcelToUse.toCity.trim().toLowerCase() === trip.toCity.trim().toLowerCase();

      if (!parcelToUse || parcelToUse.id === 'draft-parcel' || !isRouteMatch) {
        parcelToUse = await createParcelMutation.mutateAsync({
          userId: user.id,
          userName: user.fullName || user.name || 'Sender',
          fromCity: trip.fromCity,
          toCity: trip.toCity,
          category: activeParcel?.category || 'documents',
          weight: Math.min(activeParcel?.weight || 1, trip.availableCapacity || 10),
          description: activeParcel?.description || `Delivery on trip ${trip.fromCity} → ${trip.toCity}`,
          priceOffer: priceToOffer,
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
        price: priceToOffer,
        message: params.message,
      });

      if (result) {
        setShowNegotiateModal(false);
        Haptic.success();
        showAlert(
          'Offer Sent! 🤝',
          `${trip.userName} has been notified of your proposal.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await requestsQuery.refetch();
      } else {
        showAlert('Error', 'Could not submit proposal.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', getUserErrorMessage(err, 'Could not submit proposal.'));
    }
  };

  const handleStartNegotiateChat = async (params: NegotiationParams) => {
    if (!user || !trip) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to chat.');
      return;
    }

    if (user.id === trip.userId) {
      Haptic.warning();
      showAlert('Not Allowed', 'You cannot message yourself.');
      return;
    }

    const priceToOffer = Math.max(50, Math.round(Number(params.offeredPrice) || calculatedPrice || 100));

    try {
      let parcelToUse = activeParcel;
      const isRouteMatch = parcelToUse &&
        parcelToUse.fromCity.trim().toLowerCase() === trip.fromCity.trim().toLowerCase() &&
        parcelToUse.toCity.trim().toLowerCase() === trip.toCity.trim().toLowerCase();

      if (!parcelToUse || parcelToUse.id === 'draft-parcel' || !isRouteMatch) {
        parcelToUse = await createParcelMutation.mutateAsync({
          userId: user.id,
          userName: user.fullName || user.name || 'Sender',
          fromCity: trip.fromCity,
          toCity: trip.toCity,
          category: activeParcel?.category || 'documents',
          weight: Math.min(activeParcel?.weight || 1, trip.availableCapacity || 10),
          description: activeParcel?.description || `Delivery inquiry on trip ${trip.fromCity} → ${trip.toCity}`,
          priceOffer: priceToOffer,
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
          price: priceToOffer,
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
      showAlert('Chat Error', getUserErrorMessage(err, 'Could not open chat.'));
    }
  };

  const handleQuickCreateAndRequest = async (
    quickParams: QuickCreateParcelParams,
    targetTrip: Trip,
    calculatedPrice: number
  ) => {
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in to send requests.');
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
        message: `Hi ${targetTrip.userName}! Could you please carry my ${quickParams.category} package (${quickParams.weight}kg) on your trip from ${targetTrip.fromCity} to ${targetTrip.toCity}?`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        showAlert(
          'Request Sent! 🎉',
          `Your request was sent to ${targetTrip.userName}.`,
          [
            { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
            { text: 'OK', style: 'cancel' },
          ]
        );
        await Promise.all([requestsQuery.refetch(), allParcelsQuery.refetch()]);
      } else {
        showAlert('Error', 'Could not send request. Please try again.');
      }
    } catch (err: any) {
      Haptic.error();
      showAlert('Error', err?.message || 'Failed to send request.');
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
      showAlert('Not Allowed', 'Only the recipient can accept this request.');
      return;
    }

    showAlert('Accept Request?', `Accept delivery for ₹${req.price} from ${req.senderName}?`, [
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
            } catch (auxError) {
              console.warn('Post-accept step warning:', auxError);
            }
            await Promise.all([
              requestsQuery.refetch(),
              conversationsQuery.refetch(),
              requestedParcelIds.length > 0 ? parcelsQuery.refetch() : Promise.resolve(),
            ]);
            showAlert('Accepted!', 'Chat opened to coordinate pickup details.');
          } catch (error) {
            showAlert('Could Not Accept', getUserErrorMessage(error, 'Could not accept request.'));
          }
        },
      },
    ]);
  };

  const handleReject = (req: Request) => {
    if (!user || !isRequestIncoming(req, user.id)) {
      showAlert('Not Allowed', 'Only the recipient can reject this request.');
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
      showAlert('Sign In Required', 'Please sign in to chat.');
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
          showAlert('Chat', 'Could not open conversation. Please try again.');
        }
      }
    } catch (err: any) {
      showAlert('Chat', getUserErrorMessage(err, 'Could not open chat.'));
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
    showAlert('Cancel Trip?', 'This will remove your trip from the marketplace.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Trip',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateTripStatusMutation.mutateAsync({ tripId: trip.id, status: 'cancelled' });
            Haptic.success();
            showAlert('Trip Cancelled', 'Your trip has been cancelled.');
          } catch (error) {
            Haptic.error();
            showAlert('Error', getUserErrorMessage(error, 'Could not cancel trip.'));
          }
        },
      },
    ]);
  };

  const handleShareTrip = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `CaryGoo Trip: Travelling from ${trip.fromCity} to ${trip.toCity} on ${trip.date} at ${trip.time}. Space available: ${remainingWeight.toFixed(1)}kg!`,
      });
    } catch {
      // Ignored
    }
  };

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
  const totalEarnings = visibleRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isTripActive = trip.status === 'active';
  const allowedSet = useMemo(() => {
    const list = trip.allowedCategories && trip.allowedCategories.length > 0
      ? trip.allowedCategories
      : ALL_PARCEL_CATEGORIES;
    return new Set(list);
  }, [trip.allowedCategories]);
  const parcelCategoryBlocked = Boolean(activeParcel && !allowedSet.has(activeParcel.category as ParcelCategory));
  const showBottomBar = !isOwner && isTripActive && !myRequest;

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
            {isOwner ? 'Manage Trip' : 'Trip Details'}
          </Text>
          <View style={[
            styles.statusCapsule,
            { backgroundColor: isTripActive ? C.successSubtle : C.surfaceElevated }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isTripActive ? C.success : C.textMuted }
            ]} />
            <Text style={[
              styles.statusCapsuleText,
              { color: isTripActive ? C.success : C.textMuted }
            ]}>
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
        {/* Journey Card (Ticket) */}
        <View style={[styles.ticketCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.ticketHeader}>
            <LinearGradient
              colors={vGradient}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={styles.ticketTopRow}>
              <View style={styles.vehicleChip}>
                <MaterialIcons
                  name={vehicleIcons[trip.vehicleType?.toLowerCase() || 'car'] || 'directions-car'}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.vehicleChipText}>
                  {(trip.vehicleType || 'Car').toUpperCase()}
                </Text>
              </View>

              <View style={styles.scheduleRibbon}>
                <MaterialIcons name="event" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.scheduleText}>
                  {trip.date} • {trip.time}
                </Text>
              </View>
            </View>

            {/* Route */}
            <View style={styles.routeRow}>
              <View style={styles.routeCityCol}>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.fromCity}</Text>
              </View>

              <View style={styles.routeArrowBox}>
                <MaterialIcons
                  name={vehicleIcons[trip.vehicleType?.toLowerCase() || 'car'] || 'arrow-forward'}
                  size={18}
                  color="#fff"
                />
              </View>

              <View style={[styles.routeCityCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeLabel}>TO</Text>
                <Text style={styles.routeCityText} numberOfLines={1}>{trip.toCity}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Body: Capacity & Pricing */}
          <View style={styles.ticketBody}>
            <View style={styles.capacityRow}>
              <View style={styles.capacityLabelRow}>
                <MaterialIcons name="luggage" size={16} color={C.primary} />
                <Text style={[styles.capacityLabel, { color: C.textPrimary }]}>Available Space</Text>
              </View>
              <Text style={[styles.capacityVal, { color: C.primary }]}>
                {remainingWeight > 0 ? `${remainingWeight.toFixed(1)} kg available` : 'Full'}
              </Text>
            </View>

            <View style={[styles.capacityProgressBar, { backgroundColor: C.surfaceElevated }]}>
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

            <View style={styles.metricsRow}>
              <Text style={[styles.totalSpaceText, { color: C.textMuted }]}>
                {trip.availableCapacity} kg total capacity
              </Text>
              <Text style={[styles.rateText, { color: C.textPrimary }]}>
                ₹{trip.pricePerKg}/kg
              </Text>
            </View>
          </View>
        </View>

        {/* Traveler Profile Card (When Viewer is Sender) */}
        {!isOwner ? (
          <View style={[styles.travelerProfileCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.travelerTopRow}>
              <View style={styles.travelerAvatarWrap}>
                {trip.userAvatar ? (
                  <Image source={{ uri: trip.userAvatar }} style={styles.travelerAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.travelerAvatarPlaceholder, { backgroundColor: C.primarySubtle }]}>
                    <Text style={[styles.travelerAvatarInitials, { color: C.primary }]}>
                      {(trip.userName || 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.travelerVerifiedBadge}>
                  <MaterialIcons name="check" size={10} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.travelerInfoCol}>
                <View style={styles.travelerNameRow}>
                  <Text style={[styles.travelerName, { color: C.textPrimary }]}>{trip.userName}</Text>
                  <MaterialIcons name="verified" size={14} color={C.primary} />
                </View>

                <View style={styles.travelerRatingRow}>
                  <MaterialIcons name="star" size={13} color="#F59E0B" />
                  <Text style={[styles.ratingNumber, { color: C.textPrimary }]}>
                    {trip.userRating && trip.userRating > 0 ? trip.userRating.toFixed(1) : '5.0'}
                  </Text>
                  <Text style={[styles.travelerSubtitle, { color: C.textMuted }]}>· Verified Traveler</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* What this Traveler Can Carry */}
        <View style={[styles.canCarryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.canCarryHeaderRow}>
            <View style={[styles.canCarryIconBox, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="inventory-2" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.canCarryTitle, { color: C.textPrimary }]}>
                {isOwner ? 'What You Can Carry' : `What ${trip.userName.split(' ')[0]} Can Carry`}
              </Text>
              <Text style={[styles.canCarrySub, { color: C.textMuted }]}>
                {isOwner
                  ? 'Senders can only request parcels from these categories.'
                  : 'Only parcels in these categories can be requested on this trip.'}
              </Text>
            </View>
          </View>

          <View style={styles.canCarryPillsWrap}>
            {CARRY_CATEGORIES.map((cat) => {
              const allowed = allowedSet.has(cat.type);
              return (
                <View
                  key={cat.type}
                  style={[
                    styles.canCarryPill,
                    allowed
                      ? { backgroundColor: C.successSubtle, borderColor: C.successBorder }
                      : { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  ]}
                >
                  <MaterialIcons
                    name={allowed ? 'check-circle' : 'cancel'}
                    size={13}
                    color={allowed ? C.success : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.canCarryPillText,
                      {
                        color: allowed ? C.success : C.textMuted,
                        textDecorationLine: allowed ? 'none' : 'line-through',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {!isOwner && parcelCategoryBlocked && activeParcel ? (
            <View style={[styles.canCarryMismatchBanner, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder }]}>
              <MaterialIcons name="warning-amber" size={16} color={C.error} />
              <Text style={[styles.canCarryMismatchText, { color: C.error }]}>
                Your parcel is {activeParcel.category}. {trip.userName.split(' ')[0]} doesn't carry this category — pick a different trip or edit your parcel.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Existing Request Status Banner (for Sender) */}
        {!isOwner && myRequest ? (
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
                {myRequest.status === 'accepted' ? 'Request Accepted' : 'Request Pending'}
              </Text>
              <Text style={[styles.statusBannerSub, { color: C.textMuted }]}>
                {myRequest.status === 'accepted'
                  ? `Coordinate delivery with ${trip.userName} in chat.`
                  : `Waiting for ${trip.userName} to accept your request.`}
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
              <MaterialIcons name="chat" size={14} color="#fff" />
              <Text style={styles.statusBannerActionText}>Chat</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Owner Summary Strip */}
        {isOwner ? (
          <View style={[styles.ownerStatsStrip, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.ownerStatItem}>
              <Text style={[styles.ownerStatVal, { color: C.textPrimary }]}>{visibleRequests.length}</Text>
              <Text style={[styles.ownerStatLbl, { color: C.textMuted }]}>Requests</Text>
            </View>
            <View style={[styles.ownerStatDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.ownerStatItem}>
              <Text style={[styles.ownerStatVal, { color: C.textPrimary }]}>{bookedWeight.toFixed(1)} kg</Text>
              <Text style={[styles.ownerStatLbl, { color: C.textMuted }]}>Booked Space</Text>
            </View>
            <View style={[styles.ownerStatDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.ownerStatItem}>
              <Text style={[styles.ownerStatVal, { color: C.success }]}>₹{totalEarnings}</Text>
              <Text style={[styles.ownerStatLbl, { color: C.textMuted }]}>Earned</Text>
            </View>
          </View>
        ) : null}

        {/* Requests Feed (for Owner) */}
        {isOwner ? (
          <View style={styles.requestsSection}>
            <View style={styles.requestsHeaderRow}>
              <Text style={[styles.requestsTitle, { color: C.textPrimary }]}>
                Delivery Requests
              </Text>
              <View style={[styles.requestsCountBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.requestsCountText, { color: C.primary }]}>
                  {visibleRequests.length}
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
            ) : visibleRequests.length === 0 ? (
              <View style={[styles.emptyRequestsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="inbox" size={32} color={C.textMuted} />
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Delivery Requests Yet</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  Senders will send delivery requests when they see your trip in the marketplace.
                </Text>
                {isTripActive ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.browseParcelsBtn,
                      { backgroundColor: C.primary },
                      pressed && { opacity: 0.9 }
                    ]}
                    onPress={() => router.push({
                      pathname: '/search',
                      params: { fromCity: trip.fromCity, toCity: trip.toCity, mode: 'parcels' }
                    })}
                  >
                    <MaterialIcons name="search" size={16} color="#fff" />
                    <Text style={styles.browseParcelsText}>Browse Parcels on Route</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.requestsList}>
                {visibleRequests.map((req) => (
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
        ) : null}
      </ScrollView>

      {/* Fixed Bottom Action Bar for Sender */}
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
            <View style={styles.bottomPriceCol}>
              <Text style={[styles.bottomPriceLabel, { color: C.textMuted }]}>Estimated Fare</Text>
              <Text style={[styles.bottomPriceAmount, { color: C.textPrimary }]}>
                ₹{calculatedPrice}
              </Text>
              <Text style={[styles.bottomRateSub, { color: C.textMuted }]}>₹{trip.pricePerKg}/kg</Text>
            </View>

            <View style={styles.bottomActionsRow}>
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
                  { borderColor: C.surfaceBorder },
                  pressed && { opacity: 0.75 }
                ]}
              >
                <MaterialIcons name="tune" size={16} color={C.textPrimary} />
                <Text style={[styles.negotiateBtnText, { color: C.textPrimary }]}>Negotiate</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!user) {
                    Haptic.warning();
                    showAlert('Sign In Required', 'Please sign in to send requests.');
                    return;
                  }
                  if (parcelCategoryBlocked && activeParcel) {
                    Haptic.warning();
                    showAlert(
                      'Category Not Supported',
                      `${trip.userName} doesn't carry ${activeParcel.category}. Pick a different parcel or choose another trip.`
                    );
                    return;
                  }
                  Haptic.confirm();
                  if (activeParcel) {
                    handleConfirmRequest(activeParcel.id, trip, calculatedPrice);
                  } else {
                    setShowRequestModal(true);
                  }
                }}
                disabled={parcelCategoryBlocked}
                style={({ pressed }) => [
                  styles.requestDeliveryBtn,
                  { backgroundColor: parcelCategoryBlocked ? C.textMuted : C.primary },
                  pressed && { opacity: 0.9 }
                ]}
              >
                <MaterialIcons name="local-shipping" size={17} color="#FFFFFF" />
                <Text style={styles.requestDeliveryBtnText}>
                  {parcelCategoryBlocked ? 'Not Supported' : 'Request Delivery'}
                </Text>
              </Pressable>
            </View>
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
        isSubmitting={isCreatingRequest || createParcelMutation.isPending}
      />
    </View>
  );
}
