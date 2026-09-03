import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChatMessage } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  useConversationMessagesRealtime,
  useConversationsRealtime,
  useConversationMessagesQuery,
  useConversationsQuery,
  useMarkMessagesReadMutation,
  useSendMessageMutation,
} from '@/features/conversations/queries';
import { AppErrorBoundary, AsyncStateCard } from '@/components';
import { formatTime } from '@/lib/dateFormat';

function getDayLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

type ListItem =
  | { type: 'day_label'; label: string; id: string }
  | { type: 'message'; data: ChatMessage };

function buildListItems(messages: ChatMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = getDayLabel(msg.timestamp);
    if (day !== lastDay) {
      lastDay = day;
      items.push({ type: 'day_label', label: day, id: `day-${day}` });
    }
    items.push({ type: 'message', data: msg });
  }
  return items;
}

function MessageBubble({
  item, isMine, showAvatar, senderInitial, onLongPress, C,
}: {
  item: ChatMessage; isMine: boolean; showAvatar: boolean;
  senderInitial: string; onLongPress: () => void; C: ThemeColors;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <Animated.View style={[
      styles.messageRow,
      isMine && styles.messageRowMine,
      { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
    ]}>
      {!isMine ? (
        showAvatar ? (
          <View style={[styles.avatarSmall, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.avatarSmallText, { color: C.primary }]}>{senderInitial}</Text>
          </View>
        ) : (
          <View style={{ width: 28 }} />
        )
      ) : null}
      <Pressable
        onLongPress={() => { Haptic.tap(); onLongPress(); }}
        delayLongPress={350}
        accessibilityRole="text"
        accessibilityLabel={`${isMine ? 'You' : senderInitial} said: ${item.text}`}
        accessibilityHint="Long press for message options"
        style={({ pressed }) => [
          styles.bubble,
          isMine
            ? [styles.bubbleMine, { backgroundColor: C.primaryDark }]
            : [styles.bubbleOther, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }],
          pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={[styles.bubbleText, isMine ? { color: C.textInverse } : { color: C.textPrimary }]}>
          {item.text}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isMine ? { color: 'rgba(255,255,255,0.6)' } : { color: C.textMuted }]}>
            {formatTime(item.timestamp)}
          </Text>
          {isMine ? (
            <MaterialIcons
              name={item.read ? 'done-all' : 'check'}
              size={12}
              color={item.read ? C.success : 'rgba(255,255,255,0.6)'}
              style={{ marginLeft: 2 }}
            />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { id: rawId, conversationId: rawConversationId } = useLocalSearchParams<{ id?: string | string[]; conversationId?: string | string[] }>();
  const resolvedId = Array.isArray(rawId) ? rawId[0] : rawId;
  const fallbackConversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  const id = decodeURIComponent((resolvedId || fallbackConversationId || '').trim());
  const { user } = useAuth();
  const conversationsQuery = useConversationsQuery(user?.id);
  const messagesQuery = useConversationMessagesQuery(id);
  const { mutateAsync: sendMessageAsync, isPending: isSending } = useSendMessageMutation(user?.id);
  const { mutateAsync: markMessagesReadAsync } = useMarkMessagesReadMutation(user?.id);
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const flatListRef = useRef<any>(null);
  const router = useRouter();
  const sendBtnScale = useRef(new Animated.Value(1)).current;
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;

  const conversations = user ? conversationsQuery.data ?? [] : [];
  const conversation = conversations.find(c => c.id === id);
  const chatMessages: ChatMessage[] = (messagesQuery.data?.pages ?? []).flatMap(page => page.items);
  const myId = user?.id || '';
  const otherName = conversation
    ? Object.entries(conversation.participantNames).find(([k]) => k !== myId)?.[1] || 'User'
    : 'User';

  const listItems = React.useMemo(() => buildListItems(chatMessages), [chatMessages]);

  useConversationsRealtime(user?.id);
  useConversationMessagesRealtime(id, user?.id);

  useEffect(() => {
    if (id && user?.id) {
      void markMessagesReadAsync(id).catch(() => {});
    }
  }, [id, markMessagesReadAsync, user?.id]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages.length]);

  const handleSend = async () => {
    if (!text.trim() || !user || !id || isSending) return;
    const t = text.trim();
    setText('');
    Haptic.tap();

    // Button bounce
    Animated.sequence([
      Animated.spring(sendBtnScale, { toValue: 0.85, useNativeDriver: true, tension: 300 }),
      Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    try {
      await sendMessageAsync({ conversationId: id, senderId: user.id, senderName: user.name, text: t });
    } catch (error) {
      setText(t);
      Haptic.error();
      showAlert(
        'Message Not Sent',
        error instanceof Error ? error.message : 'Could not send this message. Please try again.',
      );
    }
  };

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const shouldShow = distanceFromBottom > 150;
    if (shouldShow !== showScrollBtn) {
      setShowScrollBtn(shouldShow);
      Animated.timing(scrollBtnOpacity, { toValue: shouldShow ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [showScrollBtn, scrollBtnOpacity]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    Haptic.tap();
  }, []);

  const handleLongPress = useCallback((msg: ChatMessage) => {
    showAlert('Message Options', msg.text.slice(0, 60) + (msg.text.length > 60 ? '...' : ''), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Copy Text', onPress: async () => { await Clipboard.setStringAsync(msg.text); Haptic.success(); } },
    ]);
  }, [showAlert]);

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'day_label') {
      return (
        <View style={styles.dayLabelRow}>
          <View style={[styles.dayLabelLine, { backgroundColor: C.surfaceBorder }]} />
          <Text style={[styles.dayLabel, { color: C.textMuted, backgroundColor: C.surfaceElevated }]}>
            {item.label}
          </Text>
          <View style={[styles.dayLabelLine, { backgroundColor: C.surfaceBorder }]} />
        </View>
      );
    }

    const msg = item.data;
    const isMine = msg.senderId === myId;
    const prevItem = index > 0 ? listItems[index - 1] : null;
    const prevMsg = prevItem?.type === 'message' ? prevItem.data : null;
    const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

    return (
      <MessageBubble
        item={msg}
        isMine={isMine}
        showAvatar={showAvatar}
        senderInitial={msg.senderName?.charAt(0).toUpperCase() || 'U'}
        onLongPress={() => handleLongPress(msg)}
        C={C}
      />
    );
  }, [myId, listItems, handleLongPress, C]);

  const keyExtractor = useCallback((item: ListItem) => {
    return item.type === 'day_label' ? item.id : item.data.id;
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Delivery CTA bar */}
      {!id ? (
        <View style={styles.invalidWrap}>
          <AsyncStateCard
            C={C}
            icon="error-outline"
            title="Invalid chat"
            message="This conversation link is invalid. Open chat from Messages tab."
            actionLabel="Go to Messages"
            onAction={() => router.replace('/(tabs)/messages')}
            compact
          />
        </View>
      ) : null}

      {conversation ? (
        <Pressable
          style={[styles.deliveryCTA, { backgroundColor: C.primarySubtle, borderBottomColor: C.surfaceBorder }]}
          onPress={() => router.push({ pathname: '/delivery/[id]', params: { id: conversation.requestId } })}
        >
          <MaterialIcons name="local-shipping" size={14} color={C.primary} />
          <Text style={[styles.deliveryCTAText, { color: C.primary }]}>
            {conversation.route || 'Track Delivery Status'}
          </Text>
          <MaterialIcons name="chevron-right" size={14} color={C.primary} />
        </Pressable>
      ) : null}

      <AppErrorBoundary>
        <FlashList
          ref={flatListRef}
          data={listItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.messageList, { paddingBottom: 16 }] as any}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          ListHeaderComponent={messagesQuery.hasNextPage ? (
            <Pressable
              style={[styles.loadOlderBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              onPress={() => { void messagesQuery.fetchNextPage(); }}
              disabled={messagesQuery.isFetchingNextPage}
            >
              <MaterialIcons
                name={messagesQuery.isFetchingNextPage ? 'sync' : 'history'}
                size={14}
                color={C.textMuted}
              />
              <Text style={[styles.loadOlderText, { color: C.textMuted }]}>
                {messagesQuery.isFetchingNextPage ? 'Loading earlier messages...' : 'Load earlier messages'}
              </Text>
            </Pressable>
          ) : null}
          ListEmptyComponent={() => {
            const chatError = messagesQuery.error || conversationsQuery.error;
            if (chatError) {
              return (
                <AsyncStateCard
                  C={C}
                  icon="cloud-off"
                  title="Could not load chat"
                  message={chatError instanceof Error ? chatError.message : 'Refresh and try again.'}
                  actionLabel="Retry"
                  onAction={() => {
                    void messagesQuery.refetch();
                    void conversationsQuery.refetch();
                  }}
                  compact
                />
              );
            }
            if (messagesQuery.isLoading || conversationsQuery.isLoading) {
              return (
                <AsyncStateCard
                  C={C}
                  icon="sync"
                  title="Loading chat..."
                  message="Fetching the latest delivery messages."
                  compact
                />
              );
            }
            return (
              <View style={styles.emptyChat}>
                <View style={[styles.emptyIconBox, { backgroundColor: C.surfaceElevated }]}>
                  <Ionicons name="chatbubbles-outline" size={40} color={C.textMuted} />
                </View>
                <Text style={[styles.emptyChatText, { color: C.textSecondary }]}>Start the conversation!</Text>
                <Text style={[styles.emptyChatSubtext, { color: C.textMuted }]}>
                  Coordinate pickup and delivery details with {otherName}
                </Text>
                <View style={[styles.copyHint, { backgroundColor: C.surfaceElevated }]}>
                  <MaterialIcons name="touch-app" size={13} color={C.textMuted} />
                  <Text style={[styles.copyHintText, { color: C.textMuted }]}>Long-press any message for options</Text>
                </View>
              </View>
            );
          }}
        />
      </AppErrorBoundary>

      {/* Scroll to bottom FAB */}
      {showScrollBtn ? (
        <Animated.View style={[styles.scrollBtnWrap, { opacity: scrollBtnOpacity }]}>
          <Pressable
            style={[styles.scrollBtn, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
            onPress={scrollToBottom}
            hitSlop={8}
          >
            <MaterialIcons name="keyboard-arrow-down" size={22} color={C.textSecondary} />
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Input */}
      <View style={[
        styles.inputRow,
        {
          backgroundColor: C.surface,
          borderTopColor: C.surfaceBorder,
          paddingBottom: insets.bottom + Spacing.sm,
        },
      ]}>
        <View style={[
          styles.inputWrap,
          {
            backgroundColor: inputFocused ? C.primarySubtle : C.inputBg,
            borderColor: inputFocused ? C.primary : C.surfaceBorder,
          },
        ]}>
          <TextInput
            style={[styles.input, { color: C.textPrimary }]}
            value={text}
            onChangeText={setText}
            placeholder={`Message ${otherName}...`}
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={500}
            onFocus={() => { setInputFocused(true); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200); }}
            onBlur={() => setInputFocused(false)}
          />
        </View>
        <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() && !isSending ? C.primaryDark : C.surfaceElevated },
            ]}
            onPress={handleSend}
            disabled={!text.trim() || isSending}
            hitSlop={8}
          >
            <Ionicons name="send" size={18} color={text.trim() && !isSending ? C.textInverse : C.textMuted} />
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  deliveryCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  deliveryCTAText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  invalidWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  messageList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.mdl },
  loadOlderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  loadOlderText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  dayLabelLine: { flex: 1, height: 1 },
  dayLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full,
  },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 3 },
  messageRowMine: { flexDirection: 'row-reverse' },
  avatarSmall: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { fontSize: 12, fontWeight: FontWeight.bold },
  bubble: {
    maxWidth: '78%', paddingHorizontal: Spacing.mdl,
    paddingTop: Spacing.smd, paddingBottom: 8, borderRadius: 20,
  },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleOther: { borderBottomLeftRadius: 6, borderWidth: 1 },
  bubbleText: { fontSize: FontSize.md, lineHeight: 23 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, gap: 2 },
  bubbleTime: { fontSize: 10 },

  emptyChat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 80, gap: Spacing.md },
  emptyIconBox: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyChatText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  emptyChatSubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  copyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, marginTop: 4,
  },
  copyHintText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  scrollBtnWrap: {
    position: 'absolute', right: Spacing.md, bottom: 90, zIndex: 10,
  },
  scrollBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, elevation: 4,
    shadowColor: '#111827', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1,
  },
  inputWrap: {
    flex: 1, borderRadius: BorderRadius.full,
    borderWidth: 1.2, paddingHorizontal: Spacing.mdl, paddingVertical: 11,
  },
  input: { fontSize: FontSize.md, maxHeight: 120, includeFontPadding: false },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
});
