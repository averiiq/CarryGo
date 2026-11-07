import React, { useEffect, useCallback, useState, useRef } from 'react';
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
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
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

// Responsive thresholds: a 50px pull or a 300px/s flick triggers clean snappy dismissal
const DISMISS_THRESHOLD = 50;
const DISMISS_VELOCITY = 300;

export interface GestureBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | `${number}%`;
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
  height,
  maxHeight = '90%',
  containerStyle,
  showHandle = true,
  enablePanDownToClose = true,
  dismissOnBackdropPress = true,
}: GestureBottomSheetProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 600;
  const isShortScreen = SCREEN_HEIGHT < 700;
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  // Internal mounted state preserves modal mounting during smooth slide-down exits
  const [mounted, setMounted] = useState(visible);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropProgress = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);
  const hasCrossedThreshold = useSharedValue(false);

  const animateOpen = useCallback(() => {
    translateY.value = withSpring(0, {
      damping: 28,
      stiffness: 320,
      mass: 0.65,
    });
    backdropProgress.value = withTiming(1, { duration: 180 });
  }, [backdropProgress, translateY]);

  const handleDismiss = useCallback((velocity = 0) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Haptic.tap();
    Keyboard.dismiss();

    backdropProgress.value = withTiming(0, { duration: 160 });
    const clampedVelocity = Math.max(velocity, 0);

    if (clampedVelocity > 100) {
      translateY.value = withSpring(
        SCREEN_HEIGHT,
        {
          velocity: Math.max(clampedVelocity, 500),
          damping: 28,
          stiffness: 320,
          mass: 0.65,
        },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
            runOnJS(onCloseRef.current)();
            isClosingRef.current = false;
          }
        }
      );
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
          runOnJS(onCloseRef.current)();
          isClosingRef.current = false;
        }
      });
    }
  }, [backdropProgress, translateY, SCREEN_HEIGHT]);

  const triggerDetentHaptic = useCallback(() => {
    Haptic.select();
  }, []);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Manage open and close sliding animations cleanly without race conditions
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setMounted(true);
      translateY.value = SCREEN_HEIGHT;
      backdropProgress.value = 0;
      animateOpen();
    } else if (mounted && !isClosingRef.current) {
      // Parent triggered close: perform slide-down exit first
      isClosingRef.current = true;
      Keyboard.dismiss();
      backdropProgress.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
          isClosingRef.current = false;
        }
      });
    }
  }, [visible]);

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

  // Dedicated handle gesture: sensitive, captures any downward drag on the top grab bar
  const handleGesture = Gesture.Pan()
    .enabled(enablePanDownToClose)
    .activeOffsetY([3, 1000])
    .onBegin(() => {
      hasCrossedThreshold.value = false;
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropProgress.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT * 0.38],
          [1, 0.12],
          Extrapolation.CLAMP
        );

        if (event.translationY > DISMISS_THRESHOLD && !hasCrossedThreshold.value) {
          hasCrossedThreshold.value = true;
          runOnJS(triggerDetentHaptic)();
        } else if (event.translationY <= DISMISS_THRESHOLD && hasCrossedThreshold.value) {
          hasCrossedThreshold.value = false;
        }
      } else {
        // Natural rubber-band resistance when pulling upward
        translateY.value = -Math.pow(Math.abs(event.translationY), 0.72);
      }
    })
    .onEnd((event) => {
      hasCrossedThreshold.value = false;
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(handleDismiss)(event.velocityY);
      } else {
        translateY.value = withSpring(0, { velocity: event.velocityY, damping: 28, stiffness: 320, mass: 0.65 });
        backdropProgress.value = withTiming(1, { duration: 150 });
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

  if (!mounted && !visible) return null;

  const resolvedMaxHeight = isShortScreen && typeof maxHeight === 'string' && maxHeight.endsWith('%')
    ? '94%'
    : maxHeight;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => handleDismiss()}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalRoot}>
          {/* Animated Dimming Backdrop */}
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={dismissOnBackdropPress ? () => handleDismiss() : undefined}
              accessibilityRole="button"
              accessibilityLabel="Dismiss bottom sheet"
            />
          </Animated.View>

          {/* Bottom Sheet Card */}
          <Animated.View
            style={[
              styles.sheetCard,
              isTablet && styles.tabletSheetCard,
              {
                backgroundColor: C.surface,
                borderColor: C.surfaceBorder,
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
                maxHeight: resolvedMaxHeight,
                ...(height !== undefined ? { height } : {}),
              },
              sheetDynamicHeightStyle,
              containerStyle,
              sheetAnimatedStyle,
            ]}
          >
            {showHandle && (
              <GestureDetector gesture={handleGesture}>
                <View
                  style={styles.handleContainer}
                  hitSlop={{ top: 12, bottom: 12, left: 30, right: 30 }}
                >
                  <View style={[styles.handleBar, { backgroundColor: C.surfaceBorderLight }]} />
                </View>
              </GestureDetector>
            )}
            {children}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 26, 0.58)',
  },
  sheetCard: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 28,
  },
  tabletSheetCard: {
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs + 2,
    minHeight: 32,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: BorderRadius.full,
    opacity: 0.85,
  },
});
