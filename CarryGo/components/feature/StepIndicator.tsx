import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

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

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const canPress = isCompleted && onStepPress;

        return (
          <React.Fragment key={step.label}>
            {index > 0 && (
              <StepConnector isCompleted={index <= currentStep} C={C} />
            )}
            <Pressable
              style={styles.stepItem}
              onPress={canPress ? () => { Haptic.tap(); onStepPress(index); } : undefined}
              disabled={!canPress}
            >
              <StepDot isActive={isActive} isCompleted={isCompleted} C={C} />
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isActive ? C.primary : isCompleted ? C.textPrimary : C.textMuted,
                    fontWeight: isActive ? FontWeight.semibold : FontWeight.medium,
                  },
                ]}
              >
                {step.label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function StepDot({ isActive, isCompleted, C }: { isActive: boolean; isCompleted: boolean; C: any }) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isActive ? 1 : 0.75, { damping: 15, stiffness: 200 });
    return { transform: [{ scale }] };
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          backgroundColor: isActive || isCompleted ? C.primary : C.surfaceBorder,
          borderColor: isActive ? C.primaryGlow : 'transparent',
          borderWidth: isActive ? 3 : 0,
        },
      ]}
    >
      {isCompleted && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </Animated.View>
  );
}

function StepConnector({ isCompleted, C }: { isCompleted: boolean; C: any }) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(
      isCompleted ? C.primary : C.surfaceBorder,
      { damping: 20, stiffness: 150 },
    ),
  }), [isCompleted]);

  return <Animated.View style={[styles.connector, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  connector: {
    height: 2,
    flex: 1,
    marginHorizontal: Spacing.sm,
    borderRadius: 1,
  },
  stepLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
