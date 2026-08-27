import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps, Animated } from 'react-native';
import { BorderRadius, FontSize, FontWeight, Spacing, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, containerStyle, leftIcon, rightIcon, style, ...props }: InputProps) {
  const { C } = useThemeColors();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false, ...Motion.springFast }),
      Animated.timing(glowAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false, ...Motion.springDefault }),
      Animated.timing(glowAnim, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = error
    ? C.error
    : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surfaceBorder, C.primary] });

  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: error ? C.error : focused ? C.primary : C.textSecondary }]}>{label}</Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: focused ? C.surface : C.inputBg,
            borderColor,
            shadowColor: C.primary,
            shadowOpacity,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 14,
            elevation: focused ? 4 : 0,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, { color: C.textPrimary }, leftIcon ? styles.inputWithLeftIcon : null, style]}
          placeholderTextColor={C.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={C.primary}
          {...props}
        />
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </Animated.View>

      {error ? <Text style={[styles.error, { color: C.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.4,
    minHeight: 54,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 5,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  inputWithLeftIcon: { paddingLeft: Spacing.sm },
  iconLeft: { paddingLeft: Spacing.md },
  iconRight: { paddingRight: Spacing.md },
  error: {
    fontSize: FontSize.xs,
    marginLeft: 2,
    fontWeight: FontWeight.medium,
  },
});
