import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing } from '@/constants/theme';

interface KycStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
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

    const scale = isActive ? 1.3 : 1;
    const width = isActive ? 24 : 10;

    return {
      backgroundColor: withTiming(backgroundColor, { duration: 250 }),
      transform: [{ scale: withTiming(scale, { duration: 250 }) }],
      width: withTiming(width, { duration: 250 }),
    };
  }, [isActive, isCompleted, C]);

  return (
    <Animated.View
      style={[styles.dot, animatedStyle]}
    />
  );
}

export default function KycStepIndicator({ currentStep, totalSteps }: KycStepIndicatorProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <Dot key={i} index={i} currentStep={currentStep} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
});
