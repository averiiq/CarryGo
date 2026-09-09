import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Motion, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';

interface RequestCardProps {
  request: Request;
  type: 'incoming' | 'outgoing';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onChat?: () => void;
  onDelivery?: () => void;
  onPayment?: () => void;
}

const STATUS_CONFIG = (C: ThemeColors): Record<string, { color: string; bg: string; border: string; label: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  pending: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Pending', icon: 'time-outline' },
  accepted: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Accepted', icon: 'checkmark-circle' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Declined', icon: 'close-circle' },
  cancelled: { color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', label: 'Cancelled', icon: 'ban' },
  completed: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Completed', icon: 'trophy' },
  failed: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Failed', icon: 'alert-circle' },
});

export const RequestCard = React.memo(function RequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onDelivery,
  onPayment,
}: RequestCardProps) {
  const { C, S } = useThemeColors();
  const { isSmallDevice, isTablet, swipeThreshold } = useResponsive();
  const translateX = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const sc = STATUS_CONFIG(C)[request.status] || STATUS_CONFIG(C).pending;
  const personName = type === 'incoming' ? request.senderName : request.travellerName;
  const isIncoming = type === 'incoming';
  const showSwipeHint = isIncoming && request.status === 'pending';

  // Calibrated swipe gesture with directional lock: only trigger on clear horizontal drag
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      showSwipeHint && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > swipeThreshold) {
        Haptic.success();
        Animated.spring(translateX, { toValue: 420, useNativeDriver: true, tension: 100 }).start(() => {
          translateX.setValue(0);
          onAccept?.();
        });
      } else if (g.dx < -swipeThreshold) {
        Haptic.error();
        Animated.spring(translateX, { toValue: -420, useNativeDriver: true, tension: 100 }).start(() => {
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
    outputRange: [C.errorSubtle, '#F8FAFC', '#FFFFFF', '#F8FAFC', C.successSubtle],
    extrapolate: 'clamp',
  });

  const onPressIn = () => Animated.spring(pressScale, { toValue: Motion.cardScale, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const rejectOpacity = translateX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const acceptOpacity = translateX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={{ position: 'relative' }}>
      {/* Swipe background hints */}
      {showSwipeHint ? (
        <>
          <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { backgroundColor: '#FEE2E2', opacity: rejectOpacity }]}>
            <View style={styles.swipeIconCircle}>
              <MaterialIcons name="close" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.swipeBgText, { color: '#DC2626' }]}>Decline</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { backgroundColor: '#DCFCE7', opacity: acceptOpacity }]}>
            <Text style={[styles.swipeBgText, { color: '#059669' }]}>Accept</Text>
            <View style={[styles.swipeIconCircle, { backgroundColor: '#059669' }]}>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            </View>
          </Animated.View>
        </>
      ) : null}

      <Animated.View
        style={[
          styles.card,
          S.sm,
          isTablet && styles.cardTablet,
          { backgroundColor: showSwipeHint ? bgColor : '#FFFFFF', borderColor: '#E2E8F0' },
          { transform: [{ translateX }, { scale: pressScale }] },
        ]}
        {...(showSwipeHint ? panResponder.panHandlers : {})}
      >
        <Pressable
          style={styles.inner}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={`${isIncoming ? 'Incoming' : 'Outgoing'} request from ${personName}, Rs ${request.price}, ${sc.label}`}
          accessibilityHint={showSwipeHint ? 'Swipe right to accept, left to decline' : undefined}
        >
          {/* Card Top: Title / Route + Type Pill + Price & Vehicle Icon */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {isIncoming ? `${personName}'s Request` : 'Delivery Request'}
              </Text>
              <View style={styles.typePill}>
                <MaterialIcons name="inventory-2" size={11} color="#475569" />
                <Text style={styles.typePillText}>Parcel</Text>
              </View>
            </View>

            <View style={styles.headerRightRow}>
              <Text style={styles.priceTag}>₹{request.price}</Text>
              <View style={styles.vehicleIconPill}>
                <MaterialIcons name="local-shipping" size={15} color="#475569" />
              </View>
            </View>
          </View>

          {/* Route line: Pickup ┄┄ Drop point + Optional Message Tooltip */}
          <View style={styles.routeSection}>
            <View style={styles.routeIndicatorRow}>
              <View style={styles.pickupDot} />
              <Text style={styles.routeLabel}>Pickup</Text>
              <View style={styles.dottedLine} />
              <View style={styles.dropDot} />
              <Text style={styles.routeLabel}>Drop point</Text>
            </View>

            {request.message ? (
              <View style={styles.messageTooltip}>
                <Text style={styles.tooltipLabel}>Message</Text>
                <Text style={styles.tooltipText} numberOfLines={1}>{request.message}</Text>
              </View>
            ) : null}
          </View>

          {/* Metadata Chips Row: Date, Escrow Protected, Status Pill */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color="#64748B" />
              <Text style={styles.metaChipText}>{formattedDate}</Text>
            </View>

            <View style={[styles.metaChip, styles.escrowChip]}>
              <MaterialIcons name="security" size={11} color="#059669" />
              <Text style={styles.escrowChipText}>Escrow Protected</Text>
            </View>

            <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
              <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          {/* Clean Divider */}
          <View style={styles.divider} />

          {/* User Info & Actions Bar (Matching reference image) */}
          <View style={styles.userFooterRow}>
            {/* User on Left */}
            <View style={styles.userBlock}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{personName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.avatarVerifiedBadge}>
                  <MaterialIcons name="check" size={8} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.userMeta}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName} numberOfLines={1}>{personName}</Text>
                  <MaterialIcons name="verified" size={13} color="#0284C7" />
                </View>
                <Text style={styles.userSubText}>
                  4.8 ★ · {isIncoming ? 'Sender' : 'Traveler'}
                </Text>
              </View>
            </View>

            {/* Actions on Right */}
            <View style={styles.actionsRight}>
              {/* Chat Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.squareActionBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => { Haptic.tap(); onChat?.(); }}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityLabel="Chat"
              >
                <Ionicons name="chatbubble-outline" size={17} color="#334155" />
              </Pressable>

              {/* Status Action Buttons */}
              {isIncoming && request.status === 'pending' ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.squareActionBtn,
                      styles.declineSquareBtn,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onReject?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessibilityLabel="Decline"
                  >
                    <Ionicons name="close" size={17} color="#DC2626" />
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionPill,
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onAccept?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Accept</Text>
                  </Pressable>
                </>
              ) : null}

              {!isIncoming && request.status === 'pending' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelPill,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onCancel?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                >
                  <Text style={styles.cancelPillText}>Cancel</Text>
                </Pressable>
              ) : null}

              {request.status === 'accepted' ? (
                <>
                  {!isIncoming ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.payPill,
                        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => { Haptic.tap(); onPayment?.(); }}
                      hitSlop={TouchTarget.smallHitSlop}
                    >
                      <Text style={styles.payPillText}>Pay</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionPill,
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onDelivery?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                  >
                    <MaterialIcons name="local-shipping" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Track</Text>
                  </Pressable>
                </>
              ) : null}

              {request.status === 'completed' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.receiptPill,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onPayment?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                >
                  <Text style={styles.receiptPillText}>Receipt</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  swipeBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 22,
    zIndex: 0,
  },
  swipeBgLeft: { left: 0, paddingLeft: 24, justifyContent: 'flex-start' },
  swipeBgRight: { right: 0, paddingRight: 24, justifyContent: 'flex-end' },
  swipeBgText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  swipeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Card Container (Clean, NO top border line)
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTablet: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  inner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },

  // Card Header: Title + Type Pill on left, Price + Vehicle Icon on right
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    color: '#0F172A',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: '#475569',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceTag: {
    fontSize: 17,
    fontWeight: FontWeight.bold,
    color: '#059669',
    letterSpacing: -0.3,
  },
  vehicleIconPill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Route Section: Pickup ┄┄ Drop point + Message Tooltip
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  routeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: '#475569',
  },
  dottedLine: {
    width: 28,
    height: 1,
    borderWidth: 0.8,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
  },
  messageTooltip: {
    maxWidth: 150,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 1,
  },
  tooltipLabel: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tooltipText: {
    fontSize: 10,
    color: '#334155',
  },

  // Metadata Chips Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.medium,
    color: '#64748B',
  },
  escrowChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  escrowChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.semibold,
    color: '#059669',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
  },

  // Card Divider
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 1,
  },

  // User Footer Row: Avatar + Name on left, Square action buttons on right
  userFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    color: '#064E3B',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userMeta: {
    gap: 1,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  userSubText: {
    fontSize: 10.5,
    fontWeight: FontWeight.medium,
    color: '#64748B',
  },

  // Right Actions
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squareActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineSquareBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  primaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  cancelPill: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  payPill: {
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#B45309',
  },
  receiptPill: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#059669',
  },
});
