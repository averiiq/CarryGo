import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { AsyncStateCard, OfflineBanner, RequestCard } from '@/components';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { sendLocalNotification, sendRequestNotification } from '@/services/notifications.service';
import { createDelivery } from '@/services/deliveries.service';
import { Haptic } from '@/services/haptics.service';
import { EmptyRequestsSVG } from '@/components/ui/EmptyState';
import { useConversationsQuery, useCreateConversationMutation } from '@/features/conversations/queries';
import { flattenInfiniteData, useParcelsQuery } from '@/features/listings/queries';
import { useRequestsQuery, useUpdateRequestStatusMutation } from '@/features/requests/queries';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFadeIn, useStaggeredList } from '@/hooks/useAnimations';
import { ProductIllustration } from '@/components/illustrations';

type TabType = 'incoming' | 'outgoing';
type StatusFilterKey = 'all' | 'pending' | 'accepted' | 'completed';

const STATUS_TABS: { key: StatusFilterKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pending', label: 'Pending', icon: 'hourglass-empty' },
  { key: 'accepted', label: 'Active', icon: 'local-shipping' },
  { key: 'completed', label: 'Done', icon: 'task-alt' },
];

export default function RequestsScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
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
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerEntrance = useFadeIn(0, 420);
  const controlsEntrance = useFadeIn(120, 420);

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, -12],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0.975],
    extrapolate: 'clamp',
  });

  const requests = user ? requestsQuery.data ?? [] : [];
  const conversations = user ? conversationsQuery.data ?? [] : [];
  const parcels = user ? flattenInfiniteData(parcelsQuery.data) : [];

  const incoming = requests.filter(r => r.travellerId === user?.id);
  const outgoing = requests.filter(r => r.senderId === user?.id);
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
        requestsQuery.refetch(),
        conversationsQuery.refetch(),
        parcelsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery, parcelsQuery, requestsQuery, user]);

  const handleAccept = (requestId: string, req: typeof requests[0]) => {
    if (!user || req.travellerId !== user.id) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the selected traveller can accept this request.');
      return;
    }

    Haptic.warning();
    showAlert('Accept Request?', `Accept delivery for Rs ${req.price} from ${req.senderName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          if (!user) return;
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'accepted' });
            const parcel = parcels.find(p => p.id === req.parcelId);
            const route = parcel ? `${parcel.fromCity} to ${parcel.toCity}` : 'Route';
            const existing = conversations.find(c => c.requestId === requestId);
            if (!existing) {
              await createConversationMutation.mutateAsync({
                requestId,
                participantIds: [user?.id || '', req.senderId],
                participantNames: { [user?.id || '']: user?.name || 'You', [req.senderId]: req.senderName },
                parcelDescription: parcel?.description || 'Parcel delivery',
                route,
              });
            }
            await createDelivery(requestId);
            await sendRequestNotification('received', req.senderName, req.price);
            await sendLocalNotification('Accepted', `Delivery from ${req.senderName} accepted!`);
            Haptic.success();
            showAlert('Accepted!', 'A chat has opened to coordinate pickup.');
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Accept',
              error instanceof Error ? error.message : 'The request could not be accepted. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const handleReject = (requestId: string, _req: typeof requests[0]) => {
    const req = _req;
    if (!user || req.travellerId !== user.id) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the selected traveller can reject this request.');
      return;
    }

    Haptic.warning();
    showAlert('Reject Request?', 'Reject this delivery request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'rejected' });
            Haptic.error();
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Reject',
              error instanceof Error ? error.message : 'The request could not be rejected. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const handleCancel = (requestId: string, req: typeof requests[0]) => {
    if (!user || req.senderId !== user.id) {
      Haptic.warning();
      showAlert('Not Allowed', 'Only the parcel sender can cancel this request.');
      return;
    }

    Haptic.warning();
    showAlert('Cancel Request?', 'Cancel this request to the traveller?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Request', style: 'destructive', onPress: async () => {
          try {
            await updateRequestStatusMutation.mutateAsync({ requestId, status: 'cancelled' });
            Haptic.success();
          } catch (error) {
            Haptic.error();
            showAlert(
              'Could Not Cancel',
              error instanceof Error ? error.message : 'The request could not be cancelled. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const handleChat = (req: typeof requests[0]) => {
    Haptic.tap();
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    else showAlert('No Chat Yet', 'Chat opens automatically once the request is accepted.');
  };

  const handleDelivery = (req: typeof requests[0]) => {
    Haptic.tap();
    router.push({ pathname: '/delivery/[id]', params: { id: req.id } });
  };

  const handlePayment = (req: typeof requests[0]) => {
    Haptic.tap();
    router.push({ pathname: '/payment/[id]', params: { id: req.id } });
  };

  const tabLabel = tab === 'incoming' ? 'Requests to carry parcels' : 'Requests you have sent';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.headerTop, { paddingTop: insets.top + Spacing.sm }]}>
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
            hitSlop={8}
            accessibilityLabel="Refresh requests"
          >
            <MaterialIcons name="refresh" size={20} color={C.textPrimary} />
          </Pressable>
        </View>
      </View>

      {!isOnline ? (
        <View style={styles.networkState}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* Segmented Mode Switcher: Incoming vs Outgoing */}
      <View style={[styles.segmentedWrap, { backgroundColor: '#F1F5F9', borderColor: C.surfaceBorder }]}>
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
          style={styles.statusFilterScroll}
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
          renderItem={({ item, index }) => {
            const anim = cardAnims[index];
            return (
              <Animated.View
                style={anim ? { opacity: anim.opacity, transform: [{ translateY: anim.translateY }] } : undefined}
              >
                <RequestCard
                  request={item}
                  type={tab}
                  onAccept={() => handleAccept(item.id, item)}
                  onReject={() => handleReject(item.id, item)}
                  onCancel={() => handleCancel(item.id, item)}
                  onChat={() => handleChat(item)}
                  onDelivery={() => handleDelivery(item)}
                  onPayment={() => handlePayment(item)}
                />
              </Animated.View>
            );
          }}
          estimatedItemSize={220}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
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
                  message={requestsQuery.error instanceof Error ? requestsQuery.error.message : 'Refresh and try again.'}
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
    minHeight: 40,
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
