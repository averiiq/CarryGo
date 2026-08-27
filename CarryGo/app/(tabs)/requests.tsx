import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
    if (conv) router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
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
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top + 10 }]}>
      <Animated.View
        style={{
          opacity: headerEntrance.opacity,
          transform: [...headerEntrance.transform, { translateY: heroTranslateY }, { scale: heroScale }],
        }}
      >
        <View
        style={[
          styles.heroCard,
          {
            backgroundColor: C.surface,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <Image
          source={require('@/assets/images/messages-hero-reference.png')}
          contentFit="cover"
          style={styles.heroImage}
          transition={180}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.74)', 'rgba(255,255,255,0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroScrim}
        />

        <View style={styles.heroTopRow}>
          <View style={[styles.liveBadge, { backgroundColor: pendingCount > 0 ? C.warningSubtle : C.successSubtle }]}> 
            <Animated.View
              style={[
                styles.liveDot,
                {
                  backgroundColor: pendingCount > 0 ? C.warning : C.success,
                  transform: [{ scale: pendingPulse }],
                },
              ]}
            />
            <Text style={[styles.liveText, { color: pendingCount > 0 ? C.warning : C.primaryDark }]}>
              {pendingCount > 0
                ? `${pendingCount} pending action${pendingCount > 1 ? 's' : ''}`
                : 'Everything is up to date'}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={handleRefresh}
            hitSlop={8}
          >
            <MaterialIcons name="refresh" size={18} color={C.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Requests Hub</Text>
        <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>Delivery, travel, and earnings managed in one focused workflow.</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}> 
            <View style={[styles.statIcon, { backgroundColor: C.primarySubtle }]}> 
              <MaterialIcons name="inbox" size={14} color={C.primaryDark} />
            </View>
            <Text style={[styles.statValue, { color: C.textPrimary }]}>{base.length}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>Total</Text>
          </View>

          <Animated.View
            style={[
              styles.statCard,
              { backgroundColor: C.warningSubtle, borderColor: C.warning + '33', transform: [{ scale: pendingPulse }] },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: C.warning + '24' }]}> 
              <MaterialIcons name="hourglass-empty" size={14} color={C.warning} />
            </View>
            <Text style={[styles.statValue, { color: C.textPrimary }]}>{statusCounts.pending}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>Pending</Text>
          </Animated.View>

          <View style={[styles.statCard, { backgroundColor: C.successSubtle, borderColor: C.success + '33' }]}> 
            <View style={[styles.statIcon, { backgroundColor: C.success + '24' }]}> 
              <MaterialIcons name="savings" size={14} color={C.success} />
            </View>
            <Text style={[styles.statValue, { color: C.textPrimary }]}>{statusCounts.accepted + statusCounts.completed}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>Earning</Text>
          </View>
        </View>
      </View>
      </Animated.View>

      {!isOnline ? (
        <View style={styles.networkState}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      <Animated.View style={{ opacity: controlsEntrance.opacity, transform: controlsEntrance.transform }}>
        <View style={[styles.tabRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}> 
          {(['incoming', 'outgoing'] as const).map(t => {
            const active = tab === t;
            const count = t === 'incoming' ? incoming.length : outgoing.length;
            return (
              <Pressable
                key={t}
                style={[
                  styles.tab,
                  { borderColor: C.surfaceBorderLight },
                  active && [styles.tabActive, { backgroundColor: C.surface, borderColor: C.primary + '44' }],
                ]}
                onPress={() => switchTab(t)}
              >
                <View style={[styles.tabIcon, { backgroundColor: active ? C.primarySubtle : C.surfaceElevated }]}> 
                  <MaterialIcons
                    name={t === 'incoming' ? 'call-received' : 'call-made'}
                    size={14}
                    color={active ? C.primaryDark : C.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tabTitle, { color: active ? C.textPrimary : C.textSecondary }]}>
                    {t === 'incoming' ? 'Incoming' : 'Outgoing'}
                  </Text>
                  <Text style={[styles.tabMeta, { color: active ? C.primaryDark : C.textMuted }]}>{count} requests</Text>
                </View>
                {t === 'incoming' && pendingCount > 0 ? (
                  <View style={[styles.tabBadge, { backgroundColor: C.error }]}> 
                    <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickActionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder, opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={() => {
              Haptic.tap();
              router.push('/create-trip');
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: C.primarySubtle }]}> 
              <MaterialIcons name="drive-eta" size={16} color={C.primaryDark} />
            </View>
            <Text style={[styles.quickActionText, { color: C.textSecondary }]}>Post trip</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder, opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={() => {
              Haptic.tap();
              router.push('/create-parcel');
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: C.primarySubtle }]}> 
              <MaterialIcons name="inventory-2" size={16} color={C.primaryDark} />
            </View>
            <Text style={[styles.quickActionText, { color: C.textSecondary }]}>Send parcel</Text>
          </Pressable>
        </View>

        <Text style={[styles.contextText, { color: C.textMuted }]}>{tabLabel}</Text>
      </Animated.View>

      {base.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterScroll}
          contentContainerStyle={styles.statusFilterRow}
        >
          {STATUS_TABS.map(st => {
            const count = statusCounts[st.key];
            const active = statusFilter === st.key;
            return (
              <Pressable
                key={st.key}
                style={[
                  styles.statusChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  active && { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' },
                  count === 0 && st.key !== 'all' && { opacity: 0.5 },
                ]}
                onPress={() => {
                  Haptic.select();
                  setStatusFilter(st.key);
                }}
                disabled={count === 0 && st.key !== 'all'}
              >
                <MaterialIcons name={st.icon} size={13} color={active ? C.primaryDark : C.textMuted} />
                <Text style={[styles.statusChipText, { color: active ? C.primaryDark : C.textMuted }]}>{st.label}</Text>
                <View style={[styles.statusChipBadge, { backgroundColor: active ? C.primaryDark : C.surfaceBorder }]}> 
                  <Text style={[styles.statusChipCount, { color: '#fff' }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Animated.ScrollView
        style={[styles.list, { transform: [{ translateX: slideAnim }] }]}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 108 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || requestsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={C.primaryDark}
            colors={[C.primaryDark]}
          />
        }
      >
        {requestsQuery.error ? (
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
        ) : displayed.length === 0 ? (
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
                  { backgroundColor: C.primaryDark, opacity: pressed ? 0.88 : 1 },
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
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.8 : 1 },
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
        ) : (
          displayed.map((req, index) => {
            const anim = cardAnims[index];
            return (
              <Animated.View
                key={req.id}
                style={anim ? { opacity: anim.opacity, transform: [{ translateY: anim.translateY }] } : undefined}
              >
                <RequestCard
                  request={req}
                  type={tab}
                  onAccept={() => handleAccept(req.id, req)}
                  onReject={() => handleReject(req.id, req)}
                  onCancel={() => handleCancel(req.id, req)}
                  onChat={() => handleChat(req)}
                  onDelivery={() => handleDelivery(req)}
                  onPayment={() => handlePayment(req)}
                />
              </Animated.View>
            );
          })
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.25,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },

  networkState: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  tabRow: {
    marginTop: 2,
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  tabActive: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  tabMeta: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: FontWeight.medium,
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
    color: '#fff',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  quickActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  quickActionIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  contextText: {
    marginTop: 9,
    marginBottom: Spacing.sm,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  statusFilterScroll: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 7,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
  listContent: {
    gap: Spacing.md,
  },
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
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
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  emptySecondaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
