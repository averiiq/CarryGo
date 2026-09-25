import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  AppState,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import DeliveryMap from '@/components/feature/DeliveryMap';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { useRequestQuery } from '@/features/requests/queries';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getUserErrorMessage, getErrorTitle } from '@/lib/error-handler';
import { RatingModal } from '@/components/feature/RatingModal';
import { hasRated } from '@/services/ratings.service';
import { DeliveryTimeline, DeliveryStep, STEPS, stepIndex } from '@/components/feature/DeliveryTimeline';
import {
  SenderPickupOtpCard,
  TravellerPickupActionCard,
  TravellerTripControlsCard,
  SenderLiveJourneyCard,
  DeliveryOtpActionCard,
  SenderOtpCard,
  DeliverySuccessCard,
} from '@/components/feature/DeliveryActionCards';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import {
  fetchDelivery,
  fetchOrCreateDelivery,
  getOrIssuePickupOtp,
  confirmPickupWithOtp,
  updateTripProgress,
  confirmDelivery,
  issueDeliveryOtp,
  getOrIssueDeliveryOtp,
} from '@/services/deliveries.service';
import { getCurrentLocation, updateDeliveryLocation, fetchDeliveryLocation } from '@/services/location.service';
import { Delivery } from '@/types';
import { Haptic } from '@/services/haptics.service';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';

function DeliveryScreenInner() {
  const rawParams = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : (rawParams.id || '');
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestQuery = useRequestQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [pickupOtp, setPickupOtp] = useState<string | null>(null);
  const [enteredPickupOtp, setEnteredPickupOtp] = useState('');
  const [enteredDeliveryOtp, setEnteredDeliveryOtp] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ userId: string; name: string } | null>(null);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickupOtpLoading, setPickupOtpLoading] = useState(false);
  const [tripUpdateLoading, setTripUpdateLoading] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [travellerLocation, setTravellerLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null);

  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const request = requestQuery.data ?? null;
  const isTraveller = user?.id === request?.travellerId;
  const isSender = user?.id === request?.senderId;
  const isParticipant = Boolean(user?.id && (isTraveller || isSender));
  const deliveryId = delivery?.id;
  const step: DeliveryStep = (delivery?.status as DeliveryStep) || 'awaiting_pickup';

  // Active chat conversation for this delivery request
  const conversation = conversationsQuery.data?.find(c => c.requestId === id);

  const initDelivery = useCallback(async () => {
    if (!id || !request || !isParticipant) return;
    try {
      const { data } = await fetchOrCreateDelivery(id, user?.id);
      if (data) {
        setDelivery(data);
        if (data.pickupOtp) {
          setPickupOtp(data.pickupOtp);
        } else if (isSender && ((data.status as DeliveryStep) || 'awaiting_pickup') === 'awaiting_pickup') {
          // Auto-fetch/generate pickup code immediately for sender
          setPickupOtpLoading(true);
          const otpRes = await getOrIssuePickupOtp(data.id || id);
          setPickupOtpLoading(false);
          if (otpRes.data) setPickupOtp(otpRes.data);
        }
        if (data.deliveryOtp) {
          setDeliveryOtp(data.deliveryOtp);
        } else if (isSender && (data.status as DeliveryStep) === 'in_transit') {
          const otpRes = await getOrIssueDeliveryOtp(data.id || id);
          if (otpRes.data) setDeliveryOtp(otpRes.data);
        }
      }
    } catch (err) {
      console.warn('[DeliveryScreen] initDelivery error caught:', err);
    }
  }, [id, isParticipant, isSender, request, user?.id]);

  useEffect(() => {
    if (!id || !request || !isParticipant) return;
    void initDelivery();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fadeAnim, id, initDelivery, isParticipant, request]);

  // Check if current user has already rated this delivery
  useEffect(() => {
    if (!id || !user?.id) return;
    let isMounted = true;
    void (async () => {
      const rated = await hasRated(user.id, id);
      if (isMounted) setHasAlreadyRated(rated);
    })();
    return () => {
      isMounted = false;
    };
  }, [id, user?.id]);

  // If sender and awaiting pickup, ensure pickup OTP is ready to show
  useEffect(() => {
    if (!isSender || step !== 'awaiting_pickup') return;
    if (pickupOtp) return;

    let isMounted = true;
    void (async () => {
      setPickupOtpLoading(true);
      const targetId = delivery?.id || id;
      if (!targetId) return;
      const res = await getOrIssuePickupOtp(targetId);
      if (isMounted) {
        setPickupOtpLoading(false);
        if (res.data) setPickupOtp(res.data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [delivery?.id, id, isSender, step, pickupOtp]);

  // If sender and in transit, ensure 6-digit delivery OTP is ready to show
  useEffect(() => {
    if (!isSender || step !== 'in_transit') return;
    if (deliveryOtp) return;

    let isMounted = true;
    void (async () => {
      const targetId = delivery?.id || id;
      if (!targetId) return;
      const res = await getOrIssueDeliveryOtp(targetId);
      if (isMounted && res.data) {
        setDeliveryOtp(res.data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [delivery?.id, id, isSender, step, deliveryOtp]);

  // Poll traveller location (sender side)
  useEffect(() => {
    if (!FeatureFlags.preciseLocationSharing || !deliveryId || !isSender || step === 'delivered') return;
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isAppActive = AppState.currentState === 'active';

    const poll = async () => {
      if (!isAppActive) return;
      try {
        const { data } = await fetchDeliveryLocation(deliveryId);
        if (data) {
          setTravellerLocation(data);
          consecutiveFailures = 0;
        }
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_FAILURES && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    void poll();
    intervalId = setInterval(poll, 15000);
    pollInterval.current = intervalId;

    const subscription = AppState.addEventListener('change', (nextState) => {
      isAppActive = nextState === 'active';
      if (isAppActive) {
        void poll();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      pollInterval.current = null;
      subscription.remove();
    };
  }, [deliveryId, isSender, step]);

  // Auto-poll delivery status every 3.5s so sender's screen reflects traveller's OTP confirmation instantly
  useEffect(() => {
    if (!id || !isParticipant || step === 'delivered') return;
    const poll = async () => {
      try {
        const { data } = await fetchDelivery(id);
        if (data) {
          setDelivery(prev => {
            if (!prev) return data;
            if (
              prev.status !== data.status ||
              prev.tripStatus !== data.tripStatus ||
              prev.deliveryOtp !== data.deliveryOtp ||
              prev.pickupOtp !== data.pickupOtp
            ) {
              return data;
            }
            return prev;
          });

          if (data.deliveryOtp && !deliveryOtp) {
            setDeliveryOtp(data.deliveryOtp);
          }

          // If delivery just became 'delivered', invalidate caches and offer rating
          if (data.status === 'delivered') {
            queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
            queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(id) });
            if (request?.senderId) queryClient.invalidateQueries({ queryKey: queryKeys.requests.byUser(request.senderId) });
            if (request?.travellerId) queryClient.invalidateQueries({ queryKey: queryKeys.requests.byUser(request.travellerId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
            await requestQuery.refetch();

            if (isSender && request && !hasAlreadyRated) {
              Haptic.success();
              const target = { userId: request.travellerId, name: request.travellerName || 'Traveller' };
              setRatingTarget(target);
              setTimeout(() => setShowRating(true), 600);
            }
          }
        }
      } catch (err) {
        console.warn('[DeliveryScreen] poll error caught:', err);
      }
    };
    const intervalId = setInterval(poll, 3500);
    return () => clearInterval(intervalId);
  }, [deliveryOtp, id, isParticipant, isSender, queryClient, request, requestQuery, step]);

  // Location sharing toggle for traveller
  const handleToggleLocation = async (enabled: boolean) => {
    if (!isTraveller || step !== 'in_transit') {
      showAlert('Not Allowed', 'Only the assigned traveller can share live location during transit.');
      return;
    }
    if (!FeatureFlags.preciseLocationSharing) {
      showAlert('Location Sharing Unavailable', disabledFeatureMessage.location);
      return;
    }
    if (!delivery) return;

    setLocationSharing(enabled);
    Haptic.select();

    if (!enabled) {
      if (locationInterval.current) clearInterval(locationInterval.current);
      locationInterval.current = null;
      return;
    }

    const updateLoc = async () => {
      if (AppState.currentState !== 'active') return true;
      const { data, error } = await getCurrentLocation();
      if (!data || !user?.id) {
        if (error) showAlert('Location Error', error);
        setLocationSharing(false);
        return false;
      }

      setTravellerLocation({
        lat: data.lat,
        lng: data.lng,
        updatedAt: new Date().toISOString(),
      });

      const update = await updateDeliveryLocation(delivery.id, data.lat, data.lng, user.id);
      if (update.error) {
        showAlert('Location Error', update.error);
        setLocationSharing(false);
        return false;
      }

      return true;
    };

    const started = await updateLoc();
    if (!started) {
      if (locationInterval.current) clearInterval(locationInterval.current);
      locationInterval.current = null;
      return;
    }

    locationInterval.current = setInterval(async () => {
      const ok = await updateLoc();
      if (!ok && locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
    }, 30000);
  };

  // Refresh Pickup OTP (Sender)
  const handleRefreshPickupOtp = async () => {
    if (!isSender) return;
    const targetId = delivery?.id || id;
    if (!targetId) return;
    setPickupOtpLoading(true);
    Haptic.tap();
    const res = await getOrIssuePickupOtp(targetId, true);
    setPickupOtpLoading(false);
    if (res.data) {
      setPickupOtp(res.data);
      Haptic.success();
    } else if (res.error) {
      showAlert('Error', res.error);
    }
  };

  // Confirm Pickup with 4-digit code (Traveller)
  const handleConfirmPickupWithOtp = async () => {
    if (!isTraveller || step !== 'awaiting_pickup') {
      showAlert('Not Allowed', 'Only the assigned traveller can confirm pickup.');
      return;
    }
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await confirmPickupWithOtp(targetId, enteredPickupOtp);
    setLoading(false);

    if (result.error || !result.data) {
      Haptic.error();
      showAlert('Verification Failed', result.error || 'Incorrect Pickup Code. Please re-check with the sender.');
      return;
    }

    setDelivery(result.data);
    Haptic.success();
    showAlert('Pickup Confirmed!', 'The parcel has been securely handed over. You can now start transit.');
  };

  // Update Trip Progress & Notes (Traveller)
  const handleUpdateTripDetails = async (statusText: string, noteText: string, etaText: string) => {
    const targetId = delivery?.id || id;
    if (!isTraveller || !targetId) return;
    setTripUpdateLoading(true);
    Haptic.tap();
    const res = await updateTripProgress(targetId, statusText, noteText, etaText);
    setTripUpdateLoading(false);

    if (res.error) {
      Haptic.error();
      showAlert('Update Failed', getUserErrorMessage(res.error, 'Failed to update progress.'));
      return;
    }

    setDelivery(prev => prev ? {
      ...prev,
      tripStatus: statusText,
      tripNote: noteText,
      etaText: etaText,
    } : null);
    Haptic.success();
    showAlert('Progress Updated', 'The sender can now see your latest transit stage & notes.');
  };

  // Confirm Final Delivery with 6-digit OTP (Traveller)
  const handleDeliveryOTP = async () => {
    if (!request) return;
    if (!isTraveller || step !== 'in_transit') {
      showAlert('Not Allowed', 'Only the assigned traveller can confirm delivery OTP.');
      return;
    }
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await confirmDelivery(targetId, enteredDeliveryOtp, user?.id);
    if (!result.success || !result.data) {
      setLoading(false);
      Haptic.error();
      showAlert('Delivery Not Confirmed', getUserErrorMessage(result.error, 'The delivery code could not be verified.'));
      return;
    }
    setDelivery(result.data);
    queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcels() });
    queryClient.invalidateQueries({ queryKey: queryKeys.listings.trips() });
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.byUser(request.senderId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.byUser(request.travellerId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    await requestQuery.refetch();
    setLoading(false);
    Haptic.success();
    if (locationInterval.current) clearInterval(locationInterval.current);
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (!hasAlreadyRated) {
      const target = isTraveller
        ? { userId: request.senderId, name: request.senderName }
        : { userId: request.travellerId, name: request.travellerName };
      setRatingTarget(target);
      setTimeout(() => setShowRating(true), 800);
    }
  };

  // Issue Delivery OTP (Sender)
  const handleIssueDeliveryOtp = async () => {
    if (!isSender || step !== 'in_transit') return;
    const targetId = delivery?.id || id;
    if (!targetId) return;

    setLoading(true);
    Haptic.tap();
    const result = await issueDeliveryOtp(targetId);
    setLoading(false);
    if (result.error || !result.data) {
      showAlert('Code Unavailable', getUserErrorMessage(result.error, 'Could not generate a delivery code.'));
      return;
    }
    setDeliveryOtp(result.data);
    Haptic.success();
  };

  const handleRateFromSuccess = () => {
    if (request) {
      const target = isTraveller
        ? { userId: request.senderId, name: request.senderName }
        : { userId: request.travellerId, name: request.travellerName };
      setRatingTarget(target);
      setShowRating(true);
    }
  };

  const handleOpenChat = () => {
    Haptic.tap();
    if (conversation?.id) {
      router.push(`/chat/${encodeURIComponent(String(conversation.id))}` as never);
    } else {
      showAlert('Chat', 'Open the Messages tab to reach out directly.');
    }
  };

  if (requestQuery.isLoading) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading tracking information...</Text>
      </View>
    );
  }

  if (requestQuery.isError) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <Feather name="wifi-off" size={36} color={C.error} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>
          {getErrorTitle(requestQuery.error, 'Connection Error')}
        </Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>
          {getUserErrorMessage(requestQuery.error, 'Unable to load delivery tracking details.')}
        </Text>
        <Pressable
          style={[styles.backOutlineBtn, { borderColor: C.primary, backgroundColor: C.primarySubtle, marginTop: Spacing.md }]}
          onPress={() => requestQuery.refetch()}
        >
          <Text style={[styles.backOutlineText, { color: C.primary, fontWeight: '600' }]}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <Feather name="alert-circle" size={36} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Delivery Not Found</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>This delivery journey is unavailable or has expired.</Text>
        <Pressable
          style={[styles.backOutlineBtn, { borderColor: C.surfaceBorder }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backOutlineText, { color: C.textPrimary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!isParticipant) {
    return (
      <View style={[styles.centerState, { backgroundColor: C.background }]}>
        <Feather name="lock" size={36} color={C.warning} />
        <Text style={[styles.emptyStateTitle, { color: C.textPrimary }]}>Access Restricted</Text>
        <Text style={[styles.emptyStateSub, { color: C.textMuted }]}>
          Only the verified sender and assigned traveller can access this tracking dashboard.
        </Text>
        <Pressable
          style={[styles.backOutlineBtn, { borderColor: C.surfaceBorder }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backOutlineText, { color: C.textPrimary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Formatting helpers
  const categoryTitle = request.parcelCategory
    ? `${request.parcelCategory.charAt(0).toUpperCase() + request.parcelCategory.slice(1)} Parcel`
    : 'Parcel Delivery';

  const counterpartyName = isSender ? request.travellerName : request.senderName;
  const counterpartyRole = isSender ? 'Traveller' : 'Sender';
  const counterpartyInitial = (counterpartyName || 'U').charAt(0).toUpperCase();

  const getStatusBadge = () => {
    switch (step) {
      case 'awaiting_pickup':
        return { label: 'Pickup Ready', bg: C.warningSubtle, text: C.warning, dot: C.warning };
      case 'picked_up':
        return { label: 'Picked Up', bg: C.primarySubtle, text: C.primary, dot: C.primary };
      case 'in_transit':
        return { label: 'In Transit', bg: C.primarySubtle, text: C.primary, dot: C.primary };
      case 'delivered':
        return { label: 'Delivered', bg: C.successSubtle, text: C.success, dot: C.success };
      default:
        return { label: 'Active', bg: C.surfaceElevated, text: C.textSecondary, dot: C.primary };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {showRating && ratingTarget && request ? (
        <RatingModal
          visible={showRating}
          requestId={id}
          fromUserId={user?.id || ''}
          toUserId={ratingTarget.userId}
          toUserName={ratingTarget.name}
          onDone={() => {
            setShowRating(false);
            setHasAlreadyRated(true);
          }}
        />
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* ========================================================================= */}
        {/* TOP FLOATING NAV BAR                                                      */}
        {/* ========================================================================= */}
        <View style={[styles.topNavBar, { paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12), backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <View style={styles.topNavRow}>
            {/* Back Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => {
                Haptic.tap();
                router.back();
              }}
              style={({ pressed }) => [
                styles.navRoundBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={10}
            >
              <Feather name="arrow-left" size={18} color={C.textPrimary} />
            </Pressable>

            {/* Nav Title & Subtitle */}
            <View style={styles.navTitleCenter}>
              <Text style={[styles.navTitle, { color: C.textPrimary }]} numberOfLines={1}>
                {categoryTitle}
              </Text>
              <Text style={[styles.navSub, { color: C.textMuted }]}>
                Tracking #{String(request.id || id || '').slice(-6).toUpperCase()}
              </Text>
            </View>

            {/* Quick Chat Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Direct Messaging"
              onPress={handleOpenChat}
              style={({ pressed }) => [
                styles.navRoundBtn,
                { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={10}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.primary} />
            </Pressable>
          </View>
        </View>

        <Animated.ScrollView
          style={[styles.container, { opacity: fadeAnim }]}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* ========================================================================= */}
          {/* 1. UNIFIED ROUTE HERO CARD                                               */}
          {/* ========================================================================= */}
          <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.sm]}>
            {/* Live Status Pill & Role Badge */}
            <View style={styles.heroTopRow}>
              <View style={[styles.heroBadge, { backgroundColor: statusBadge.bg }]}>
                <View style={[styles.heroBadgeDot, { backgroundColor: statusBadge.dot }]} />
                <Text style={[styles.heroBadgeText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>

              <Text style={[styles.heroRoleTag, { color: C.textMuted }]}>
                Viewing as {isSender ? 'Sender' : 'Traveller'}
              </Text>
            </View>

            {/* Origin -> Destination Route */}
            <View style={styles.heroRouteRow}>
              <View style={styles.heroCityBox}>
                <Text style={[styles.heroCityLabel, { color: C.textMuted }]}>ORIGIN</Text>
                <Text style={[styles.heroCityName, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.fromCity || 'Pickup City'}
                </Text>
              </View>

              <View style={styles.heroRouteArrowBox}>
                <View style={[styles.heroRouteLine, { backgroundColor: C.surfaceBorder }]} />
                <View style={[styles.heroRouteArrowCircle, { backgroundColor: C.primarySubtle }]}>
                  <Feather name="arrow-right" size={14} color={C.primary} />
                </View>
              </View>

              <View style={[styles.heroCityBox, { alignItems: 'flex-end' }]}>
                <Text style={[styles.heroCityLabel, { color: C.textMuted }]}>DESTINATION</Text>
                <Text style={[styles.heroCityName, { color: C.textPrimary }]} numberOfLines={1}>
                  {request.toCity || 'Destination'}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.heroDivider, { backgroundColor: C.surfaceBorder }]} />

            {/* Counterparty Strip */}
            <View style={styles.heroCounterpartyRow}>
              <View style={styles.heroUserLeft}>
                <View style={[styles.heroAvatar, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.heroAvatarText, { color: C.primary }]}>
                    {counterpartyInitial}
                  </Text>
                </View>
                <View style={styles.heroUserInfo}>
                  <Text style={[styles.heroUserName, { color: C.textPrimary }]} numberOfLines={1}>
                    {counterpartyName}
                  </Text>
                  <Text style={[styles.heroUserRole, { color: C.textMuted }]}>
                    Assigned {counterpartyRole}
                  </Text>
                </View>
              </View>

              {/* Chat Quick Action */}
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenChat}
                style={({ pressed }) => [
                  styles.heroChatBtn,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="chatbubble-outline" size={14} color={C.primary} />
                <Text style={[styles.heroChatBtnText, { color: C.textPrimary }]}>Chat</Text>
              </Pressable>
            </View>

            {/* Bottom Key Metrics Strip */}
            <View style={[styles.heroMetricsStrip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Agreed Fee</Text>
                <Text style={[styles.metricValue, { color: C.success }]}>₹{request.price}</Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: C.surfaceBorder }]} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Package</Text>
                <Text style={[styles.metricValue, { color: C.textPrimary }]}>
                  {request.parcelWeight ? `${request.parcelWeight} kg` : 'Standard'}
                </Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: C.surfaceBorder }]} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Live Status</Text>
                <Text style={[styles.metricValue, { color: C.primary }]} numberOfLines={1}>
                  {step === 'in_transit' && delivery?.etaText ? delivery.etaText : (STEPS[stepIndex(step)]?.label || 'In Progress')}
                </Text>
              </View>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* 2. PROGRESS TIMELINE (HORIZONTAL STEPPER)                                  */}
          {/* ========================================================================= */}
          <DeliveryTimeline step={step} C={C} />

          {/* ========================================================================= */}
          {/* 3. ACTIVE FOCUSED ACTION CARD (ROLE-BASED)                                 */}
          {/* ========================================================================= */}

          {/* SENDER FLOWS */}
          {isSender && (
            <>
              {/* Stage 1: Awaiting Pickup -> Display 4-digit Pickup Handover Code */}
              {step === 'awaiting_pickup' && (
                <SenderPickupOtpCard
                  code={pickupOtp}
                  onRefresh={handleRefreshPickupOtp}
                  loading={pickupOtpLoading}
                  C={C}
                />
              )}

              {/* Stage 2: In Transit -> Live Journey Status & 6-Digit Delivery Code */}
              {step === 'in_transit' && (
                <>
                  <SenderLiveJourneyCard
                    travellerName={request.travellerName}
                    tripStatus={delivery?.tripStatus}
                    tripNote={delivery?.tripNote}
                    etaText={delivery?.etaText}
                    onChat={handleOpenChat}
                    C={C}
                  />

                  {/* Live GPS Map or subtle standby banner */}
                  {FeatureFlags.preciseLocationSharing ? (
                    <DeliveryMap
                      travellerName={request.travellerName || 'Carrier'}
                      lat={travellerLocation?.lat ?? 28.6139}
                      lng={travellerLocation?.lng ?? 77.2090}
                      updatedAt={travellerLocation?.updatedAt ?? new Date().toISOString()}
                      isLiveBroadcasting={Boolean(travellerLocation)}
                      fromCity={request.fromCity}
                      toCity={request.toCity}
                      C={C}
                    />
                  ) : null}

                  {/* 6-Digit Delivery Release Code for final handoff */}
                  <SenderOtpCard
                    code={deliveryOtp}
                    onGenerate={handleIssueDeliveryOtp}
                    loading={loading}
                    C={C}
                  />
                </>
              )}
            </>
          )}

          {/* TRAVELLER FLOWS */}
          {isTraveller && (
            <>
              {/* Stage 1: Awaiting Pickup -> Enter 4-digit Pickup Code */}
              {step === 'awaiting_pickup' && (
                <TravellerPickupActionCard
                  enteredOtp={enteredPickupOtp}
                  onOtpChange={setEnteredPickupOtp}
                  onConfirmPickup={handleConfirmPickupWithOtp}
                  loading={loading}
                  C={C}
                />
              )}

              {/* Stage 2: In Transit -> Status Controls & 6-Digit Delivery Verification */}
              {step === 'in_transit' && (
                <>
                  <TravellerTripControlsCard
                    currentStatus={delivery?.tripStatus || ''}
                    currentNote={delivery?.tripNote || ''}
                    currentEta={delivery?.etaText || ''}
                    onUpdateTrip={handleUpdateTripDetails}
                    locationSharing={locationSharing}
                    onToggleLocation={handleToggleLocation}
                    loading={tripUpdateLoading}
                    C={C}
                  />

                  {FeatureFlags.preciseLocationSharing ? (
                    <DeliveryMap
                      travellerName="Your Location"
                      lat={travellerLocation?.lat ?? 28.6139}
                      lng={travellerLocation?.lng ?? 77.2090}
                      updatedAt={travellerLocation?.updatedAt ?? new Date().toISOString()}
                      isLiveBroadcasting={locationSharing && Boolean(travellerLocation)}
                      fromCity={request.fromCity}
                      toCity={request.toCity}
                      C={C}
                    />
                  ) : null}

                  <DeliveryOtpActionCard
                    enteredOtp={enteredDeliveryOtp}
                    onOtpChange={setEnteredDeliveryOtp}
                    onConfirmDelivery={handleDeliveryOTP}
                    loading={loading}
                    C={C}
                  />
                </>
              )}
            </>
          )}

          {/* DELIVERED CELEBRATION CARD */}
          {step === 'delivered' && (
            <DeliverySuccessCard
              onRate={handleRateFromSuccess}
              onViewPayment={() => router.push({ pathname: '/payment/[id]', params: { id } })}
              showPayment={FeatureFlags.payments}
              hasRated={hasAlreadyRated}
              C={C}
            />
          )}

          {/* ========================================================================= */}
          {/* 4. STREAMLINED JOURNEY SPECIFICATIONS CARD                                 */}
          {/* ========================================================================= */}
          <View style={[styles.specsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.specsHeader}>
              <View style={[styles.specsIconBox, { backgroundColor: C.primarySubtle }]}>
                <Feather name="shield" size={14} color={C.primary} />
              </View>
              <Text style={[styles.specsTitle, { color: C.textPrimary }]}>Delivery Protection & Specs</Text>
            </View>

            <View style={styles.specsGrid}>
              <View style={[styles.specItem, { borderBottomColor: C.surfaceBorder }]}>
                <Text style={[styles.specKey, { color: C.textMuted }]}>Category</Text>
                <Text style={[styles.specVal, { color: C.textPrimary }]}>
                  {request.parcelCategory ? request.parcelCategory.toUpperCase() : 'GENERAL'}
                </Text>
              </View>

              <View style={[styles.specItem, { borderBottomColor: C.surfaceBorder }]}>
                <Text style={[styles.specKey, { color: C.textMuted }]}>Package Weight</Text>
                <Text style={[styles.specVal, { color: C.textPrimary }]}>
                  {request.parcelWeight ? `${request.parcelWeight} kg` : 'Standard'}
                </Text>
              </View>

              <View style={[styles.specItem, { borderBottomColor: C.surfaceBorder }]}>
                <Text style={[styles.specKey, { color: C.textMuted }]}>Security Escrow</Text>
                <Text style={[styles.specVal, { color: C.success }]}>Active & Protected</Text>
              </View>

              <View style={[styles.specItem, { borderBottomWidth: 0 }]}>
                <Text style={[styles.specKey, { color: C.textMuted }]}>Tracking Ref</Text>
                <Text style={[styles.specVal, { color: C.textSecondary }]}>
                  {String(request?.id || id || '').slice(0, 8)}...
                </Text>
              </View>
            </View>
          </View>

          {/* Minimal 24/7 Security Assurance Badge */}
          <View style={styles.supportFooter}>
            <Feather name="lock" size={12} color={C.textMuted} />
            <Text style={[styles.supportFooterText, { color: C.textMuted }]}>
              Hizli 2-Factor OTP verification guarantees safe handoff and payout release.
            </Text>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

export default function DeliveryScreen() {
  return (
    <AppErrorBoundary>
      <DeliveryScreenInner />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // Top Nav Bar
  topNavBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  navSub: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },

  // 1. Hero Card
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  heroRoleTag: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  // Hero Route
  heroRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  heroCityBox: {
    flex: 1,
    gap: 2,
  },
  heroCityLabel: {
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  heroCityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  heroRouteArrowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    position: 'relative',
    width: 70,
  },
  heroRouteLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  heroRouteArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroDivider: {
    height: 1,
    opacity: 0.6,
  },

  // Hero Counterparty Row
  heroCounterpartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  heroAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  heroUserInfo: {
    flex: 1,
  },
  heroUserName: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  heroUserRole: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  heroChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  heroChatBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Hero Metrics Strip
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  metricDivider: {
    width: 1,
    height: 22,
    opacity: 0.6,
  },

  // GPS Standby Card
  gpsStandbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsStandbyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  gpsStandbySub: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },

  // Specs Card
  specsCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  specsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  specsIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  specsGrid: {
    gap: 0,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm - 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  specKey: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  specVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Support Footer
  supportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  supportFooterText: {
    fontSize: FontSize.xs - 1,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Center / Empty States
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  emptyStateSub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  backOutlineBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  backOutlineText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
