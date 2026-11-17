import React, { useCallback } from 'react';
import { StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, Spacing, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
  interactive?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, elevated = false, padded = true, interactive = false, onPress }: CardProps) {
  const { C, S } = useThemeColors();
  const scale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const shouldInteractive = Boolean(interactive || onPress);

  const animStyle = useAnimatedStyle(() => {
    if (!shouldInteractive) return {};
    return {
      transform: [{ scale: scale.value }],
      opacity: cardOpacity.value,
    };
  });

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(Motion.cardScale, { damping: 15, stiffness: 400, mass: 0.4 });
    cardOpacity.value = withTiming(0.95, { duration: 80 });
  }, [scale, cardOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200, mass: 0.5 });
    cardOpacity.value = withTiming(1, { duration: 150 });
  }, [scale, cardOpacity]);

  const handlePress = useCallback(() => {
    Haptic.select();
    // Spring bounce on tap
    scale.value = withSequence(
      withSpring(1.01, { damping: 15, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    onPress?.();
  }, [onPress, scale]);

  const baseStyle: ViewStyle = {
    backgroundColor: elevated ? C.surfaceElevated : C.surface,
    borderColor: C.surfaceBorder,
  };

  const content = (
    <Animated.View
      style={[
        styles.card,
        baseStyle,
        elevated ? S.card : S.sm,
        padded ? styles.padded : styles.compact,
        shouldInteractive ? animStyle : null,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!shouldInteractive) return content;

  return (
    <Pressable
      android_ripple={{ color: C.overlayLight }}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.mdl,
  },
  compact: {
    padding: 0,
  },
});
