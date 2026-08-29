import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSize, FontWeight, Spacing, Gradients, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

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
}: ButtonProps) {
  const { C, S } = useThemeColors();
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: Motion.pressScale,
      useNativeDriver: true,
      tension: Motion.springFast.tension,
      friction: Motion.springFast.friction,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: Motion.springDefault.tension,
      friction: Motion.springDefault.friction,
    }).start();
  };

  const handlePress = () => {
    if (isDisabled) return;
    Haptic.tap();
    onPress();
  };

  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const textSizeStyle = size === 'sm' ? styles.textSizeSm : size === 'lg' ? styles.textSizeLg : styles.textSizeMd;

  const variantBg = {
    primary: 'transparent',
    secondary: C.surfaceElevated,
    outline: 'transparent',
    ghost: 'transparent',
    danger: C.error,
  }[variant];

  const variantBorder = {
    primary: 'transparent',
    secondary: C.surfaceBorder,
    outline: C.primary,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  const textColor = {
    primary: C.textInverse,
    secondary: C.textPrimary,
    outline: C.primary,
    ghost: C.primary,
    danger: C.textInverse,
  }[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          sizeStyle,
          {
            backgroundColor: variantBg,
            borderColor: variantBorder,
            borderWidth: variant === 'ghost' ? 0 : 1.2,
          },
          variant === 'primary' ? S.sm : null,
          isDisabled && styles.disabled,
        ]}
      >
        {variant === 'primary' ? (
          <>
            <LinearGradient
              colors={Gradients.primaryVibrant}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: BorderRadius.md }]}
            />
          </>
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

  sizeSm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 40 },
  sizeMd: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 4, minHeight: 52 },
  sizeLg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 60 },

  text: { fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
  textSizeSm: { fontSize: FontSize.sm },
  textSizeMd: { fontSize: FontSize.md },
  textSizeLg: { fontSize: FontSize.lg },
});
