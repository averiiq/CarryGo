import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import Reanimated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

export type DeliveryStep = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';

export function stepIndex(status: DeliveryStep) {
  const steps: DeliveryStep[] = ['awaiting_pickup', 'picked_up', 'in_transit', 'delivered'];
  return steps.indexOf(status);
}

export const STEPS: {
  key: DeliveryStep;
  label: string;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}[] = [
  { key: 'awaiting_pickup', label: 'Awaiting Pickup', sub: 'Traveller will collect parcel', icon: 'clock' as const, color: '#F59E0B' },
  { key: 'picked_up',       label: 'Picked Up',       sub: 'Parcel collected from sender',   icon: 'package' as const, color: '#3B82F6' },
  { key: 'in_transit',      label: 'In Transit',      sub: 'On the way to destination',      icon: 'truck' as const, color: '#4F46E5' },
  { key: 'delivered',       label: 'Delivered',       sub: 'Delivery complete!',              icon: 'check-circle' as const, color: '#10B981' },
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
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [pulseAnim, step]);

  const stepsData = STEPS.map(s => {
    if (s.key === 'awaiting_pickup') return { ...s, color: C.warning, bg: C.warningSubtle };
    if (s.key === 'picked_up') return { ...s, color: C.info, bg: C.infoSubtle };
    if (s.key === 'in_transit') return { ...s, color: C.primary, bg: C.primarySubtle };
    return { ...s, color: C.success, bg: C.successSubtle };
  });

  const progressStyle = useAnimatedStyle(() => {
    const targetWidth = ((currentIdx) / (stepsData.length - 1)) * 100;
    return {
      width: withSpring(`${targetWidth}%`, { damping: 20, stiffness: 100 }),
    };
  }, [currentIdx]);

  return (
    <View style={[styles.timelineCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.sm]}>
      <View style={styles.timelineHeader}>
        <View style={[styles.timelineIconBox, { backgroundColor: C.primarySubtle }]}>
          <Feather name="truck" size={16} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.timelineTitle, { color: C.textPrimary }]}>Delivery Progress</Text>
          <Text style={[styles.timelineSub, { color: C.textMuted }]}>
            Step {currentIdx + 1} of {stepsData.length}
          </Text>
        </View>
        <View style={[styles.progressPill, { backgroundColor: stepsData[currentIdx].bg, borderColor: stepsData[currentIdx].color + '33' }]}>
          <Text style={[styles.progressPillText, { color: stepsData[currentIdx].color }]}>
            {stepsData[currentIdx].label}
          </Text>
        </View>
      </View>

      {/* Linear progress bar */}
      <View style={[styles.progressBarBg, { backgroundColor: C.surfaceElevated }]}>
        <Reanimated.View
          style={[
            styles.progressBarFill,
            progressStyle,
            {
              backgroundColor: stepsData[currentIdx].color,
            },
          ]}
        />
      </View>

      {/* Step rows */}
      {stepsData.map((s, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;
        const dotColor = isDone ? s.color : isCurrent ? s.color : C.surfaceBorderLight;

        return (
          <View key={s.key} style={styles.stepRow}>
            {/* Connector + dot */}
            <View style={styles.stepLeft}>
              <View style={[
                styles.stepDot,
                { backgroundColor: isPending ? C.surfaceElevated : dotColor, borderColor: isPending ? C.surfaceBorder : dotColor },
              ]}>
                {isDone ? (
                  <Feather name="check" size={10} color="#fff" />
                ) : isCurrent ? (
                  <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]}>
                    <Feather name={s.icon} size={10} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={[styles.pendingDot, { backgroundColor: C.textMuted + '80' }]} />
                )}
              </View>
              {idx < stepsData.length - 1 ? (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: isDone ? s.color : C.surfaceBorderLight },
                ]} />
              ) : null}
            </View>

            {/* Content */}
            <View style={[styles.stepContent, isCurrent && { backgroundColor: s.color + '05', borderColor: s.color + '22', borderWidth: 1 }]}>
              <View style={styles.stepContentInner}>
                <View style={[styles.stepIconWrap, { backgroundColor: dotColor + (isPending ? '00' : '12') }]}>
                  <Feather name={s.icon} size={14} color={isPending ? C.textMuted : dotColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.stepLabel,
                    { color: isPending ? C.textMuted : C.textPrimary },
                    isCurrent && { fontWeight: FontWeight.bold },
                  ]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.stepSub, { color: isCurrent ? s.color + 'dd' : C.textMuted }]}>
                    {isCurrent ? 'Current step' : s.sub}
                  </Text>
                </View>
                {isDone ? (
                  <View style={[styles.doneChip, { backgroundColor: s.color + '12' }]}>
                    <Feather name="check-circle" size={11} color={s.color} />
                    <Text style={[styles.doneChipText, { color: s.color }]}>Done</Text>
                  </View>
                ) : isCurrent ? (
                  <View style={[styles.activeChip, { backgroundColor: s.color }]}>
                    <Text style={styles.activeChipText}>Now</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  timelineIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  timelineSub: { fontSize: FontSize.xs, marginTop: 2 },
  progressPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, flexShrink: 0,
  },
  progressPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },

  stepRow: { flexDirection: 'row', gap: 0, alignItems: 'flex-start' },
  stepLeft: { width: 48, alignItems: 'center' },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  pulseDot: { alignItems: 'center', justifyContent: 'center' },
  pendingDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 3 },
  stepContent: { flex: 1, borderRadius: BorderRadius.md, marginBottom: 8, padding: 10 },
  stepContentInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  stepSub: { fontSize: FontSize.xs, marginTop: 2 },
  doneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  doneChipText: { fontSize: 10, fontWeight: FontWeight.bold },
  activeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  activeChipText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#fff' },
});
