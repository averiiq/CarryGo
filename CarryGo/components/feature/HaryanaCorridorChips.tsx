import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

export const TOP_HARYANA_CORRIDORS = [
  { id: 'del-ggn', fromCity: 'Delhi', toCity: 'Gurugram', label: 'Delhi ↔ Gurugram', distance: '32 km' },
  { id: 'ggn-rtk', fromCity: 'Gurugram', toCity: 'Rohtak', label: 'Gurugram ↔ Rohtak', distance: '75 km' },
  { id: 'del-chd', fromCity: 'Delhi', toCity: 'Chandigarh', label: 'Delhi ↔ Chandigarh', distance: '245 km' },
  { id: 'del-jpr', fromCity: 'Delhi', toCity: 'Jaipur', label: 'Delhi ↔ Jaipur', distance: '270 km' },
  { id: 'fbd-knl', fromCity: 'Faridabad', toCity: 'Karnal', label: 'Faridabad ↔ Karnal', distance: '150 km' },
  { id: 'pnp-amb', fromCity: 'Panipat', toCity: 'Ambala', label: 'Panipat ↔ Ambala', distance: '115 km' },
  { id: 'noi-agr', fromCity: 'Noida', toCity: 'Agra', label: 'Noida ↔ Agra', distance: '195 km' },
  { id: 'hsr-snp', fromCity: 'Hisar', toCity: 'Sonipat', label: 'Hisar ↔ Sonipat', distance: '140 km' },
  { id: 'rew-ggn', fromCity: 'Rewari', toCity: 'Gurugram', label: 'Rewari ↔ Gurugram', distance: '55 km' },
] as const;

interface HaryanaCorridorChipsProps {
  activeFromCity?: string;
  activeToCity?: string;
  onSelectCorridor: (fromCity: string, toCity: string) => void;
  onClear?: () => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
  compactPadding?: boolean;
}

export const HaryanaCorridorChips = React.memo(function HaryanaCorridorChips({
  activeFromCity,
  activeToCity,
  onSelectCorridor,
  onClear,
  title,
  style,
  compactPadding = false,
}: HaryanaCorridorChipsProps) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.container, compactPadding && styles.containerCompact, style]}>
      <View style={[styles.headerRow, compactPadding && styles.headerRowCompact]}>
        <View style={styles.titleRow}>
          <View style={[styles.boltBadge, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="bolt" size={13} color={C.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            {title || 'Popular Corridors (1-Tap Route)'}
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
        contentContainerStyle={[styles.scrollContent, compactPadding && styles.scrollContentCompact]}
      >
        {TOP_HARYANA_CORRIDORS.map((c) => {
          const isSelected =
            (activeFromCity?.toLowerCase() === c.fromCity.toLowerCase() &&
              activeToCity?.toLowerCase() === c.toCity.toLowerCase()) ||
            (activeFromCity?.toLowerCase() === c.toCity.toLowerCase() &&
              activeToCity?.toLowerCase() === c.fromCity.toLowerCase());

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
              accessibilityLabel={`Select corridor ${c.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <MaterialIcons
                name={isSelected ? 'check-circle' : 'alt-route'}
                size={14}
                color={isSelected ? C.primary : C.textMuted}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? C.primaryDark : C.textPrimary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                  },
                ]}
              >
                {c.label}
              </Text>
              {c.distance ? (
                <View
                  style={[
                    styles.distanceTag,
                    {
                      backgroundColor: isSelected ? C.primary + '20' : C.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.distanceText,
                      { color: isSelected ? C.primaryDark : C.textMuted },
                    ]}
                  >
                    {c.distance}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  containerCompact: {
    marginHorizontal: -Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
  },
  headerRowCompact: {
    paddingHorizontal: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boltBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContentCompact: {
    paddingHorizontal: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.2,
    minHeight: 36,
  },
  chipText: {
    fontSize: FontSize.xs,
  },
  distanceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
});
