import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AutosaveStatus } from '@/hooks/useFormDraft';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface AutosaveBadgeProps {
  status: AutosaveStatus;
  isRestored?: boolean;
  lastSavedAt?: Date | null;
}

export function AutosaveBadge({ status, isRestored, lastSavedAt }: AutosaveBadgeProps) {
  const { C } = useThemeColors();

  if (status === 'idle' && !isRestored) return null;

  return (
    <View style={[styles.badge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
      {status === 'saving' ? (
        <>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.text, { color: C.textSecondary }]}>Saving draft...</Text>
        </>
      ) : isRestored ? (
        <>
          <MaterialIcons name="restore" size={12} color={C.primary} />
          <Text style={[styles.text, { color: C.primary }]}>Draft restored</Text>
        </>
      ) : (
        <>
          <MaterialIcons name="check-circle" size={12} color="#10B981" />
          <Text style={[styles.text, { color: '#059669' }]}>
            Saved {lastSavedAt ? 'just now' : ''}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
});

