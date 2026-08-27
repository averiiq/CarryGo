import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
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
  const scale = useRef(new Animated.Value(1)).current;
  const shouldInteractive = Boolean(interactive || onPress);

  const baseStyle: ViewStyle = {
    backgroundColor: elevated ? C.surfaceElevated : C.surface,
    borderColor: C.surfaceBorder,
  };

  const content = (
    <Animated.View
      style={[
        styles.card,
        baseStyle,
        elevated ? S.card : null,
        padded ? styles.padded : styles.compact,
        shouldInteractive ? { transform: [{ scale }] } : null,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!shouldInteractive) return content;

  return (
    <Pressable
      onPress={() => {
        Haptic.select();
        onPress?.();
      }}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: Motion.cardScale,
          useNativeDriver: true,
          tension: Motion.springFast.tension,
          friction: Motion.springFast.friction,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: Motion.springBouncy.tension,
          friction: Motion.springBouncy.friction,
        }).start();
      }}
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
    padding: Spacing.md,
  },
  compact: {
    padding: 0,
  },
});
