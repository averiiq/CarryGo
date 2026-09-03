import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

type Step = {
  label: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
  onStepPress?: (index: number) => void;
};

function getStepHint(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('route')) return 'Choose cities and schedule with confidence.';
  if (normalized.includes('capacity') || normalized.includes('parcel') || normalized.includes('detail')) return 'Add the essentials so matching is accurate.';
  if (normalized.includes('review') || normalized.includes('publish') || normalized.includes('send')) return 'Do a final check before you publish.';
  return 'Complete this step to continue smoothly.';
}

export function StepIndicator({ steps, currentStep, onStepPress }: StepIndicatorProps) {
  const { C } = useThemeColors();
  const progress = (currentStep + 1) / steps.length;
  const percent = Math.round(progress * 100);

  const hint = useMemo(() => getStepHint(steps[currentStep]?.label ?? ''), [currentStep, steps]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress * 100}%`, { damping: 20, stiffness: 120 }),
    };
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={[styles.heroStrip, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
        <View style={styles.heroTopRow}>
          <Text style={[styles.stepText, { color: C.textMuted }]}>Step {currentStep + 1} of {steps.length}</Text>
          <View style={[styles.percentPill, { backgroundColor: C.primarySubtle }]}> 
            <Text style={[styles.percentText, { color: C.primaryDark }]}>{percent}%</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: C.textPrimary }]}>{steps[currentStep]?.label}</Text>
        <Text style={[styles.hintText, { color: C.textSecondary }]}>{hint}</Text>

        <View style={[styles.progressBarBg, { backgroundColor: C.surfaceBorderLight }]}> 
          <Animated.View style={[styles.progressBarFill, progressStyle, { backgroundColor: C.primary }]} />
        </View>
      </View>

      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;

          return (
            <Pressable
              key={step.label}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1}: ${step.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => onStepPress?.(index)}
              disabled={!onStepPress}
              style={({ pressed }) => [
                styles.stepChip,
                {
                  backgroundColor: isActive ? C.primarySubtle : C.surface,
                  borderColor: isActive || isComplete ? C.primary + '55' : C.surfaceBorder,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <View style={[styles.stepNumber, { backgroundColor: isActive || isComplete ? C.primary : C.surfaceElevated }]}> 
                {isComplete ? (
                  <MaterialIcons name="check" size={11} color={C.textInverse} />
                ) : (
                  <Text style={[styles.stepNumberText, { color: isActive ? C.textInverse : C.textMuted }]}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepChipText, { color: isActive ? C.primaryDark : C.textMuted }]} numberOfLines={1}>
                {step.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 10,
  },
  heroStrip: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.mdl,
    paddingVertical: Spacing.smd,
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentPill: {
    minWidth: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  percentText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.35,
  },
  hintText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
    marginTop: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  stepChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stepNumber: { width: 19, height: 19, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 10, fontWeight: FontWeight.bold },
  stepChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
