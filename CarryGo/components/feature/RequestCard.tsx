import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Request, RequestStatus } from '@/types';
import { FontSize, FontWeight, BorderRadius, ThemeColors, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';

export interface RequestCardProps {
  request: Request;
  type: 'incoming' | 'outgoing';
  currentUserId?: string;
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onChat?: () => void;
  onDelivery?: () => void;
  onPayment?: () => void;
  onReview?: (req: Request) => void;
}

export const STATUS_CONFIG = (C: ThemeColors): Record<string, { color: string; bg: string; border: string; label: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  pending: { color: C.pending, bg: C.warningSubtle, border: C.warningBorder, label: 'Pending Response', icon: 'time-outline' },
  accepted: { color: C.accepted, bg: C.successSubtle, border: C.successBorder, label: 'Matched', icon: 'checkmark-circle' },
  rejected: { color: C.rejected, bg: C.errorSubtle, border: C.errorBorder, label: 'Declined', icon: 'close-circle' },
  cancelled: { color: C.textMuted, bg: C.surfaceElevated, border: C.surfaceBorder, label: 'Cancelled', icon: 'ban' },
  completed: { color: C.delivered, bg: C.successSubtle, border: C.successBorder, label: 'Completed', icon: 'trophy' },
  failed: { color: C.error, bg: C.errorSubtle, border: C.errorBorder, label: 'Failed', icon: 'alert-circle' },
});

export function getRouteLocations(req: Request) {
  let pickup = req.fromCity?.trim() || '';
  let drop = req.toCity?.trim() || '';

  if ((!pickup || !drop) && req.message) {
    const match = req.message.match(/from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\.|\s+by|\s+with|\s+it|,|$)/i);
    if (match) {
      if (!pickup && match[1]) pickup = match[1].trim();
      if (!drop && match[2]) drop = match[2].trim();
    }
  }

  return {
    pickup: pickup || 'Pickup Point',
    drop: drop || 'Drop-off Point',
    hasExactRoute: Boolean(pickup && drop),
  };
}

export function getContextBanner(
  request: Request,
  isSender: boolean,
  isTraveller: boolean,
  isRequester: boolean,
  otherName: string,
  C: ThemeColors,
) {
  if (request.status === 'pending') {
    if (!isRequester) {
      if (isTraveller) {
        return {
          title: 'Action Needed: Delivery Request Received',
          message: `${otherName} wants you to carry their parcel. Review route compatibility and tap Accept (or tap Chat to ask questions).`,
          bg: C.primarySubtle,
          border: C.primaryBorder,
          iconBg: C.primary,
          iconColor: '#FFFFFF',
          titleColor: C.primaryDark,
          textColor: C.textPrimary,
          icon: 'flash-outline' as const,
        };
      } else {
        return {
          title: 'Action Needed: Carry Offer Received',
          message: `${otherName} offered to deliver your parcel for ₹${request.price}! Chat to coordinate or accept to proceed to escrow.`,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          iconBg: '#059669',
          iconColor: '#FFFFFF',
          titleColor: '#065F46',
          textColor: '#047857',
          icon: 'gift-outline' as const,
        };
      }
    } else {
      if (isSender) {
        return {
          title: 'Waiting for Traveler Response',
          message: `Your booking request was sent to ${otherName}. Chat anytime to coordinate package details before acceptance.`,
          bg: C.surfaceElevated,
          border: C.surfaceBorder,
          iconBg: C.surface,
          iconColor: C.textSecondary,
          titleColor: C.textPrimary,
          textColor: C.textSecondary,
          icon: 'time-outline' as const,
        };
      } else {
        return {
          title: 'Waiting for Sender Response',
          message: `Your offer to carry was sent to ${otherName}. Chat anytime to coordinate package details before acceptance.`,
          bg: C.surfaceElevated,
          border: C.surfaceBorder,
          iconBg: C.surface,
          iconColor: C.textSecondary,
          titleColor: C.textPrimary,
          textColor: C.textSecondary,
          icon: 'time-outline' as const,
        };
      }
    }
  }

  if (request.status === 'accepted') {
    if (isSender) {
      return {
        title: 'Step 2: Deposit Escrow Payment',
        message: `Traveler accepted! Deposit ₹${request.price} in secure escrow to generate your pickup & handover OTP.`,
        bg: '#FEF3C7',
        border: '#FDE68A',
        iconBg: '#D97706',
        iconColor: '#FFFFFF',
        titleColor: '#92400E',
        textColor: '#B45309',
        icon: 'lock-closed-outline' as const,
      };
    } else {
      return {
        title: 'Step 2: Waiting for Sender Escrow',
        message: `Delivery accepted! Coordinate pickup in chat. Handover OTP will unlock once the sender deposits escrow.`,
        bg: '#EFF6FF',
        border: '#BFDBFE',
        iconBg: '#2563EB',
        iconColor: '#FFFFFF',
        titleColor: '#1E40AF',
        textColor: '#1D4ED8',
        icon: 'chatbubble-ellipses-outline' as const,
      };
    }
  }

  if (request.status === 'completed') {
    return {
      title: 'Delivery Complete & Escrow Released',
      message: `Parcel safely delivered and verified via OTP. Thank you for building trusted community logistics!`,
      bg: '#ECFDF5',
      border: '#A7F3D0',
      iconBg: '#059669',
      iconColor: '#FFFFFF',
      titleColor: '#065F46',
      textColor: '#047857',
      icon: 'checkmark-circle-outline' as const,
    };
  }

  if (request.status === 'rejected') {
    return {
      title: 'Request Declined',
      message: 'This delivery request was declined. No fees were charged to either party.',
      bg: C.errorSubtle,
      border: C.errorBorder,
      iconBg: C.error,
      iconColor: '#FFFFFF',
      titleColor: C.error,
      textColor: C.textSecondary,
      icon: 'close-circle-outline' as const,
    };
  }

  if (request.status === 'cancelled') {
    return {
      title: 'Request Cancelled',
      message: 'This request was cancelled by the requester. No fees were charged.',
      bg: C.surfaceElevated,
      border: C.surfaceBorder,
      iconBg: C.surface,
      iconColor: C.textMuted,
      titleColor: C.textPrimary,
      textColor: C.textMuted,
      icon: 'ban-outline' as const,
    };
  }

  return null;
}

export function getRequestCardViewModel({
  request,
  type,
  currentUserId,
  C,
}: {
  request: Request;
  type: 'incoming' | 'outgoing';
  currentUserId?: string;
  C: ThemeColors;
}) {
  const isIncoming = type === 'incoming';

  // Strict user role checks
  const isSender = currentUserId ? currentUserId === request.senderId : !isIncoming;
  const isTraveller = currentUserId ? currentUserId === request.travellerId : isIncoming;
  const isRequester = currentUserId
    ? (request.createdBy ? currentUserId === request.createdBy : currentUserId === request.senderId)
    : !isIncoming;

  const isOffer = request.createdBy ? request.createdBy === request.travellerId : false;

  const personName = currentUserId
    ? (isSender ? request.travellerName : request.senderName)
    : (request.createdBy
        ? (isIncoming
            ? (request.createdBy === request.senderId ? request.senderName : request.travellerName)
            : (request.createdBy === request.senderId ? request.travellerName : request.senderName))
        : (isIncoming ? request.senderName : request.travellerName));

  const roleLabel = currentUserId
    ? (isSender ? 'Traveler' : 'Sender')
    : (request.createdBy
        ? (isIncoming
            ? (request.createdBy === request.senderId ? 'Sender' : 'Traveler')
            : (request.createdBy === request.senderId ? 'Traveler' : 'Sender'))
        : (isIncoming ? 'Sender' : 'Traveler'));

  const showSwipeHint = !isRequester && request.status === 'pending';
  const { pickup, drop, hasExactRoute } = getRouteLocations(request);

  // Dynamic Card Title based on context
  let cardTitle = 'Delivery Request';
  if (isSender) {
    cardTitle = isOffer ? `Carry Offer from ${personName}` : `Booking with ${personName}`;
  } else if (isTraveller) {
    cardTitle = isOffer ? `Carry Offer to ${personName}` : `Delivery Request from ${personName}`;
  }

  const roleBadgeText = isSender ? 'YOU ARE SENDER' : 'YOU ARE TRAVELER';
  const roleSubText = isSender ? 'Parcel Owner' : 'Route Carrier';

  const showAcceptDecline = !isRequester && request.status === 'pending';
  const showCancel = isRequester && request.status === 'pending';
  const showPayButton = isSender && request.status === 'accepted';
  const showDeliveryButton = request.status === 'accepted';
  const showReceiptReview = request.status === 'completed';

  const contextBanner = getContextBanner(request, isSender, isTraveller, isRequester, personName, C);

  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';
  const isNegative = request.status === 'rejected' || request.status === 'cancelled' || request.status === 'failed';

  const step1 = {
    done: isAccepted || isCompleted,
    current: isPending,
    stopped: isNegative,
    label: isNegative ? (request.status === 'cancelled' ? 'Cancelled' : 'Declined') : (isAccepted || isCompleted ? 'Matched' : 'Matching'),
    icon: (isNegative
      ? (request.status === 'cancelled' ? 'ban-outline' : 'close-circle-outline')
      : (isAccepted || isCompleted ? 'checkmark-circle' : 'time-outline')) as keyof typeof Ionicons.glyphMap,
  };

  const step2 = {
    done: isCompleted,
    active: isAccepted,
    label: isCompleted
      ? 'Escrow Safe'
      : (isAccepted ? (isSender ? 'Escrow Due' : 'Escrow Pending') : 'Escrow'),
    icon: (isCompleted
      ? 'shield-checkmark'
      : (isAccepted ? (isSender ? 'lock-closed' : 'shield-outline') : 'lock-closed-outline')) as keyof typeof Ionicons.glyphMap,
  };

  const step3 = {
    done: isCompleted,
    active: isAccepted,
    label: isCompleted ? 'Delivered' : (isAccepted ? 'Handover' : 'Delivery'),
    icon: (isCompleted ? 'trophy' : 'cube-outline') as keyof typeof Ionicons.glyphMap,
  };

  return {
    isSender,
    isTraveller,
    isRequester,
    isOffer,
    personName,
    roleLabel,
    pickup,
    drop,
    hasExactRoute,
    cardTitle,
    roleBadgeText,
    roleSubText,
    showSwipeHint,
    showAcceptDecline,
    showCancel,
    showPayButton,
    showDeliveryButton,
    showReceiptReview,
    contextBanner,
    formattedDate,
    stepper: { step1, step2, step3 },
  };
}



export const RequestCard = React.memo(function RequestCard({
  request,
  type,
  currentUserId,
  onPress,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onDelivery,
  onPayment,
  onReview,
}: RequestCardProps) {
  const { C, S } = useThemeColors();
  const { isTablet, swipeThreshold } = useResponsive();
  const translateX = useRef(new Animated.Value(0)).current;

  const sc = STATUS_CONFIG(C)[request.status] || STATUS_CONFIG(C).pending;

  const vm = getRequestCardViewModel({
    request,
    type,
    currentUserId,
    C,
  });

  // Calibrated swipe gesture with directional lock
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      vm.showSwipeHint && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > swipeThreshold) {
        Haptic.success();
        Animated.spring(translateX, { toValue: 460, useNativeDriver: true, tension: 220, friction: 14 }).start(() => {
          translateX.setValue(0);
          onAccept?.();
        });
      } else if (g.dx < -swipeThreshold) {
        Haptic.error();
        Animated.spring(translateX, { toValue: -460, useNativeDriver: true, tension: 220, friction: 14 }).start(() => {
          translateX.setValue(0);
          onReject?.();
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 240, friction: 14 }).start();
      }
    },
  })).current;

  const bgColor = translateX.interpolate({
    inputRange: [-200, -80, 0, 80, 200],
    outputRange: [C.errorSubtle, '#F8FAFC', '#FFFFFF', '#F8FAFC', C.successSubtle],
    extrapolate: 'clamp',
  });

  const rejectOpacity = translateX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const acceptOpacity = translateX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  const requestAccessibilityLabel = [
    vm.isSender ? `You are sender. Counterpart: ${vm.personName}` : `You are traveler. Counterpart: ${vm.personName}`,
    `role: ${vm.roleLabel}`,
    `route from ${vm.pickup} to ${vm.drop}`,
    request.parcelCategory ? `category: ${request.parcelCategory}` : '',
    request.parcelWeight ? `weight: ${request.parcelWeight} kg` : '',
    `amount: ₹${request.price}`,
    `status: ${sc.label}`,
    request.message ? `note: ${request.message}` : '',
    vm.formattedDate ? `created ${vm.formattedDate}` : '',
  ].filter(Boolean).join(', ');

  return (
    <View style={{ position: 'relative' }}>
      {/* Swipe background hints */}
      {vm.showSwipeHint ? (
        <>
          <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { backgroundColor: '#FEE2E2', opacity: rejectOpacity }]}>
            <View style={styles.swipeIconCircle}>
              <MaterialIcons name="close" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.swipeBgText, { color: '#DC2626' }]}>Decline</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { backgroundColor: '#ECFDF5', opacity: acceptOpacity }]}>
            <Text style={[styles.swipeBgText, { color: C.primary, fontWeight: 'bold' }]}>Accept</Text>
            <View style={[styles.swipeIconCircle, { backgroundColor: C.primary }]}>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            </View>
          </Animated.View>
        </>
      ) : null}

      <Animated.View
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={requestAccessibilityLabel}
        style={[
          styles.card,
          S.card,
          isTablet && styles.cardTablet,
          { backgroundColor: vm.showSwipeHint ? bgColor : C.card, borderColor: C.cardBorder },
          { transform: [{ translateX }] },
        ]}
        {...(vm.showSwipeHint ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={onPress}
          style={styles.inner}
          android_ripple={{ color: C.primarySubtle }}
        >
          {/* Top Row: User Avatar, Name & Price Pill */}
          <View style={styles.topRow}>
            <View style={styles.userBlock}>
              <View style={[styles.avatar, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                <Text style={[styles.avatarText, { color: C.primary }]}>
                  {vm.personName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userMeta}>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>
                    {vm.personName}
                  </Text>
                  <MaterialIcons name="verified" size={13} color={C.primary} />
                </View>
                <Text style={[styles.userSubText, { color: C.textMuted }]}>
                  {vm.roleLabel} • {vm.formattedDate}
                </Text>
              </View>
            </View>

            {/* Price Tag Pill */}
            <View style={[styles.priceCapsule, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Text style={[styles.priceTag, { color: C.textPrimary }]}>₹{request.price}</Text>
              <Text style={[styles.priceSub, { color: C.primary }]}>
                {request.status === 'completed'
                  ? (vm.isTraveller ? 'Earned' : 'Paid')
                  : (vm.isTraveller ? 'You Earn' : 'Escrow')}
              </Text>
            </View>
          </View>

          {/* Route Section: Clean, Minimal, Non-Boxed */}
          <View style={styles.routeRow}>
            <View style={styles.cityCol}>
              <View style={[styles.cityDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
                {vm.pickup}
              </Text>
            </View>

            <View style={styles.routeArrowCol}>
              <View style={[styles.routeDash, { backgroundColor: C.surfaceBorder }]} />
              <MaterialIcons name="east" size={14} color={C.primary} />
              <View style={[styles.routeDash, { backgroundColor: C.surfaceBorder }]} />
            </View>

            <View style={[styles.cityCol, { alignItems: 'flex-end' }]}>
              <View style={[styles.cityDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
                {vm.drop}
              </Text>
            </View>
          </View>

          {/* Clean Specs & Status */}
          <View style={styles.specChipsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="inventory-2" size={13} color={C.textMuted} />
              <Text style={[styles.specChipText, { color: C.textSecondary }]}>
                {request.parcelCategory || 'Parcel'}
                {request.parcelWeight ? ` • ${request.parcelWeight} kg` : ''}
              </Text>
            </View>

            <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Ionicons name={sc.icon} size={11} color={sc.color} style={{ marginRight: 3 }} />
              <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          {/* Optional Message */}
          {request.message ? (
            <View style={styles.messageRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={C.textMuted} style={{ marginTop: 1 }} />
              <Text style={[styles.messageText, { color: C.textMuted }]} numberOfLines={1}>
                "{request.message}"
              </Text>
            </View>
          ) : null}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {/* View Details Prompt */}
            <Pressable
              onPress={onPress}
              hitSlop={TouchTarget.smallHitSlop}
              style={styles.detailsBtn}
            >
              <Text style={[styles.detailsBtnText, { color: C.textMuted }]}>Details</Text>
              <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
            </Pressable>

            {/* Contextual Action Buttons */}
            <View style={styles.actionsRightGroup}>
              {/* Direct Chat Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.chatBtn,
                  request.status === 'pending'
                    ? { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }
                    : { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => { Haptic.tap(); onChat?.(); }}
                hitSlop={TouchTarget.smallHitSlop}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${vm.personName}${request.status === 'pending' ? ' before accepting' : ''}`}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={15}
                  color={request.status === 'pending' ? C.primary : C.textSecondary}
                />
              </Pressable>

              {vm.showAcceptDecline ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.declineBtn,
                      { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                    onPress={() => { Haptic.warning(); onReject?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Decline Request"
                  >
                    <Ionicons name="close" size={14} color={C.error} />
                    <Text style={[styles.declineText, { color: C.error }]}>Decline</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.acceptBtn,
                      { backgroundColor: C.primary },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.success(); onAccept?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Accept Request"
                  >
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    <Text style={[styles.acceptText, { color: '#FFFFFF', fontWeight: '700' }]}>
                      {vm.isTraveller ? `Accept & Earn ₹${request.price}` : `Accept (₹${request.price})`}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {vm.showCancel ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onCancel?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel Request"
                >
                  <Text style={[styles.cancelText, { color: C.error }]}>Cancel</Text>
                </Pressable>
              ) : null}

              {vm.showPayButton ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.payBtn,
                    { backgroundColor: '#D97706' },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onPayment?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Pay Escrow"
                >
                  <MaterialIcons name="lock" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.payBtnText}>Pay Escrow (₹{request.price})</Text>
                </Pressable>
              ) : null}

              {!vm.showPayButton && vm.showDeliveryButton ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.trackBtn,
                    { backgroundColor: C.primary },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onDelivery?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={vm.isTraveller ? "Process Delivery" : "Track Delivery"}
                >
                  <MaterialIcons
                    name={vm.isTraveller ? "fact-check" : "radar"}
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.trackBtnText}>
                    {vm.isTraveller ? "Process Handover" : "Track Delivery"}
                  </Text>
                </Pressable>
              ) : null}

              {vm.showReceiptReview ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.receiptBtn,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onPayment?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                  >
                    <Text style={[styles.receiptBtnText, { color: C.textPrimary }]}>Receipt</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.reviewBtn,
                      { backgroundColor: '#F59E0B' },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      if (onReview) onReview(request);
                      else onDelivery?.();
                    }}
                    hitSlop={TouchTarget.smallHitSlop}
                  >
                    <MaterialIcons name="star" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.reviewBtnText}>Rate</Text>
                  </Pressable>
                </>
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
    borderRadius: 20,
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

  // Card Container
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTablet: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  // Context Banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  bannerIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    flex: 1,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  userMeta: {
    gap: 1.5,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  userSubText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },

  // Price Capsule
  priceCapsule: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  priceTag: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  priceSub: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },

  // Route Section: Non-Boxed, Airy
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityName: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  routeArrowCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  routeDash: {
    width: 14,
    height: 1,
  },

  // Spec Micro-Chips
  specChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  specChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.medium,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // Message Row
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },

  // Action Controls
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  detailsBtnText: {
    fontSize: 11.5,
    fontWeight: FontWeight.semibold,
  },
  actionsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  cancelBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  receiptBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtnText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
});

