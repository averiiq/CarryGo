import React, { useCallback } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing, Motion } from '@/constants/theme';
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
  imageBackground?: any;
  imageOpacity?: number;
}

export function LivelyCard({
  children,
  onPress,
  style,
  scaleOnPress = Motion.cardScale,
  elevated = false,
  glowColor,
  disabled,
  hapticOnPress = true,
  imageBackground,
  imageOpacity = 0.14,
}: LivelyCardProps) {
  const { C, isDark } = useThemeColors();
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: pressOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleOnPress, { damping: 15, stiffness: 400, mass: 0.4 });
    pressOpacity.value = withTiming(0.95, { duration: 80 });
  }, [scale, pressOpacity, scaleOnPress]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200, mass: 0.5 });
    pressOpacity.value = withTiming(1, { duration: 150 });
  }, [scale, pressOpacity]);

  const handlePress = useCallback(() => {
    if (hapticOnPress) Haptic.tap();
    // Micro-bounce feedback
    scale.value = withSequence(
      withSpring(1.01, { damping: 15, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    onPress?.();
  }, [hapticOnPress, onPress, scale]);

  const cardStyle: ViewStyle = {
    backgroundColor: C.surface,
    borderColor: C.surfaceBorder,
    ...(elevated && {
      shadowColor: glowColor || '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 20,
      elevation: 10,
    }),
  };

  const content = (
    <Animated.View style={[styles.card, cardStyle, style, animStyle]}>
      {imageBackground ? (
        <Image
          source={imageBackground}
          style={[styles.imageBg, { opacity: imageOpacity }]}
          contentFit="cover"
          transition={220}
        />
      ) : null}
      {children}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  imageBg: {
    ...StyleSheet.absoluteFillObject,
  },
});
