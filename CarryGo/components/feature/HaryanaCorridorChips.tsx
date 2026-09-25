import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

export const TOP_HARYANA_CORRIDORS = [
  { id: 'ggn-rtk', fromCity: 'Gurugram', toCity: 'Rohtak', label: 'Gurugram ↔ Rohtak' },
  { id: 'fbd-knl', fromCity: 'Faridabad', toCity: 'Karnal', label: 'Faridabad ↔ Karnal' },
  { id: 'pnp-amb', fromCity: 'Panipat', toCity: 'Ambala', label: 'Panipat ↔ Ambala' },
  { id: 'hsr-snp', fromCity: 'Hisar', toCity: 'Sonipat', label: 'Hisar ↔ Sonipat' },
  { id: 'pkl-krk', fromCity: 'Panchkula', toCity: 'Kurukshetra', label: 'Panchkula ↔ Kurukshetra' },
  { id: 'rew-ggn', fromCity: 'Rewari', toCity: 'Gurugram', label: 'Rewari ↔ Gurugram' },
] as const;

interface HaryanaCorridorChipsProps {
  activeFromCity?: string;
  activeToCity?: string;
  onSelectCorridor: (fromCity: string, toCity: string) => void;
  onClear?: () => void;
  title?: string;
}

export const HaryanaCorridorChips = React.memo(function HaryanaCorridorChips({
  activeFromCity,
  activeToCity,
  onSelectCorridor,
  onClear,
  title,
}: HaryanaCorridorChipsProps) {
  const { C } = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="bolt" size={16} color={C.primary} />
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            {title || 'Popular Haryana Corridors'}
          </Text>
        </View>
        {onClear && (activeFromCity || activeToCity) ? (
          <Pressable
            onPress={() => {
              Haptic.tap();
              onClear();
            }}
            hitSlop={TouchTarget.smallHitSlop}
            accessibilityRole="button"
            accessibilityLabel="Clear corridor filter"
          >
            <Text style={[styles.clearBtnText, { color: C.primary }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TOP_HARYANA_CORRIDORS.map((c) => {
          const isSelected =
            activeFromCity?.toLowerCase() === c.fromCity.toLowerCase() &&
            activeToCity?.toLowerCase() === c.toCity.toLowerCase();

          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? C.primarySubtle : C.surface,
                  borderColor: isSelected ? C.primary : C.surfaceBorder,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => {
                Haptic.select();
                if (isSelected) {
                  onClear?.();
                } else {
                  onSelectCorridor(c.fromCity, c.toCity);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Filter by corridor ${c.label}`}
            >
              <MaterialIcons
                name="directions"
                size={13}
                color={isSelected ? C.primary : C.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? C.primary : C.textPrimary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                  },
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  clearBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
  },
});
