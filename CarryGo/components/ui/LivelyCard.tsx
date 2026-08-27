import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
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
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleOnPress,
      useNativeDriver: true,
      tension: Motion.springFast.tension,
      friction: Motion.springFast.friction,
    }).start();
  }, [scale, scaleOnPress]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: Motion.springBouncy.tension,
      friction: Motion.springBouncy.friction,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    if (hapticOnPress) Haptic.tap();
    onPress?.();
  }, [hapticOnPress, onPress]);

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
    <Animated.View style={[styles.card, cardStyle, style, { transform: [{ scale }] }]}>
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
