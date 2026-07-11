import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, FlatList, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { AppNotification } from '@/types';
import { styles } from '@/styles/tabs/index.styles';

type NotificationPanelProps = {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  markAllRead: () => void;
  C: ThemeColors;
};

function AnimatedNotifItem({ item, index, C, typeIcon }: { item: AppNotification; index: number; C: ThemeColors; typeIcon: Record<string, keyof typeof MaterialIcons.glyphMap> }) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14, delay }),
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity, index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.notifItem,
          { borderBottomColor: C.surfaceBorder },
          !item.read && { backgroundColor: C.primarySubtle },
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => Haptic.tap()}
      >
        <View style={[styles.notifIcon, { backgroundColor: item.read ? C.surfaceElevated : C.primarySubtle, borderWidth: 1, borderColor: item.read ? C.surfaceBorder : C.primary + '30' }]}>
          <MaterialIcons name={typeIcon[item.type] || 'notifications'} size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.notifItemTitle, { color: C.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.notifItemBody, { color: C.textSecondary }]} numberOfLines={2}>{item.body}</Text>
          <Text style={[styles.notifItemTime, { color: C.textMuted }]}>
            {new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!item.read ? <View style={[styles.unreadDot, { backgroundColor: C.primary }]} /> : null}
      </Pressable>
    </Animated.View>
  );
}

export function NotificationPanel({
  visible,
  onClose,
  notifications,
  markAllRead,
  C,
}: NotificationPanelProps) {
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const typeIcon: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    new_request: 'swap-horiz', request_accepted: 'check-circle', request_rejected: 'cancel',
    delivery_otp: 'lock', rating: 'star', route_match: 'notifications-active', general: 'notifications', chat_message: 'chat',
  };

  useEffect(() => {
    if (visible) {
      sheetAnim.setValue(0);
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 18 }).start();
    }
  }, [visible, sheetAnim]);

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
        {notifications.length === 0 ? (
          <View style={styles.notifEmpty}>
            <View style={[styles.emptyIconBox, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="notifications-off-outline" size={36} color={C.textMuted} />
            </View>
            <Text style={[styles.notifEmptyText, { color: C.textSecondary }]}>No notifications yet</Text>
            <Text style={[styles.notifEmptySub, { color: C.textMuted }]}>Activity will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={n => n.id}
            renderItem={({ item, index }) => (
              <AnimatedNotifItem item={item} index={index} C={C} typeIcon={typeIcon} />
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
}
