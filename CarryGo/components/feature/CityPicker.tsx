import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={[styles.pickerOverlay, { backgroundColor: C.overlay }]}
        onPress={handleClose}
      />
      <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.pickerHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>{title}</Text>
        <Input
          placeholder="Search or type any city..."
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
          {showCustomOption && (
            <Pressable
              style={({ pressed }) => [
                styles.cityOption,
                styles.customCityOption,
                {
                  borderBottomColor: C.surfaceBorder,
                  backgroundColor: pressed ? C.primarySubtle : C.surfaceElevated,
                },
              ]}
              onPress={() => handleSelect(search.trim())}
            >
              <MaterialIcons name="add-location" size={18} color={dotColor} />
              <Text style={[styles.cityOptionText, { color: C.textPrimary, fontWeight: FontWeight.semibold }]}>
                Use &quot;{search.trim()}&quot;
              </Text>
            </Pressable>
          )}
          {filteredCities.map(city => (
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
            </Pressable>
          ))}
          {filteredCities.length === 0 && !showCustomOption && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>No cities found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '75%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  cityDotSmall: { width: 8, height: 8, borderRadius: 4 },
  cityOptionText: { fontSize: FontSize.md },
  customCityOption: { borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center' as const },
  emptyText: { fontSize: FontSize.sm },
});
