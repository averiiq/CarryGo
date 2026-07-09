import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { MatchScore } from '@/services/smart-matching.service';

interface MatchScoreIndicatorProps {
  score: MatchScore;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
}

function getScoreColor(total: number, C: any): string {
  if (total >= 80) return C.success;
  if (total >= 50) return C.warning;
  return C.error;
}

function CircularProgress({ score, size, color, bgColor }: { score: number; size: number; color: string; bgColor: string }) {
  const strokeWidth = size > 50 ? 5 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

export function MatchScoreIndicator({ score, size = 'md', showBreakdown = false }: MatchScoreIndicatorProps) {
  const { C } = useThemeColors();
  const [expanded, setExpanded] = React.useState(false);

  const sizeMap = { sm: 36, md: 56, lg: 80 };
  const fontMap = { sm: 11, md: 16, lg: 24 };
  const circleSize = sizeMap[size];
  const fontSize = fontMap[size];
  const color = getScoreColor(score.total, C);

  const gradeLabels = {
    excellent: 'Excellent Match',
    good: 'Good Match',
    fair: 'Fair Match',
    poor: 'Poor Match',
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.scoreWrap}
        onPress={showBreakdown ? () => setExpanded(!expanded) : undefined}
      >
        <View style={{ width: circleSize, height: circleSize, alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress
            score={score.total}
            size={circleSize}
            color={color}
            bgColor={C.surfaceBorder}
          />
          <Text style={[styles.scoreText, { color, fontSize }]}>{score.total}</Text>
        </View>
        {size !== 'sm' && (
          <Text style={[styles.gradeLabel, { color }]}>{gradeLabels[score.grade]}</Text>
        )}
      </Pressable>

      {expanded && showBreakdown && (
        <View style={[styles.breakdown, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <BreakdownItem label="Route" value={score.breakdown.routeScore} icon="route" C={C} />
          <BreakdownItem label="Date" value={score.breakdown.dateScore} icon="event" C={C} />
          <BreakdownItem label="Capacity" value={score.breakdown.capacityScore} icon="inventory-2" C={C} />
          <BreakdownItem label="Price" value={score.breakdown.priceScore} icon="payments" C={C} />
          <BreakdownItem label="Rating" value={score.breakdown.ratingScore} icon="star" C={C} />
          <BreakdownItem label="Reliability" value={score.breakdown.reliabilityScore} icon="verified" C={C} />
        </View>
      )}
    </View>
  );
}

function BreakdownItem({ label, value, icon, C }: { label: string; value: number; icon: keyof typeof MaterialIcons.glyphMap; C: any }) {
  const color = getScoreColor(value, C);
  return (
    <View style={styles.breakdownItem}>
      <MaterialIcons name={icon} size={12} color={C.textMuted} />
      <Text style={[styles.breakdownLabel, { color: C.textSecondary }]}>{label}</Text>
      <View style={[styles.miniBar, { backgroundColor: C.surfaceBorder }]}>
        <View style={[styles.miniBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  scoreWrap: { alignItems: 'center', gap: 4 },
  scoreText: { position: 'absolute', fontWeight: FontWeight.bold },
  gradeLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  breakdown: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: { fontSize: 10, width: 60 },
  miniBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 2 },
  breakdownValue: { fontSize: 10, fontWeight: FontWeight.semibold, width: 22, textAlign: 'right' },
});
