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
} from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { AsyncStateCard, OfflineBanner } from '@/components';
import { useAlert } from '@/template';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn } from '@/hooks/useAnimations';
import { formatRelative } from '@/lib/dateFormat';
import { getUserErrorMessage } from '@/lib/error-handler';
import { Conversation, Request } from '@/types';
import { ProductIllustration } from '@/components/illustrations';
import { resolveImageUrl } from '@/constants/images';

interface ConversationRowModel {
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
}

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
  requestMap: Map<string, Request>
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
  let avatarUri = otherUserId ? participantAvatars[otherUserId] : undefined;
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
        <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </Pressable>
    </View>
  ), [item, C.error, onDelete]);

  return (
    <View style={isTablet ? styles.tabletContainer : undefined}>
      <Swipeable
        rightThreshold={36}
        renderRightActions={renderSwipeActions}
        containerStyle={{ overflow: 'hidden', borderRadius: BorderRadius.lg }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.convCard,
            {
              backgroundColor: C.surface,
              borderColor: item.isUnread ? C.primary + '30' : C.surfaceBorder,
            },
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => onOpen(item.id)}
        >
          {/* Avatar with subtle unread indicator */}
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: C.primarySubtle,
                  borderColor: C.surfaceBorder,
                },
              ]}
            >
              {item.avatarUri ? (
                <Image
                  source={{ uri: item.avatarUri }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={[styles.avatarText, { color: C.primary }]}>
                  {item.displayInitial}
                </Text>
              )}
            </View>
            {item.isUnread ? (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: C.primary, borderColor: C.surface },
                ]}
              />
            ) : null}
          </View>

          {/* Details */}
          <View style={styles.convDetails}>
            {/* Top Row: Name and Time */}
            <View style={styles.nameTimeRow}>
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
              <Text
                style={[
                  styles.timeLabel,
                  { color: item.isUnread ? C.primary : C.textMuted },
                  item.isUnread && { fontWeight: FontWeight.semibold },
                ]}
              >
                {item.previewTimeLabel}
              </Text>
            </View>

            {/* Context Subtitle: Route & Delivery Status */}
            {item.routeLabel ? (
              <Text style={[styles.routeSubtitle, { color: C.textMuted }]} numberOfLines={1}>
                {item.routeLabel}
                {item.isActiveDelivery ? ' • In Transit' : ''}
              </Text>
            ) : null}

            {/* Message Preview */}
            <View style={styles.previewRow}>
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
          </View>

          <Feather name="chevron-right" size={16} color={C.textMuted} style={styles.chevronIcon} />
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

  const conversationRows = useMemo(() => {
    if (!user?.id) return [];

    return rawConversations
      .map((conv) => toConversationRowModel(conv, user.id, requestMap))
      .filter((row): row is ConversationRowModel => Boolean(row))
      .sort((a, b) => {
        if (a.previewTimeValue === b.previewTimeValue) {
          return b.id.localeCompare(a.id);
        }
        return b.previewTimeValue - a.previewTimeValue;
      });
  }, [rawConversations, user?.id, requestMap]);

  const unreadCount = useMemo(
    () => conversationRows.filter((r) => r.isUnread).length,
    [conversationRows]
  );

  // Fast client search across names, routes, cities, and preview text
  const filteredRows = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase();
    if (!cleanSearch) return conversationRows;

    return conversationRows.filter(
      (r) =>
        r.displayName.toLowerCase().includes(cleanSearch) ||
        r.routeLabel.toLowerCase().includes(cleanSearch) ||
        (r.fromCity && r.fromCity.toLowerCase().includes(cleanSearch)) ||
        (r.toCity && r.toCity.toLowerCase().includes(cleanSearch)) ||
        r.previewText.toLowerCase().includes(cleanSearch)
    );
  }, [conversationRows, searchQuery]);

  useConversationsRealtime(user?.id);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([conversationsQuery.refetch(), requestsQuery.refetch()]);
      Haptic.success();
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery, requestsQuery, user?.id]);

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
      {/* ── Minimal Header ──────────────────────────────────────────── */}
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
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Messages</Text>
          {unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: C.primary }]}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount} new
              </Text>
            </View>
          ) : null}
        </View>

        {/* Clean, single search input */}
        {conversationRows.length > 0 ? (
          <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Feather name="search" size={15} color={C.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages or routes..."
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
      </Animated.View>

      {!isOnline ? (
        <View style={styles.stateWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      {/* ── Main List Content ─────────────────────────────────────────── */}
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
              message="Sign in to access your direct delivery conversations."
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
              { paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet) },
            ]}
          >
            <AsyncStateCard
              C={C}
              icon="sync"
              title="Loading messages..."
              message="Fetching your encrypted delivery conversations."
            />
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
                  <Feather name="search" size={28} color={C.textMuted} style={{ marginBottom: 4 }} />
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
              ) : (
                <>
                  <ProductIllustration variant="chat" size={130} />
                  <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Messages Yet</Text>
                  <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                    When you request a parcel delivery or coordinate a trip, your chats will appear here.
                  </Text>
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
            estimatedItemSize={84}
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
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
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

  itemSeparator: {
    height: Spacing.xs + 2,
  },

  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm + 2,
  },
  avatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },

  convDetails: {
    flex: 1,
    gap: 2,
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  displayName: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  displayNameUnread: {
    fontWeight: FontWeight.bold,
  },
  timeLabel: {
    fontSize: 11,
  },

  routeSubtitle: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticksIcon: {
    marginRight: 1,
  },
  previewText: {
    flex: 1,
    fontSize: FontSize.xs + 0.5,
    lineHeight: 16,
  },
  chevronIcon: {
    opacity: 0.5,
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
    maxWidth: 260,
  },
  emptyCTA: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  emptyCTAText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },

  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
});
