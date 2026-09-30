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
          message: `${otherName} wants you to carry their parcel. Review route compatibility and tap Accept to coordinate handover.`,
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
          message: `${otherName} offered to deliver your parcel for ₹${request.price}! Accept to proceed to escrow payment.`,
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
          message: `Your booking request was sent to ${otherName}. We'll notify you as soon as they accept.`,
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
          message: `Your offer to carry was sent to ${otherName}. We'll notify you as soon as they accept.`,
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

interface StepperProps {
  status: RequestStatus;
  isSender: boolean;
  isTraveller: boolean;
  C: ThemeColors;
}

const RequestProgressStepper = React.memo(function RequestProgressStepper({
  status,
  isSender,
  isTraveller,
  C,
}: StepperProps) {
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isCompleted = status === 'completed';
  const isNegative = status === 'rejected' || status === 'cancelled' || status === 'failed';

  // Step 1: Matched
  const step1Done = isAccepted || isCompleted;
  const step1Current = isPending;
  const step1Color = isNegative ? C.error : (step1Done ? '#059669' : (step1Current ? C.primary : C.textMuted));
  const step1Bg = isNegative ? C.errorSubtle : (step1Done ? '#ECFDF5' : (step1Current ? C.primarySubtle : C.surfaceElevated));
  const step1Border = isNegative ? C.errorBorder : (step1Done ? '#A7F3D0' : (step1Current ? C.primaryBorder : C.surfaceBorder));
  const step1Icon: keyof typeof Ionicons.glyphMap = isNegative
    ? (status === 'cancelled' ? 'ban-outline' : 'close-circle-outline')
    : (step1Done ? 'checkmark-circle' : 'time-outline');
  const step1Label = isNegative ? (status === 'cancelled' ? 'Cancelled' : 'Declined') : (step1Done ? 'Matched' : 'Matching');

  // Step 2: Escrow Locked
  const step2Done = isCompleted;
  const step2Active = isAccepted;
  const step2Color = step2Done ? '#059669' : (step2Active ? (isSender ? '#D97706' : '#2563EB') : C.textMuted);
  const step2Bg = step2Done ? '#ECFDF5' : (step2Active ? (isSender ? '#FEF3C7' : '#EFF6FF') : C.surfaceElevated);
  const step2Border = step2Done ? '#A7F3D0' : (step2Active ? (isSender ? '#FDE68A' : '#BFDBFE') : C.surfaceBorder);
  const step2Icon: keyof typeof Ionicons.glyphMap = step2Done
    ? 'shield-checkmark'
    : (step2Active ? (isSender ? 'lock-closed' : 'shield-outline') : 'lock-closed-outline');
  const step2Label = step2Done
    ? 'Escrow Safe'
    : (step2Active ? (isSender ? 'Escrow Due' : 'Escrow Pending') : 'Escrow');

  // Step 3: Handover & Delivery
  const step3Done = isCompleted;
  const step3Color = step3Done ? '#059669' : (step2Active ? C.primary : C.textMuted);
  const step3Bg = step3Done ? '#ECFDF5' : C.surfaceElevated;
  const step3Border = step3Done ? '#A7F3D0' : C.surfaceBorder;
  const step3Icon: keyof typeof Ionicons.glyphMap = step3Done ? 'trophy' : 'cube-outline';
  const step3Label = step3Done ? 'Delivered' : (step2Active ? 'Handover' : 'Delivery');

  const line1Active = step1Done;
  const line2Active = step2Done;

  return (
    <View style={[styles.stepperContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
      {/* Step 1 */}
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, { backgroundColor: step1Bg, borderColor: step1Border }]}>
          <Ionicons name={step1Icon} size={13} color={step1Color} />
        </View>
        <Text style={[styles.stepLabel, { color: step1Color }]} numberOfLines={1}>{step1Label}</Text>
      </View>

      {/* Line 1 */}
      <View style={[styles.stepLine, { backgroundColor: line1Active ? '#10B981' : C.surfaceBorder }]} />

      {/* Step 2 */}
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, { backgroundColor: step2Bg, borderColor: step2Border }]}>
          <Ionicons name={step2Icon} size={13} color={step2Color} />
        </View>
        <Text style={[styles.stepLabel, { color: step2Color }]} numberOfLines={1}>{step2Label}</Text>
      </View>

      {/* Line 2 */}
      <View style={[styles.stepLine, { backgroundColor: line2Active ? '#10B981' : C.surfaceBorder }]} />

      {/* Step 3 */}
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, { backgroundColor: step3Bg, borderColor: step3Border }]}>
          <Ionicons name={step3Icon} size={13} color={step3Color} />
        </View>
        <Text style={[styles.stepLabel, { color: step3Color }]} numberOfLines={1}>{step3Label}</Text>
      </View>
    </View>
  );
});

export const RequestCard = React.memo(function RequestCard({
  request,
  type,
  currentUserId,
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
          <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { backgroundColor: '#DCFCE7', opacity: acceptOpacity }]}>
            <Text style={[styles.swipeBgText, { color: '#059669' }]}>Accept</Text>
            <View style={[styles.swipeIconCircle, { backgroundColor: '#059669' }]}>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            </View>
          </Animated.View>
        </>
      ) : null}

      <Animated.View
        accessible={true}
        accessibilityRole="summary"
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
        <View style={styles.inner}>
          {/* Top Role Clarity Header */}
          <View style={styles.roleIdentityHeader}>
            <View style={[
              styles.roleBadge,
              vm.isSender
                ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                : { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }
            ]}>
              <MaterialIcons
                name={vm.isSender ? "inventory-2" : "directions-car"}
                size={12}
                color={vm.isSender ? "#059669" : "#4F46E5"}
              />
              <Text style={[
                styles.roleBadgeText,
                { color: vm.isSender ? "#059669" : "#4F46E5" }
              ]}>
                {vm.roleBadgeText}
              </Text>
            </View>

            <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Ionicons name={sc.icon} size={11} color={sc.color} style={{ marginRight: 3 }} />
              <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          {/* Card Title & Price Row */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]} numberOfLines={1}>
                {vm.cardTitle}
              </Text>
              <View style={[styles.typePill, { backgroundColor: C.badgeBg, borderColor: C.badgeBorder }]}>
                <MaterialIcons name="inventory-2" size={11} color={C.textSecondary} />
                <Text style={[styles.typePillText, { color: C.textSecondary }]}>{request.parcelCategory || 'Parcel'}</Text>
              </View>
            </View>

            <View style={styles.headerRightRow}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.priceTag, { color: C.primary }]}>₹{request.price}</Text>
                <Text style={[styles.priceSub, { color: C.textMuted }]}>Escrow Total</Text>
              </View>
              <View style={[styles.vehicleIconPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="local-shipping" size={16} color={C.primary} />
              </View>
            </View>
          </View>

          {/* 3-Stage Visual Order Stepper */}
          <RequestProgressStepper
            status={request.status}
            isSender={vm.isSender}
            isTraveller={vm.isTraveller}
            C={C}
          />

          {/* Context Guidance Banner */}
          {vm.contextBanner ? (
            <View style={[styles.contextBanner, { backgroundColor: vm.contextBanner.bg, borderColor: vm.contextBanner.border }]}>
              <View style={[styles.contextIconWrap, { backgroundColor: vm.contextBanner.iconBg }]}>
                <Ionicons name={vm.contextBanner.icon} size={14} color={vm.contextBanner.iconColor} />
              </View>
              <View style={styles.contextContent}>
                <Text style={[styles.contextTitle, { color: vm.contextBanner.titleColor }]}>
                  {vm.contextBanner.title}
                </Text>
                <Text style={[styles.contextMessage, { color: vm.contextBanner.textColor }]}>
                  {vm.contextBanner.message}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Route Section: Explicit Pickup and Drop Locations */}
          <View style={[styles.routeContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.routeRow}>
              {/* Pickup location */}
              <View style={styles.locationCol}>
                <View style={styles.locBadgeRow}>
                  <View style={[styles.pickupDot, { backgroundColor: C.primary }]} />
                  <Text style={[styles.locTypeLabel, { color: C.textMuted }]}>PICKUP</Text>
                </View>
                <Text style={[styles.locCityText, { color: C.textPrimary }]} numberOfLines={1}>{vm.pickup}</Text>
              </View>

              {/* Route connecting arrow */}
              <View style={styles.routeConnector}>
                <View style={[styles.dottedLine, { borderColor: C.surfaceBorder }]} />
                <View style={[styles.arrowIconWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  <MaterialIcons name="east" size={13} color={C.primary} />
                </View>
                <View style={[styles.dottedLine, { borderColor: C.surfaceBorder }]} />
              </View>

              {/* Drop location */}
              <View style={[styles.locationCol, styles.locationColRight]}>
                <View style={[styles.locBadgeRow, { justifyContent: 'flex-end' }]}>
                  <Text style={[styles.locTypeLabel, { color: C.textMuted }]}>DROP</Text>
                  <MaterialIcons name="place" size={11} color={C.primary} style={{ marginLeft: 2 }} />
                </View>
                <Text style={[styles.locCityText, { color: C.textPrimary, textAlign: 'right' }]} numberOfLines={1}>{vm.drop}</Text>
              </View>
            </View>

            {/* Optional parcel specs or message row */}
            {(request.parcelWeight || request.parcelCategory || request.message) ? (
              <View style={[styles.detailsRow, { borderTopColor: C.surfaceBorderLight }]}>
                {request.parcelWeight ? (
                  <View style={[styles.specChip, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                    <MaterialIcons name="scale" size={11} color={C.textSecondary} />
                    <Text style={[styles.specChipText, { color: C.textSecondary }]}>{request.parcelWeight} kg</Text>
                  </View>
                ) : null}
                {request.message ? (
                  <View style={styles.messageTooltip}>
                    <MaterialIcons name="notes" size={11} color={C.textMuted} />
                    <Text style={[styles.tooltipText, { color: C.textSecondary }]} numberOfLines={1}>{request.message}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Clean Divider */}
          <View style={[styles.divider, { backgroundColor: C.surfaceBorderLight }]} />

          {/* User Info & Actions Bar */}
          <View style={styles.userFooterRow}>
            {/* User on Left */}
            <View style={styles.userBlock}>
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <Text style={[styles.avatarText, { color: C.primary }]}>{vm.personName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[styles.avatarVerifiedBadge, { backgroundColor: C.primary }]}>
                  <MaterialIcons name="check" size={8} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.userMeta}>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>{vm.personName}</Text>
                  <MaterialIcons name="verified" size={13} color={C.info} />
                </View>
                <Text style={[styles.userSubText, { color: C.textMuted }]}>
                  Verified {vm.roleLabel} • {vm.formattedDate}
                </Text>
              </View>
            </View>

            {/* Actions on Right */}
            <View style={styles.actionsRight}>
              {/* Chat Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.squareActionBtn,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => { Haptic.tap(); onChat?.(); }}
                hitSlop={TouchTarget.smallHitSlop}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${vm.personName}`}
              >
                <Ionicons name="chatbubble-outline" size={17} color={C.textSecondary} />
              </Pressable>

              {/* Status Action Buttons */}
              {vm.showAcceptDecline ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.declineActionPill,
                      { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                    onPress={() => {
                      Haptic.warning();
                      onReject?.();
                    }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Decline Request"
                  >
                    <Ionicons name="close" size={15} color={C.error} />
                    <Text style={[styles.declineActionText, { color: C.error }]}>Decline</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionPill,
                      { backgroundColor: C.primary },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      Haptic.success();
                      onAccept?.();
                    }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Accept Request"
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Accept</Text>
                  </Pressable>
                </>
              ) : null}

              {vm.showCancel ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelPill,
                    { backgroundColor: C.errorSubtle, borderColor: C.errorBorder },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => { Haptic.tap(); onCancel?.(); }}
                  hitSlop={TouchTarget.smallHitSlop}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel Request"
                >
                  <Text style={[styles.cancelPillText, { color: C.error }]}>Cancel</Text>
                </Pressable>
              ) : null}

              {vm.showPayButton || vm.showDeliveryButton ? (
                <>
                  {vm.showPayButton ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.payPill,
                        { backgroundColor: '#F59E0B' },
                        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => { Haptic.tap(); onPayment?.(); }}
                      hitSlop={TouchTarget.smallHitSlop}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Pay for delivery"
                    >
                      <MaterialIcons name="lock" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.payPillText}>Pay Escrow (₹{request.price})</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionPill,
                      { backgroundColor: vm.isSender ? C.surfaceElevated : C.primary, borderColor: vm.isSender ? C.surfaceBorder : 'transparent', borderWidth: vm.isSender ? 1 : 0 },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onDelivery?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={vm.isTraveller ? "Process Delivery" : "Track Parcel"}
                  >
                    <MaterialIcons
                      name={vm.isTraveller ? "fact-check" : "radar"}
                      size={15}
                      color={vm.isSender ? C.textPrimary : "#FFFFFF"}
                    />
                    <Text style={[styles.primaryActionText, vm.isSender && { color: C.textPrimary }]}>
                      {vm.isTraveller ? "Process Delivery" : "Track Parcel"}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {vm.showReceiptReview ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.receiptPill,
                      { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => { Haptic.tap(); onPayment?.(); }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Receipt"
                  >
                    <Text style={[styles.receiptPillText, { color: C.primary }]}>Receipt</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionPill,
                      { backgroundColor: '#F59E0B' },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      if (onReview) {
                        onReview(request);
                      } else {
                        onDelivery?.();
                      }
                    }}
                    hitSlop={TouchTarget.smallHitSlop}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Rate and Review"
                  >
                    <MaterialIcons name="star" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Rate & Review</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
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

  // Card Container
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
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },

  // Top Role Clarity Header
  roleIdentityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },

  // Stepper styles
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepLabel: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    borderRadius: 1,
  },

  // Context Guidance Banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  contextIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  contextContent: {
    flex: 1,
    gap: 2,
  },
  contextTitle: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.1,
  },
  contextMessage: {
    fontSize: 11,
    lineHeight: 15,
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
    fontSize: FontSize.md,
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
    fontSize: 16,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  priceSub: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  vehicleIconPill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Route Section: Explicit Pickup and Drop locations
  routeContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationCol: {
    flex: 1,
    gap: 3,
  },
  locationColRight: {
    alignItems: 'flex-end',
  },
  locBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locTypeLabel: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  locCityText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  arrowIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pickupDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dottedLine: {
    width: 14,
    height: 1,
    borderWidth: 0.8,
    borderStyle: 'dashed',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  specChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  messageTooltip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipText: {
    fontSize: 10.5,
    flex: 1,
  },

  // Status Chip
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
  },

  // Card Divider
  divider: {
    height: 1,
    marginVertical: 1,
  },

  // User Footer Row: Avatar + Name on left, Action buttons on right
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  userSubText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },

  // Right Actions
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squareActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
  },
  declineActionText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  primaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 11,
  },
  primaryActionText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  cancelPill: {
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  payPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 11,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  payPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  receiptPill: {
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptPillText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
});
