import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';

type Step = {
  label: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
  onStepPress?: (index: number) => void;
};

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
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
});
