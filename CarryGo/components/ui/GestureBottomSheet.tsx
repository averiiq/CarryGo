import React, { useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  Platform,
  Keyboard,
  KeyboardEvent,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptic } from '@/services/haptics.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

// Responsive thresholds: a 70px pull or a 400px/s flick triggers clean dismissal
const DISMISS_THRESHOLD = 70;
const DISMISS_VELOCITY = 400;

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
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropProgress = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  const handleDismissFinished = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateOpen = useCallback(() => {
    translateY.value = withSpring(0, {
      damping: 24,
      stiffness: 280,
      mass: 0.85,
    });
    backdropProgress.value = withTiming(1, { duration: 240 });
  }, [backdropProgress, translateY]);

  const animateClose = useCallback(() => {
    'worklet';
    backdropProgress.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(handleDismissFinished)();
      }
    });
  }, [backdropProgress, handleDismissFinished, translateY, SCREEN_HEIGHT]);

  const triggerCloseWithHaptic = useCallback(() => {
    Haptic.tap();
    Keyboard.dismiss();
    animateClose();
  }, [animateClose]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (visible) {
      animateOpen();
    }
  }, [visible, animateOpen]);

  // Keyboard elevation tracking
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates.height;
      if (Platform.OS === 'ios') {
        keyboardOffset.value = withTiming(h, { duration: Math.max(200, e.duration || 250) });
      } else {
        keyboardOffset.value = withSpring(h, { damping: 22, stiffness: 260 });
      }
    };

    const onHide = (e?: KeyboardEvent) => {
      if (Platform.OS === 'ios') {
        keyboardOffset.value = withTiming(0, { duration: Math.max(180, e?.duration || 200) });
      } else {
        keyboardOffset.value = withTiming(0, { duration: 180 });
      }
    };

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);

    let sub3: any = null;
    let sub4: any = null;
    if (Platform.OS === 'android') {
      sub3 = Keyboard.addListener('keyboardDidShow', onShow);
      sub4 = Keyboard.addListener('keyboardDidHide', onHide);
    }

    return () => {
      sub1.remove();
      sub2.remove();
      sub3?.remove();
      sub4?.remove();
    };
  }, [keyboardOffset]);

  // Dedicated handle gesture: highly sensitive, captures any downward swipe on the top bar
  const handleGesture = Gesture.Pan()
    .enabled(enablePanDownToClose)
    .activeOffsetY([4, 1000])
    .onBegin(() => {
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropProgress.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT * 0.35],
          [1, 0.15],
          Extrapolation.CLAMP
        );
      } else {
        translateY.value = event.translationY * 0.14;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(triggerCloseWithHaptic)();
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 280, mass: 0.85 });
        backdropProgress.value = withTiming(1, { duration: 180 });
      }
    });

  // Body gesture: activates on deliberate downward swipe, yields on horizontal or upward drags
  const sheetGesture = Gesture.Pan()
    .enabled(enablePanDownToClose)
    .activeOffsetY([8, 1000])
    .failOffsetY([-1000, -8])
    .failOffsetX([-25, 25])
    .onBegin(() => {
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropProgress.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT * 0.35],
          [1, 0.15],
          Extrapolation.CLAMP
        );
      } else {
        translateY.value = event.translationY * 0.14;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(triggerCloseWithHaptic)();
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 280, mass: 0.85 });
        backdropProgress.value = withTiming(1, { duration: 180 });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      marginBottom: keyboardOffset.value,
    };
  });

  const sheetDynamicHeightStyle = useAnimatedStyle(() => {
    const availableHeight = SCREEN_HEIGHT - insets.top - 24 - keyboardOffset.value;
    return {
      maxHeight: availableHeight,
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
      <View style={styles.modalRoot}>
        {/* Animated Dimming Backdrop */}
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdropPress ? () => animateClose() : undefined}
            accessibilityRole="button"
            accessibilityLabel="Dismiss bottom sheet"
          />
        </Animated.View>

        {/* Gesture & Keyboard Driven Bottom Sheet */}
        <GestureDetector gesture={sheetGesture}>
          <Animated.View
            style={[
              styles.sheetCard,
              {
                backgroundColor: C.surface,
                borderColor: C.surfaceBorder,
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
                maxHeight,
              },
              sheetDynamicHeightStyle,
              containerStyle,
              sheetAnimatedStyle,
            ]}
          >
            {showHandle && (
              <GestureDetector gesture={handleGesture}>
                <View style={styles.handleContainer}>
                  <View style={[styles.handleBar, { backgroundColor: C.surfaceBorderLight }]} />
                </View>
              </GestureDetector>
            )}
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 26, 0.58)',
  },
  sheetCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.xs + 4,
    // Generous hit target to ensure effortless downward swiping
    minHeight: 28,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: BorderRadius.full,
  },
});
