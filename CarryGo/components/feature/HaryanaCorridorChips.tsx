import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import {
  getDynamicPopularCorridors,
  recordCorridorUsage,
  PopularCorridor,
} from '@/services/corridors.service';

/**
 * Base permitted corridors strictly in Haryana and Delhi corridors (no Jaipur, Agra, or out-of-region routes).
 * Exported for backwards-compatibility.
 */
export const TOP_HARYANA_CORRIDORS = [
  { id: 'del-ggn', fromCity: 'Delhi', toCity: 'Gurugram', label: 'Delhi ↔ Gurugram', distance: '32 km' },
  { id: 'ggn-rtk', fromCity: 'Gurugram', toCity: 'Rohtak', label: 'Gurugram ↔ Rohtak', distance: '75 km' },
  { id: 'del-chd', fromCity: 'Delhi', toCity: 'Chandigarh', label: 'Delhi ↔ Chandigarh', distance: '245 km' },
  { id: 'del-fbd', fromCity: 'Delhi', toCity: 'Faridabad', label: 'Delhi ↔ Faridabad', distance: '28 km' },
  { id: 'fbd-knl', fromCity: 'Faridabad', toCity: 'Karnal', label: 'Faridabad ↔ Karnal', distance: '150 km' },
  { id: 'pnp-amb', fromCity: 'Panipat', toCity: 'Ambala', label: 'Panipat ↔ Ambala', distance: '115 km' },
  { id: 'hsr-snp', fromCity: 'Hisar', toCity: 'Sonipat', label: 'Hisar ↔ Sonipat', distance: '140 km' },
  { id: 'rew-ggn', fromCity: 'Rewari', toCity: 'Gurugram', label: 'Rewari ↔ Gurugram', distance: '55 km' },
  { id: 'del-pnp', fromCity: 'Delhi', toCity: 'Panipat', label: 'Delhi ↔ Panipat', distance: '88 km' },
  { id: 'del-rtk', fromCity: 'Delhi', toCity: 'Rohtak', label: 'Delhi ↔ Rohtak', distance: '70 km' },
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
  const [corridors, setCorridors] = useState<PopularCorridor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCorridors = useCallback(async () => {
    try {
      const dynamicList = await getDynamicPopularCorridors(8);
      if (dynamicList && dynamicList.length > 0) {
        setCorridors(dynamicList);
      } else {
        setCorridors(
          TOP_HARYANA_CORRIDORS.map((c) => ({
            ...c,
            usageCount: 0,
            lastUsedAt: 0,
          }))
        );
      }
    } catch {
      setCorridors(
        TOP_HARYANA_CORRIDORS.map((c) => ({
          ...c,
          usageCount: 0,
          lastUsedAt: 0,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCorridors();
  }, [loadCorridors]);

  const handleSelect = (c: PopularCorridor) => {
    Haptic.select();
    void recordCorridorUsage(c.fromCity, c.toCity);
    onSelectCorridor(c.fromCity, c.toCity);
  };

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

      {loading && corridors.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          contentContainerStyle={[styles.scrollContent, compactPadding && styles.scrollContentCompact]}
        >
          {corridors.map((c) => {
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
                  if (isSelected) {
                    Haptic.tap();
                    onClear?.();
                  } else {
                    handleSelect(c);
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
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  containerCompact: {
    marginVertical: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  headerRowCompact: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boltBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  clearBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
    paddingBottom: 2,
  },
  scrollContentCompact: {
    paddingHorizontal: 0,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
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
    fontWeight: FontWeight.medium,
  },
  loadingBox: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
