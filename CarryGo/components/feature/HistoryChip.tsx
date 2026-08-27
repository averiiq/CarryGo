import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeColors, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface SearchHistoryEntry {
  fromCity: string;
  toCity: string;
  timestamp: number;
}

export interface HistoryChipProps {
  entry: SearchHistoryEntry;
  onPress: () => void;
  onRemove: () => void;
  C: ThemeColors;
}

export function HistoryChip({ entry, onPress, onRemove, C }: HistoryChipProps) {
  return (
    <View style={[styles.historyChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
      <Pressable style={styles.historyChipInner} onPress={() => { Haptic.tap(); onPress(); }}>
        <MaterialIcons name="history" size={12} color={C.textMuted} />
        <Text style={[styles.historyChipText, { color: C.textSecondary }]}>
          {entry.fromCity} → {entry.toCity}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.historyChipRemove, { backgroundColor: C.surfaceBorder }]}
        onPress={() => { Haptic.tap(); onRemove(); }}
        hitSlop={6}
      >
        <MaterialIcons name="close" size={10} color={C.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  historyChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.full, borderWidth: 1, overflow: 'hidden',
  },
  historyChipInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 10, paddingVertical: 8 },
  historyChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  historyChipRemove: {
    paddingHorizontal: 8, paddingVertical: 8,
    marginLeft: 4,
  },
});
