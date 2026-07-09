import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  const { C, S } = useThemeColors();
  return (
    <View style={[
      styles.card,
      { backgroundColor: C.surface, borderColor: C.surfaceBorder },
      elevated && [{ backgroundColor: C.surfaceElevated }, S.card],
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
});
