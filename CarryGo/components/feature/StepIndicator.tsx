import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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

export function StepIndicator({ steps, currentStep, onStepPress }: StepIndicatorProps) {
  const { C } = useThemeColors();
  const progress = (currentStep + 1) / steps.length;

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress * 100}%`, { damping: 20, stiffness: 120 }),
    };
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.stepText, { color: C.textMuted }]}>
          Step {currentStep + 1} of {steps.length}
        </Text>
        <Text style={[styles.label, { color: C.textPrimary }]}>
          {steps[currentStep].label}
        </Text>
      </View>
      <View style={[styles.progressBarBg, { backgroundColor: C.surfaceBorderLight }]}>
        <Animated.View style={[styles.progressBarFill, progressStyle, { backgroundColor: C.primary }]} />
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
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  stepText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  stepChip: {
    flex: 1,
    minHeight: 38,
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
