import React from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, FadeInLeft, FadeOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StepIndicator } from './StepIndicator';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type Step = { label: string };

type WizardContainerProps = {
  steps: Step[];
  currentStep: number;
  onStepPress?: (index: number) => void;
  children: React.ReactNode;
  direction?: 'forward' | 'backward';
};

export function WizardContainer({
  steps,
  currentStep,
  onStepPress,
  children,
  direction = 'forward',
}: WizardContainerProps) {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();

  const entering = direction === 'forward' ? FadeInRight.duration(250) : FadeInLeft.duration(250);
  const exiting = direction === 'forward' ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[C.primarySubtle, 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
        />
      </View>
      <StepIndicator steps={steps} currentStep={currentStep} onStepPress={onStepPress} />
      <Animated.View
        key={`step-${currentStep}`}
        entering={entering}
        exiting={exiting}
        style={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
});
