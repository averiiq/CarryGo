import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeColors } from '@/constants/theme';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface CityDropdownProps {
  suggestions: string[];
  onSelect: (c: string) => void;
  accent: string;
  C: ThemeColors;
}

export function CityDropdown({ suggestions, onSelect, accent, C }: CityDropdownProps) {
  if (suggestions.length === 0) return null;
  return (
    <View style={[styles.dropdown, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
      {suggestions.slice(0, 6).map((city, i) => (
        <Pressable
          key={city}
          style={({ pressed }) => [
            styles.dropdownItem,
            { borderBottomColor: C.surfaceBorder },
            i === suggestions.length - 1 && { borderBottomWidth: 0 },
            pressed && { backgroundColor: C.primarySubtle },
          ]}
          onPress={() => { Haptic.select(); onSelect(city); }}
        >
          <View style={[styles.dropdownIcon, { backgroundColor: accent + '18' }]}>
            <MaterialIcons name="location-on" size={13} color={accent} />
          </View>
          <Text style={[styles.dropdownText, { color: C.textPrimary }]}>{city}</Text>
          <MaterialIcons name="north-west" size={12} color={C.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    marginHorizontal: Spacing.md, marginTop: 4, overflow: 'hidden',
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    borderBottomWidth: 1,
  },
  dropdownIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdownText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
