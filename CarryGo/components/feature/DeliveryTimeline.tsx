import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';

export type DeliveryStep = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';

export const STEPS: {
  key: DeliveryStep;
  label: string;
  sub: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { key: 'awaiting_pickup', label: 'Awaiting Pickup', sub: 'Traveller will collect parcel', icon: 'schedule', color: '#F59E0B' },
  { key: 'picked_up',       label: 'Picked Up',       sub: 'Parcel collected from sender',   icon: 'inventory',       color: '#7C3AED' },
  { key: 'in_transit',      label: 'In Transit',      sub: 'On the way to destination',      icon: 'local-shipping',  color: '#06B6D4' },
  { key: 'delivered',       label: 'Delivered',       sub: 'Delivery complete!',              icon: 'celebration',     color: '#22C55E' },
];

export function stepIndex(status: DeliveryStep) {
  return STEPS.findIndex(s => s.key === status);
}

type DeliveryTimelineProps = {
  step: DeliveryStep;
  C: ThemeColors;
};

export function DeliveryTimeline({ step, C }: DeliveryTimelineProps) {
  const currentIdx = stepIndex(step);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step !== 'delivered') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [step]);

  return (
    <View style={[styles.timelineCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.timelineHeader}>
        <View style={[styles.timelineIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="local-shipping" size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.timelineTitle, { color: C.textPrimary }]}>Delivery Progress</Text>
          <Text style={[styles.timelineSub, { color: C.textMuted }]}>
            Step {currentIdx + 1} of {STEPS.length}
          </Text>
        </View>
        <View style={[styles.progressPill, { backgroundColor: STEPS[currentIdx].color + '18', borderColor: STEPS[currentIdx].color + '44' }]}>
          <Text style={[styles.progressPillText, { color: STEPS[currentIdx].color }]}>
            {STEPS[currentIdx].label}
          </Text>
        </View>
      </View>

      {/* Linear progress bar */}
      <View style={[styles.progressBarBg, { backgroundColor: C.surfaceElevated }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: STEPS[currentIdx].color,
              width: `${((currentIdx) / (STEPS.length - 1)) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Step rows */}
      {STEPS.map((s, idx) => {
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
                { backgroundColor: dotColor, borderColor: isPending ? C.surfaceBorder : dotColor },
              ]}>
                {isDone ? (
                  <MaterialIcons name="check" size={11} color="#fff" />
                ) : isCurrent ? (
                  <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialIcons name={s.icon} size={11} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={[styles.pendingDot, { backgroundColor: C.surfaceBorder }]} />
                )}
              </View>
              {idx < STEPS.length - 1 ? (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: isDone ? s.color : C.surfaceBorderLight },
                ]} />
              ) : null}
            </View>

            {/* Content */}
            <View style={[styles.stepContent, isCurrent && [styles.stepContentActive, { backgroundColor: s.color + '08', borderColor: s.color + '25' }]]}>
              <View style={styles.stepContentInner}>
                <View style={[styles.stepIconWrap, { backgroundColor: dotColor + (isPending ? '0' : '18') }]}>
                  <MaterialIcons name={s.icon} size={15} color={isPending ? C.textMuted : dotColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.stepLabel,
                    { color: isPending ? C.textMuted : C.textPrimary },
                    isCurrent && { fontWeight: FontWeight.bold },
                  ]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.stepSub, { color: isCurrent ? s.color + 'AA' : C.textMuted }]}>
                    {isCurrent ? 'Current step' : s.sub}
                  </Text>
                </View>
                {isDone ? (
                  <View style={[styles.doneChip, { backgroundColor: s.color + '15' }]}>
                    <MaterialIcons name="check-circle" size={13} color={s.color} />
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
  stepContentActive: { borderWidth: 1 },
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
