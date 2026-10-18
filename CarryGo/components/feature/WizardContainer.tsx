import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StepIndicator } from './StepIndicator';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Haptic } from '@/services/haptics.service';

type Step = { label: string };

type WizardContainerProps = {
  steps: Step[];
  currentStep: number;
  onStepPress?: (index: number) => void;
  children: React.ReactNode;
  direction?: 'forward' | 'backward';
  /** Optional header title — shows a navigation bar with back button */
  title?: string;
  /** Called when the back arrow in the header is pressed */
  onBack?: () => void;
};

export function WizardContainer({
  steps,
  currentStep,
  onStepPress,
  children,
  direction = 'forward',
  title,
  onBack,
}: WizardContainerProps) {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();

  const entering = direction === 'forward'
    ? SlideInRight.springify().damping(22).stiffness(200)
    : SlideInLeft.springify().damping(22).stiffness(200);
  const exiting = direction === 'forward'
    ? SlideOutLeft.duration(180)
    : SlideOutRight.duration(180);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[C.primarySubtle, 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.3 }}
        />
      </View>

      {/* Navigation header */}
      {title ? (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => {
                Haptic.tap();
                onBack();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.backPlaceholder} />
        </View>
      ) : null}

      <StepIndicator steps={steps} currentStep={currentStep} onStepPress={onStepPress} />
      <Animated.View
        key={`step-${currentStep}`}
        entering={entering}
        exiting={exiting}
        style={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
