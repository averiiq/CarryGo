import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
  const headerEntrance = useFadeIn(0, 360);
  const listEntrance = useFadeIn(100, 420);
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
      if (!conversationId) return;
      Haptic.tap();
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
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
            pressed && { opacity: 0.86, transform: [{ scale: 0.988 }] },
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
            paddingTop: insets.top + 14,
            opacity: headerEntrance.opacity,
            transform: [...headerEntrance.transform, { translateY: heroTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[C.primarySubtle + '99', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Messages</Text>
            <Text style={[styles.pageSubtitle, { color: unreadCount > 0 ? C.error : C.textMuted }]}> 
              {unreadCount > 0
                ? `${unreadCount} unread · ${conversationRows.length} total`
                : conversationRows.length > 0
                  ? `${conversationRows.length} conversations`
                  : 'Stay connected with your delivery partner'}
            </Text>
          </View>

          {unreadCount > 0 ? (
            <Animated.View
              style={[
                styles.unreadCountBadge,
                { backgroundColor: C.error, transform: [{ scale: unreadPulse }] },
              ]}
            >
              <Text style={styles.unreadCountText}>{unreadCount}</Text>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View
          style={[
            styles.heroCard,
            {
              transform: [{ scale: heroScale }],
              borderColor: C.surfaceBorder,
              backgroundColor: C.surface,
            },
          ]}
        >
          <Image
            source={require('../../assets/images/messages-hero-reference.png')}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={[C.surface + 'F0', C.surface + 'B8', C.surface + 'EE']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroGreeting, { color: C.textMuted }]}>Welcome back</Text>
              <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Let’s keep delivery stress-free</Text>
            </View>
            <View style={[styles.heroAvatar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <Text style={[styles.heroAvatarText, { color: C.primary }]}>{(user?.name?.charAt(0) || 'U').toUpperCase()}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.heroAction,
              { backgroundColor: C.primaryDark, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={handleHeroAction}
          >
            <MaterialIcons name={firstUnread ? 'mark-chat-unread' : 'add-circle-outline'} size={16} color="#fff" />
            <Text style={styles.heroActionText}>{firstUnread ? 'Open Unread Chat' : 'Start New Conversation'}</Text>
          </Pressable>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStatCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}> 
              <Text style={[styles.heroStatLabel, { color: C.textMuted }]}>Unread</Text>
              <Text style={[styles.heroStatValue, { color: unreadCount > 0 ? C.error : C.textPrimary }]}>{unreadCount}</Text>
            </View>
            <View style={[styles.heroStatCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}> 
              <Text style={[styles.heroStatLabel, { color: C.textMuted }]}>Active chats</Text>
              <Text style={[styles.heroStatValue, { color: C.textPrimary }]}>{conversationRows.length}</Text>
            </View>
          </View>
        </Animated.View>

        {conversationRows.length > 0 ? (
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === 'all' ? C.primarySubtle : C.surfaceElevated,
                  borderColor: activeFilter === 'all' ? C.primary + '44' : C.surfaceBorder,
                },
              ]}
              onPress={() => handleFilterPress('all')}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'all' ? C.primary : C.textSecondary }]}>All</Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === 'unread' ? C.primarySubtle : C.surfaceElevated,
                  borderColor: activeFilter === 'unread' ? C.primary + '44' : C.surfaceBorder,
                },
              ]}
              onPress={() => handleFilterPress('unread')}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'unread' ? C.primary : C.textSecondary }]}>Unread</Text>
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
              <Image
                source={require('../../assets/images/empty-messages.webp')}
                style={styles.emptyImage}
                contentFit="contain"
                transition={250}
              />
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
          <Animated.FlatList
            data={visibleRows}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  pageSubtitle: { fontSize: FontSize.xs, marginTop: 2, fontWeight: FontWeight.medium },
  unreadCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  heroCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  heroGreeting: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  heroTitle: { marginTop: 2, fontSize: FontSize.lg, fontWeight: FontWeight.bold, maxWidth: 230 },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroAvatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  heroAction: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
  },
  heroActionText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  heroStatsRow: { flexDirection: 'row', gap: Spacing.sm },
  heroStatCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  heroStatLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  heroStatValue: { marginTop: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm + 2 },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  filterText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
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
  convName: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
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
  lastMsg: { fontSize: FontSize.sm, lineHeight: 18 },
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
  emptyImage: { width: 210, height: 160 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
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

