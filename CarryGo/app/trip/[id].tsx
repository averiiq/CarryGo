import React, { useMemo, useState, useEffect } from 'react';
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
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Request, Trip, Parcel, ParcelCategory } from '@/types';
import { isRequestIncoming } from '@/services/requests.service';
import { createDelivery } from '@/services/deliveries.service';
import { fetchPaymentByRequest } from '@/services/payments.service';
import { Haptic } from '@/services/haptics.service';
import { getUserErrorMessage } from '@/lib/error-handler';
import { getUserAvatarSource, DEFAULT_AVATAR_ASSET } from '@/constants/images';
import { RequestItem } from '@/components/feature/RequestItem';
import { StatusBarGeometry, Spacing, FontWeight } from '@/constants/theme';
import { styles } from '@/styles/trip/[id].styles';
import { CARRY_CATEGORIES } from '@/components/feature/trip/TripDetailsStep';
import { RouteMapCanvas } from '@/components/feature/trip/RouteMapCanvas';
import { fetchRouteAlternatives, RouteOption } from '@/services/routing.service';
import { getStopoverTimelineMeta, calculateLegPrice } from '@/components/feature/matching/blaBlaHelpers';
import { checkTripParcelRoute } from '@/services/smart-matching.service';
import { findCity, getDistance } from '@/constants/indian-cities';
import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '@/services/profile.service';

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
  const { C, isDark } = useThemeColors();
  const { isSmallDevice, isTablet } = useResponsive();

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
  const [openingChatRequestId, setOpeningChatRequestId] = useState<string | null>(null);

  const trip = (tripQuery.data ?? undefined) as Trip | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const isOwner = Boolean(trip?.userId && user?.id && trip.userId === user.id);

  const travelerId = trip?.userId;
  // Fetch traveler profile if not owner and travelerId is available
  const { data: travelerProfile } = useQuery({
    queryKey: ['userProfile', travelerId],
    queryFn: async () => {
      if (!travelerId) return null;
      const { data } = await fetchProfile(travelerId);
      return data;
    },
    enabled: Boolean(travelerId && !isOwner),
    staleTime: 5 * 60_000,
  });

  const [avatarError, setAvatarError] = useState(false);

  const rawTravelerAvatar = isOwner
    ? (user?.avatar || trip?.userAvatar || (trip as any)?.avatar || (trip as any)?.avatar_url || (trip as any)?.selfieUrl)
    : (travelerProfile?.avatar || trip?.userAvatar || (trip as any)?.avatar || (trip as any)?.avatar_url || (trip as any)?.selfieUrl);

  const travelerAvatarSource = getUserAvatarSource(rawTravelerAvatar, travelerId || trip?.userName);

  const travelerDisplayName = isOwner
    ? (user?.fullName || user?.name || trip?.userName || 'Trip Host (You)')
    : (travelerProfile?.name || trip?.userName || 'Verified Traveler');

  const travelerFirstName = travelerDisplayName.split(' ')[0] || 'Traveler';

  const travelerRatingDisplay = isOwner
    ? (user?.rating && user.rating > 0 ? user.rating.toFixed(1) : (trip?.userRating && trip.userRating > 0 ? trip.userRating.toFixed(1) : '5.0'))
    : (travelerProfile?.rating && travelerProfile.rating > 0 ? travelerProfile.rating.toFixed(1) : (trip?.userRating && trip.userRating > 0 ? trip.userRating.toFixed(1) : '5.0'));

  const travelerTotalTrips = isOwner
    ? (user?.totalTrips && user.totalTrips > 0 ? user.totalTrips : 1)
    : (travelerProfile?.totalTrips && travelerProfile.totalTrips > 0 ? travelerProfile.totalTrips : 1);

  const isTravelerVerified = isOwner
    ? (user?.verified ?? true)
    : (travelerProfile?.verified ?? true);

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
      weight: Math.min(Math.max(Number(draftWeight) || 1, 0.1), 500),
      priceOffer: Math.min(Math.max(Number(draftPrice) || 180, 1), 50000),
      description: draftDesc || 'Parcel delivery',
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }, [draftCategory, draftWeight, draftPrice, draftFromCity, draftToCity, draftDesc, user, trip]);

  const [routeOption, setRouteOption] = useState<RouteOption | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  useEffect(() => {
    if (!trip?.fromCity || !trip?.toCity) return;
    let cancelled = false;
    setIsMapLoading(true);

    fetchRouteAlternatives(trip.fromCity, trip.toCity)
      .then((res) => {
        if (cancelled) return;
        if (res.routes && res.routes.length > 0) {
          setRouteOption(res.routes[0]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsMapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trip?.fromCity, trip?.toCity]);

  const itineraryNodes = useMemo(() => {
    if (!trip) return [];
    return getStopoverTimelineMeta(trip);
  }, [trip]);

  const matchingRouteParcel = useMemo(() => {
    if (!trip) return null;
    return userParcels.find(
      p => p.status === 'open' &&
           p.weight <= (trip.availableCapacity || 999) &&
           checkTripParcelRoute(trip, p).isCompatible
    ) || null;
  }, [trip, userParcels]);

  const activeParcel = useMemo(() => {
    if (!trip) return null;

    if (draftParcel) {
      if (checkTripParcelRoute(trip, draftParcel).isCompatible) {
        return draftParcel;
      }
    }
    if (singleParcelQuery.data) {
      const p = singleParcelQuery.data;
      if (checkTripParcelRoute(trip, p).isCompatible) {
        return p;
      }
    }
    if (parcelId) {
      const found = userParcels.find(p => p.id === parcelId);
      if (found && checkTripParcelRoute(trip, found).isCompatible) {
        return found;
      }
    }
    return matchingRouteParcel;
  }, [draftParcel, singleParcelQuery.data, parcelId, userParcels, trip, matchingRouteParcel]);

  const senderMatchedLeg = useMemo(() => {
    if (!trip) return null;
    const allStops = [trip.fromCity, ...(trip.stopovers || []).map(s => String(s || '').trim()).filter(Boolean), trip.toCity];

    const candidateFrom = (draftFromCity || activeParcel?.fromCity || '').trim().toLowerCase();
    const candidateTo = (draftToCity || activeParcel?.toCity || '').trim().toLowerCase();

    if (!candidateFrom || !candidateTo) return null;

    const fromIdx = allStops.findIndex(s => s.toLowerCase() === candidateFrom);
    const toIdx = allStops.findIndex(s => s.toLowerCase() === candidateTo);

    if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
      const legFrom = allStops[fromIdx];
      const legTo = allStops[toIdx];
      const c1 = findCity(legFrom);
      const c2 = findCity(legTo);
      const legDist = c1 && c2 ? Math.round(getDistance(c1, c2)) : 0;
      const fullRate = activeParcel ? Math.round(trip.pricePerKg * (activeParcel.weight || 1)) : Math.round(trip.pricePerKg * 1);
      const legPrice = calculateLegPrice(fullRate, legFrom, legTo, trip.fromCity, trip.toCity);
      const isSubSegment = !(fromIdx === 0 && toIdx === allStops.length - 1);
      return {
        from: legFrom,
        to: legTo,
        distanceKm: legDist,
        legPrice,
        isSubSegment,
      };
    }
    return null;
  }, [trip, draftFromCity, draftToCity, activeParcel]);

  // Fare is weight × traveller-set pricePerKg, floored at ₹80 (or fair leg fare if sub-segment).
  const calculatedPrice = useMemo(() => {
    if (!trip) return 0;
    if (senderMatchedLeg?.legPrice) {
      return senderMatchedLeg.legPrice;
    }
    if (activeParcel) {
      const baseFare = Math.max(80, Math.round(trip.pricePerKg * (activeParcel.weight || 1)));
      return calculateLegPrice(baseFare, activeParcel.fromCity, activeParcel.toCity, trip.fromCity, trip.toCity);
    }
    return Math.max(80, Math.round(trip.pricePerKg * 1));
  }, [trip, activeParcel, senderMatchedLeg]);

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

    if (targetTrip.allowedCategories && targetTrip.allowedCategories.length > 0) {
      const allowed = targetTrip.allowedCategories.map((c) => String(c).trim().toLowerCase());
      if (!allowed.includes(String(chosenParcel.category || '').toLowerCase())) {
        Haptic.warning();
        showAlert(
          'Category Not Accepted',
          `${targetTrip.userName || 'The traveller'} does not carry ${chosenParcel.category} on this trip.`
        );
        return;
      }
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

      // Booking status is determined server-side by the create_request RPC
      // based on traveller rating data — never trust client for status.
      const result = await createRequestAsync({
        parcelId: resolvedParcelId,
        tripId: targetTrip.id,
        senderId: user.id,
        senderName: user.fullName || user.name || 'Sender',
        travellerId: targetTrip.userId,
        travellerName: targetTrip.userName,
        status: 'pending',
        price: priceToUse,
        message: `Hi ${targetTrip.userName}! I would like you to deliver my ${chosenParcel.category} package (${chosenParcel.weight}kg) from ${chosenParcel.fromCity || targetTrip.fromCity} to ${chosenParcel.toCity || targetTrip.toCity} on your route.`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        void requestsQuery.refetch();
        // v2 (BlaBlaCar-style): pay upfront at booking. Go straight to the
        // payment/protection screen; funds are released on OTP handover.
        router.push({ pathname: '/payment/[id]', params: { id: result.id } });
      } else {
        showAlert('Could Not Send Request', 'Could not send request. Please check the trip and parcel details.');
      }
    } catch (err: any) {
      Haptic.error();
      console.warn('[trip] Request creation failed:', err?.message);
      showAlert('Could Not Send Request', getUserErrorMessage(err, 'Could not send request. Please try again.'));
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

    if (targetTrip.allowedCategories && targetTrip.allowedCategories.length > 0) {
      const allowed = targetTrip.allowedCategories.map((c) => String(c).trim().toLowerCase());
      if (!allowed.includes(String(quickParams.category || '').toLowerCase())) {
        Haptic.warning();
        showAlert(
          'Category Not Accepted',
          `${targetTrip.userName || 'The traveller'} does not carry ${quickParams.category} on this trip.`
        );
        return;
      }
    }

    try {
      const fromCity = quickParams.fromCity || targetTrip.fromCity;
      const toCity = quickParams.toCity || targetTrip.toCity;
      const newParcel = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'Sender',
        fromCity,
        toCity,
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
        message: `Hi ${targetTrip.userName}! Could you please carry my ${quickParams.category} package (${quickParams.weight}kg) from ${fromCity} to ${toCity} on your route?`,
      });

      if (result) {
        setShowRequestModal(false);
        Haptic.success();
        void Promise.all([requestsQuery.refetch(), allParcelsQuery.refetch()]);
        // v2: pay upfront at booking (see handleConfirmRequest).
        router.push({ pathname: '/payment/[id]', params: { id: result.id } });
      } else {
        showAlert('Could Not Send Request', 'Could not send request. Please check the trip and parcel details.');
      }
    } catch (err: any) {
      Haptic.error();
      console.warn('[trip] Quick request failed:', err?.message);
      showAlert('Could Not Send Request', getUserErrorMessage(err, 'Failed to send request. Please try again.'));
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

  const handleDelivery = async (req: Request) => {
    Haptic.tap();
    try {
      const { data: pay } = await fetchPaymentByRequest(req.id);
      const isReqPaid = pay?.status === 'locked' || pay?.status === 'released' || req.status === 'completed';
      if (!isReqPaid && req.status === 'accepted') {
        if (viewerRole === 'sender') {
          router.push({ pathname: '/payment/[id]', params: { id: req.id } });
        } else {
          showAlert('Awaiting Sender Payment', 'The sender has not completed the booking payment yet. Once paid, parcel handover and tracking will unlock.');
        }
        return;
      }
    } catch {}
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
    if (tripQuery.isLoading) {
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
            <Text style={[styles.navTitle, { color: C.textPrimary }]}>Trip Details</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={[styles.center, { padding: Spacing.xl, gap: Spacing.md }]}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="directions-car" size={32} color={C.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: FontWeight.bold, color: C.textPrimary, textAlign: 'center' }}>
            Trip Not Available
          </Text>
          <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 18 }}>
            This trip might have completed, expired, or was removed from the live marketplace.
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

  const isTripActive = trip.status === 'active';

  const normalizedAllowedCategories = useMemo(() => {
    if (trip.allowedCategories && trip.allowedCategories.length > 0) {
      return trip.allowedCategories.map(c => String(c).trim().toLowerCase());
    }
    if (Array.isArray(trip.allowedCategories) && trip.allowedCategories.length === 0) {
      return [];
    }
    const vType = trip.vehicleType?.toLowerCase() || 'car';
    if (vType === 'bike') {
      return ['documents', 'electronics', 'clothing', 'medicine'];
    }
    if (vType === 'flight') {
      return ['documents', 'clothing', 'electronics', 'medicine'];
    }
    if (vType === 'bus' || vType === 'train') {
      return ['documents', 'clothing', 'food', 'medicine', 'other'];
    }
    return ALL_PARCEL_CATEGORIES;
  }, [trip.allowedCategories, trip.vehicleType]);

  const allowedSet = useMemo(() => {
    return new Set(normalizedAllowedCategories);
  }, [normalizedAllowedCategories]);

  const sortedCarryCategories = useMemo(() => {
    return [...CARRY_CATEGORIES].sort((a, b) => {
      const aAllowed = allowedSet.has(a.type);
      const bAllowed = allowedSet.has(b.type);
      if (aAllowed && !bAllowed) return -1;
      if (!aAllowed && bAllowed) return 1;
      return 0;
    });
  }, [allowedSet]);

  const vehicleSpecs = useMemo(() => {
    const vType = trip.vehicleType?.toLowerCase() || 'car';
    switch (vType) {
      case 'bike':
        return {
          title: 'Two-Wheeler / Bike',
          icon: 'two-wheeler' as const,
          spaceDesc: 'Backpack & rear saddlebag storage',
          guideline: 'Suitable for envelopes, small electronics, and light essentials under 5 kg.',
        };
      case 'flight':
        return {
          title: 'Commercial Flight',
          icon: 'flight' as const,
          spaceDesc: 'Cabin overhead baggage & checked luggage',
          guideline: 'Strictly airport-safe personal items. No hazardous goods, flammables, or unsealed liquids.',
        };
      case 'bus':
        return {
          title: 'Intercity Bus',
          icon: 'directions-bus' as const,
          spaceDesc: 'Under-seat baggage space & boot compartment',
          guideline: 'Fits duffels, personal bags, packaged foods, apparel, and medium cartons.',
        };
      case 'train':
        return {
          title: 'Express Train',
          icon: 'train' as const,
          spaceDesc: 'Luggage berth & under-seat space',
          guideline: 'Spacious for suitcases, boxes, apparel, and personal packages.',
        };
      case 'car':
      default:
        return {
          title: 'Personal Car',
          icon: 'directions-car' as const,
          spaceDesc: 'Car trunk & secure rear seats',
          guideline: 'Ample luggage space for suitcases, cartons, parcels, and clothing.',
        };
    }
  }, [trip.vehicleType]);
  const parcelCategoryBlocked = Boolean(activeParcel && !allowedSet.has(String(activeParcel.category).toLowerCase()));
  const showBottomBar = !isOwner && isTripActive && !myRequest;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.topNavBar, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top) }, isTablet && styles.tabletCentered]}>
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
          { paddingBottom: showBottomBar ? insets.bottom + 90 : insets.bottom + 36 },
          isTablet && styles.tabletCentered,
          isSmallDevice && { paddingHorizontal: Spacing.md },
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
                <Text style={[styles.routeCityText, isSmallDevice && { fontSize: 17 }]} numberOfLines={1}>{trip.fromCity}</Text>
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
                <Text style={[styles.routeCityText, isSmallDevice && { fontSize: 17 }]} numberOfLines={1}>{trip.toCity}</Text>
              </View>
            </View>

            {trip.stopovers && trip.stopovers.length > 0 ? (
              <View style={styles.stopoverChainRow}>
                <MaterialIcons name="alt-route" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.stopoverChainLabel}>via</Text>
                <View style={styles.stopoverChipsWrap}>
                  {trip.stopovers.map((s, idx) => (
                    <View key={`${s}-${idx}`} style={styles.stopoverChip}>
                      <Text style={styles.stopoverChipText} numberOfLines={1}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
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

        {/* ── Real Interactive Route Street Map Canvas ── */}
        <View style={[styles.mapSectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.mapHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="map" size={16} color={C.primary} />
              <Text style={[styles.mapHeaderTitle, { color: C.textPrimary }]}>Live Route Corridor</Text>
            </View>
            <View style={[styles.osmBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
              <Text style={[styles.osmBadgeText, { color: C.textMuted }]}>OpenStreetMap</Text>
            </View>
          </View>
          <View style={styles.mapCanvasWrapper}>
            <RouteMapCanvas
              routes={routeOption ? [routeOption] : []}
              selectedRouteId={routeOption?.id || 'main-route'}
              fromCity={trip.fromCity}
              toCity={trip.toCity}
              stopovers={trip.stopovers || []}
              height={220}
              isLoading={isMapLoading}
            />
          </View>
        </View>

        {/* ── BlaBlaCar-Style Journey & Stopovers Itinerary ── */}
        <View style={[styles.itineraryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.itineraryHeader}>
            <View>
              <Text style={[styles.itineraryTitle, { color: C.textPrimary }]}>Route Itinerary</Text>
              <Text style={[styles.itinerarySubtitle, { color: C.textMuted }]}>
                {trip.stopovers && trip.stopovers.length > 0
                  ? `${trip.stopovers.length} intermediate stopover${trip.stopovers.length === 1 ? '' : 's'} along highway`
                  : 'Direct non-stop corridor'}
              </Text>
            </View>
            {senderMatchedLeg?.isSubSegment ? (
              <View style={[styles.matchedLegPill, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                <MaterialIcons name="alt-route" size={12} color="#059669" />
                <Text style={styles.matchedLegPillText}>Matches Your Leg</Text>
              </View>
            ) : null}
          </View>

          {/* Sender Matched Sub-Segment Banner */}
          {senderMatchedLeg?.isSubSegment ? (
            <View style={[styles.matchedBanner, { backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5', borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#A7F3D0' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.matchedBannerHeading, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                  Your Delivery Sub-Route
                </Text>
                <Text style={[styles.matchedBannerSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  {senderMatchedLeg.from} ➔ {senderMatchedLeg.to} • {senderMatchedLeg.distanceKm} km
                </Text>
              </View>
              <View style={styles.matchedBannerPrice}>
                <Text style={[styles.matchedBannerPriceVal, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                  ₹{senderMatchedLeg.legPrice}
                </Text>
                <Text style={[styles.matchedBannerPriceSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  fair leg fare
                </Text>
              </View>
            </View>
          ) : null}

          {/* Vertical Nodes */}
          <View style={styles.timelineNodesList}>
            {itineraryNodes.map((node, idx) => {
              const isSenderPickup = senderMatchedLeg?.from.toLowerCase() === node.cityName.toLowerCase();
              const isSenderDropoff = senderMatchedLeg?.to.toLowerCase() === node.cityName.toLowerCase();
              const isMatchedStop = isSenderPickup || isSenderDropoff;

              return (
                <View key={`${node.cityName}-${idx}`} style={styles.timelineNodeRow}>
                  {/* Time column */}
                  <View style={styles.nodeTimeCol}>
                    <Text style={[styles.nodeTimeText, { color: C.textPrimary }]}>{node.time}</Text>
                    {node.distanceFromStartKm > 0 ? (
                      <Text style={[styles.nodeDistText, { color: C.textMuted }]}>+{node.distanceFromStartKm} km</Text>
                    ) : (
                      <Text style={[styles.nodeDistText, { color: C.textMuted }]}>Start</Text>
                    )}
                  </View>

                  {/* Vertical Track & Node Dot */}
                  <View style={styles.nodeTrackCol}>
                    <View
                      style={[
                        styles.nodeDot,
                        node.isOrigin && { borderColor: '#004AAD', backgroundColor: '#FFFFFF' },
                        node.isDestination && { borderColor: '#008B48', backgroundColor: '#FFFFFF' },
                        !node.isOrigin && !node.isDestination && { borderColor: '#94A3B8', backgroundColor: '#CBD5E1' },
                        isMatchedStop && { borderColor: '#008B48', backgroundColor: '#008B48', transform: [{ scale: 1.25 }] },
                      ]}
                    />
                    {idx < itineraryNodes.length - 1 ? (
                      <View style={[styles.nodeTrackLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                    ) : null}
                  </View>

                  {/* City info */}
                  <View style={[styles.nodeInfoCol, isMatchedStop && styles.nodeInfoColMatched]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text
                        style={[
                          styles.nodeCityText,
                          { color: C.textPrimary },
                          (node.isOrigin || node.isDestination) && { fontWeight: '700' },
                          isMatchedStop && { color: '#008B48', fontWeight: '700' },
                        ]}
                      >
                        {node.cityName}
                      </Text>
                      {isSenderPickup ? (
                        <View style={[styles.nodeBadge, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                          <MaterialIcons name="north-east" size={10} color="#1D4ED8" />
                          <Text style={[styles.nodeBadgeText, { color: '#1D4ED8' }]}>Your Pickup</Text>
                        </View>
                      ) : null}
                      {isSenderDropoff ? (
                        <View style={[styles.nodeBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                          <MaterialIcons name="south-east" size={10} color="#15803D" />
                          <Text style={[styles.nodeBadgeText, { color: '#15803D' }]}>Your Dropoff</Text>
                        </View>
                      ) : null}
                      {!node.isOrigin && !node.isDestination && !isMatchedStop ? (
                        <View style={[styles.stopoverBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' }]}>
                          <Text style={[styles.stopoverBadgeText, { color: C.textMuted }]}>Stop {node.stopoverIndex}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Traveler Profile Card (Always Visible to Senders and Owner) */}
        <View style={[styles.travelerProfileCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.travelerHeaderRow}>
            <Text style={[styles.travelerSectionTitle, { color: C.textMuted }]}>
              {isOwner ? 'Your Traveler Profile' : 'Trip Host'}
            </Text>
            <View
              style={[
                styles.travelerRoleBadge,
                { backgroundColor: isOwner ? C.primarySubtle : C.successSubtle },
              ]}
            >
              <MaterialIcons
                name={isOwner ? 'person' : 'verified-user'}
                size={12}
                color={isOwner ? C.primary : C.success}
              />
              <Text
                style={[
                  styles.travelerRoleText,
                  { color: isOwner ? C.primary : C.success },
                ]}
              >
                {isOwner ? 'You (Trip Host)' : 'Verified Traveler'}
              </Text>
            </View>
          </View>

          <View style={styles.travelerTopRow}>
            <View style={styles.travelerAvatarWrap}>
              <Image
                source={avatarError ? DEFAULT_AVATAR_ASSET : travelerAvatarSource}
                style={[styles.travelerAvatar, { borderColor: C.surfaceBorder }]}
                contentFit="cover"
                transition={200}
                onError={() => setAvatarError(true)}
              />
              {isTravelerVerified ? (
                <View style={styles.travelerVerifiedBadge}>
                  <MaterialIcons name="check" size={10} color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            <View style={styles.travelerInfoCol}>
              <View style={styles.travelerNameRow}>
                <Text style={[styles.travelerName, { color: C.textPrimary }]} numberOfLines={1}>
                  {travelerDisplayName}
                </Text>
                {isTravelerVerified ? (
                  <MaterialIcons name="verified" size={16} color={C.primary} />
                ) : null}
              </View>

              <View style={styles.travelerRatingRow}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={[styles.ratingNumber, { color: C.textPrimary }]}>
                  {travelerRatingDisplay}
                </Text>
                <Text style={[styles.travelerSubtitle, { color: C.textMuted }]}>
                  • {travelerTotalTrips} {travelerTotalTrips === 1 ? 'trip completed' : 'trips completed'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trust & Safety Badges */}
          <View style={[styles.travelerPillsRow, { borderTopColor: C.surfaceBorder }]}>
            <View style={[styles.travelerTrustPill, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="shield" size={13} color={C.primary} />
              <Text style={[styles.travelerTrustText, { color: C.textSecondary }]}>Govt ID Verified</Text>
            </View>
            <View style={[styles.travelerTrustPill, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="phone" size={13} color={C.success} />
              <Text style={[styles.travelerTrustText, { color: C.textSecondary }]}>Phone Verified</Text>
            </View>
            <View style={[styles.travelerTrustPill, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="lock" size={13} color={C.warning} />
              <Text style={[styles.travelerTrustText, { color: C.textSecondary }]}>OTP Secured Handover</Text>
            </View>
          </View>
        </View>

        {/* What this Traveler Can Carry */}
        <View style={[styles.canCarryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.canCarryHeaderRow}>
            <View style={[styles.canCarryIconBox, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="inventory-2" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.canCarryTitle, { color: C.textPrimary }]}>
                {isOwner ? 'What You Can Carry' : `What ${travelerFirstName} Can Carry`}
              </Text>
              <Text style={[styles.canCarrySub, { color: C.textMuted }]}>
                {isOwner
                  ? 'Senders on CaryGoo can send parcels matching your vehicle luggage space and accepted categories.'
                  : `Luggage specifications and acceptable package types for this ${trip.vehicleType} trip.`}
              </Text>
            </View>
          </View>

          {/* Dynamic Vehicle Luggage Space Callout */}
          <View style={[styles.vehicleSpaceStrip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={[styles.vehicleSpaceIconBox, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name={vehicleSpecs.icon} size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vehicleSpaceTitle, { color: C.textPrimary }]}>
                {vehicleSpecs.title} • {remainingWeight.toFixed(1)} kg Available
              </Text>
              <Text style={[styles.vehicleSpaceDesc, { color: C.textMuted }]}>
                {vehicleSpecs.spaceDesc}. {vehicleSpecs.guideline}
              </Text>
            </View>
          </View>

          {/* Quick Vehicle Specs Grid */}
          <View style={[styles.canCarrySpecsRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.canCarrySpecItem}>
              <Text style={[styles.canCarrySpecVal, { color: C.textPrimary }]}>
                {trip.availableCapacity} kg
              </Text>
              <Text style={[styles.canCarrySpecLbl, { color: C.textMuted }]}>Total Capacity</Text>
            </View>
            <View style={[styles.canCarrySpecDivider, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.canCarrySpecItem}>
              <Text style={[styles.canCarrySpecVal, { color: remainingWeight > 0 ? C.success : C.warning }]}>
                {remainingWeight.toFixed(1)} kg
              </Text>
              <Text style={[styles.canCarrySpecLbl, { color: C.textMuted }]}>Free Space</Text>
            </View>
            <View style={[styles.canCarrySpecDivider, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.canCarrySpecItem}>
              <Text style={[styles.canCarrySpecVal, { color: C.primary }]}>
                ₹{trip.pricePerKg}
              </Text>
              <Text style={[styles.canCarrySpecLbl, { color: C.textMuted }]}>Per Kg Rate</Text>
            </View>
          </View>

          {/* Detailed Category Acceptance List */}
          {trip.allowedCategories && trip.allowedCategories.length > 0 ? (
            <View style={[styles.canCarrySummaryBar, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
              <MaterialIcons name="check-circle" size={16} color={C.success} />
              <Text style={[styles.canCarrySummaryText, { color: C.textPrimary }]}>
                {isOwner ? 'You are accepting ' : `${travelerFirstName} accepts `}
                <Text style={{ fontWeight: FontWeight.bold, color: C.success }}>
                  {normalizedAllowedCategories.length} {normalizedAllowedCategories.length === 1 ? 'category' : 'categories'}
                </Text>
                {': '}
                <Text style={{ fontWeight: FontWeight.bold }}>
                  {normalizedAllowedCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                </Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.canCarryGrid}>
            {sortedCarryCategories.map((cat) => {
              const allowed = allowedSet.has(cat.type);
              return (
                <View
                  key={cat.type}
                  style={[
                    styles.canCarryCategoryCard,
                    {
                      backgroundColor: allowed ? C.surfaceElevated : C.surface,
                      borderColor: allowed ? C.successBorder : C.surfaceBorder,
                      opacity: allowed ? 1 : 0.6,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.canCarryCategoryIconBox,
                      { backgroundColor: allowed ? C.successSubtle : C.surfaceBorder },
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon}
                      size={18}
                      color={allowed ? C.success : C.textMuted}
                    />
                  </View>
                  <View style={styles.canCarryCategoryInfo}>
                    <View style={styles.canCarryCategoryTitleRow}>
                      <Text style={[styles.canCarryCategoryTitle, { color: C.textPrimary }]}>
                        {cat.label}
                      </Text>
                      <View
                        style={[
                          styles.canCarryBadge,
                          {
                            backgroundColor: allowed ? C.successSubtle : C.surfaceElevated,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={allowed ? 'check-circle' : 'block'}
                          size={11}
                          color={allowed ? C.success : C.textMuted}
                        />
                        <Text
                          style={[
                            styles.canCarryBadgeText,
                            { color: allowed ? C.success : C.textMuted },
                          ]}
                        >
                          {allowed ? 'Accepts' : 'Not Allowed'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.canCarryCategoryTagline, { color: C.textMuted }]}>
                      {allowed ? cat.tagline : 'Not accepted for this journey'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Safe Travel & Guidelines Box */}
          <View style={[styles.canCarryGuidelinesBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.canCarryGuidelineRow}>
              <MaterialIcons name="security" size={15} color={C.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.canCarryGuidelineText, { color: C.textSecondary }]}>
                <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>Handover Security: </Text>
                Packages are inspected at pickup and locked with instant sender & recipient OTP verification.
              </Text>
            </View>
            <View style={styles.canCarryGuidelineRow}>
              <MaterialIcons name="do-not-disturb" size={15} color={C.error} style={{ marginTop: 1 }} />
              <Text style={[styles.canCarryGuidelineText, { color: C.textSecondary }]}>
                <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>Prohibited Items: </Text>
                No flammables, hazardous liquids, illegal goods, or unsealed perishable food.
              </Text>
            </View>
          </View>

          {/* Match & Compatibility Status */}
          {!isOwner && activeParcel ? (
            parcelCategoryBlocked ? (
              <View style={[styles.canCarryMismatchBanner, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder }]}>
                <MaterialIcons name="warning-amber" size={16} color={C.error} />
                <Text style={[styles.canCarryMismatchText, { color: C.error }]}>
                  Your parcel is {activeParcel.category}. {travelerFirstName} doesn't accept this category on this {trip.vehicleType} trip.
                </Text>
              </View>
            ) : (
              <View style={[styles.canCarryMatchBanner, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                <MaterialIcons name="check-circle" size={16} color={C.success} />
                <Text style={[styles.canCarryMatchText, { color: C.success }]}>
                  Ready to book: Your {activeParcel.category} package ({activeParcel.weight}kg) is 100% compatible with this trip.
                </Text>
              </View>
            )
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
              <Text style={[styles.ownerStatLbl, { color: C.textMuted }]}>Bookings</Text>
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
                Incoming Bookings
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
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Bookings Yet</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  Senders on this route will book space on your trip. You'll see each paid booking here with pickup details.
                </Text>
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
          <View style={[
            styles.bottomBarInner,
            isTablet && styles.tabletCentered,
            isSmallDevice && styles.bottomBarInnerSmall,
          ]}>
            <View style={styles.bottomPriceCol}>
              {activeParcel ? (
                <>
                  <Text style={[styles.bottomPriceLabel, { color: C.textMuted }]}>Fare for {activeParcel.weight} kg</Text>
                  <Text style={[styles.bottomPriceAmount, isSmallDevice && { fontSize: 16 }, { color: C.textPrimary }]}>
                    ₹{calculatedPrice}
                  </Text>
                  <Text style={[styles.bottomRateSub, { color: C.textMuted }]}>₹{trip.pricePerKg}/kg × {activeParcel.weight} kg</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.bottomPriceLabel, { color: C.textMuted }]}>Traveller's Rate</Text>
                  <Text style={[styles.bottomPriceAmount, isSmallDevice && { fontSize: 16 }, { color: C.textPrimary }]}>
                    ₹{trip.pricePerKg}/kg
                  </Text>
                  <Text style={[styles.bottomRateSub, { color: C.textMuted }]}>Final fare set by weight</Text>
                </>
              )}
            </View>

            <View style={[styles.bottomActionsRow, isSmallDevice && { gap: 6 }]}>
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
                  isSmallDevice && styles.requestDeliveryBtnSmall,
                  { backgroundColor: parcelCategoryBlocked ? C.textMuted : C.primary },
                  pressed && { opacity: 0.9 }
                ]}
              >
                <MaterialIcons name="local-shipping" size={isSmallDevice ? 15 : 17} color="#FFFFFF" />
                <Text style={[styles.requestDeliveryBtnText, isSmallDevice && styles.requestDeliveryBtnTextSmall]}>
                  {parcelCategoryBlocked ? 'Not Supported' : (isSmallDevice ? 'Book' : 'Book Delivery')}
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
        initialFromCity={senderMatchedLeg?.from || draftFromCity}
        initialToCity={senderMatchedLeg?.to || draftToCity}
      />

    </View>
  );
}
