import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSize, FontWeight, Spacing, Gradients, Motion, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import type { Insets } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  hitSlop?: Insets;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  hitSlop,
}: ButtonProps) {
  const { C, S } = useThemeColors();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const btnOpacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: btnOpacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(Motion.pressScale, { damping: 15, stiffness: 400, mass: 0.4 });
    btnOpacity.value = withTiming(0.93, { duration: 80 });
  }, [scale, btnOpacity]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 });
    btnOpacity.value = withTiming(1, { duration: 120 });
  }, [scale, btnOpacity]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    Haptic.tap();
    // Satisfying micro-bounce feedback
    scale.value = withSequence(
      withSpring(1.02, { damping: 15, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    onPress();
  }, [isDisabled, onPress, scale]);

  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const textSizeStyle = size === 'sm' ? styles.textSizeSm : size === 'lg' ? styles.textSizeLg : styles.textSizeMd;

  const variantBg = {
    primary: 'transparent',
    secondary: C.surface,
    outline: 'transparent',
    ghost: C.primarySubtle,
    danger: C.error,
  }[variant];

  const variantBorder = {
    primary: 'transparent',
    secondary: C.surfaceBorder,
    outline: C.primaryDark,
    ghost: C.primarySubtle,
    danger: 'transparent',
  }[variant];

  const textColor = {
    primary: C.textInverse,
    secondary: C.textPrimary,
    outline: C.primary,
    ghost: C.primaryDark,
    danger: C.textInverse,
  }[variant];

  return (
    <Animated.View style={[animStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        hitSlop={hitSlop ?? (size === 'sm' ? TouchTarget.smallHitSlop : undefined)}
        style={[
          styles.base,
          sizeStyle,
          {
            backgroundColor: variantBg,
            borderColor: variantBorder,
            borderWidth: variant === 'ghost' ? 0 : 1.2,
          },
          variant === 'primary' ? S.sm : null,
          variant === 'secondary' ? S.card : null,
          isDisabled && styles.disabled,
        ]}
        android_ripple={{ color: C.overlayLight }}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={Gradients.primaryVibrant}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: BorderRadius.md }]}
            pointerEvents="none"
          />
        ) : null}

        {loading ? (
          <ActivityIndicator color={textColor} size={'small'} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, textSizeStyle, { color: textColor }, textStyle]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  sizeSm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.smd, minHeight: 44 },
  sizeMd: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.smd, minHeight: 52 },
  sizeLg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 62 },

  text: { fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
  textSizeSm: { fontSize: FontSize.sm },
  textSizeMd: { fontSize: FontSize.md },
  textSizeLg: { fontSize: FontSize.lg },
});
