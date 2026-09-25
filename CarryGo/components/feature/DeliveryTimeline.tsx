import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

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
  detail: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  {
    key: 'awaiting_pickup',
    label: 'Pickup Pending',
    sub: 'Traveller collects parcel from sender',
    detail: 'Verify 4-digit Pickup OTP before handing over package to traveller.',
    icon: 'clock',
  },
  {
    key: 'picked_up',
    label: 'Picked Up',
    sub: 'Parcel inspected & securely handed over',
    detail: 'Package verified, weighed, and sealed. Traveller is on route.',
    icon: 'package',
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    sub: 'On journey to final destination',
    detail: 'Active delivery in progress. Live route coordinates and ETA updating.',
    icon: 'truck',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    sub: 'Safely delivered and verified',
    detail: 'Delivery completed with Drop-off OTP confirmation. Funds released.',
    icon: 'check-circle',
  },
];

type DeliveryTimelineProps = {
  step: DeliveryStep;
  C?: ThemeColors;
};

export function DeliveryTimeline({ step }: DeliveryTimelineProps) {
  const { C, S } = useThemeColors();
  const currentIdx = stepIndex(step);
  const [selectedIdx, setSelectedIdx] = useState<number>(currentIdx);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const detailFade = useRef(new Animated.Value(1)).current;

  // Sync selected index when step changes
  useEffect(() => {
    setSelectedIdx(currentIdx);
  }, [currentIdx]);

  useEffect(() => {
    if (step !== 'delivered') {
      const pulseLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.14, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringScale, { toValue: 1.45, duration: 800, useNativeDriver: true }),
            Animated.timing(ringScale, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity, { toValue: 0.1, duration: 800, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          ]),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [pulseAnim, ringOpacity, ringScale, step]);

  const handleSelectStep = (idx: number) => {
    Haptic.select();
    Animated.sequence([
      Animated.timing(detailFade, { toValue: 0.4, duration: 80, useNativeDriver: true }),
      Animated.timing(detailFade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    setSelectedIdx(idx);
  };

  const displayedStep = STEPS[selectedIdx] || STEPS[currentIdx] || STEPS[0];
  const activeColor = step === 'delivered' ? C.success : C.primary;

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.sm]}>
      {/* Top row: Minimal step label & pill */}
      <View style={styles.topRow}>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusEyebrow, { color: C.textMuted }]}>
            DELIVERY MILESTONES · {selectedIdx + 1} OF {STEPS.length}
          </Text>
          <Text style={[styles.statusTitle, { color: C.textPrimary }]}>
            {displayedStep.label}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: step === 'delivered' ? C.successSubtle : C.primarySubtle,
              borderColor: step === 'delivered' ? C.success + '33' : C.primary + '33',
            },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: step === 'delivered' ? C.success : C.primary }]} />
          <Text
            style={[
              styles.statusPillText,
              { color: step === 'delivered' ? C.success : C.primary },
            ]}
          >
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
          const isSelected = idx === selectedIdx;

          return (
            <React.Fragment key={s.key}>
              {/* Step Node */}
              <Pressable
                onPress={() => handleSelectStep(idx)}
                style={styles.nodeWrapper}
                accessibilityRole="button"
                accessibilityLabel={`${s.label}, step ${idx + 1}`}
                hitSlop={8}
              >
                <View style={styles.nodeOuter}>
                  {isCurrent ? (
                    <Animated.View
                      style={[
                        styles.glowingRing,
                        {
                          borderColor: activeColor,
                          opacity: ringOpacity,
                          transform: [{ scale: ringScale }],
                        },
                      ]}
                    />
                  ) : null}

                  <View
                    style={[
                      styles.nodeCircle,
                      isDone && { backgroundColor: activeColor, borderColor: activeColor },
                      isCurrent && { backgroundColor: activeColor, borderColor: activeColor },
                      isPending && { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      isSelected && !isCurrent && { borderColor: C.primary, borderWidth: 2 },
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
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.nodeLabel,
                    {
                      color: isSelected ? activeColor : isDone ? C.textPrimary : C.textMuted,
                      fontWeight: isSelected || isCurrent ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {s.label.split(' ')[0]}
                </Text>
              </Pressable>

              {/* Connecting Bar */}
              {idx < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.segmentConnector,
                    { backgroundColor: isDone ? activeColor : C.surfaceBorder },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Interactive Context Detail Box */}
      <Animated.View
        style={[
          styles.detailBox,
          {
            backgroundColor: C.surfaceElevated,
            borderColor: selectedIdx === currentIdx ? activeColor + '44' : C.surfaceBorder,
            opacity: detailFade,
          },
        ]}
      >
        <Feather
          name={selectedIdx <= currentIdx ? 'shield' : 'info'}
          size={14}
          color={selectedIdx <= currentIdx ? activeColor : C.textMuted}
        />
        <View style={styles.detailCopy}>
          <Text style={[styles.detailHeading, { color: C.textPrimary }]}>
            {displayedStep.sub}
          </Text>
          <Text style={[styles.detailSubtext, { color: C.textSecondary }]}>
            {displayedStep.detail}
          </Text>
        </View>
      </Animated.View>
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
  nodeOuter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  glowingRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
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
  detailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailHeading: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  detailSubtext: {
    fontSize: FontSize.xs - 1,
    lineHeight: 16,
  },
});
