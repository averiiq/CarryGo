import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface KycStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}

function Dot({ index, currentStep }: { index: number; currentStep: number }) {
  const { C } = useThemeColors();

  const isActive = index === currentStep;
  const isCompleted = index < currentStep;

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = isActive
      ? C.primary
      : isCompleted
        ? C.accent
        : C.surfaceBorderLight;

    const scale = isActive ? 1.2 : 1;
    const width = isActive ? 28 : 10;

    return {
      backgroundColor: withTiming(backgroundColor, { duration: 250 }),
      transform: [{ scale: withTiming(scale, { duration: 250 }) }],
      width: withTiming(width, { duration: 250 }),
    };
  }, [isActive, isCompleted, C]);

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function KycStepIndicator({ currentStep, totalSteps, stepLabel }: KycStepIndicatorProps) {
  const { C } = useThemeColors();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {stepLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.stepText, { color: C.textSecondary }]}>
            Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
          </Text>
          <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.badgeText, { color: C.primary }]}>{stepLabel}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <Dot key={i} index={i} currentStep={currentStep} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  stepText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
