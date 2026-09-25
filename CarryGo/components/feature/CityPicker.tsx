import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const ALL_CITY_NAMES = INDIAN_CITIES.map(c => c.name);

type CityPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
  title: string;
  dotColor: string;
  C: ThemeColors;
  cities?: string[];
};

export function CityPicker({
  visible,
  onClose,
  onSelect,
  title,
  dotColor,
  C,
  cities = ALL_CITY_NAMES,
}: CityPickerProps) {
  const [search, setSearch] = useState('');

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const lower = search.toLowerCase().trim();
    return cities.filter(c => c.toLowerCase().includes(lower));
  }, [cities, search]);

  const showCustomOption = search.trim().length >= 2 &&
    !filteredCities.some(c => c.toLowerCase() === search.toLowerCase().trim());

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleSelect = (city: string) => {
    onSelect(city.trim());
    setSearch('');
    Haptic.select();
  };

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeight="82%"
      showHandle
      enablePanDownToClose
    >
      <View style={styles.contentWrap}>
        {/* Header with Title and Close button */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={[styles.titleDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>{title}</Text>
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeCircle,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Search Field with Clear Button */}
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search or type any city..."
            value={search}
            onChangeText={setSearch}
            autoFocus
            leftIcon={<MaterialIcons name="search" size={20} color={C.textMuted} />}
            rightIcon={
              search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <MaterialIcons name="cancel" size={18} color={C.textMuted} />
                </Pressable>
              ) : null
            }
          />
        </View>

        {/* Scrollable City List */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {showCustomOption && (
            <Pressable
              style={({ pressed }) => [
                styles.cityOption,
                styles.customCityOption,
                {
                  borderBottomColor: C.surfaceBorder,
                  backgroundColor: pressed ? C.primarySubtle : C.surfaceElevated,
                  borderColor: C.primary + '40',
                },
              ]}
              onPress={() => handleSelect(search.trim())}
            >
              <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="add-location-alt" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cityOptionText, { color: C.textPrimary, fontWeight: FontWeight.semibold }]}>
                  Use &quot;{search.trim()}&quot;
                </Text>
                <Text style={[styles.customCitySub, { color: C.textMuted }]}>Custom Indian Location</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={12} color={C.primary} />
            </Pressable>
          )}

          {filteredCities.map((city) => (
            <Pressable
              key={city}
              style={({ pressed }) => [
                styles.cityOption,
                {
                  borderBottomColor: C.surfaceBorder,
                  backgroundColor: pressed ? C.surfaceElevated : 'transparent',
                },
              ]}
              onPress={() => handleSelect(city)}
            >
              <View style={[styles.cityDotSmall, { backgroundColor: dotColor }]} />
              <Text style={[styles.cityOptionText, { color: C.textPrimary }]}>{city}</Text>
              <MaterialIcons name="north-west" size={14} color={C.textMuted} style={styles.selectIcon} />
            </Pressable>
          ))}

          {filteredCities.length === 0 && !showCustomOption && (
            <View style={styles.emptyState}>
              <MaterialIcons name="location-off" size={32} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>No matching cities</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Type full city name to select custom</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginBottom: Spacing.sm,
  },
  listScroll: {
    maxHeight: 320,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityOptionText: {
    fontSize: FontSize.md,
    flex: 1,
  },
  selectIcon: {
    opacity: 0.6,
  },
  customCityOption: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCitySub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  emptySub: {
    fontSize: FontSize.xs,
  },
});
