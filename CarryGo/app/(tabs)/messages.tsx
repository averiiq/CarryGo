import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { LinearGradient } from 'expo-linear-gradient';
import { useConversationsQuery, useConversationsRealtime } from '@/features/conversations/queries';
import { AsyncStateCard, OfflineBanner } from '@/components';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFadeIn, useHeartbeat } from '@/hooks/useAnimations';
import { formatRelative } from '@/lib/dateFormat';
import { Conversation } from '@/types';
import { ProductIllustration } from '@/components/illustrations';

type ConversationFilter = 'all' | 'unread';

interface ConversationRowModel {
  id: string;
  displayName: string;
  displayInitial: string;
  routeLabel: string;
  previewText: string;
  previewTimeLabel: string;
  previewTimeValue: number;
  isUnread: boolean;
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

function toConversationRowModel(conversation: Conversation, userId: string): ConversationRowModel | null {
  const participantNames =
    conversation.participantNames && typeof conversation.participantNames === 'object'
      ? conversation.participantNames
      : {};

  const participantIds = Array.isArray(conversation.participants)
    ? conversation.participants.filter(id => typeof id === 'string')
    : [];

  const isParticipant = participantIds.includes(userId) || Object.prototype.hasOwnProperty.call(participantNames, userId);
  if (!isParticipant) return null;

  const namedOtherEntry = Object.entries(participantNames).find(
    ([participantId, participantName]) =>
      participantId !== userId && typeof participantName === 'string' && participantName.trim().length > 0
  );
  const unnamedOtherId = participantIds.find(participantId => participantId !== userId);

  const displayName = safeText(namedOtherEntry?.[1], unnamedOtherId ? 'User' : 'Traveller');
  const displayInitial = displayName.charAt(0)?.toUpperCase() || 'U';
  const previewText = safeText(conversation.lastMessage?.text, 'Start the conversation');
  const routeLabel = safeText(conversation.route, 'Delivery chat');
  const previewTimeValue = getLastTimestampValue(conversation.lastMessage?.timestamp);

  return {
    id: conversation.id,
    displayName,
    displayInitial,
    routeLabel,
    previewText,
    previewTimeLabel: formatConversationTime(conversation.lastMessage?.timestamp),
    previewTimeValue,
    isUnread: Boolean(
      conversation.lastMessage &&
      !conversation.lastMessage.read &&
      conversation.lastMessage.senderId !== userId
    ),
  };
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const conversationsQuery = useConversationsQuery(user?.id);
  const conversations = useMemo(() => (user ? conversationsQuery.data ?? [] : []), [conversationsQuery.data, user]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all');
  const headerEntrance = useFadeIn(0, 420);
  const listEntrance = useFadeIn(120, 420);
  const unreadPulse = useHeartbeat(3200, 1.14);
  const scrollY = useRef(new Animated.Value(0)).current;

  const conversationRows = useMemo(() => {
    if (!user?.id) return [];

    return conversations
      .map(conversation => toConversationRowModel(conversation, user.id))
      .filter((row): row is ConversationRowModel => Boolean(row))
      .sort((a, b) => {
        if (a.previewTimeValue === b.previewTimeValue) {
          return b.id.localeCompare(a.id);
        }
        return b.previewTimeValue - a.previewTimeValue;
      });
  }, [conversations, user?.id]);

  const unreadCount = useMemo(() => conversationRows.filter(row => row.isUnread).length, [conversationRows]);
  const visibleRows = useMemo(
    () => (activeFilter === 'unread' ? conversationRows.filter(row => row.isUnread) : conversationRows),
    [activeFilter, conversationRows]
  );
  const firstUnread = useMemo(() => conversationRows.find(row => row.isUnread), [conversationRows]);

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, -12],
    extrapolate: 'clamp',
  });
  const heroScale = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.965],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (activeFilter === 'unread' && unreadCount === 0) {
      setActiveFilter('all');
    }
  }, [activeFilter, unreadCount]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await conversationsQuery.refetch();
      Haptic.success();
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery, user?.id]);

  const openConversation = useCallback(
    (conversationId: string) => {
      const normalizedId = String(conversationId ?? '').trim();
      if (!normalizedId) return;
      Haptic.tap();
      router.push(`/chat/${encodeURIComponent(normalizedId)}` as never);
    },
    [router]
  );

  const handleFilterPress = useCallback((filter: ConversationFilter) => {
    if (filter === activeFilter) return;
    Haptic.select();
    setActiveFilter(filter);
  }, [activeFilter]);

  const handleHeroAction = useCallback(() => {
    if (firstUnread) {
      openConversation(firstUnread.id);
      return;
    }

    Haptic.confirm();
    router.push('/create-parcel');
  }, [firstUnread, openConversation, router]);

  useConversationsRealtime(user?.id);

  const renderItem = useCallback(
    ({ item, index }: { item: ConversationRowModel; index: number }) => {
      const topMargin = index === 0 ? Spacing.sm : 0;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.convItem,
            { marginTop: topMargin, backgroundColor: C.surface, borderColor: item.isUnread ? C.primary + '55' : C.surfaceBorder },
            item.isUnread && { borderLeftWidth: 3, borderLeftColor: C.primary },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => openConversation(item.id)}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: item.isUnread ? C.primarySubtle : C.surfaceElevated,
                borderColor: item.isUnread ? C.primary + '44' : C.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.avatarInitial, { color: item.isUnread ? C.primary : C.textSecondary }]}>{item.displayInitial}</Text>
            {item.isUnread ? (
              <View style={[styles.onlineDot, { backgroundColor: C.success, borderColor: C.surface }]} />
            ) : null}
          </View>

          <View style={styles.convInfo}>
            <View style={styles.convTop}>
              <Text style={[styles.convName, { color: C.textPrimary }, item.isUnread && { fontWeight: FontWeight.bold }]} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={[styles.convTime, { color: item.isUnread ? C.primary : C.textMuted }]}>{item.previewTimeLabel}</Text>
            </View>

            <View style={[styles.routePill, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="route" size={10} color={C.primary} />
              <Text style={[styles.routeText, { color: C.primary }]} numberOfLines={1}>{item.routeLabel}</Text>
            </View>

            <Text style={[styles.lastMsg, { color: item.isUnread ? C.textPrimary : C.textMuted }]} numberOfLines={1}>
              {item.previewText}
            </Text>
          </View>

          {item.isUnread ? (
            <View style={[styles.unreadBadge, { backgroundColor: C.primary }]}>
              <Text style={styles.unreadText}>NEW</Text>
            </View>
          ) : (
            <MaterialIcons name="chevron-right" size={17} color={C.surfaceBorderLight} />
          )}
        </Pressable>
      );
    },
    [C, openConversation]
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            opacity: headerEntrance.opacity,
            transform: [...headerEntrance.transform, { translateY: heroTranslateY }],
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Messages</Text>
            <Text style={[styles.pageSubtitle, { color: C.textMuted }]}> 
              {unreadCount > 0
                ? `${unreadCount} unread • ${conversationRows.length} total conversations`
                : conversationRows.length > 0
                  ? `${conversationRows.length} active delivery conversations`
                  : 'Direct coordinate chat with delivery partners'}
            </Text>
          </View>

          <View style={styles.headerActionRow}>
            {unreadCount > 0 ? (
              <View style={[styles.unreadPill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
                <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />
                <Text style={[styles.unreadPillText, { color: C.primaryDark }]}>{unreadCount} New</Text>
              </View>
            ) : (
              <View style={[styles.unreadPill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
                <MaterialIcons name="done-all" size={13} color={C.primary} />
                <Text style={[styles.unreadPillText, { color: C.primary }]}>All Read</Text>
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
              accessibilityLabel="Refresh messages"
            >
              <MaterialIcons name="refresh" size={20} color={C.textPrimary} />
            </Pressable>
          </View>
        </View>

        {conversationRows.length > 0 ? (
          <View style={[styles.filterSegment, { backgroundColor: '#F1F5F9', borderColor: C.surfaceBorder }]}>
            <Pressable
              style={[
                styles.segmentItem,
                { backgroundColor: activeFilter === 'all' ? C.primary : 'transparent' },
              ]}
              onPress={() => handleFilterPress('all')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeFilter === 'all' ? '#FFFFFF' : C.textSecondary, fontWeight: activeFilter === 'all' ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                All Chats ({conversationRows.length})
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentItem,
                { backgroundColor: activeFilter === 'unread' ? C.primary : 'transparent' },
              ]}
              onPress={() => handleFilterPress('unread')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeFilter === 'unread' ? '#FFFFFF' : C.textSecondary, fontWeight: activeFilter === 'unread' ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                Unread ({unreadCount})
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      {!isOnline ? (
        <View style={styles.stateWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      <Animated.View style={{ flex: 1, opacity: listEntrance.opacity, transform: listEntrance.transform }}>
        {!user ? (
          <View style={[styles.stateWrap, { paddingBottom: insets.bottom + 90 }]}> 
            <AsyncStateCard
              C={C}
              icon="person-outline"
              title="Sign in required"
              message="Sign in to access your delivery conversations."
            />
          </View>
        ) : conversationsQuery.error ? (
          <View style={[styles.stateWrap, { paddingBottom: insets.bottom + 100 }]}>
            <AsyncStateCard
              C={C}
              icon="cloud-off"
              title="Could not load messages"
              message={conversationsQuery.error instanceof Error ? conversationsQuery.error.message : 'Refresh and try again.'}
              actionLabel="Retry"
              onAction={() => {
                void conversationsQuery.refetch();
              }}
            />
          </View>
        ) : conversationsQuery.isLoading ? (
          <View style={[styles.stateWrap, { paddingBottom: insets.bottom + 100 }]}>
            <AsyncStateCard
              C={C}
              icon="sync"
              title="Loading messages..."
              message="Checking your delivery conversations."
            />
          </View>
        ) : visibleRows.length === 0 ? (
          <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 100 }]}>
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <ProductIllustration variant="chat" size={184} />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}> 
                {conversationRows.length > 0 && activeFilter === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: C.textMuted }]}> 
                {conversationRows.length > 0 && activeFilter === 'unread'
                  ? 'You are all caught up. Switch to All to view conversation history.'
                  : 'Accept a request or send a parcel to start chatting with travellers.'}
              </Text>
              {conversationRows.length > 0 && activeFilter === 'unread' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyCTA,
                    {
                      backgroundColor: C.primaryDark,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                  onPress={() => handleFilterPress('all')}
                >
                  <MaterialIcons name="forum" size={15} color="#fff" />
                  <Text style={styles.emptyCTAText}>View All Conversations</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyCTA,
                      {
                        backgroundColor: C.primaryDark,
                        opacity: pressed ? 0.88 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptic.confirm();
                      router.push('/create-parcel');
                    }}
                  >
                    <MaterialIcons name="inventory-2" size={15} color="#fff" />
                    <Text style={styles.emptyCTAText}>Send a Parcel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptySecBtn,
                      {
                        borderColor: C.surfaceBorder,
                        backgroundColor: C.surfaceElevated,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      router.push('/create-trip');
                    }}
                  >
                    <MaterialIcons name="directions-car" size={15} color={C.textSecondary} />
                    <Text style={[styles.emptySecBtnText, { color: C.textSecondary }]}>Post a Trip</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : (
          <FlashList
            keyboardDismissMode="on-drag"
            data={visibleRows}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            estimatedItemSize={92}
            contentContainerStyle={{
              paddingHorizontal: Spacing.md,
              paddingTop: Spacing.sm,
              paddingBottom: insets.bottom + 110,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
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
    paddingBottom: Spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontWeight: FontWeight.medium,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
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

  filterSegment: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginTop: Spacing.md,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FontSize.sm - 0.5,
    letterSpacing: -0.1,
  },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.mdl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  avatarInitial: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  convInfo: { flex: 1, gap: 3 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  convName: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, letterSpacing: -0.2 },
  convTime: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  routeText: { fontSize: 10, fontWeight: FontWeight.semibold, maxWidth: 170 },
  lastMsg: { fontSize: FontSize.sm, lineHeight: 20 },
  unreadBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  unreadText: { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

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
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  emptyCTAText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  emptySecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  emptySecBtnText: { fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});

