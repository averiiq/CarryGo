import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  TouchTarget,
  TabBarGeometry,
  StatusBarGeometry,
} from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  useConversationsQuery,
  useConversationsRealtime,
  useDeleteConversationMutation,
  useUserAvatarsQuery,
} from '@/features/conversations/queries';
import { getCachedAvatar } from '@/services/avatar-enrichment.service';
import { useRequestsQuery } from '@/features/requests/queries';
import { AsyncStateCard, OfflineBanner, LottieAnimation, ConversationItemSkeleton } from '@/components';
import { useAlert } from '@/template';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn } from '@/hooks/useAnimations';
import { formatRelative } from '@/lib/dateFormat';
import { getUserErrorMessage } from '@/lib/error-handler';
import { Conversation, Request } from '@/types';
import { ProductIllustration } from '@/components/illustrations';
import { resolveImageUrl, getUserAvatarSource } from '@/constants/images';

export interface ConversationRowModel {
  id: string;
  requestId: string;
  displayName: string;
  displayInitial: string;
  avatarUri?: string;
  routeLabel: string;
  fromCity?: string;
  toCity?: string;
  previewText: string;
  previewTimeLabel: string;
  previewTimeValue: number;
  lastMessageSenderId?: string;
  isLastMessageFromMe: boolean;
  isUnread: boolean;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
  isActiveDelivery: boolean;
  isCompleted: boolean;
  counterpartRole: 'traveller' | 'sender';
  price?: number;
  category?: string;
}

export type MessageFilter = 'all' | 'active' | 'unread';

function safeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getLastTimestampValue(timestamp?: string) {
  if (!timestamp) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function formatConversationTime(timestamp?: string) {
  if (!timestamp) return '';
  return formatRelative(timestamp);
}

function toConversationRowModel(
  conversation: Conversation,
  userId: string,
  requestMap: Map<string, Request>,
  avatarMap?: Record<string, string>
): ConversationRowModel | null {
  const participantNames =
    conversation.participantNames && typeof conversation.participantNames === 'object'
      ? conversation.participantNames
      : {};

  const participantIds = Array.isArray(conversation.participants)
    ? conversation.participants.filter((id) => typeof id === 'string')
    : [];

  const isParticipant =
    participantIds.includes(userId) || Object.prototype.hasOwnProperty.call(participantNames, userId);
  if (!isParticipant) return null;

  const namedOtherEntry = Object.entries(participantNames).find(
    ([participantId, participantName]) =>
      participantId !== userId && typeof participantName === 'string' && participantName.trim().length > 0
  );
  const unnamedOtherId = participantIds.find((participantId) => participantId !== userId);

  const req = requestMap.get(conversation.requestId);
  const isSender = req ? req.senderId === userId : false;
  const counterpartRole: 'traveller' | 'sender' = isSender ? 'traveller' : 'sender';

  let rawName = namedOtherEntry?.[1];
  if (!rawName && req) {
    rawName = isSender ? req.travellerName : req.senderName;
  }
  const displayName = safeText(rawName, unnamedOtherId ? 'Delivery Partner' : 'Traveler');
  const displayInitial = displayName.charAt(0)?.toUpperCase() || 'U';

  const otherUserId = namedOtherEntry?.[0] || unnamedOtherId || (isSender ? req?.travellerId : req?.senderId);
  const participantAvatars = (conversation as any).participantAvatars || {};
  let avatarUri = (otherUserId ? avatarMap?.[otherUserId] : undefined) ||
    (otherUserId ? getCachedAvatar(otherUserId) : undefined) ||
    (otherUserId ? participantAvatars[otherUserId] : undefined);
  if (!avatarUri && req) {
    avatarUri = isSender
      ? ((req as any).travellerSelfieUrl || req.travellerAvatar)
      : ((req as any).senderSelfieUrl || req.senderAvatar);
  }
  avatarUri = resolveImageUrl(avatarUri);

  const previewText = safeText(conversation.lastMessage?.text, 'Tap to open conversation');
  const fromCity = req?.fromCity || '';
  const toCity = req?.toCity || '';
  const routeLabel = fromCity && toCity
    ? `${fromCity} ➔ ${toCity}`
    : safeText(conversation.route, '');

  const previewTimeValue = getLastTimestampValue(conversation.lastMessage?.timestamp);
  const lastMessageSenderId = conversation.lastMessage?.senderId;
  const isLastMessageFromMe = Boolean(lastMessageSenderId && lastMessageSenderId === userId);

  const isUnread = Boolean(
    conversation.lastMessage &&
    !conversation.lastMessage.read &&
    conversation.lastMessage.senderId !== userId
  );

  const status = req?.status || (conversation.lastMessage ? 'pending' : 'pending');
  const isActiveDelivery = status === 'accepted';
  const isCompleted = status === 'completed';

  return {
    id: conversation.id,
    requestId: conversation.requestId,
    displayName,
    displayInitial,
    avatarUri,
    routeLabel,
    fromCity,
    toCity,
    previewText,
    previewTimeLabel: formatConversationTime(conversation.lastMessage?.timestamp),
    previewTimeValue,
    lastMessageSenderId,
    isLastMessageFromMe,
    isUnread,
    status: status as any,
    isActiveDelivery,
    isCompleted,
    counterpartRole,
    price: req?.price,
    category: req?.parcelCategory,
  };
}

const ItemSeparator = () => <View style={styles.itemSeparator} />;

const ConversationRowItem = React.memo(function ConversationRowItem({
  item,
  isTablet,
  C,
  onOpen,
  onDelete,
}: {
  item: ConversationRowModel;
  isTablet: boolean;
  C: any;
  onOpen: (id: string) => void;
  onDelete: (item: ConversationRowModel) => void;
}) {
  const renderSwipeActions = useCallback(() => (
    <View style={styles.swipeActionsContainer}>
      <Pressable
        onPress={() => onDelete(item)}
        style={({ pressed }) => [
          styles.swipeDeleteBtn,
          { backgroundColor: C.error },
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Delete conversation with ${item.displayName}`}
      >
        <MaterialIcons name="delete-outline" size={22} color="#FFFFFF" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </Pressable>
    </View>
  ), [item, C.error, onDelete]);

  return (
    <View style={isTablet ? styles.tabletContainer : undefined}>
      <Swipeable
        rightThreshold={36}
        renderRightActions={renderSwipeActions}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable
          style={({ pressed }) => [
            styles.convCard,
            {
              backgroundColor: item.isUnread ? C.surfaceElevated : C.surface,
              borderColor: item.isUnread ? C.primary + '35' : C.surfaceBorder,
            },
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => onOpen(item.id)}
        >
          {/* Avatar with verified badge & unread dot */}
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: C.primarySubtle,
                  borderColor: item.isUnread ? C.primary : C.surfaceBorder,
                },
              ]}
            >
              <Image
                source={getUserAvatarSource(item.avatarUri, item.id || item.displayName)}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            </View>

            {/* Verified Partner Badge */}
            <View style={[styles.verifiedBadge, { backgroundColor: C.surface }]}>
              <MaterialIcons name="verified" size={13} color={C.success} />
            </View>

            {/* Unread dot */}
            {item.isUnread ? (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: C.primary, borderColor: C.surface },
                ]}
              />
            ) : null}
          </View>

          {/* Details Column */}
          <View style={styles.convDetails}>
            {/* Top Row: Name, Role Pill, and Timestamp */}
            <View style={styles.nameTimeRow}>
              <View style={styles.nameRoleContainer}>
                <Text
                  style={[
                    styles.displayName,
                    { color: C.textPrimary },
                    item.isUnread && styles.displayNameUnread,
                  ]}
                  numberOfLines={1}
                >
                  {item.displayName}
                </Text>

                <View
                  style={[
                    styles.rolePill,
                    {
                      backgroundColor:
                        item.counterpartRole === 'traveller'
                          ? C.primarySubtle
                          : C.successSubtle,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={item.counterpartRole === 'traveller' ? 'directions-car' : 'inventory-2'}
                    size={10}
                    color={item.counterpartRole === 'traveller' ? C.primary : C.success}
                  />
                  <Text
                    style={[
                      styles.rolePillText,
                      {
                        color: item.counterpartRole === 'traveller' ? C.primary : C.success,
                      },
                    ]}
                  >
                    {item.counterpartRole === 'traveller' ? 'Traveler' : 'Sender'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.timeLabel,
                  { color: item.isUnread ? C.primary : C.textMuted },
                  item.isUnread && { fontWeight: FontWeight.bold },
                ]}
              >
                {item.previewTimeLabel}
              </Text>
            </View>

            {/* Middle Row: Route Corridor, Price Tag & Delivery Status */}
            {(item.routeLabel || item.price || item.isActiveDelivery || item.isCompleted) ? (
              <View style={styles.corridorRow}>
                {item.routeLabel ? (
                  <View
                    style={[
                      styles.routePill,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                    ]}
                  >
                    <MaterialIcons
                      name="near-me"
                      size={10}
                      color={C.primary}
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                    <Text style={[styles.routePillText, { color: C.textSecondary }]} numberOfLines={1}>
                      {item.routeLabel}
                    </Text>
                  </View>
                ) : null}

                {item.price ? (
                  <View style={[styles.pricePill, { backgroundColor: C.successSubtle }]}>
                    <Text style={[styles.pricePillText, { color: C.success }]}>₹{item.price}</Text>
                  </View>
                ) : null}

                {item.isActiveDelivery ? (
                  <View style={[styles.statusPill, { backgroundColor: C.successSubtle }]}>
                    <View style={[styles.statusPulseDot, { backgroundColor: C.success }]} />
                    <Text style={[styles.statusPillText, { color: C.success }]}>In Transit</Text>
                  </View>
                ) : item.isCompleted ? (
                  <View style={[styles.statusPill, { backgroundColor: C.primarySubtle }]}>
                    <Text style={[styles.statusPillText, { color: C.primary }]}>Delivered</Text>
                  </View>
                ) : item.status === 'pending' ? (
                  <View style={[styles.statusPill, { backgroundColor: C.warningSubtle }]}>
                    <Text style={[styles.statusPillText, { color: C.warning }]}>Pending</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Bottom Row: Message Preview & Read Receipts */}
            <View style={styles.previewRow}>
              <View style={styles.previewTextWrapper}>
                {item.isLastMessageFromMe ? (
                  <MaterialIcons
                    name="done-all"
                    size={14}
                    color={item.isUnread ? C.textMuted : C.primary}
                    style={styles.ticksIcon}
                  />
                ) : null}
                <Text
                  style={[
                    styles.previewText,
                    {
                      color: item.isUnread ? C.textPrimary : C.textSecondary,
                      fontWeight: item.isUnread ? FontWeight.semibold : FontWeight.regular,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.isLastMessageFromMe ? `You: ${item.previewText}` : item.previewText}
                </Text>
              </View>

              {item.isUnread ? (
                <View style={[styles.newBadgePill, { backgroundColor: C.primary }]}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              ) : (
                <Feather name="chevron-right" size={15} color={C.textMuted} style={styles.chevronIcon} />
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
});

export default function MessagesScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const { isSmallDevice, isTablet } = useResponsive();

  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: deleteConversationAsync } = useDeleteConversationMutation(user?.id);
  const requestsQuery = useRequestsQuery(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');
  const headerEntrance = useFadeIn(0, 300);
  const listEntrance = useFadeIn(80, 300);

  // Map requests by requestId for instant O(1) enrichment
  const requestMap = useMemo(() => {
    const map = new Map<string, Request>();
    (requestsQuery.data || []).forEach((r) => {
      if (r.id) map.set(r.id, r);
    });
    return map;
  }, [requestsQuery.data]);

  const rawConversations = useMemo(
    () => (user ? conversationsQuery.data ?? [] : []),
    [conversationsQuery.data, user]
  );

  // Extract all counterpart user IDs across all active conversations and requests
  const counterpartUserIds = useMemo(() => {
    if (!user?.id) return [];
    const idSet = new Set<string>();
    for (const conv of rawConversations) {
      if (Array.isArray(conv.participants)) {
        for (const p of conv.participants) {
          if (p && p !== user.id) idSet.add(p);
        }
      }
      if (conv.participantNames && typeof conv.participantNames === 'object') {
        for (const p of Object.keys(conv.participantNames)) {
          if (p && p !== user.id) idSet.add(p);
        }
      }
      const req = requestMap.get(conv.requestId);
      if (req) {
        if (req.travellerId && req.travellerId !== user.id) idSet.add(req.travellerId);
        if (req.senderId && req.senderId !== user.id) idSet.add(req.senderId);
      }
    }
    return Array.from(idSet);
  }, [rawConversations, user?.id, requestMap]);

  const userAvatarsQuery = useUserAvatarsQuery(counterpartUserIds);
  const avatarMap = userAvatarsQuery.data || {};

  const conversationRows = useMemo(() => {
    if (!user?.id) return [];

    return rawConversations
      .map((conv) => toConversationRowModel(conv, user.id, requestMap, avatarMap))
      .filter((row): row is ConversationRowModel => Boolean(row))
      .sort((a, b) => {
        if (a.previewTimeValue === b.previewTimeValue) {
          return b.id.localeCompare(a.id);
        }
        return b.previewTimeValue - a.previewTimeValue;
      });
  }, [rawConversations, user?.id, requestMap, avatarMap]);

  const allCount = conversationRows.length;
  const activeCount = useMemo(
    () => conversationRows.filter((r) => r.isActiveDelivery).length,
    [conversationRows]
  );
  const unreadCount = useMemo(
    () => conversationRows.filter((r) => r.isUnread).length,
    [conversationRows]
  );

  // Fast client search and active filter segment
  const filteredRows = useMemo(() => {
    let list = conversationRows;

    if (activeFilter === 'active') {
      list = list.filter((r) => r.isActiveDelivery);
    } else if (activeFilter === 'unread') {
      list = list.filter((r) => r.isUnread);
    }

    const cleanSearch = searchQuery.trim().toLowerCase();
    if (!cleanSearch) return list;

    return list.filter(
      (r) =>
        r.displayName.toLowerCase().includes(cleanSearch) ||
        r.routeLabel.toLowerCase().includes(cleanSearch) ||
        (r.fromCity && r.fromCity.toLowerCase().includes(cleanSearch)) ||
        (r.toCity && r.toCity.toLowerCase().includes(cleanSearch)) ||
        r.previewText.toLowerCase().includes(cleanSearch)
    );
  }, [conversationRows, activeFilter, searchQuery]);

  useConversationsRealtime(user?.id);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([
        conversationsQuery.refetch(),
        requestsQuery.refetch(),
        userAvatarsQuery.refetch(),
      ]);
      Haptic.success();
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery, requestsQuery, userAvatarsQuery, user?.id]);

  const openConversation = useCallback(
    (conversationId: string) => {
      const normalizedId = String(conversationId ?? '').trim();
      if (!normalizedId) return;
      Haptic.tap();
      router.push(`/chat/${encodeURIComponent(normalizedId)}` as never);
    },
    [router]
  );

  const handleDeleteConversation = useCallback(
    (item: ConversationRowModel) => {
      Haptic.warning();
      if (item.isActiveDelivery) {
        showAlert(
          'Active Delivery',
          'Chats with active, in-transit deliveries cannot be deleted until custody is completed.'
        );
        return;
      }

      showAlert(
        'Delete Conversation',
        `Delete your conversation with ${item.displayName}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteConversationAsync(item.id);
                Haptic.confirm();
              } catch (err: any) {
                showAlert('Error', err?.message || 'Could not delete conversation.');
              }
            },
          },
        ]
      );
    },
    [deleteConversationAsync, showAlert]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationRowModel }) => (
      <ConversationRowItem
        item={item}
        isTablet={isTablet}
        C={C}
        onOpen={openConversation}
        onDelete={handleDeleteConversation}
      />
    ),
    [isTablet, C, openConversation, handleDeleteConversation]
  );

  const keyExtractor = useCallback((item: ConversationRowModel) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Polished Header & Filter Section ──────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          isTablet && styles.tabletContainer,
          {
            paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top, Spacing.sm),
            opacity: headerEntrance.opacity,
            transform: headerEntrance.transform,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWithBrandRow}>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Messages</Text>
          </View>

          {unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: C.primary }]}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount} new
              </Text>
            </View>
          ) : null}
        </View>

        {/* Search input with clear button */}
        {conversationRows.length > 0 ? (
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Feather name="search" size={15} color={C.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages, names, or routes..."
              placeholderTextColor={C.textMuted}
              style={[styles.searchInput, { color: C.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.clearSearchBtn}
              >
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Filter Pills: All, Active Deliveries, Unread */}
        {conversationRows.length > 0 ? (
          <View style={styles.filterTabsRow}>
            {/* Filter: All */}
            <Pressable
              onPress={() => {
                Haptic.tap();
                setActiveFilter('all');
              }}
              style={[
                styles.filterTabPill,
                activeFilter === 'all'
                  ? { backgroundColor: C.primary, borderColor: C.primary }
                  : { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show all messages (${allCount})`}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === 'all'
                    ? { color: '#FFFFFF', fontWeight: FontWeight.bold }
                    : { color: C.textSecondary },
                ]}
              >
                All
              </Text>
              <View
                style={[
                  styles.filterCountBadge,
                  activeFilter === 'all'
                    ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                    : { backgroundColor: C.surfaceElevated },
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    activeFilter === 'all' ? { color: '#FFFFFF' } : { color: C.textMuted },
                  ]}
                >
                  {allCount}
                </Text>
              </View>
            </Pressable>

            {/* Filter: Active Deliveries */}
            <Pressable
              onPress={() => {
                Haptic.tap();
                setActiveFilter('active');
              }}
              style={[
                styles.filterTabPill,
                activeFilter === 'active'
                  ? { backgroundColor: C.primary, borderColor: C.primary }
                  : { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show active deliveries (${activeCount})`}
            >
              <View
                style={[
                  styles.filterActiveDot,
                  { backgroundColor: activeFilter === 'active' ? '#6EE7B7' : C.success },
                ]}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === 'active'
                    ? { color: '#FFFFFF', fontWeight: FontWeight.bold }
                    : { color: C.textSecondary },
                ]}
              >
                Active
              </Text>
              {activeCount > 0 ? (
                <View
                  style={[
                    styles.filterCountBadge,
                    activeFilter === 'active'
                      ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                      : { backgroundColor: C.successSubtle },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      activeFilter === 'active' ? { color: '#FFFFFF' } : { color: C.success },
                    ]}
                  >
                    {activeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            {/* Filter: Unread */}
            <Pressable
              onPress={() => {
                Haptic.tap();
                setActiveFilter('unread');
              }}
              style={[
                styles.filterTabPill,
                activeFilter === 'unread'
                  ? { backgroundColor: C.primary, borderColor: C.primary }
                  : { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show unread messages (${unreadCount})`}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === 'unread'
                    ? { color: '#FFFFFF', fontWeight: FontWeight.bold }
                    : { color: C.textSecondary },
                ]}
              >
                Unread
              </Text>
              {unreadCount > 0 ? (
                <View
                  style={[
                    styles.filterCountBadge,
                    activeFilter === 'unread'
                      ? { backgroundColor: 'rgba(255,255,255,0.28)' }
                      : { backgroundColor: C.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: '#FFFFFF', fontWeight: FontWeight.bold },
                    ]}
                  >
                    {unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      {!isOnline ? (
        <View style={styles.stateWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* ── Main Conversations List ───────────────────────────────────── */}
      <Animated.View
        style={[
          { flex: 1 },
          { opacity: listEntrance.opacity, transform: listEntrance.transform },
        ]}
      >
        {!user ? (
          <View
            style={[
              styles.stateWrap,
              { paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) },
            ]}
          >
            <AsyncStateCard
              C={C}
              icon="person-outline"
              title="Sign in required"
              message="Sign in to access your direct CaryGoo delivery conversations."
              actionLabel="Sign In"
              onAction={() => router.push('/login')}
            />
          </View>
        ) : conversationsQuery.error ? (
          <View
            style={[
              styles.stateWrap,
              { paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) },
            ]}
          >
            <AsyncStateCard
              C={C}
              icon="cloud-off"
              title="Could not load messages"
              message={getUserErrorMessage(conversationsQuery.error, 'Please pull to refresh and try again.')}
              actionLabel="Retry"
              onAction={() => {
                void conversationsQuery.refetch();
              }}
            />
          </View>
        ) : conversationsQuery.isLoading ? (
          <View
            style={[
              styles.stateWrap,
              { paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet), paddingHorizontal: Spacing.md },
            ]}
          >
            <ConversationItemSkeleton />
            <ConversationItemSkeleton />
            <ConversationItemSkeleton />
            <ConversationItemSkeleton />
          </View>
        ) : filteredRows.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              { paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) },
            ]}
          >
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              {searchQuery ? (
                <>
                  <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <LottieAnimation name="searchEmpty" style={{ width: 140, height: 110 }} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No matches</Text>
                  <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                    No conversations matching "{searchQuery}"
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.emptyCTAText}>Clear Search</Text>
                  </Pressable>
                </>
              ) : activeFilter === 'unread' ? (
                <>
                  <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <LottieAnimation name="success" style={{ width: 140, height: 110 }} loop={false} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>All Caught Up!</Text>
                  <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                    You have no unread messages. All conversations are up to date.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1, opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => setActiveFilter('all')}
                  >
                    <Text style={[styles.emptyCTAText, { color: C.textPrimary }]}>View All Messages</Text>
                  </Pressable>
                </>
              ) : activeFilter === 'active' ? (
                <>
                  <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <LottieAnimation name="deliveryCar" style={{ width: 140, height: 110 }} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Active Deliveries</Text>
                  <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                    Conversations for ongoing and accepted deliveries will appear here.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1, opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => setActiveFilter('all')}
                  >
                    <Text style={[styles.emptyCTAText, { color: C.textPrimary }]}>View All Messages</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={{ width: 180, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <LottieAnimation name="chat" style={{ width: 180, height: 140 }} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Messages Yet</Text>
                  <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                    Coordinate delivery details and handover OTPs directly with verified CaryGoo travelers along your route.
                  </Text>
                  <View style={styles.emptyActionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.emptyPrimaryCTA,
                        { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 },
                      ]}
                      onPress={() => router.push('/(tabs)')}
                    >
                      <MaterialIcons name="explore" size={15} color="#FFFFFF" />
                      <Text style={styles.emptyPrimaryCTAText}>Browse Deliveries</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.emptySecondaryCTA,
                        { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.9 : 1 },
                      ]}
                      onPress={() => router.push('/create-parcel')}
                    >
                      <MaterialIcons name="add-box" size={15} color={C.textPrimary} />
                      <Text style={[styles.emptySecondaryCTAText, { color: C.textPrimary }]}>Send Parcel</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        ) : (
          <FlashList
            keyboardDismissMode="on-drag"
            data={filteredRows}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            estimatedItemSize={92}
            contentContainerStyle={{
              paddingHorizontal: Spacing.md,
              paddingTop: Spacing.xs,
              paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet),
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ItemSeparator}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  titleWithBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  brandBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  unreadBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  searchIcon: {
    marginLeft: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm - 0.5,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },

  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  filterTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  itemSeparator: {
    height: Spacing.xs + 2,
  },

  swipeableContainer: {
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
  },

  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 3,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm + 3,
  },
  avatarWrap: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderRadius: BorderRadius.full,
    padding: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
  },

  convDetails: {
    flex: 1,
    gap: 3,
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  nameRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  displayName: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  displayNameUnread: {
    fontWeight: FontWeight.bold,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },
  timeLabel: {
    fontSize: 11,
  },

  corridorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 1,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 160,
  },
  routePillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  pricePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pricePillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  previewTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
    marginRight: 6,
  },
  ticksIcon: {
    marginRight: 1,
  },
  previewText: {
    flex: 1,
    fontSize: FontSize.xs + 0.5,
    lineHeight: 16,
  },
  newBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  chevronIcon: {
    opacity: 0.45,
    marginLeft: 2,
  },

  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 1,
    marginLeft: 6,
  },
  swipeDeleteBtn: {
    width: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: 11,
  },

  stateWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
  },
  emptySubtext: {
    fontSize: FontSize.xs + 0.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyCTA: {
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  emptyCTAText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptyPrimaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyPrimaryCTAText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs + 0.5,
  },
  emptySecondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  emptySecondaryCTAText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs + 0.5,
  },

  tabletContainer: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
});
