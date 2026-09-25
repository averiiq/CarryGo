import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

interface LiveActivityBannerProps {
  request: Request;
  isTraveller: boolean;
  onTrack: (requestId: string) => void;
  onViewRequests?: () => void;
}

export const LiveActivityBanner = React.memo(function LiveActivityBanner({
  request,
  isTraveller,
  onTrack,
  onViewRequests,
}: LiveActivityBannerProps) {
  const { C, S } = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const isAccepted = request.status === 'accepted';

  const badgeColor = isAccepted ? C.success : C.warning;
  const badgeBg = isAccepted ? C.successSubtle : C.warningSubtle;
  const badgeLabel = isAccepted
    ? 'LIVE DELIVERY'
    : isTraveller
      ? 'ACTION REQUIRED'
      : 'REQUEST PENDING';

  const subtitle = isAccepted
    ? isTraveller
      ? 'You are carrying this parcel • Pickup/Drop OTP ready'
      : 'Traveler assigned • Track live journey & coordinates'
    : isTraveller
      ? 'Sender sent a delivery request • Tap to review'
      : 'Waiting for traveler confirmation';

  const actionLabel = isAccepted ? 'Track Live' : 'Review';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        S.md,
        { backgroundColor: C.surface, borderColor: badgeColor + '55' },
        pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() => {
        Haptic.tap();
        if (isAccepted) {
          onTrack(request.id);
        } else {
          onViewRequests?.();
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`${badgeLabel}: ${request.fromCity || 'Origin'} to ${request.toCity || 'Destination'}`}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={[styles.badgeWrap, { backgroundColor: badgeBg, borderColor: badgeColor + '33' }]}>
          <Animated.View style={[styles.pulseDot, { backgroundColor: badgeColor, opacity: pulseAnim }]} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>

        {request.price ? (
          <View style={[styles.pricePill, { backgroundColor: C.surfaceElevated }]}>
            <Text style={[styles.priceText, { color: C.textPrimary }]}>₹{request.price}</Text>
          </View>
        ) : null}
      </View>

      {/* Corridor & Narrative */}
      <View style={styles.middleRow}>
        <View style={styles.routeCol}>
          <View style={styles.cityRow}>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {request.fromCity || 'Origin'}
            </Text>
            <View style={styles.arrowWrap}>
              <MaterialIcons name="arrow-forward" size={15} color={C.primary} />
            </View>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {request.toCity || 'Destination'}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: C.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* CTA Button */}
        <View style={[styles.ctaBtn, { backgroundColor: isAccepted ? C.primary : C.surfaceElevated, borderColor: isAccepted ? C.primary : C.surfaceBorder }]}>
          <Text style={[styles.ctaText, { color: isAccepted ? '#FFFFFF' : C.textPrimary }]}>
            {actionLabel}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={isAccepted ? '#FFFFFF' : C.textPrimary}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  routeCol: {
    flex: 1,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cityName: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    maxWidth: '42%',
  },
  arrowWrap: {
    paddingHorizontal: 2,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.bold,
    marginRight: 2,
  },
});
