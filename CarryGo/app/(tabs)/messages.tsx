import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { EmptyMessagesSVG } from '@/components/ui/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { useConversationsQuery, useConversationsRealtime } from '@/features/conversations/queries';
import { AsyncStateCard, OfflineBanner } from '@/components';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFadeIn, useHeartbeat } from '@/hooks/useAnimations';
import { formatRelative } from '@/lib/dateFormat';

function formatConversationTime(timestamp?: string) {
  if (!timestamp) return '';
  return formatRelative(timestamp);
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const conversationsQuery = useConversationsQuery(user?.id);
  const conversations = user ? conversationsQuery.data ?? [] : [];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const headerEntrance = useFadeIn(0, 400);
  const listEntrance = useFadeIn(120, 450);
  const unreadPulse = useHeartbeat(3500, 1.2);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await conversationsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [conversationsQuery]);

  useConversationsRealtime(user?.id);

  const myConversations = conversations
    .filter(c => c.participants.includes(user?.id || ''))
    .sort((a, b) => {
      const ta = a.lastMessage?.timestamp || a.id;
      const tb = b.lastMessage?.timestamp || b.id;
      return tb.localeCompare(ta);
    });

  const unreadCount = myConversations.filter(c =>
    c.lastMessage && !c.lastMessage.read && c.lastMessage.senderId !== user?.id
  ).length;

  const getOtherName = (conv: typeof conversations[0]) => {
    const otherId = conv.participants.find(p => p !== (user?.id || ''));
    return otherId ? conv.participantNames[otherId] : 'Unknown';
  };

  const renderItem = ({ item }: { item: typeof conversations[0] }) => {
    const isUnread = item.lastMessage && !item.lastMessage.read && item.lastMessage.senderId !== user?.id;
    const otherName = getOtherName(item);
    const initial = otherName.charAt(0).toUpperCase();

    return (
      <Pressable
        style={({ pressed }) => [
          styles.convItem,
          { backgroundColor: C.surface, borderColor: isUnread ? C.primary + '55' : C.surfaceBorder },
          isUnread && { borderLeftWidth: 3, borderLeftColor: C.primary },
          pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] },
        ]}
        onPress={() => {
          Haptic.tap();
          router.push({ pathname: '/chat/[id]', params: { id: item.id } });
        }}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: isUnread ? C.primarySubtle : C.surfaceElevated, borderColor: isUnread ? C.primary + '44' : C.surfaceBorder }]}>
          <Text style={[styles.avatarInitial, { color: isUnread ? C.primary : C.textSecondary }]}>{initial}</Text>
          {isUnread ? (
            <View style={[styles.onlineDot, { backgroundColor: C.success, borderColor: C.surface }]} />
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.convInfo}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, { color: C.textPrimary }, isUnread && { fontWeight: FontWeight.bold }]}>
              {otherName}
            </Text>
            <Text style={[styles.convTime, { color: isUnread ? C.primary : C.textMuted }]}>
              {formatConversationTime(item.lastMessage?.timestamp)}
            </Text>
          </View>

          {/* Route pill */}
          <View style={[styles.routePill, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="route" size={10} color={C.primary} />
            <Text style={[styles.routeText, { color: C.primary }]} numberOfLines={1}>{item.route}</Text>
          </View>

          {/* Last message */}
          {item.lastMessage ? (
            <Text
              style={[styles.lastMsg, { color: isUnread ? C.textPrimary : C.textMuted }]}
              numberOfLines={1}
            >
              {item.lastMessage.senderId === user?.id ? (
                <Text style={{ color: C.textMuted }}>You: </Text>
              ) : null}
              {item.lastMessage.text}
            </Text>
          ) : (
            <Text style={[styles.lastMsg, { color: C.textMuted + '88' }]}>Start the conversation</Text>
          )}
        </View>

        {/* Badge / Arrow */}
        {isUnread ? (
          <View style={[styles.unreadBadge, { backgroundColor: C.primary }]}>
            <Text style={styles.unreadText}>NEW</Text>
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={17} color={C.surfaceBorderLight} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 14, opacity: headerEntrance.opacity, transform: headerEntrance.transform }]}>
        <LinearGradient
          colors={[C.primary + '0C', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Messages</Text>
            {unreadCount > 0 ? (
              <Text style={[styles.pageSubtitle, { color: C.error }]}>{unreadCount} unread</Text>
            ) : myConversations.length > 0 ? (
              <Text style={[styles.pageSubtitle, { color: C.textMuted }]}>{myConversations.length} conversations</Text>
            ) : null}
          </View>
          {myConversations.length > 0 && unreadCount > 0 ? (
            <Animated.View style={[styles.unreadCountBadge, { backgroundColor: C.error, transform: [{ scale: unreadPulse }] }]}>
              <Text style={styles.unreadCountText}>{unreadCount}</Text>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>

      {!isOnline ? (
        <View style={styles.stateWrap}>
          <OfflineBanner C={C} />
        </View>
      ) : null}

      <Animated.View style={{ flex: 1, opacity: listEntrance.opacity, transform: listEntrance.transform }}>
      {conversationsQuery.error ? (
        <View style={[styles.stateWrap, { paddingBottom: insets.bottom + 100 }]}>
          <AsyncStateCard
            C={C}
            icon="cloud-off"
            title="Could not load messages"
            message={conversationsQuery.error instanceof Error ? conversationsQuery.error.message : 'Refresh and try again.'}
            actionLabel="Retry"
            onAction={() => { void conversationsQuery.refetch(); }}
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
      ) : myConversations.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 100 }]}>
          <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <EmptyMessagesSVG width={200} height={150} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
              Accept a request or send a parcel to start chatting with travellers
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyCTA, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              onPress={() => { Haptic.confirm(); router.push('/create-parcel'); }}
            >
              <MaterialIcons name="inventory-2" size={15} color="#fff" />
              <Text style={styles.emptyCTAText}>Send a Parcel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.emptySecBtn, { borderColor: C.surfaceBorder, backgroundColor: C.surfaceElevated, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptic.tap(); router.push('/create-trip'); }}
            >
              <MaterialIcons name="directions-car" size={15} color={C.textSecondary} />
              <Text style={[styles.emptySecBtnText, { color: C.textSecondary }]}>Post a Trip</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={myConversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
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
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadCountText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  stateWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', borderWidth: 1,
  },
  avatarInitial: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2,
  },
  convInfo: { flex: 1, gap: 3 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  convTime: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  routePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  routeText: { fontSize: 10, fontWeight: FontWeight.semibold, maxWidth: 170 },
  lastMsg: { fontSize: FontSize.sm, lineHeight: 18 },
  unreadBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  unreadText: { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  // Empty
  emptyWrap: {
    flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: Spacing.sm, width: '100%', justifyContent: 'center',
  },
  emptyCTAText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  emptySecBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, borderWidth: 1, width: '100%', justifyContent: 'center',
  },
  emptySecBtnText: { fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});
