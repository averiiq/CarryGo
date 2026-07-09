import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';

type BadgeVariant = 'pending' | 'accepted' | 'rejected' | 'inTransit' | 'delivered' | 'open' | 'matched' | 'active' | 'cancelled' | 'failed';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  pending: { bg: Colors.warningSubtle, text: Colors.warning },
  accepted: { bg: Colors.successSubtle, text: Colors.success },
  rejected: { bg: Colors.errorSubtle, text: Colors.error },
  inTransit: { bg: Colors.primarySubtle, text: Colors.primary },
  delivered: { bg: Colors.successSubtle, text: Colors.success },
  open: { bg: Colors.primarySubtle, text: Colors.primaryLight },
  matched: { bg: Colors.successSubtle, text: Colors.success },
  active: { bg: Colors.successSubtle, text: Colors.success },
  cancelled: { bg: 'rgba(82,82,91,0.3)', text: Colors.textMuted },
  failed: { bg: Colors.errorSubtle, text: Colors.error },
};

export function Badge({ label, variant = 'pending' }: BadgeProps) {
  const vs = variantStyles[variant] || variantStyles.pending;
  return (
    <View style={[styles.badge, { backgroundColor: vs.bg }]}>
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
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
