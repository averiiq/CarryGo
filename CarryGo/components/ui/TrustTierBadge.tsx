import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TrustTierConfig {
  tier: TrustTier;
  label: string;
  badgeLabel: string;
  minDeliveries: number;
  minRating: number;
  color: string;
  bgLight: string;
  bgDark: string;
  borderColor: string;
  icon: string;
  perks: string[];
}

export const TRUST_TIER_CONFIGS: Record<TrustTier, TrustTierConfig> = {
  bronze: {
    tier: 'bronze',
    label: 'Bronze Member',
    badgeLabel: 'Starter',
    minDeliveries: 0,
    minRating: 0,
    color: '#B45309',
    bgLight: '#FEF3C7',
    bgDark: '#451A03',
    borderColor: '#FDE68A',
    icon: 'shield',
    perks: ['Standard delivery limits', 'Community chat support', 'Secure OTP handovers'],
  },
  silver: {
    tier: 'silver',
    label: 'Silver Courier',
    badgeLabel: 'Verified',
    minDeliveries: 3,
    minRating: 4.0,
    color: '#0284C7',
    bgLight: '#E0F2FE',
    bgDark: '#082F49',
    borderColor: '#BAE6FD',
    icon: 'verified',
    perks: ['Higher luggage limits (up to 20kg)', 'Instant booking priority', 'Verified courier badge'],
  },
  gold: {
    tier: 'gold',
    label: 'Gold Super Traveler',
    badgeLabel: 'Top Rated',
    minDeliveries: 10,
    minRating: 4.5,
    color: '#D97706',
    bgLight: '#FFFBEB',
    bgDark: '#78350F',
    borderColor: '#FCD34D',
    icon: 'star',
    perks: ['Express matching priority', 'Reduced platform fee (20% off)', 'Dedicated CaryGoo support line'],
  },
  platinum: {
    tier: 'platinum',
    label: 'Platinum Ambassador',
    badgeLabel: 'Elite',
    minDeliveries: 25,
    minRating: 4.8,
    color: '#059669',
    bgLight: '#D1FAE5',
    bgDark: '#064E3B',
    borderColor: '#6EE7B7',
    icon: 'workspace-premium',
    perks: ['Zero platform commission', 'Maximum capacity clearance', 'Early access to corridor bookings'],
  },
};

export function computeTrustTier(params: {
  completedDeliveries?: number;
  rating?: number;
  isKycVerified?: boolean;
}): TrustTier {
  const deliveries = params.completedDeliveries ?? 0;
  const rating = params.rating ?? 0;
  const kyc = Boolean(params.isKycVerified);

  if (deliveries >= 25 && rating >= 4.7 && kyc) return 'platinum';
  if (deliveries >= 10 && rating >= 4.4 && kyc) return 'gold';
  if (deliveries >= 3 || kyc) return 'silver';
  return 'bronze';
}

interface TrustTierBadgeProps {
  tier?: TrustTier;
  completedDeliveries?: number;
  rating?: number;
  isKycVerified?: boolean;
  variant?: 'pill' | 'compact' | 'card';
  onPress?: () => void;
}

export function TrustTierBadge({
  tier: propTier,
  completedDeliveries = 0,
  rating = 0,
  isKycVerified = false,
  variant = 'pill',
  onPress,
}: TrustTierBadgeProps) {
  const { isDark, C } = useThemeColors();
  const activeTier = propTier || computeTrustTier({ completedDeliveries, rating, isKycVerified });
  const config = TRUST_TIER_CONFIGS[activeTier];
  const bg = isDark ? config.bgDark : config.bgLight;

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactPill,
          { backgroundColor: bg, borderColor: config.borderColor },
        ]}
      >
        <MaterialIcons name={config.icon as any} size={12} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]}>
          {config.badgeLabel}
        </Text>
      </View>
    );
  }

  if (variant === 'card') {
    const nextTier: TrustTier | null =
      activeTier === 'bronze' ? 'silver' : activeTier === 'silver' ? 'gold' : activeTier === 'gold' ? 'platinum' : null;
    const nextConfig = nextTier ? TRUST_TIER_CONFIGS[nextTier] : null;

    const currentDeliveries = completedDeliveries;
    const targetDeliveries = nextConfig ? nextConfig.minDeliveries : currentDeliveries;
    const progress = Math.min(1, Math.max(0, currentDeliveries / (targetDeliveries || 1)));

    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.tierCard,
          {
            backgroundColor: isDark ? C.card : '#FFFFFF',
            borderColor: config.borderColor,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: bg }]}>
              <MaterialIcons name={config.icon as any} size={22} color={config.color} />
            </View>
            <View>
              <Text style={[styles.cardTierLabel, { color: C.textPrimary }]}>{config.label}</Text>
              <Text style={[styles.cardSubText, { color: C.textSecondary }]}>
                {completedDeliveries} deliveries completed {rating > 0 ? `• ★ ${rating.toFixed(1)}` : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.badgePill, { backgroundColor: bg, borderColor: config.borderColor }]}>
            <Text style={[styles.badgePillText, { color: config.color }]}>{config.badgeLabel}</Text>
          </View>
        </View>

        {nextConfig && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressText, { color: C.textMuted }]}>
                Next: {nextConfig.label} ({targetDeliveries - currentDeliveries} trips to unlock)
              </Text>
              <Text style={[styles.progressPercent, { color: config.color }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? C.surfaceElevated : '#F1F5F9' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%`, backgroundColor: config.color },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.perksList}>
          {config.perks.map((perk, idx) => (
            <View key={idx} style={styles.perkItem}>
              <MaterialIcons name="check-circle" size={14} color={config.color} />
              <Text style={[styles.perkText, { color: C.textSecondary }]}>{perk}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    );
  }

  // Default 'pill'
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.pillContainer,
        { backgroundColor: bg, borderColor: config.borderColor },
      ]}
    >
      <MaterialIcons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  tierCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTierLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cardSubText: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  progressSection: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: FontSize.xs,
  },
  progressPercent: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  perksList: {
    gap: 6,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    fontSize: FontSize.xs,
  },
});
