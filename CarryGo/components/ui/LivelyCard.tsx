import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

interface LivelyCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleOnPress?: number;
  elevated?: boolean;
  glowColor?: string;
  disabled?: boolean;
  hapticOnPress?: boolean;
}

export function LivelyCard({
  children,
  onPress,
  style,
  scaleOnPress = 0.975,
  elevated = false,
  glowColor,
  disabled,
  hapticOnPress = true,
}: LivelyCardProps) {
  const { C, isDark } = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;
  const elevation = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleOnPress, useNativeDriver: true, tension: 350, friction: 20 }),
      Animated.timing(elevation, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [scale, elevation, scaleOnPress]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }),
      Animated.timing(elevation, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [scale, elevation]);

  const handlePress = useCallback(() => {
    if (hapticOnPress) Haptic.tap();
    onPress?.();
  }, [hapticOnPress, onPress]);

  const cardStyle: ViewStyle = {
    backgroundColor: C.surface,
    borderColor: C.surfaceBorder,
    ...(elevated && {
      shadowColor: glowColor || (isDark ? '#7C3AED' : '#000'),
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 20,
      elevation: 10,
    }),
  };

  if (!onPress) {
    return (
      <Animated.View style={[styles.card, cardStyle, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[styles.card, cardStyle, style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
});
