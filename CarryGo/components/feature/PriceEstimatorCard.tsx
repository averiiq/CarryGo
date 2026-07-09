import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { PriceEstimate } from '@/services/price-estimator.service';
import { formatCurrency } from '@/lib/price-utils';

interface PriceEstimatorCardProps {
  estimate: PriceEstimate | null;
  isLoading: boolean;
  onAcceptPrice?: (price: number) => void;
  compact?: boolean;
}

function ConfidenceBadge({ level, C }: { level: PriceEstimate['confidenceLevel']; C: any }) {
  const config = {
    high: { label: 'High confidence', color: C.success, bg: C.success + '18' },
    medium: { label: 'Medium confidence', color: C.warning, bg: C.warning + '18' },
    low: { label: 'Estimated', color: C.textMuted, bg: C.surfaceElevated },
  }[level];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function BreakdownRow({ label, value, icon, C }: { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap; C: any }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLeft}>
        <MaterialIcons name={icon} size={14} color={C.textMuted} />
        <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.breakdownValue, { color: C.textPrimary }]}>{value}</Text>
    </View>
  );
}

export function PriceEstimatorCard({ estimate, isLoading, onAcceptPrice, compact }: PriceEstimatorCardProps) {
  const { C } = useThemeColors();
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <ActivityIndicator size="small" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textMuted }]}>Estimating price...</Text>
      </View>
    );
  }

  if (!estimate) return null;

  return (
    <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="auto-awesome" size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Suggested Price</Text>
          <ConfidenceBadge level={estimate.confidenceLevel} C={C} />
        </View>
        {estimate.demandLevel === 'high' && (
          <View style={[styles.demandBadge, { backgroundColor: C.error + '15' }]}>
            <MaterialIcons name="local-fire-department" size={12} color={C.error} />
            <Text style={[styles.demandText, { color: C.error }]}>High demand</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: C.primary }]}>{formatCurrency(estimate.suggestedPrice)}</Text>
        <Text style={[styles.priceRange, { color: C.textMuted }]}>
          {formatCurrency(estimate.minPrice)} – {formatCurrency(estimate.maxPrice)}
        </Text>
      </View>

      {!compact && (
        <Pressable
          style={styles.breakdownToggle}
          onPress={() => setShowBreakdown(!showBreakdown)}
        >
          <Text style={[styles.breakdownToggleText, { color: C.primary }]}>
            {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          </Text>
          <MaterialIcons
            name={showBreakdown ? 'expand-less' : 'expand-more'}
            size={16}
            color={C.primary}
          />
        </Pressable>
      )}

      {showBreakdown && (
        <View style={[styles.breakdown, { borderTopColor: C.surfaceBorder }]}>
          <BreakdownRow label="Base price" value={formatCurrency(estimate.breakdown.basePrice)} icon="attach-money" C={C} />
          <BreakdownRow label="Distance" value={`+${formatCurrency(estimate.breakdown.distanceFactor)}`} icon="route" C={C} />
          <BreakdownRow label="Weight" value={`+${formatCurrency(estimate.breakdown.weightFactor)}`} icon="fitness-center" C={C} />
          <BreakdownRow label="Category" value={`×${estimate.breakdown.categoryFactor}`} icon="category" C={C} />
          <BreakdownRow label="Demand" value={`×${estimate.breakdown.demandFactor}`} icon="trending-up" C={C} />
          <BreakdownRow label="Urgency" value={`×${estimate.breakdown.urgencyFactor}`} icon="schedule" C={C} />
          <BreakdownRow label="Vehicle" value={`×${estimate.breakdown.vehicleFactor}`} icon="directions-car" C={C} />
        </View>
      )}

      {onAcceptPrice && (
        <Pressable
          style={({ pressed }) => [styles.acceptBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
          onPress={() => onAcceptPrice(estimate.suggestedPrice)}
        >
          <MaterialIcons name="check" size={16} color="#fff" />
          <Text style={styles.acceptText}>Use this price</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: FontWeight.medium },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  demandText: { fontSize: 10, fontWeight: FontWeight.semibold },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  price: {
    fontSize: FontSize.xxl ?? 28,
    fontWeight: FontWeight.bold,
  },
  priceRange: {
    fontSize: FontSize.xs,
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownToggleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  breakdown: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: { fontSize: FontSize.xs },
  breakdownValue: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  acceptText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  loadingText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
