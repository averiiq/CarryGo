import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
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

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Active' },
  { key: 'completed', label: 'Done' },
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const headerEntrance = useFadeIn(0, 400);
  const contentEntrance = useFadeIn(150, 450);

  const requests = user ? requestsQuery.data ?? [] : [];
  const conversations = user ? conversationsQuery.data ?? [] : [];
  const parcels = user ? flattenInfiniteData(parcelsQuery.data) : [];
  const incoming = requests.filter(r => r.travellerId === user?.id);
  const outgoing = requests.filter(r => r.senderId === user?.id);
  const base = tab === 'incoming' ? incoming : outgoing;
  const displayed = statusFilter === 'all' ? base : base.filter(r => r.status === statusFilter);
  const pendingCount = incoming.filter(r => r.status === 'pending').length;

  const switchTab = (newTab: TabType) => {
    if (newTab === tab) return;
    Haptic.select();
    const dir = newTab === 'outgoing' ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * 20, duration: 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 200, friction: 16 }),
    ]).start();
    setTab(newTab);
    setStatusFilter('all');
  };

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
    Haptic.warning();
    showAlert('Accept Request?', `Accept delivery for ₹${req.price} from ${req.senderName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          if (!user) return;
          try {
          await updateRequestStatusMutation.mutateAsync({ requestId, status: 'accepted' });
          const parcel = parcels.find(p => p.id === req.parcelId);
          const route = parcel ? `${parcel.fromCity} → ${parcel.toCity}` : 'Route';
          const existing = conversations.find(c => c.requestId === requestId);
          if (!existing) await createConversationMutation.mutateAsync({
            requestId,
            participantIds: [user?.id || '', req.senderId],
            participantNames: { [user?.id || '']: user?.name || 'You', [req.senderId]: req.senderName },
            parcelDescription: parcel?.description || 'Parcel delivery',
            route,
          });
          await createDelivery(requestId);
          /* await createNotification({
            userId: req.senderId,
            title: 'Request Accepted!',
            body: `${req.travellerName} accepted your delivery. Open chat to coordinate pickup.`,
            type: 'request_accepted',
            relatedId: requestId,
          }); */
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

  const handleReject = (requestId: string, req: typeof requests[0]) => {
    Haptic.warning();
    showAlert('Reject Request?', 'Reject this delivery request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
          await updateRequestStatusMutation.mutateAsync({ requestId, status: 'rejected' });
          /* await createNotification({
            userId: req.senderId,
            title: 'Request Rejected',
            body: `${req.travellerName} is unable to carry your parcel this time`,
            type: 'request_rejected',
            relatedId: requestId,
          }); */
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

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top + 14 }]}>
      {/* Header */}
      <Animated.View style={[styles.headerRow, { opacity: headerEntrance.opacity, transform: headerEntrance.transform }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Requests</Text>
          {pendingCount > 0 ? (
            <Text style={[styles.pageSubtitle, { color: C.error }]}>
              {pendingCount} pending {pendingCount === 1 ? 'action' : 'actions'} required
            </Text>
          ) : (
            <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>
              Manage your deliveries
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
          onPress={handleRefresh}
          hitSlop={8}
        >
          <MaterialIcons name="refresh" size={18} color={C.textSecondary} />
        </Pressable>
      </Animated.View>

      {!isOnline ? (
        <View style={styles.networkState}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* Tab Switcher */}
      <View style={[styles.tabRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        {(['incoming', 'outgoing'] as const).map(t => (
          <Pressable
            key={t}
            style={[
              styles.tab,
              tab === t && [styles.tabActive, { backgroundColor: C.surface }],
            ]}
            onPress={() => switchTab(t)}
          >
            <MaterialIcons
              name={t === 'incoming' ? 'call-received' : 'call-made'}
              size={13}
              color={tab === t ? C.primary : C.textMuted}
            />
            <Text style={[styles.tabText, { color: tab === t ? C.primary : C.textMuted }]}>
              {t === 'incoming' ? `Incoming (${incoming.length})` : `Outgoing (${outgoing.length})`}
            </Text>
            {t === 'incoming' && pendingCount > 0 ? (
              <View style={[styles.tabBadge, { backgroundColor: C.error }]}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Status Filter Chips */}
      {base.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilterScroll}
          contentContainerStyle={styles.statusFilterRow}
        >
          {STATUS_TABS.map(st => {
            const cnt = st.key === 'all' ? base.length : base.filter(r => r.status === st.key).length;
            const active = statusFilter === st.key;
            return (
              <Pressable
                key={st.key}
                style={[
                  styles.statusChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  active && { backgroundColor: C.primarySubtle, borderColor: C.primary + '88' },
                  cnt === 0 && { opacity: 0.5 },
                ]}
                onPress={() => { Haptic.select(); setStatusFilter(st.key); }}
                disabled={cnt === 0 && st.key !== 'all'}
              >
                <Text style={[styles.statusChipText, { color: active ? C.primary : C.textMuted }]}>
                  {st.label}
                </Text>
                <View style={[styles.statusChipBadge, { backgroundColor: active ? C.primary : C.surfaceBorder }]}>
                  <Text style={[styles.statusChipCount, { color: active ? '#fff' : C.textMuted }]}>{cnt}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Animated.ScrollView
        style={[styles.list, { transform: [{ translateX: slideAnim }] }]}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || requestsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {requestsQuery.error ? (
          <AsyncStateCard
            C={C}
            icon="cloud-off"
            title="Could not load requests"
            message={requestsQuery.error instanceof Error ? requestsQuery.error.message : 'Refresh and try again.'}
            actionLabel="Retry"
            onAction={() => { void requestsQuery.refetch(); }}
          />
        ) : requestsQuery.isLoading ? (
          <AsyncStateCard
            C={C}
            icon="sync"
            title="Loading requests..."
            message="Checking your incoming and outgoing delivery requests."
          />
        ) : displayed.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <EmptyRequestsSVG width={180} height={140} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
              {statusFilter !== 'all' ? `No ${statusFilter} requests` : `No ${tab} requests`}
            </Text>
            <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
              {statusFilter !== 'all'
                ? 'Try a different filter tab above'
                : tab === 'incoming'
                ? 'Post a trip — senders will reach out to you'
                : 'Send a parcel and choose a traveller on your route'}
            </Text>
            {statusFilter === 'all' ? (
              <Pressable
                style={({ pressed }) => [styles.emptyCTA, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
                onPress={() => { Haptic.tap(); router.push(tab === 'incoming' ? '/create-trip' : '/create-parcel'); }}
              >
                <MaterialIcons name={tab === 'incoming' ? 'directions-car' : 'inventory-2'} size={15} color="#fff" />
                <Text style={styles.emptyCTAText}>
                  {tab === 'incoming' ? 'Post a Trip' : 'Send a Parcel'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.emptyCTA, { backgroundColor: C.surfaceElevated, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptic.tap(); setStatusFilter('all'); }}
              >
                <MaterialIcons name="filter-list-off" size={15} color={C.textSecondary} />
                <Text style={[styles.emptyCTAText, { color: C.textSecondary }]}>Clear filter</Text>
              </Pressable>
            )}
          </View>
        ) : (
          displayed.map(req => (
            <RequestCard
              key={req.id}
              request={req}
              type={tab}
              onAccept={() => handleAccept(req.id, req)}
              onReject={() => handleReject(req.id, req)}
              onChat={() => handleChat(req)}
              onDelivery={() => handleDelivery(req)}
              onPayment={() => handlePayment(req)}
            />
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  networkState: { marginBottom: Spacing.md },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  pageSubtitle: { fontSize: FontSize.xs, marginTop: 2, fontWeight: FontWeight.medium },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 4,
  },

  tabRow: {
    flexDirection: 'row', marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md, padding: 4, borderWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: BorderRadius.sm - 2, gap: 6,
  },
  tabActive: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabBadge: {
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  statusFilterScroll: { flexGrow: 0, marginBottom: Spacing.md },
  statusFilterRow: { flexDirection: 'row', gap: Spacing.sm },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingLeft: 12, paddingRight: 6, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  statusChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statusChipBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: BorderRadius.full, minWidth: 20, alignItems: 'center' },
  statusChipCount: { fontSize: 10, fontWeight: FontWeight.bold },

  list: { flex: 1 },
  listContent: { gap: Spacing.md },
  empty: {
    marginTop: Spacing.xl, borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg,
    alignItems: 'center', gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginTop: Spacing.sm },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: Spacing.sm,
  },
  emptyCTAText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});
