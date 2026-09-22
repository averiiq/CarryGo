import React, { useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Haptic } from '@/services/haptics.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 110;
const DISMISS_VELOCITY = 700;

export interface GestureBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
  containerStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  enablePanDownToClose?: boolean;
  dismissOnBackdropPress?: boolean;
}

export function GestureBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '90%',
  containerStyle,
  showHandle = true,
  enablePanDownToClose = true,
  dismissOnBackdropPress = true,
}: GestureBottomSheetProps) {
  const { C } = useThemeColors();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropProgress = useSharedValue(0);

  const handleDismissFinished = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateOpen = useCallback(() => {
    translateY.value = withSpring(0, {
      damping: 24,
      stiffness: 260,
      mass: 0.85,
    });
    backdropProgress.value = withTiming(1, { duration: 250 });
  }, [backdropProgress, translateY]);

  const animateClose = useCallback(() => {
    'worklet';
    backdropProgress.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 240 }, (finished) => {
      if (finished) {
        runOnJS(handleDismissFinished)();
      }
    });
  }, [backdropProgress, handleDismissFinished, translateY]);

  const triggerCloseWithHaptic = useCallback(() => {
    Haptic.tap();
    animateClose();
  }, [animateClose]);

  useEffect(() => {
    if (visible) {
      animateOpen();
    }
  }, [visible, animateOpen]);

  const panGesture = Gesture.Pan()
    .enabled(enablePanDownToClose)
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropProgress.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT * 0.45],
          [1, 0.3],
          Extrapolation.CLAMP
        );
      } else {
        // Subtle resistance / rubber-band when dragging up
        translateY.value = event.translationY * 0.18;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(triggerCloseWithHaptic)();
      } else {
        translateY.value = withSpring(0, {
          damping: 22,
          stiffness: 240,
        });
        backdropProgress.value = withTiming(1, { duration: 180 });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropProgress.value,
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => animateClose()}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <View style={styles.modalRoot}>
          {/* Animated Backdrop */}
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={dismissOnBackdropPress ? () => animateClose() : undefined}
              accessibilityRole="button"
              accessibilityLabel="Dismiss modal backdrop"
            />
          </Animated.View>

          {/* Gesture Driven Bottom Sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheetCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.surfaceBorder,
                  maxHeight,
                },
                containerStyle,
                sheetAnimatedStyle,
              ]}
            >
              {showHandle && (
                <View style={styles.handleContainer}>
                  <View style={[styles.handleBar, { backgroundColor: C.surfaceBorderLight }]} />
                </View>
              )}
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  sheetCard: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: BorderRadius.full,
  },
});
