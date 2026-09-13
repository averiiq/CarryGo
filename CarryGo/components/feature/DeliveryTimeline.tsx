import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type DeliveryStep = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';

export function stepIndex(status: DeliveryStep) {
  const steps: DeliveryStep[] = ['awaiting_pickup', 'picked_up', 'in_transit', 'delivered'];
  const idx = steps.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export const STEPS: {
  key: DeliveryStep;
  label: string;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: 'awaiting_pickup', label: 'Pickup Pending', sub: 'Traveller collects parcel from sender', icon: 'clock' },
  { key: 'picked_up',       label: 'Picked Up',      sub: 'Parcel inspected & securely handed over', icon: 'package' },
  { key: 'in_transit',      label: 'In Transit',     sub: 'On journey to final destination', icon: 'truck' },
  { key: 'delivered',       label: 'Delivered',      sub: 'Safely delivered and verified', icon: 'check-circle' },
];

type DeliveryTimelineProps = {
  step: DeliveryStep;
  C?: ThemeColors;
};

export function DeliveryTimeline({ step }: DeliveryTimelineProps) {
  const { C, S } = useThemeColors();
  const currentIdx = stepIndex(step);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step !== 'delivered') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [pulseAnim, step]);

  const currentStep = STEPS[currentIdx] || STEPS[0];

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.sm]}>
      {/* Top row: Minimal step label & pill */}
      <View style={styles.topRow}>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusEyebrow, { color: C.textMuted }]}>
            STATUS · STEP {currentIdx + 1} OF {STEPS.length}
          </Text>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>
            {currentStep.label}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <View style={[styles.liveDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.statusPillText, { color: C.primary }]}>
            {step === 'delivered' ? 'Completed' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Horizontal Segmented Progress Indicator */}
      <View style={styles.segmentsRow}>
        {STEPS.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <React.Fragment key={s.key}>
              {/* Step Node */}
              <View style={styles.nodeWrapper}>
                <View
                  style={[
                    styles.nodeCircle,
                    isDone && { backgroundColor: C.primary, borderColor: C.primary },
                    isCurrent && { backgroundColor: C.primary, borderColor: C.primary },
                    isPending && { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  ]}
                >
                  {isDone ? (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <Feather name={s.icon} size={12} color="#FFFFFF" />
                    </Animated.View>
                  ) : (
                    <View style={[styles.pendingDot, { backgroundColor: C.textMuted + '66' }]} />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.nodeLabel,
                    {
                      color: isCurrent ? C.primary : isDone ? C.textPrimary : C.textMuted,
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {s.label.split(' ')[0]}
                </Text>
              </View>

              {/* Connecting Bar (except after last step) */}
              {idx < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.segmentConnector,
                    { backgroundColor: isDone ? C.primary : C.surfaceBorder },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Micro subtext description */}
      <Text style={[styles.subtext, { color: C.textSecondary }]} numberOfLines={1}>
        {currentStep.sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.mdl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    gap: 2,
  },
  statusEyebrow: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  nodeWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 1,
  },
  nodeLabel: {
    fontSize: 11,
  },
  subtext: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
