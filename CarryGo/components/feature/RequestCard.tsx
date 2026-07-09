import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

interface RequestCardProps {
  request: Request;
  type: 'incoming' | 'outgoing';
  onAccept?: () => void;
  onReject?: () => void;
  onChat?: () => void;
  onDelivery?: () => void;
  onPayment?: () => void;
}

const STATUS_CONFIG = (C: ThemeColors): Record<string, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  pending: { color: C.warning, bg: C.warningSubtle, label: 'Pending', icon: 'time-outline' },
  accepted: { color: C.success, bg: C.successSubtle, label: 'Accepted', icon: 'checkmark-circle-outline' },
  rejected: { color: C.error, bg: C.errorSubtle, label: 'Rejected', icon: 'close-circle-outline' },
  cancelled: { color: C.textMuted, bg: C.surfaceElevated, label: 'Cancelled', icon: 'ban-outline' },
  completed: { color: C.success, bg: C.successSubtle, label: 'Completed', icon: 'trophy-outline' },
  failed: { color: C.error, bg: C.errorSubtle, label: 'Failed', icon: 'alert-circle-outline' },
});

export const RequestCard = React.memo(function RequestCard({ request, type, onAccept, onReject, onChat, onDelivery, onPayment }: RequestCardProps) {
  const { C, S } = useThemeColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const sc = STATUS_CONFIG(C)[request.status] || STATUS_CONFIG(C).pending;
  const personName = type === 'incoming' ? request.senderName : request.travellerName;
  const personLabel = type === 'incoming' ? 'From Sender' : 'To Traveller';
  const showSwipeHint = type === 'incoming' && request.status === 'pending';

  // Swipe gestures for incoming pending requests
  const SWIPE_THRESHOLD = 80;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => showSwipeHint && Math.abs(g.dx) > 8 && Math.abs(g.dy) < 30,
    onPanResponderMove: (_, g) => {
      translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        // Swipe right → accept
        Haptic.success();
        Animated.spring(translateX, { toValue: 400, useNativeDriver: true, tension: 100 }).start(() => {
          translateX.setValue(0);
          onAccept?.();
        });
      } else if (g.dx < -SWIPE_THRESHOLD) {
        // Swipe left → reject
        Haptic.error();
        Animated.spring(translateX, { toValue: -400, useNativeDriver: true, tension: 100 }).start(() => {
          translateX.setValue(0);
          onReject?.();
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 150 }).start();
      }
    },
  })).current;

  const bgColor = translateX.interpolate({
    inputRange: [-200, -80, 0, 80, 200],
    outputRange: [C.errorSubtle, C.surfaceElevated, C.surface, C.surfaceElevated, C.successSubtle],
    extrapolate: 'clamp',
  });

  const onPressIn = () => Animated.spring(pressScale, { toValue: Motion.cardScale, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  // Swipe hint labels
  const rejectOpacity = translateX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const acceptOpacity = translateX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ position: 'relative' }}>
      {/* Swipe background hints */}
      {showSwipeHint ? (
        <>
          <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { backgroundColor: C.errorSubtle, opacity: rejectOpacity }]}>
            <MaterialIcons name="close" size={22} color={C.error} />
            <Text style={[styles.swipeBgText, { color: C.error }]}>Reject</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { backgroundColor: C.successSubtle, opacity: acceptOpacity }]}>
            <Text style={[styles.swipeBgText, { color: C.success }]}>Accept</Text>
            <MaterialIcons name="check" size={22} color={C.success} />
          </Animated.View>
        </>
      ) : null}

      <Animated.View
        style={[
          styles.card,
          S.sm,
          { backgroundColor: showSwipeHint ? bgColor : C.surface, borderColor: C.surfaceBorder },
          { transform: [{ translateX }, { scale: pressScale }] },
        ]}
        {...(showSwipeHint ? panResponder.panHandlers : {})}
      >
        {/* Status accent bar */}
        <View style={[styles.statusBar, { backgroundColor: sc.color }]} />

        <Pressable
          style={styles.inner}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          android_ripple={{ color: C.primarySubtle }}
          accessibilityRole="button"
          accessibilityLabel={`${type === 'incoming' ? 'Incoming' : 'Outgoing'} request from ${personName}, ₹${request.price}, ${sc.label}`}
          accessibilityHint={showSwipeHint ? 'Swipe right to accept, left to reject' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.personBlock}>
              <View style={[styles.personAvatar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' }]}>
                <Text style={[styles.personAvatarText, { color: C.primary }]}>{personName.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={[styles.personLabel, { color: C.textMuted }]}>{personLabel}</Text>
                <Text style={[styles.personName, { color: C.textPrimary }]}>{personName}</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Ionicons name={sc.icon} size={11} color={sc.color} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: C.surfaceBorder }]} />

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <MaterialIcons name="currency-rupee" size={14} color={C.success} />
              <Text style={[styles.priceText, { color: C.success }]}>₹{request.price}</Text>
            </View>
            <View style={[styles.detailSep, { backgroundColor: C.surfaceBorderLight }]} />
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
              <Text style={[styles.dateText, { color: C.textMuted }]}>
                {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            {type === 'incoming' && request.status === 'pending' ? (
              <>
                <View style={[styles.detailSep, { backgroundColor: C.surfaceBorderLight }]} />
                <View style={[styles.swipeHintBadge, { backgroundColor: C.surfaceElevated }]}>
                  <MaterialIcons name="swipe" size={11} color={C.textMuted} />
                  <Text style={[styles.swipeHintText, { color: C.textMuted }]}>Swipe</Text>
                </View>
              </>
            ) : null}
          </View>

          {request.message ? (
            <View style={[styles.messageBubble, { backgroundColor: C.surfaceElevated, borderLeftColor: C.primary }]}>
              <Text style={[styles.messageText, { color: C.textSecondary }]} numberOfLines={2}>
                &quot;{request.message}&quot;
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          {type === 'incoming' && request.status === 'pending' ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44', borderWidth: 1, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptic.tap(); onReject?.(); }}
              >
                <Ionicons name="close" size={15} color={C.error} />
                <Text style={[styles.actionBtnText, { color: C.error }]}>Reject</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.success, opacity: pressed ? 0.88 : 1 }]}
                onPress={() => { Haptic.tap(); onAccept?.(); }}
              >
                <Ionicons name="checkmark" size={15} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
              </Pressable>
            </View>
          ) : null}

          {request.status === 'accepted' ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44', borderWidth: 1, flex: undefined, paddingHorizontal: Spacing.md, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptic.tap(); onChat?.(); }}
              >
                <Ionicons name="chatbubble-outline" size={14} color={C.primary} />
                <Text style={[styles.actionBtnText, { color: C.primary }]}>Chat</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.warning + '18', borderColor: C.warning + '44', borderWidth: 1, flex: undefined, paddingHorizontal: Spacing.md, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptic.tap(); onPayment?.(); }}
              >
                <MaterialIcons name="account-balance-wallet" size={14} color={C.warning} />
                <Text style={[styles.actionBtnText, { color: C.warning }]}>Pay</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
                onPress={() => { Haptic.tap(); onDelivery?.(); }}
              >
                <MaterialIcons name="local-shipping" size={14} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Track</Text>
              </Pressable>
            </View>
          ) : null}

          {request.status === 'completed' ? (
            <Pressable
              style={({ pressed }) => [styles.historyBtn, { backgroundColor: C.successSubtle, borderColor: C.success + '44', opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptic.tap(); onPayment?.(); }}
            >
              <MaterialIcons name="receipt-long" size={14} color={C.success} />
              <Text style={[styles.actionBtnText, { color: C.success }]}>View Payment</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  swipeBg: {
    position: 'absolute', top: 0, bottom: 0, width: '50%',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    gap: 8, borderRadius: BorderRadius.lg, zIndex: 0,
  },
  swipeBgLeft: { left: 0, paddingLeft: 20, justifyContent: 'flex-start' },
  swipeBgRight: { right: 0, paddingRight: 20, justifyContent: 'flex-end' },
  swipeBgText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  card: {
    borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden', zIndex: 1,
  },
  statusBar: { height: 3 },
  inner: { padding: Spacing.md, gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  personAvatar: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  personAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  personLabel: { fontSize: FontSize.xs },
  personName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  divider: { height: 1 },
  details: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailSep: { width: 1, height: 14 },
  priceText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  dateText: { fontSize: FontSize.xs },
  swipeHintBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full,
  },
  swipeHintText: { fontSize: 10, fontWeight: FontWeight.medium },
  messageBubble: {
    padding: Spacing.sm, borderRadius: BorderRadius.sm, borderLeftWidth: 2.5,
  },
  messageText: { fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm + 3, borderRadius: BorderRadius.md,
  },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm + 1, borderRadius: BorderRadius.md, borderWidth: 1,
  },
});
