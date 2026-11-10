import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert, getSupabaseClient } from '@/template';
import { fetchUserPayments } from '@/services/payments.service';
import { AsyncStateCard, OfflineBanner, RequestCard, LottieAnimation, RequestCardSkeleton } from '@/components';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { RatingModal } from '@/components/feature/RatingModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget, TabBarGeometry, StatusBarGeometry } from '@/constants/theme';
import { createDelivery } from '@/services/deliveries.service';
import { Haptic } from '@/services/haptics.service';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { flattenInfiniteData, useParcelsQuery, useParcelsByIdsQuery } from '@/features/listings/queries';
import { useRequestsQuery, useUpdateRequestStatusMutation, useUserRatedRequestIdsQuery } from '@/features/requests/queries';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn } from '@/hooks/useAnimations';
import { getUserErrorMessage } from '@/lib/error-handler';
import { Request } from '@/types';
import { isRequestIncoming, isRequestOutgoing } from '@/services/requests.service';

type MainTab = 'requests' | 'active';

const RequestListItem = React.memo(function RequestListItem({
  item,
  isTablet,
  currentUserId,
  isPaid,
  onPress,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onDelivery,
  onPayment,
  onReview,
}: {
  item: Request;
  isTablet: boolean;
  currentUserId?: string;
  isPaid?: boolean;
  onPress: (req: Request) => void;
  onAccept: (id: string, req: Request) => void;
  onReject: (id: string, req: Request) => void;
  onCancel: (id: string, req: Request) => void;
  onChat: (req: Request) => void;
  onDelivery: (req: Request) => void;
  onPayment: (req: Request) => void;
  onReview: (req: Request) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const handleAccept = useCallback(() => onAccept(item.id, item), [onAccept, item]);
  const handleReject = useCallback(() => onReject(item.id, item), [onReject, item]);
  const handleCancel = useCallback(() => onCancel(item.id, item), [onCancel, item]);
  const handleChat = useCallback(() => onChat(item), [onChat, item]);
  const handleDelivery = useCallback(() => onDelivery(item), [onDelivery, item]);
  const handlePayment = useCallback(() => onPayment(item), [onPayment, item]);
  const handleReview = useCallback(() => onReview(item), [onReview, item]);

  const cardType = isRequestIncoming(item, currentUserId) ? 'incoming' : 'outgoing';

  return (
    <View style={isTablet ? styles.tabletContainer : undefined}>
      <RequestCard
        request={item}
        type={cardType}
        currentUserId={currentUserId}
        isPaid={isPaid}
        onPress={handlePress}
        onAccept={handleAccept}
        onReject={handleReject}
        onCancel={handleCancel}
        onChat={handleChat}
        onDelivery={handleDelivery}
        onPayment={handlePayment}
        onReview={handleReview}
      />
    </View>
  );
});

function RequestsScreenContent() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const { isSmallDevice, isTablet } = useResponsive();
  const requestsQuery = useRequestsQuery(user?.id);
  const ratedRequestIdsQuery = useUserRatedRequestIdsQuery(user?.id);
  const ratedRequestIds = useMemo(() => new Set(ratedRequestIdsQuery.data ?? []), [ratedRequestIdsQuery.data]);
  const conversationsQuery = useConversationsQuery(user?.id);
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const updateRequestStatusMutation = useUpdateRequestStatusMutation(user?.id);
  const createConversationMutation = useCreateConversationMutation(user?.id);

  const [tab, setTab] = useState<MainTab>('requests');
  const [refreshing, setRefreshing] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Request | null>(null);
  const [openingChatRequestId, setOpeningChatRequestId] = useState<string | null>(null);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const requestsRefetchRef = React.useRef(requestsQuery.refetch);
  requestsRefetchRef.current = requestsQuery.refetch;
  const conversationsRefetchRef = React.useRef(conversationsQuery.refetch);
  conversationsRefetchRef.current = conversationsQuery.refetch;
  const parcelsRefetchRef = React.useRef(parcelsQuery.refetch);
  parcelsRefetchRef.current = parcelsQuery.refetch;

  // Track which accepted requests are already paid (booked)
  const [paidRequestIds, setPaidRequestIds] = useState<Set<string>>(new Set());
  const refreshPaidRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const sb = getSupabaseClient();
      const [paymentsRes, deliveriesRes] = await Promise.all([
        fetchUserPayments(user.id),
        sb
          .from('deliveries')
          .select('request_id, status')
          .neq('status', 'failed'),
      ]);

      const locked = new Set<string>();

      if (Array.isArray(paymentsRes?.data)) {
        for (const p of paymentsRes.data) {
          if (p && (p.status === 'locked' || p.status === 'released') && p.requestId) {
            locked.add(p.requestId);
          }
        }
      }

      if (Array.isArray(deliveriesRes?.data)) {
        for (const d of deliveriesRes.data) {
          if (d?.request_id && d.status !== 'failed') {
            locked.add(d.request_id);
          }
        }
      }

      setPaidRequestIds(locked);
    } catch {}
  }, [user?.id]);
  useEffect(() => {
    void refreshPaidRequests();
  }, [refreshPaidRequests]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void requestsRefetchRef.current();
        void refreshPaidRequests();
      }
    }, [user?.id, refreshPaidRequests])
  );

  // Realtime subscription — refetch requests and payments when related rows change
  useEffect(() => {
    if (!user?.id) return;
    const sb = getSupabaseClient();
    const channel = sb
      .channel(`requests:realtime:${user.id}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          // Use payload.new for INSERT/UPDATE; for DELETE, refetch unconditionally
          const row: any = payload.new;
          if (!row) {
            // DELETE event — refetch to sync list
            void requestsRefetchRef.current();
            return;
          }
          const touchesUser = row.sender_id === user.id || row.traveller_id === user.id;
          if (touchesUser) {
            void requestsRefetchRef.current();
            void refreshPaidRequests();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          void refreshPaidRequests();
          void requestsRefetchRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          void refreshPaidRequests();
          void requestsRefetchRef.current();
        },
      )
      .subscribe();
    return () => {
      try { void sb.removeChannel(channel); } catch {}
    };
  }, [user?.id, refreshPaidRequests]);

  const rawRequests = user && Array.isArray(requestsQuery.data) ? requestsQuery.data : [];
  const conversations = user && Array.isArray(conversationsQuery.data) ? conversationsQuery.data : [];
  const marketplaceParcels = user ? flattenInfiniteData(parcelsQuery.data) : [];

  const requestedParcelIds = useMemo(() => {
    if (!Array.isArray(rawRequests)) return [];
    return Array.from(new Set(rawRequests.map(r => r?.parcelId).filter(Boolean)));
  }, [rawRequests]);

  const requestedParcelsQuery = useParcelsByIdsQuery(requestedParcelIds);
  const requestedParcels = Array.isArray(requestedParcelsQuery.data) ? requestedParcelsQuery.data : [];
  const requestedParcelsRefetchRef = React.useRef(requestedParcelsQuery.refetch);
  requestedParcelsRefetchRef.current = requestedParcelsQuery.refetch;

  // Parcel lookup map prioritizing requestedParcelsQuery, then marketplace parcels
  const parcelMap = useMemo(() => {
    const map = new Map<string, typeof marketplaceParcels[0]>();
    if (Array.isArray(marketplaceParcels)) {
      marketplaceParcels.forEach(p => { if (p?.id) map.set(p.id, p); });
    }
    if (Array.isArray(requestedParcels)) {
      requestedParcels.forEach(p => { if (p?.id) map.set(p.id, p); });
    }
    return map;
  }, [marketplaceParcels, requestedParcels]);

  // Enrich requests with resolved route, category, and weight, and filter out reviewed completed requests
  const requests = useMemo(() => {
    return rawRequests
      .filter(req => {
        if (!req || !req.id) return false;
        if (req.status === 'completed' && ratedRequestIds.has(req.id)) {
          return false;
        }
        return true;
      })
      .map(req => {
        const p = req.parcelId ? parcelMap.get(req.parcelId) : undefined;
        return {
          ...req,
          fromCity: req.fromCity || p?.fromCity || '',
          toCity: req.toCity || p?.toCity || '',
          parcelCategory: req.parcelCategory || p?.category || 'documents',
          parcelWeight: req.parcelWeight || p?.weight || 1,
        };
      });
  }, [rawRequests, ratedRequestIds, parcelMap]);

  // Received pending requests (action needed: Accept / Reject / Chat)
  const receivedRequests = useMemo(() => {
    return requests.filter(r => r && isRequestIncoming(r, user?.id) && r.status === 'pending');
  }, [requests, user?.id]);

  // Sent pending requests (awaiting counterparty: Status / Cancel / Chat)
  const sentRequests = useMemo(() => {
    return requests.filter(r => r && isRequestOutgoing(r, user?.id) && r.status === 'pending');
  }, [requests, user?.id]);

  // All pending requests (received first for immediate action visibility, then sent)
  const allPendingRequests = useMemo(() => {
    return [...receivedRequests, ...sentRequests];
  }, [receivedRequests, sentRequests]);

  // Active in-progress deliveries (accepted)
  const activeList = useMemo(() => {
    return requests.filter(r => r && r.status === 'accepted');
  }, [requests]);

  const displayed = useMemo(() => {
    if (tab === 'active') return activeList;
    return allPendingRequests;
  }, [tab, activeList, allPendingRequests]);

  const switchTab = (nextTab: MainTab) => {
    if (nextTab === tab) return;
    Haptic.select();
    const direction = nextTab === 'active' ? 1 : -1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * 16,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 180,
        friction: 15,
      }),
    ]).start();
    setTab(nextTab);
  };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await Promise.all([
        requestsRefetchRef.current(),
        refreshPaidRequests(),
        ratedRequestIdsQuery.refetch(),
        conversationsRefetchRef.current(),
        parcelsRefetchRef.current(),
        requestedParcelIds.length > 0 ? requestedParcelsRefetchRef.current() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [ratedRequestIdsQuery, refreshPaidRequests, requestedParcelIds.length, user]);

  const handleAccept = (requestId: string, req: Request) => {
    const isIncoming = isRequestIncoming(req, user?.id);
    if (!user || !isIncoming) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the intended recipient can accept this request.');
      return;
    }

    const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;
    const otherUserId = req.senderId === user.id ? req.travellerId : req.senderId;
    const isOffer = req.createdBy ? req.createdBy !== req.senderId : false;
    const isSender = user.id === req.senderId;

    const promptTitle = isOffer ? 'Accept Carry Offer?' : 'Accept Delivery Request?';
    const promptText = isOffer
      ? `Accept ${otherUserName}'s offer to carry your parcel for ₹${req.price}?`
      : `Accept request from ${otherUserName} to deliver for ₹${req.price}?`;

    Haptic.warning();
    showAlert(promptTitle, promptText, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          if (!user) return;
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'accepted' });
            let convId: string | null = null;
            try {
              const parcel = parcelMap.get(req.parcelId);
              const route = parcel ? `${parcel.fromCity} to ${parcel.toCity}` : `${req.fromCity || 'Pickup'} to ${req.toCity || 'Drop'}`;
              const existing = conversations.find(c => c.requestId === requestId);
              if (!existing) {
                const newConv = await createConversationMutation.mutateAsync({
                  requestId,
                  participantIds: [user.id, otherUserId],
                  participantNames: { [user.id]: user.name || 'You', [otherUserId]: otherUserName },
                  parcelDescription: parcel?.description || 'Parcel delivery',
                  route,
                });
                convId = newConv?.id || null;
              } else {
                convId = existing.id;
              }
              await createDelivery(requestId);
            } catch (auxError) {
              console.warn('Post-accept auxiliary step error (non-fatal):', auxError);
            }
            await requestsQuery.refetch();
            Haptic.success();

            if (isSender) {
              // v2: senders pay at booking, so this branch only fires for legacy
              // requests created before upfront protection shipped. Keep as a safety
              // net so unpaid accepted requests still have a clear path to pay.
              router.push({ pathname: '/payment/[id]', params: { id: requestId } });
            } else {
              showAlert(
                'Request Accepted! 📦',
                `Delivery matched with ${otherUserName}. Open chat to coordinate pickup point and time.`,
                [
                  { text: 'Done', style: 'cancel' },
                  {
                    text: 'Open Chat',
                    onPress: () => {
                      if (convId) {
                        router.push(`/chat/${encodeURIComponent(String(convId))}` as never);
                      }
                    },
                  },
                ]
              );
            }
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Accept',
              getUserErrorMessage(error, 'The request could not be accepted. Please try again.'),
            );
          }
        },
      },
    ]);
  };

  const handleReject = (requestId: string, _req: Request) => {
    const req = _req;
    const isIncoming = isRequestIncoming(req, user?.id);
    if (!user || !isIncoming) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the intended recipient can decline this request.');
      return;
    }

    const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;

    Haptic.warning();
    showAlert('Decline Request?', `Are you sure you want to decline this request from ${otherUserName}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'rejected' });
            await requestsQuery.refetch();
            Haptic.error();
            showAlert('Declined', 'The delivery request has been declined.');
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Decline',
              getUserErrorMessage(error, 'The request could not be declined. Please try again.'),
            );
          }
        },
      },
    ]);
  };

  const handleCancel = (requestId: string, req: Request) => {
    const isOutgoing = isRequestOutgoing(req, user?.id);
    if (!user || !isOutgoing) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the user who created this request can cancel it.');
      return;
    }

    Haptic.warning();
    showAlert('Cancel Request?', 'Cancel this request? No fees will be charged.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Request', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'cancelled' });
            Haptic.success();
            await requestsQuery.refetch();
            showAlert('Cancelled', 'Your request has been cancelled.');
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Cancel',
              getUserErrorMessage(error, 'The request could not be cancelled. Please try again.'),
            );
          }
        },
      },
    ]);
  };

  const handleChat = useCallback(
    async (req: Request) => {
      if (!user) {
        Haptic.warning();
        showAlert('Sign In Required', 'Please sign in to view and send messages.');
        return;
      }

      if (openingChatRequestId === req.id) return;

      Haptic.tap();
      const conv = conversations.find((c) => c.requestId === req.id);
      if (conv?.id) {
        router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
        return;
      }

      try {
        setOpeningChatRequestId(req.id);
        const otherUserId = req.senderId === user.id ? req.travellerId : req.senderId;
        const otherUserName = req.senderId === user.id ? req.travellerName : req.senderName;
        const parcel = parcelMap.get(req.parcelId);
        const route = parcel
          ? `${parcel.fromCity} → ${parcel.toCity}`
          : `${req.fromCity || 'Pickup'} → ${req.toCity || 'Drop'}`;

        const newConv = await createConversationMutation.mutateAsync({
          requestId: req.id,
          participantIds: [user.id, otherUserId],
          participantNames: {
            [user.id]: user.fullName || user.name || 'You',
            [otherUserId]: otherUserName || 'User',
          },
          parcelDescription: parcel?.description || req.parcelCategory || 'Parcel delivery',
          route,
        });

        if (newConv?.id) {
          router.push(`/chat/${encodeURIComponent(String(newConv.id))}` as never);
        } else {
          const refetched = await conversationsQuery.refetch();
          const found = refetched.data?.find((c) => c.requestId === req.id);
          if (found?.id) {
            router.push(`/chat/${encodeURIComponent(String(found.id))}` as never);
          } else {
            showAlert('Chat Error', 'Could not open conversation. Please try again.');
          }
        }
      } catch (err: any) {
        Haptic.error();
        showAlert('Chat Error', getUserErrorMessage(err, 'Could not open chat. Please try again.'));
      } finally {
        setOpeningChatRequestId(null);
      }
    },
    [
      conversations,
      conversationsQuery,
      createConversationMutation,
      openingChatRequestId,
      parcelMap,
      router,
      showAlert,
      user,
    ]
  );

  const handleDelivery = useCallback((req: Request) => {
    Haptic.tap();
    const isReqPaid = paidRequestIds.has(req.id) || req.status === 'completed';
    const isSender = user?.id ? user.id === req.senderId : false;
    if (!isReqPaid && req.status === 'accepted') {
      if (isSender) {
        router.push({ pathname: '/payment/[id]', params: { id: req.id } });
        return;
      } else {
        showAlert('Awaiting Payment', 'The sender has not completed the booking payment yet. Once paid, handover and tracking will unlock.');
        return;
      }
    }
    router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
  }, [paidRequestIds, router, showAlert, user?.id]);

  const handlePayment = useCallback((req: Request) => {
    Haptic.tap();
    router.push({ pathname: '/payment/[id]', params: { id: req.id } });
  }, [router]);

  const handleReview = useCallback((req: Request) => {
    Haptic.confirm();
    setRatingTarget(req);
  }, []);

  const handleOpenDetail = useCallback((req: Request) => {
    Haptic.tap();
    if (req.status === 'accepted' || req.status === 'completed') {
      const isSender = user?.id ? user.id === req.senderId : false;
      const isReqPaid = paidRequestIds.has(req.id) || req.status === 'completed';
      if (req.status === 'accepted' && !isReqPaid) {
        if (isSender) {
          router.push({ pathname: '/payment/[id]', params: { id: req.id } });
          return;
        } else {
          showAlert('Awaiting Payment', 'The sender has not completed the booking payment yet. Once paid, handover and tracking will unlock.');
          return;
        }
      }
      router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
      return;
    }
    if (req.tripId) {
      router.push({ pathname: '/trip/[id]', params: { id: req.tripId } });
    } else if (req.parcelId) {
      router.push({ pathname: '/parcel/[id]', params: { id: req.parcelId } });
    }
  }, [paidRequestIds, router, showAlert, user?.id]);

  const renderRequestItem = useCallback(({ item }: { item: Request }) => (
    <RequestListItem
      item={item}
      isTablet={isTablet}
      currentUserId={user?.id}
      isPaid={paidRequestIds.has(item.id)}
      onPress={handleOpenDetail}
      onAccept={handleAccept}
      onReject={handleReject}
      onCancel={handleCancel}
      onChat={handleChat}
      onDelivery={handleDelivery}
      onPayment={handlePayment}
      onReview={handleReview}
    />
  ), [isTablet, user?.id, paidRequestIds, handleOpenDetail, handleAccept, handleReject, handleCancel, handleChat, handleDelivery, handlePayment, handleReview]);

  const renderItemSeparator = useCallback(() => <View style={{ height: Spacing.md }} />, []);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerTop, { paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top, Spacing.sm) }, isTablet && styles.tabletContainer]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Requests</Text>
          <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>
            {tab === 'requests'
              ? receivedRequests.length > 0
                ? `${receivedRequests.length} incoming request${receivedRequests.length > 1 ? 's' : ''} awaiting action`
                : sentRequests.length > 0
                ? `${sentRequests.length} sent request${sentRequests.length > 1 ? 's' : ''} awaiting response`
                : 'Manage incoming and sent delivery requests'
              : activeList.length > 0
              ? `${activeList.length} active deliver${activeList.length > 1 ? 'ies' : 'y'} in progress`
              : 'Track ongoing deliveries and handover OTPs'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.refreshBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
          onPress={handleRefresh}
          hitSlop={TouchTarget.smallHitSlop}
          accessibilityLabel="Refresh requests"
        >
          <MaterialIcons name="refresh" size={20} color={C.textPrimary} />
        </Pressable>
      </View>

      {!isOnline ? (
        <View style={[styles.networkState, isTablet && styles.tabletContainer]}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* 2 Main Tabs: Requests vs Active Deliveries */}
      <View style={[styles.segmentedWrap, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, isTablet && styles.tabletContainer]}>
        {[
          { key: 'requests' as const, label: 'Pending', icon: 'schedule', count: allPendingRequests.length, alert: receivedRequests.length > 0 },
          { key: 'active' as const, label: 'In Transit', icon: 'local-shipping', count: activeList.length, alert: false },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={({ pressed }) => [
                styles.segmentTab,
                { backgroundColor: active ? C.primary : 'transparent' },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={() => switchTab(t.key)}
            >
              <MaterialIcons
                name={t.icon as any}
                size={15}
                color={active ? '#FFFFFF' : C.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? '#FFFFFF' : C.textSecondary, fontWeight: active ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                {t.label}
              </Text>
              {t.count > 0 ? (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: active
                        ? '#FFFFFF'
                        : t.alert
                        ? '#EF4444'
                        : C.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      {
                        color: active
                          ? C.primary
                          : t.alert
                          ? '#FFFFFF'
                          : C.textSecondary,
                        fontWeight: FontWeight.bold,
                      },
                    ]}
                  >
                    {t.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
        <FlashList
          data={requestsQuery.error || requestsQuery.isLoading ? [] : displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          estimatedItemSize={260}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={renderItemSeparator}
          contentContainerStyle={{ paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || requestsQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={C.primaryDark}
              colors={[C.primaryDark]}
            />
          }
          ListEmptyComponent={
            requestsQuery.error ? (
              <View style={styles.feedbackWrap}>
                <AsyncStateCard
                  C={C}
                  icon="cloud-off"
                  title="Could not load requests"
                  message={getUserErrorMessage(requestsQuery.error, 'Refresh and try again.')}
                  actionLabel="Retry"
                  onAction={() => { void requestsQuery.refetch(); }}
                />
              </View>
            ) : requestsQuery.isLoading ? (
              <View style={styles.feedbackWrap}>
                <RequestCardSkeleton />
                <RequestCardSkeleton />
                <RequestCardSkeleton />
              </View>
            ) : (
              <View style={[styles.empty, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
                <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
                  <LottieAnimation
                    name={tab === 'requests' ? 'emptyActivity' : 'deliveryCar'}
                    style={{ width: 140, height: 110 }}
                  />
                </View>

                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                  {tab === 'requests' ? 'No Pending Requests' : 'No Active Deliveries'}
                </Text>

                <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                  {tab === 'requests'
                    ? 'When you send a request or someone requests your trip, it will appear here.'
                    : 'Matched deliveries in transit will appear here with live tracking, confirmed booking, and handover OTP.'}
                </Text>

                <View style={styles.emptyActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      router.push('/(tabs)');
                    }}
                  >
                    <MaterialIcons name="search" size={15} color="#fff" />
                    <Text style={styles.emptyCTAText}>Browse Listings</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.emptySecondaryCTA,
                      {
                        backgroundColor: C.surfaceElevated,
                        borderColor: C.surfaceBorder,
                        opacity: pressed ? 0.86 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      router.push(tab === 'active' ? '/create-trip' : '/create-parcel');
                    }}
                  >
                    <MaterialIcons name={tab === 'active' ? 'drive-eta' : 'inventory-2'} size={15} color={C.textPrimary} />
                    <Text style={[styles.emptySecondaryText, { color: C.textPrimary }]}>
                      {tab === 'active' ? 'Post a Trip' : 'Send a Parcel'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )
          }
        />
      </Animated.View>

      {ratingTarget && user ? (
        <RatingModal
          visible={Boolean(ratingTarget)}
          requestId={ratingTarget.id}
          fromUserId={user.id}
          toUserId={ratingTarget.senderId === user.id ? ratingTarget.travellerId : ratingTarget.senderId}
          toUserName={ratingTarget.senderId === user.id ? ratingTarget.travellerName : ratingTarget.senderName}
          onDone={() => {
            setRatingTarget(null);
            void ratedRequestIdsQuery.refetch();
            void requestsQuery.refetch();
          }}
        />
      ) : null}
    </View>
  );
}

export default function RequestsScreen() {
  return (
    <AppErrorBoundary>
      <RequestsScreenContent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  titleWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  networkState: {
    marginVertical: Spacing.xs,
  },

  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },

  payNowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  payNowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  payNowSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },

  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginVertical: Spacing.xs,
  },
  segmentTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: Spacing.xs,
  },
  segmentLabel: {
    fontSize: FontSize.xs + 0.5,
    letterSpacing: -0.1,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },

  filtersContainer: {
    marginVertical: 6,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingLeft: 9,
    paddingRight: 5,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  statusChipBadge: {
    minWidth: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 0.5,
  },
  statusChipCount: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },

  feedbackWrap: {
    marginTop: 2,
  },

  empty: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSize.xs + 0.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  emptyCTAText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: 12,
  },
  emptySecondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  emptySecondaryText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
});
