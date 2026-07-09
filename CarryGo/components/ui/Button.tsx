import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSize, FontWeight, Spacing, Gradients, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  const { C } = useThemeColors();
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

  const sizeStyle = size === 'sm' ? styles.size_sm : size === 'lg' ? styles.size_lg : styles.size_md;
  const textSizeStyle = size === 'sm' ? styles.textSize_sm : size === 'lg' ? styles.textSize_lg : styles.textSize_md;

  const variantBg = {
    primary: 'transparent',
    secondary: C.surfaceElevated,
    outline: 'transparent',
    ghost: 'transparent',
    danger: C.error,
  }[variant];

  const variantBorder = variant === 'outline' ? C.primary : 'transparent';

  const textColor = {
    primary: '#FFFFFF',
    secondary: C.textPrimary,
    outline: C.primary,
    ghost: C.primary,
    danger: '#FFFFFF',
  }[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          sizeStyle,
          {
            backgroundColor: variantBg,
            borderColor: variantBorder,
            borderWidth: variant === 'outline' ? 1.5 : 0,
          },
          isDisabled && styles.disabled,
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={Gradients.primaryVibrant}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.8 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: BorderRadius.md }]}
          />
        ) : null}
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, textSizeStyle, { color: textColor }, textStyle]}>
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
  disabled: { opacity: 0.45 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  size_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 38 },
  size_md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 4, minHeight: 50 },
  size_lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 58 },

  text: { fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
  textSize_sm: { fontSize: FontSize.sm },
  textSize_md: { fontSize: FontSize.md },
  textSize_lg: { fontSize: FontSize.lg },
});
