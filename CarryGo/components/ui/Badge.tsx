import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, FontSize } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type BadgeVariant = 'pending' | 'accepted' | 'rejected' | 'inTransit' | 'delivered' | 'open' | 'matched' | 'active' | 'cancelled' | 'failed';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'pending' }: BadgeProps) {
  const { C } = useThemeColors();
  const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
    pending: { bg: C.warningSubtle, text: C.warning },
    accepted: { bg: C.successSubtle, text: C.success },
    rejected: { bg: C.errorSubtle, text: C.error },
    inTransit: { bg: C.primarySubtle, text: C.primary },
    delivered: { bg: C.successSubtle, text: C.success },
    open: { bg: C.primarySubtle, text: C.primaryDark },
    matched: { bg: C.successSubtle, text: C.success },
    active: { bg: C.successSubtle, text: C.success },
    cancelled: { bg: C.surfaceElevated, text: C.textMuted },
    failed: { bg: C.errorSubtle, text: C.error },
  };
  const vs = variantStyles[variant] || variantStyles.pending;
  return (
    <View style={[styles.badge, { backgroundColor: vs.bg, borderColor: C.surfaceBorder }]}>
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
