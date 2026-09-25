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
import { AsyncStateCard, OfflineBanner, RequestCard } from '@/components';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { sendLocalNotification, sendRequestNotification } from '@/services/notifications.service';
import { createDelivery } from '@/services/deliveries.service';
import { Haptic } from '@/services/haptics.service';
import { EmptyRequestsSVG } from '@/components/ui/EmptyState';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { flattenInfiniteData, useParcelsQuery, useParcelsByIdsQuery } from '@/features/listings/queries';
import { useRequestsQuery, useUpdateRequestStatusMutation } from '@/features/requests/queries';
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
  anim,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onDelivery,
  onPayment,
}: {
  item: Request;
  tab: TabType;
  isTablet: boolean;
  anim?: { opacity: Animated.Value; translateY: Animated.Value };
  onAccept: (id: string, req: Request) => void;
  onReject: (id: string, req: Request) => void;
  onCancel: (id: string, req: Request) => void;
  onChat: (req: Request) => void;
  onDelivery: (req: Request) => void;
  onPayment: (req: Request) => void;
}) {
  const handleAccept = useCallback(() => onAccept(item.id, item), [onAccept, item]);
  const handleReject = useCallback(() => onReject(item.id, item), [onReject, item]);
  const handleCancel = useCallback(() => onCancel(item.id, item), [onCancel, item]);
  const handleChat = useCallback(() => onChat(item), [onChat, item]);
  const handleDelivery = useCallback(() => onDelivery(item), [onDelivery, item]);
  const handlePayment = useCallback(() => onPayment(item), [onPayment, item]);

  const content = (
    <View style={isTablet ? styles.tabletContainer : undefined}>
      <RequestCard
        request={item}
        type={tab}
        onAccept={handleAccept}
        onReject={handleReject}
        onCancel={handleCancel}
        onChat={handleChat}
        onDelivery={handleDelivery}
        onPayment={handlePayment}
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
  const conversationsQuery = useConversationsQuery(user?.id);
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const updateRequestStatusMutation = useUpdateRequestStatusMutation(user?.id);
  const createConversationMutation = useCreateConversationMutation(user?.id);

  const [tab, setTab] = useState<TabType>('incoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const pendingPulse = React.useRef(new Animated.Value(1)).current;
  const headerEntrance = useFadeIn(0, 420);
  const controlsEntrance = useFadeIn(120, 420);

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

  // Enrich requests with resolved route, category, and weight
  const requests = useMemo(() => {
    return rawRequests.map(req => {
      const p = parcelMap.get(req.parcelId);
      return {
        ...req,
        fromCity: req.fromCity || p?.fromCity,
        toCity: req.toCity || p?.toCity,
        parcelCategory: req.parcelCategory || p?.category,
        parcelWeight: req.parcelWeight || p?.weight,
      };
    });
  }, [rawRequests, parcelMap]);

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

  const displayed = statusFilter === 'all' ? base : base.filter(r => r.status === statusFilter);
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
        conversationsRefetchRef.current(),
        parcelsRefetchRef.current(),
        requestedParcelIds.length > 0 ? requestedParcelsRefetchRef.current() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [requestedParcelIds.length, user]);

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
    const promptText = isOffer
      ? `Accept carrier offer for ₹${req.price} from ${otherUserName}?`
      : `Accept delivery for ₹${req.price} from ${otherUserName}?`;

    Haptic.warning();
    showAlert('Accept Request?', promptText, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          if (!user) return;
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'accepted' });
            try {
              const parcel = parcelMap.get(req.parcelId);
              const route = parcel ? `${parcel.fromCity} to ${parcel.toCity}` : `${req.fromCity || 'Pickup'} to ${req.toCity || 'Drop'}`;
              const existing = conversations.find(c => c.requestId === requestId);
              if (!existing) {
                await createConversationMutation.mutateAsync({
                  requestId,
                  participantIds: [user.id, otherUserId],
                  participantNames: { [user.id]: user.name || 'You', [otherUserId]: otherUserName },
                  parcelDescription: parcel?.description || 'Parcel delivery',
                  route,
                });
              }
              await createDelivery(requestId);
              await sendRequestNotification('received', otherUserName, req.price);
              await sendLocalNotification('Accepted', `Delivery with ${otherUserName} accepted!`);
            } catch (auxError) {
              console.warn('Post-accept auxiliary step error (non-fatal):', auxError);
            }
            await requestsQuery.refetch();
            Haptic.success();
            showAlert('Accepted!', 'A chat has opened to coordinate pickup.');
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
    showAlert('Cancel Request?', 'Cancel this request?', [
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

  const renderRequestItem = useCallback(({ item, index }: { item: Request; index: number }) => (
    <RequestListItem
      item={item}
      tab={tab}
      isTablet={isTablet}
      anim={cardAnims[index]}
      onAccept={handleAccept}
      onReject={handleReject}
      onCancel={handleCancel}
      onChat={handleChat}
      onDelivery={handleDelivery}
      onPayment={handlePayment}
    />
  ), [tab, isTablet, cardAnims, handleAccept, handleReject, handleCancel, handleChat, handleDelivery, handlePayment]);

  const renderItemSeparator = useCallback(() => <View style={{ height: Spacing.md }} />, []);

  const tabLabel = tab === 'incoming' ? 'Requests to carry parcels' : 'Requests you have sent';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerTop, { paddingTop: insets.top + Spacing.sm }, isTablet && styles.tabletContainer]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Requests</Text>
          <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>
            {pendingCount > 0
              ? `${pendingCount} pending handover decision${pendingCount > 1 ? 's' : ''}`
              : 'Manage delivery matches and handoffs'}
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

      {/* Segmented Mode Switcher: Incoming vs Outgoing */}
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
                name={t === 'incoming' ? 'call-received' : 'call-made'}
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
                <View style={[styles.tabBadge, { backgroundColor: active ? '#FFFFFF' : C.error }]}>
                  <Text style={[styles.tabBadgeText, { color: active ? C.primary : '#FFFFFF' }]}>{pendingCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Status Filter Row */}
      {base.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.statusFilterScroll, isTablet && styles.tabletContainer]}
          contentContainerStyle={styles.statusFilterRow}
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
                <MaterialIcons name={st.icon} size={14} color={active ? C.primary : C.textSecondary} />
                <Text
                  style={[
                    styles.statusChipText,
                    { color: active ? C.primary : C.textSecondary, fontWeight: active ? FontWeight.bold : FontWeight.medium },
                  ]}
                >
                  {st.label}
                </Text>
                <View style={[styles.statusChipBadge, { backgroundColor: active ? C.primary : C.surfaceBorder }]}>
                  <Text style={[styles.statusChipCount, { color: '#fff' }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
        <FlashList
          data={requestsQuery.error || requestsQuery.isLoading ? [] : displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          estimatedItemSize={220}
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
                <View style={[styles.emptyVisual, { backgroundColor: C.surfaceElevated }]}> 
                  <EmptyRequestsSVG width={176} height={132} />
                </View>

                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
                  {statusFilter !== 'all' ? `No ${statusFilter} requests` : `No ${tab} requests yet`}
                </Text>

                <Text style={[styles.emptySubtext, { color: C.textMuted }]}> 
                  {statusFilter !== 'all'
                    ? 'Try another filter or clear this one to explore more requests.'
                    : tab === 'incoming'
                      ? 'Post a trip and receive delivery requests from senders on your route.'
                      : 'Send a parcel request and match with trusted travellers quickly.'}
                </Text>

                {statusFilter === 'all' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      { backgroundColor: C.primaryDark, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      router.push(tab === 'incoming' ? '/create-trip' : '/create-parcel');
                    }}
                  >
                    <MaterialIcons name={tab === 'incoming' ? 'drive-eta' : 'inventory-2'} size={16} color="#fff" />
                    <Text style={styles.emptyCTAText}>{tab === 'incoming' ? 'Post a Trip' : 'Send a Parcel'}</Text>
                  </Pressable>
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
                    <Text style={[styles.emptySecondaryText, { color: C.textSecondary }]}>Clear filter</Text>
                  </Pressable>
                )}
              </View>
            )
          }
        />
      </Animated.View>
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    minHeight: 44,
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

  statusFilterScroll: {
    flexGrow: 0,
    marginVertical: Spacing.xs + 2,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    paddingRight: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    letterSpacing: -0.1,
  },
  statusChipBadge: {
    minWidth: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusChipCount: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  list: {
    flex: 1,
  },
  listContent: {},
  feedbackWrap: {
    marginTop: 2,
  },

  empty: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyVisual: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 286,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  emptyCTAText: {
    color: '#fff',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  emptySecondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  emptySecondaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
