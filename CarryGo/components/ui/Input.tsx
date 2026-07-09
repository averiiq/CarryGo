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

  const handleFocus = () => {
    setFocused(true);
    Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false, ...Motion.springFast }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false, ...Motion.springDefault }).start();
  };

  const borderColor = error
    ? C.error
    : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surfaceBorder, C.primary] });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: focused ? C.primary : C.textSecondary }]}>{label}</Text> : null}
      <Animated.View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor }]}>
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
  container: { gap: 6 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
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
