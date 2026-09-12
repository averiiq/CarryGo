import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget } from '@/constants/theme';
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
  const { isSmallDevice, isTablet } = useResponsive();
  const progress = (currentStep + 1) / steps.length;
  const percent = Math.round(progress * 100);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress * 100}%`, { damping: 22, stiffness: 140 }),
    };
  }, [progress]);

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      {/* Sleek Top Status Row */}
      <View style={styles.topStatusRow}>
        <View style={styles.topStatusLeft}>
          <View style={[styles.stepDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.stepCounterText, { color: C.textMuted }]}>
            Step {currentStep + 1} of {steps.length}
          </Text>
          <Text style={[styles.dotDivider, { color: C.surfaceBorder }]}>•</Text>
          <Text style={[styles.activeStepTitle, { color: C.textPrimary }]} numberOfLines={1}>
            {steps[currentStep]?.label}
          </Text>
        </View>

        <View style={[styles.percentBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.percentBadgeText, { color: C.primaryDark }]}>{percent}%</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={[styles.progressBarBg, { backgroundColor: C.surfaceBorderLight }]}>
        <Animated.View style={[styles.progressBarFill, progressStyle, { backgroundColor: C.primary }]} />
      </View>

      {/* Step Pills Row */}
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
              onPress={() => {
                if (onStepPress) {
                  Haptic.select();
                  onStepPress(index);
                }
              }}
              disabled={!onStepPress}
              hitSlop={TouchTarget.smallHitSlop}
              style={({ pressed }) => [
                styles.stepChip,
                {
                  backgroundColor: isActive ? C.primarySubtle : C.surface,
                  borderColor: isActive ? C.primary : isComplete ? C.primary + '55' : C.surfaceBorder,
                  opacity: pressed ? 0.75 : 1,
                  paddingHorizontal: isSmallDevice ? 6 : Spacing.sm + 2,
                },
              ]}
            >
              <View style={[styles.stepNumber, { backgroundColor: isActive || isComplete ? C.primary : C.surfaceElevated }]}>
                {isComplete ? (
                  <MaterialIcons name="check" size={12} color={C.textInverse} />
                ) : (
                  <Text style={[styles.stepNumberText, { color: isActive ? C.textInverse : C.textMuted }]}>{index + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepChipText,
                  { color: isActive ? C.primaryDark : isComplete ? C.textPrimary : C.textMuted },
                ]}
                numberOfLines={1}
              >
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
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.xs,
    gap: 8,
  },
  containerTablet: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepCounterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },
  dotDivider: {
    fontSize: FontSize.xs,
  },
  activeStepTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentBadgeText: {
    fontSize: FontSize.xs,
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
  stepsRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginTop: 2,
  },
  stepChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stepChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
