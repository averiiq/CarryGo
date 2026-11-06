import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StepIndicator } from './StepIndicator';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Haptic } from '@/services/haptics.service';
import { useResponsive } from '@/hooks/useResponsive';

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
  /** Optional sticky footer rendered outside the animated sliding container */
  footer?: React.ReactNode;
};

export function WizardContainer({
  steps,
  currentStep,
  onStepPress,
  children,
  direction = 'forward',
  title,
  onBack,
  footer,
}: WizardContainerProps) {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isSmallDevice, isTablet } = useResponsive();

  const entering = direction === 'forward'
    ? SlideInRight.springify().damping(26).stiffness(320).mass(0.75)
    : SlideInLeft.springify().damping(26).stiffness(320).mass(0.75);

  const exiting = direction === 'forward'
    ? SlideOutLeft.springify().damping(26).stiffness(320).mass(0.75)
    : SlideOutRight.springify().damping(26).stiffness(320).mass(0.75);

  const triggerBack = useCallback(() => {
    if (onBack && currentStep > 0) {
      Haptic.tap();
      onBack();
    }
  }, [onBack, currentStep]);

  // Screen slider gesture: allows swiping right to return to previous wizard step
  const swipeBackGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX > 40 || e.velocityX > 350) {
        runOnJS(triggerBack)();
      }
    });

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
        <View style={[styles.header, { paddingTop: insets.top + 8 }, isTablet && styles.tabletInnerWrap]}>
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
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
            {title}
          </Text>
          <View style={styles.backPlaceholder} />
        </View>
      ) : null}

      <View style={[isTablet && styles.tabletInnerWrap]}>
        <StepIndicator steps={steps} currentStep={currentStep} onStepPress={onStepPress} />
      </View>

      <GestureDetector gesture={swipeBackGesture}>
        <Animated.View
          key={`step-${currentStep}`}
          entering={entering}
          exiting={exiting}
          style={[
            styles.content,
            { paddingBottom: footer ? 0 : insets.bottom + 24 },
            isSmallDevice && { paddingHorizontal: Spacing.sm },
            isTablet && styles.tabletInnerWrap,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>

      {footer ? <View style={[isTablet && styles.tabletInnerWrap]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabletInnerWrap: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
});
