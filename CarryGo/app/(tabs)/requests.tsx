import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { AsyncStateCard, OfflineBanner, RequestCard, LottieAnimation } from '@/components';
import { RatingModal } from '@/components/feature/RatingModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { sendLocalNotification, sendRequestNotification } from '@/services/notifications.service';
import { createDelivery } from '@/services/deliveries.service';
import { Haptic } from '@/services/haptics.service';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { flattenInfiniteData, useParcelsQuery, useParcelsByIdsQuery } from '@/features/listings/queries';
import { useRequestsQuery, useUpdateRequestStatusMutation, useUserRatedRequestIdsQuery } from '@/features/requests/queries';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn, useStaggeredList } from '@/hooks/useAnimations';
import { getUserErrorMessage } from '@/lib/error-handler';
import { Request } from '@/types';
import { isRequestIncoming, isRequestOutgoing } from '@/services/requests.service';

type TabType = 'incoming' | 'outgoing';
type StatusFilterKey = 'all' | 'pending' | 'accepted' | 'completed';

const STATUS_TABS: { key: StatusFilterKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pending', label: 'Pending', icon: 'hourglass-empty' },
  { key: 'accepted', label: 'Active', icon: 'local-shipping' },
  { key: 'completed', label: 'Done', icon: 'task-alt' },
];

const RequestListItem = React.memo(function RequestListItem({
  item,
  tab,
  isTablet,
  currentUserId,
  anim,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onDelivery,
  onPayment,
  onReview,
}: {
  item: Request;
  tab: TabType;
  isTablet: boolean;
  currentUserId?: string;
  anim?: { opacity: Animated.Value; translateY: Animated.Value };
  onAccept: (id: string, req: Request) => void;
  onReject: (id: string, req: Request) => void;
  onCancel: (id: string, req: Request) => void;
  onChat: (req: Request) => void;
  onDelivery: (req: Request) => void;
  onPayment: (req: Request) => void;
  onReview: (req: Request) => void;
}) {
  const handleAccept = useCallback(() => onAccept(item.id, item), [onAccept, item]);
  const handleReject = useCallback(() => onReject(item.id, item), [onReject, item]);
  const handleCancel = useCallback(() => onCancel(item.id, item), [onCancel, item]);
  const handleChat = useCallback(() => onChat(item), [onChat, item]);
  const handleDelivery = useCallback(() => onDelivery(item), [onDelivery, item]);
  const handlePayment = useCallback(() => onPayment(item), [onPayment, item]);
  const handleReview = useCallback(() => onReview(item), [onReview, item]);

  const content = (
    <View style={isTablet ? styles.tabletContainer : undefined}>
      <RequestCard
        request={item}
        type={tab}
        currentUserId={currentUserId}
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

  if (anim) {
    return (
      <Animated.View style={{ opacity: anim.opacity, transform: [{ translateY: anim.translateY }] }}>
        {content}
      </Animated.View>
    );
  }

  return content;
});

export default function RequestsScreen() {
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

  const [tab, setTab] = useState<TabType>('incoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Request | null>(null);

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const pendingPulse = React.useRef(new Animated.Value(1)).current;

  const requestsRefetchRef = React.useRef(requestsQuery.refetch);
  requestsRefetchRef.current = requestsQuery.refetch;
  const conversationsRefetchRef = React.useRef(conversationsQuery.refetch);
  conversationsRefetchRef.current = conversationsQuery.refetch;
  const parcelsRefetchRef = React.useRef(parcelsQuery.refetch);
  parcelsRefetchRef.current = parcelsQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void requestsRefetchRef.current();
      }
    }, [user?.id])
  );

  const rawRequests = user ? requestsQuery.data ?? [] : [];
  const conversations = user ? conversationsQuery.data ?? [] : [];
  const marketplaceParcels = user ? flattenInfiniteData(parcelsQuery.data) : [];

  const requestedParcelIds = useMemo(() => {
    return Array.from(new Set(rawRequests.map(r => r.parcelId).filter(Boolean)));
  }, [rawRequests]);

  const requestedParcelsQuery = useParcelsByIdsQuery(requestedParcelIds);
  const requestedParcels = requestedParcelsQuery.data ?? [];
  const requestedParcelsRefetchRef = React.useRef(requestedParcelsQuery.refetch);
  requestedParcelsRefetchRef.current = requestedParcelsQuery.refetch;

  // Parcel lookup map prioritizing requestedParcelsQuery, then marketplace parcels
  const parcelMap = useMemo(() => {
    const map = new Map<string, typeof marketplaceParcels[0]>();
    marketplaceParcels.forEach(p => map.set(p.id, p));
    requestedParcels.forEach(p => map.set(p.id, p));
    return map;
  }, [marketplaceParcels, requestedParcels]);

  // Enrich requests with resolved route, category, and weight, and filter out reviewed completed requests
  const requests = useMemo(() => {
    return rawRequests
      .filter(req => {
        if (req.status === 'completed' && ratedRequestIds.has(req.id)) {
          return false;
        }
        return true;
      })
      .map(req => {
        const p = parcelMap.get(req.parcelId);
        return {
          ...req,
          fromCity: req.fromCity || p?.fromCity,
          toCity: req.toCity || p?.toCity,
          parcelCategory: req.parcelCategory || p?.category,
          parcelWeight: req.parcelWeight || p?.weight,
        };
      });
  }, [rawRequests, ratedRequestIds, parcelMap]);

  const incoming = requests.filter(r => isRequestIncoming(r, user?.id));
  const outgoing = requests.filter(r => isRequestOutgoing(r, user?.id));
  const base = tab === 'incoming' ? incoming : outgoing;
  const pendingCount = incoming.filter(r => r.status === 'pending').length;

  const statusCounts = useMemo(() => ({
    all: base.length,
    pending: base.filter(r => r.status === 'pending').length,
    accepted: base.filter(r => r.status === 'accepted').length,
    completed: base.filter(r => r.status === 'completed').length,
  }), [base]);

  const displayed = useMemo(() => {
    if (statusFilter === 'all') return base;
    return base.filter(r => r.status === statusFilter);
  }, [base, statusFilter]);

  const cardAnims = useStaggeredList(Math.max(displayed.length, 14), 70);

  const switchTab = (nextTab: TabType) => {
    if (nextTab === tab) return;
    Haptic.select();
    const direction = nextTab === 'outgoing' ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * 18,
        duration: 95,
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
    setStatusFilter('all');
  };

  useEffect(() => {
    if (pendingCount <= 0) {
      pendingPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pendingPulse, { toValue: 1.08, duration: 620, useNativeDriver: true }),
        Animated.timing(pendingPulse, { toValue: 1, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pendingCount, pendingPulse]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await Promise.all([
        requestsRefetchRef.current(),
        ratedRequestIdsQuery.refetch(),
        conversationsRefetchRef.current(),
        parcelsRefetchRef.current(),
        requestedParcelIds.length > 0 ? requestedParcelsRefetchRef.current() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [ratedRequestIdsQuery, requestedParcelIds.length, user]);

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
              await sendRequestNotification('received', otherUserName, req.price);
              await sendLocalNotification('Accepted', `Delivery with ${otherUserName} accepted!`);
            } catch (auxError) {
              console.warn('Post-accept auxiliary step error (non-fatal):', auxError);
            }
            await requestsQuery.refetch();
            Haptic.success();

            if (isSender) {
              showAlert(
                'Offer Accepted! 💳',
                `You matched with ${otherUserName}. Deposit ₹${req.price} in secure escrow to unlock your handover OTP.`,
                [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Pay Escrow Now',
                    onPress: () => router.push({ pathname: '/payment/[id]', params: { id: requestId } }),
                  },
                ]
              );
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

  const handleChat = useCallback((req: Request) => {
    Haptic.tap();
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    else showAlert('No Chat Yet', 'Chat opens automatically once the request is accepted.');
  }, [conversations, router, showAlert]);

  const handleDelivery = useCallback((req: Request) => {
    Haptic.tap();
    router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
  }, [router]);

  const handlePayment = useCallback((req: Request) => {
    Haptic.tap();
    router.push({ pathname: '/payment/[id]', params: { id: req.id } });
  }, [router]);

  const handleReview = useCallback((req: Request) => {
    Haptic.confirm();
    setRatingTarget(req);
  }, []);

  const renderRequestItem = useCallback(({ item, index }: { item: Request; index: number }) => (
    <RequestListItem
      item={item}
      tab={tab}
      isTablet={isTablet}
      currentUserId={user?.id}
      anim={cardAnims[index]}
      onAccept={handleAccept}
      onReject={handleReject}
      onCancel={handleCancel}
      onChat={handleChat}
      onDelivery={handleDelivery}
      onPayment={handlePayment}
      onReview={handleReview}
    />
  ), [tab, isTablet, user?.id, cardAnims, handleAccept, handleReject, handleCancel, handleChat, handleDelivery, handlePayment, handleReview]);

  const renderItemSeparator = useCallback(() => <View style={{ height: Spacing.md }} />, []);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerTop, { paddingTop: insets.top + Spacing.sm }, isTablet && styles.tabletContainer]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Requests</Text>
          <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>
            {pendingCount > 0
              ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} awaiting your action`
              : 'Track and manage your community deliveries'}
          </Text>
        </View>

        <View style={styles.headerActionRow}>
          {pendingCount > 0 ? (
            <View style={[styles.pulsePill, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44' }]}>
              <View style={[styles.liveDot, { backgroundColor: C.warning }]} />
              <Text style={[styles.pulsePillText, { color: C.warning }]}>{pendingCount} Action{pendingCount > 1 ? 's' : ''}</Text>
            </View>
          ) : (
            <View style={[styles.pulsePill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
              <MaterialIcons name="check-circle" size={13} color={C.primary} />
              <Text style={[styles.pulsePillText, { color: C.primary }]}>Synced</Text>
            </View>
          )}

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
      </View>

      {!isOnline ? (
        <View style={[styles.networkState, isTablet && styles.tabletContainer]}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* Segmented Mode Switcher: Received vs Sent */}
      <View style={[styles.segmentedWrap, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, isTablet && styles.tabletContainer]}>
        {(['incoming', 'outgoing'] as const).map((t) => {
          const active = tab === t;
          const count = t === 'incoming' ? incoming.length : outgoing.length;
          return (
            <Pressable
              key={t}
              style={({ pressed }) => [
                styles.segmentTab,
                { backgroundColor: active ? C.primary : 'transparent' },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={() => switchTab(t)}
            >
              <MaterialIcons
                name={t === 'incoming' ? 'move-to-inbox' : 'outbox'}
                size={16}
                color={active ? '#FFFFFF' : C.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? '#FFFFFF' : C.textSecondary, fontWeight: active ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                {t === 'incoming' ? 'Received' : 'Sent'} ({count})
              </Text>
              {t === 'incoming' && pendingCount > 0 ? (
                <View style={[styles.tabBadge, { backgroundColor: active ? '#FFFFFF' : C.warning }]}>
                  <Text style={[styles.tabBadgeText, { color: active ? C.primary : '#FFFFFF' }]}>{pendingCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Clear contextual description of active tab */}
      <View style={[styles.tabDescriptionWrap, isTablet && styles.tabletContainer]}>
        <Text style={[styles.tabDescriptionText, { color: C.textMuted }]}>
          {tab === 'incoming'
            ? 'Offers and delivery requests sent to you by other members'
            : 'Delivery requests and carry offers you sent to others'}
        </Text>
      </View>

      {/* Single Clean Status Filter Bar */}
      {base.length > 0 ? (
        <View style={[styles.filtersContainer, isTablet && styles.tabletContainer]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {STATUS_TABS.map((st) => {
              const count = statusCounts[st.key];
              const active = statusFilter === st.key;
              return (
                <Pressable
                  key={st.key}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: active ? C.primarySubtle : C.surface,
                      borderColor: active ? C.primary : C.surfaceBorder,
                    },
                    count === 0 && st.key !== 'all' && { opacity: 0.45 },
                  ]}
                  hitSlop={TouchTarget.smallHitSlop}
                  onPress={() => {
                    Haptic.select();
                    setStatusFilter(st.key);
                  }}
                  disabled={count === 0 && st.key !== 'all'}
                >
                  <MaterialIcons name={st.icon} size={13} color={active ? C.primary : C.textSecondary} />
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: active ? C.primary : C.textSecondary, fontWeight: active ? FontWeight.bold : FontWeight.medium },
                    ]}
                  >
                    {st.label}
                  </Text>
                  <View style={[styles.statusChipBadge, { backgroundColor: active ? C.primary : C.surfaceBorder }]}>
                    <Text style={[styles.statusChipCount, { color: active ? '#fff' : C.textSecondary }]}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
        <FlashList
          data={requestsQuery.error || requestsQuery.isLoading ? [] : displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          estimatedItemSize={260}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={renderItemSeparator}
          contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
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
                <AsyncStateCard
                  C={C}
                  icon="sync"
                  title="Loading requests"
                  message="Checking your incoming and outgoing delivery requests."
                />
              </View>
            ) : (
              <View style={[styles.empty, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
                <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
                  <LottieAnimation
                    name={tab === 'incoming' ? 'deliveryCar' : 'packageBox'}
                    style={{ width: 140, height: 110 }}
                  />
                </View>

                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                  {statusFilter !== 'all'
                    ? `No ${statusFilter} requests`
                    : tab === 'incoming'
                      ? 'No received requests yet'
                      : 'No sent requests yet'}
                </Text>

                <Text style={[styles.emptySubtext, { color: C.textMuted }]}> 
                  {statusFilter !== 'all'
                    ? 'Try switching status filter to "All" to view all requests.'
                    : tab === 'incoming'
                      ? 'When travelers offer to carry your parcels or senders request your trips, they appear here.'
                      : 'Browse verified trips to send your parcel, or view parcels to carry along your journey.'}
                </Text>

                {statusFilter === 'all' ? (
                  <View style={styles.emptyActionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.emptyCTA,
                        { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                      onPress={() => {
                        Haptic.tap();
                        router.push(tab === 'incoming' ? '/create-trip' : '/create-parcel');
                      }}
                    >
                      <MaterialIcons name={tab === 'incoming' ? 'drive-eta' : 'inventory-2'} size={15} color="#fff" />
                      <Text style={styles.emptyCTAText}>{tab === 'incoming' ? 'Post a Trip' : 'Send a Parcel'}</Text>
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
                        router.push('/(tabs)');
                      }}
                    >
                      <MaterialIcons name="explore" size={15} color={C.textPrimary} />
                      <Text style={[styles.emptySecondaryText, { color: C.textPrimary }]}>Explore Marketplace</Text>
                    </Pressable>
                  </View>
                ) : (
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
                      setStatusFilter('all');
                    }}
                  >
                    <MaterialIcons name="filter-alt-off" size={15} color={C.textSecondary} />
                    <Text style={[styles.emptySecondaryText, { color: C.textSecondary }]}>Show all requests</Text>
                  </Pressable>
                )}
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
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  pulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pulsePillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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

  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginVertical: Spacing.xs,
  },
  segmentTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
  },
  segmentLabel: {
    fontSize: FontSize.sm - 0.5,
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
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  tabDescriptionWrap: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  tabDescriptionText: {
    fontSize: 11.5,
    lineHeight: 16,
  },

  filtersContainer: {
    marginVertical: 4,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: Spacing.sm,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleChipText: {
    fontSize: 11,
    letterSpacing: -0.1,
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
