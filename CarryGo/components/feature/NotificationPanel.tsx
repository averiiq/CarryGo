import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, FlatList, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { AppNotification } from '@/types';
import { styles } from '@/styles/tabs/index.styles';

type NotificationPanelProps = {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  markAllRead: () => void;
  onPressNotification: (notification: AppNotification) => void;
  onMarkRead: (notifications: AppNotification[]) => void;
  C: ThemeColors;
};

type NotificationGroup = {
  key: string;
  representative: AppNotification;
  items: AppNotification[];
  unreadCount: number;
};

function getGroupKey(notification: AppNotification): string {
  if (notification.type === 'chat_message') return `chat_message:${notification.relatedId ?? 'unknown'}`;
  if (notification.relatedId) return `${notification.type}:${notification.relatedId}`;
  return `${notification.type}:${notification.title}`;
}

function buildNotificationGroups(source: AppNotification[]): NotificationGroup[] {
  const groupMap = new Map<string, NotificationGroup>();
  const orderedKeys: string[] = [];

  for (const notification of source) {
    const key = getGroupKey(notification);
    const existing = groupMap.get(key);

    if (!existing) {
      groupMap.set(key, {
        key,
        representative: notification,
        items: [notification],
        unreadCount: notification.read ? 0 : 1,
      });
      orderedKeys.push(key);
      continue;
    }

    existing.items.push(notification);
    if (!notification.read) existing.unreadCount += 1;

    if (new Date(notification.createdAt).getTime() > new Date(existing.representative.createdAt).getTime()) {
      existing.representative = notification;
    }
  }

  return orderedKeys
    .map((key) => groupMap.get(key))
    .filter((group): group is NotificationGroup => Boolean(group));
}

function AnimatedNotifItem({
  group,
  index,
  C,
  typeIcon,
  isExpanded,
  onToggleGroup,
  onPressNotification,
  onMarkRead,
}: {
  group: NotificationGroup;
  index: number;
  C: ThemeColors;
  typeIcon: Record<string, keyof typeof MaterialIcons.glyphMap>;
  isExpanded: boolean;
  onToggleGroup: (groupKey: string) => void;
  onPressNotification: (notification: AppNotification) => void;
  onMarkRead: (notifications: AppNotification[]) => void;
}) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const item = group.representative;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14, delay }),
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity, index]);

  const renderLeftActions = () => (
    <Pressable
      onPress={() => {
        if (group.unreadCount === 0) return;
        Haptic.tap();
        onMarkRead(group.items);
      }}
      style={{
        width: 90,
        marginVertical: 4,
        borderRadius: 14,
        backgroundColor: group.unreadCount === 0 ? C.surfaceElevated : C.success,
        borderWidth: group.unreadCount === 0 ? 1 : 0,
        borderColor: C.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialIcons name={group.unreadCount === 0 ? 'done-all' : 'done'} size={18} color={group.unreadCount === 0 ? C.textMuted : '#fff'} />
      <Text style={{ color: group.unreadCount === 0 ? C.textMuted : '#fff', fontWeight: '700', marginTop: 4, fontSize: 11 }}>
        {group.unreadCount === 0 ? 'Read' : 'Mark'}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Swipeable leftThreshold={30} renderLeftActions={renderLeftActions}>
        <View>
          <Pressable
            style={({ pressed }) => [
              styles.notifItem,
              { borderBottomColor: C.surfaceBorder },
              group.unreadCount > 0 && { backgroundColor: C.primarySubtle },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => { Haptic.tap(); onPressNotification(item); }}
          >
            <View style={[styles.notifIcon, { backgroundColor: group.unreadCount === 0 ? C.surfaceElevated : C.primarySubtle, borderWidth: 1, borderColor: group.unreadCount === 0 ? C.surfaceBorder : C.primary + '30' }]}>
              <MaterialIcons name={typeIcon[item.type] || 'notifications'} size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.notifItemTitle, { color: C.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.notifItemBody, { color: C.textSecondary }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.notifItemTime, { color: C.textMuted }]}>
                {new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {group.items.length > 1 ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  Haptic.tap();
                  onToggleGroup(group.key);
                }}
                style={{ alignItems: 'center', justifyContent: 'center', marginRight: 6, gap: 4 }}
              >
                <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.surfaceBorder, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.textSecondary, fontSize: 10, fontWeight: '700' }}>+{group.items.length - 1}</Text>
                </View>
                <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={16} color={C.textMuted} />
              </Pressable>
            ) : null}
            {group.unreadCount > 0 ? <View style={[styles.unreadDot, { backgroundColor: C.primary }]} /> : null}
          </Pressable>

          {isExpanded ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10, backgroundColor: C.surface }}>
              {group.items.slice(1).map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => {
                    Haptic.tap();
                    onPressNotification(child);
                  }}
                  style={({ pressed }) => [{
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: C.surfaceBorder,
                    backgroundColor: child.read ? C.surfaceElevated : C.primarySubtle,
                    marginTop: 8,
                  }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{child.title}</Text>
                  <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{child.body}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Swipeable>
    </Animated.View>
  );
}

export function NotificationPanel({
  visible,
  onClose,
  notifications,
  markAllRead,
  onPressNotification,
  onMarkRead,
  C,
}: NotificationPanelProps) {
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [activeFilter, setActiveFilter] = useState<'unread' | 'all'>('unread');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);

  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
  const filteredNotifications = useMemo(
    () => (activeFilter === 'unread' ? unreadNotifications : notifications),
    [activeFilter, notifications, unreadNotifications]
  );
  const groupedNotifications = useMemo(() => buildNotificationGroups(filteredNotifications), [filteredNotifications]);

  const typeIcon: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    new_request: 'swap-horiz', request_accepted: 'check-circle', request_rejected: 'cancel',
    delivery_otp: 'lock', rating: 'star', route_match: 'notifications-active', general: 'notifications', chat_message: 'chat',
  };

  useEffect(() => {
    if (visible) {
      sheetAnim.setValue(0);
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 18 }).start();
      if (unreadNotifications.length === 0) setActiveFilter('all');
    }
  }, [visible, sheetAnim, unreadNotifications.length]);

  useEffect(() => {
    setExpandedGroupKeys((prev) => prev.filter((key) => groupedNotifications.some((group) => group.key === key)));
  }, [groupedNotifications]);

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroupKeys((prev) => (prev.includes(groupKey) ? prev.filter((key) => key !== groupKey) : [...prev, groupKey]));
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: C.overlayMedium }]} onPress={onClose} />
      <Animated.View style={[
        styles.notifSheet,
        { backgroundColor: C.surface, borderTopColor: C.surfaceBorder },
        { transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] },
      ]}>
        <View style={[styles.sheetHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <View style={styles.notifHeader}>
          <Text style={[styles.notifTitle, { color: C.textPrimary }]}>Notifications</Text>
          <Pressable onPress={() => { Haptic.tap(); markAllRead(); }} style={({ pressed }) => [styles.markReadBtn, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="done-all" size={16} color={C.primary} />
            <Text style={[styles.markReadText, { color: C.primary }]}>Mark all read</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 10 }}>
          <Pressable
            onPress={() => setActiveFilter('unread')}
            style={{
              flex: 1,
              minHeight: 34,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: activeFilter === 'unread' ? C.primary : C.surfaceBorder,
              backgroundColor: activeFilter === 'unread' ? C.primarySubtle : C.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: activeFilter === 'unread' ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 12 }}>
              Unread ({unreadNotifications.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('all')}
            style={{
              flex: 1,
              minHeight: 34,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: activeFilter === 'all' ? C.primary : C.surfaceBorder,
              backgroundColor: activeFilter === 'all' ? C.primarySubtle : C.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: activeFilter === 'all' ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 12 }}>
              All ({notifications.length})
            </Text>
          </Pressable>
        </View>

        {groupedNotifications.length === 0 ? (
          <View style={styles.notifEmpty}>
            <View style={[styles.emptyIconBox, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="notifications-off-outline" size={36} color={C.textMuted} />
            </View>
            <Text style={[styles.notifEmptyText, { color: C.textSecondary }]}>
              {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={[styles.notifEmptySub, { color: C.textMuted }]}>Activity will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={groupedNotifications}
            keyExtractor={(group) => group.key}
            renderItem={({ item, index }) => (
              <AnimatedNotifItem
                group={item}
                index={index}
                C={C}
                typeIcon={typeIcon}
                isExpanded={expandedGroupKeys.includes(item.key)}
                onToggleGroup={toggleGroupExpanded}
                onPressNotification={onPressNotification}
                onMarkRead={onMarkRead}
              />
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
}
