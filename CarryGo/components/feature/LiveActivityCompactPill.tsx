import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { Request } from '@/types';

export interface LiveActivityCompactPillProps {
  request?: Request | null;
  isTraveller?: boolean;
  onTrack: (requestId: string) => void;
  onViewRequests?: () => void;
}

export function getLiveActivityPillDetails(request?: Request | null, isTraveller = false) {
  if (!request) return null;
  const isAccepted = request.status === 'accepted';
  const badgeColor = isAccepted ? '#10B981' : '#F59E0B';
  const badgeBg = isAccepted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const statusLabel = isAccepted
    ? 'In Transit'
    : isTraveller
      ? 'Action Required'
      : 'Pending';
  const actionLabel = isAccepted ? 'Track' : 'Review';

  return {
    isAccepted,
    badgeColor,
    badgeBg,
    statusLabel,
    actionLabel,
    routeText: `${request.fromCity || 'Origin'} ➔ ${request.toCity || 'Destination'}`,
  };
}

export const LiveActivityCompactPill = React.memo(function LiveActivityCompactPill({
  request,
  isTraveller,
  onTrack,
  onViewRequests,
}: LiveActivityCompactPillProps) {
  const { C } = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!request) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, request]);

  if (!request) return null;

  const isAccepted = request.status === 'accepted';
  const badgeColor = isAccepted ? '#10B981' : '#F59E0B';
  const badgeBg = isAccepted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const statusLabel = isAccepted
    ? 'In Transit'
    : isTraveller
      ? 'Action Required'
      : 'Pending';

  const actionLabel = isAccepted ? 'Track' : 'Review';

  return (
    <Pressable
      onPress={() => {
        Haptic.tap();
        if (isAccepted) {
          onTrack(request.id);
        } else {
          onViewRequests?.();
        }
      }}
      hitSlop={TouchTarget.smallHitSlop}
      accessibilityRole="button"
      accessibilityLabel={`Live delivery from ${request.fromCity} to ${request.toCity}, status: ${statusLabel}`}
      style={({ pressed }) => [
        styles.pillContainer,
        { backgroundColor: C.surface, borderColor: badgeColor + '55' },
        pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
      ]}
    >
      {/* Left: Glowing pulse dot + status tag */}
      <View style={[styles.badgeWrap, { backgroundColor: badgeBg }]}>
        <Animated.View style={[styles.pulseDot, { backgroundColor: badgeColor, opacity: pulseAnim }]} />
        <Text style={[styles.badgeText, { color: badgeColor }]}>LIVE</Text>
      </View>

      {/* Middle: Route & status narrative */}
      <View style={styles.centerWrap}>
        <Text style={[styles.routeText, { color: C.textPrimary }]} numberOfLines={1}>
          {request.fromCity || 'Origin'} ➔ {request.toCity || 'Destination'}
        </Text>
        <Text style={[styles.statusSubText, { color: C.textMuted }]} numberOfLines={1}>
          • {statusLabel}
        </Text>
      </View>

      {/* Right: Sleek track action pill */}
      <View style={[styles.actionBtn, { backgroundColor: isAccepted ? C.primary : C.surfaceElevated }]}>
        <Text style={[styles.actionBtnText, { color: isAccepted ? '#FFFFFF' : C.textPrimary }]}>
          {actionLabel}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={16}
          color={isAccepted ? '#FFFFFF' : C.textPrimary}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    marginHorizontal: Spacing.md,
    marginTop: 4,
    marginBottom: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  centerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 4,
  },
  routeText: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.bold,
    maxWidth: '65%',
  },
  statusSubText: {
    fontSize: FontSize.xs - 0.5,
    fontWeight: FontWeight.medium,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  actionBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
