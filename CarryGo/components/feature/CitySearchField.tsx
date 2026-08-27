import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const ALL_CITY_NAMES = INDIAN_CITIES.map(c => c.name);

type CitySearchFieldProps = {
  label: string;
  value: string;
  onSelect: (city: string) => void;
  dotColor: string;
  error?: string;
  placeholder?: string;
  onUseCurrentLocation?: () => void;
  isDetectingCurrentLocation?: boolean;
  currentLocationLabel?: string;
};

export function CitySearchField({
  label,
  value,
  onSelect,
  dotColor,
  error,
  placeholder = 'Search city...',
  onUseCurrentLocation,
  isDetectingCurrentLocation = false,
  currentLocationLabel = 'Use Current Location',
}: CitySearchFieldProps) {
  const { C } = useThemeColors();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const filteredCities = query.length > 0
    ? ALL_CITY_NAMES.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const showCustomOption = query.trim().length >= 2 &&
    !filteredCities.some(c => c.toLowerCase() === query.toLowerCase().trim());

  const showCurrentLocationOption = Boolean(onUseCurrentLocation);

  const handleSelect = useCallback((city: string) => {
    onSelect(city);
    setQuery('');
    setIsOpen(false);
    Haptic.select();
    inputRef.current?.blur();
  }, [onSelect]);

  const handleFocus = () => {
    setIsOpen(true);
    if (value) setQuery(value);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleClear = () => {
    setQuery('');
    onSelect('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: error ? C.error : C.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: C.inputBg,
            borderColor: error ? C.error : isOpen ? C.primary : C.surfaceBorder,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: C.textPrimary }]}
          value={isOpen ? query : value}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          selectionColor={C.primary}
          autoCorrect={false}
        />
        {(value || query) && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {isOpen && (filteredCities.length > 0 || showCustomOption || showCurrentLocationOption) && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
        >
          {showCurrentLocationOption && (
            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed && !isDetectingCurrentLocation ? C.surfaceElevated : 'transparent' },
              ]}
              onPress={() => onUseCurrentLocation?.()}
              disabled={isDetectingCurrentLocation}
            >
              {isDetectingCurrentLocation ? (
                <ActivityIndicator size="small" color={dotColor} />
              ) : (
                <MaterialIcons name="my-location" size={16} color={dotColor} />
              )}
              <Text style={[styles.optionText, { color: C.textPrimary, fontWeight: FontWeight.semibold }]}>
                {isDetectingCurrentLocation ? 'Detecting location...' : currentLocationLabel}
              </Text>
            </Pressable>
          )}
          {showCustomOption && (
            <Pressable
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? C.primarySubtle : C.surfaceElevated },
              ]}
              onPress={() => handleSelect(query.trim())}
            >
              <MaterialIcons name="add-location" size={16} color={dotColor} />
              <Text style={[styles.optionText, { color: C.textPrimary, fontWeight: FontWeight.semibold }]}>
                Use &quot;{query.trim()}&quot;
              </Text>
            </Pressable>
          )}
          {filteredCities.map((city) => (
            <Pressable
              key={city}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? C.surfaceElevated : 'transparent' },
              ]}
              onPress={() => handleSelect(city)}
            >
              <View style={[styles.optionDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.optionText, { color: C.textPrimary }]}>{city}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      {error && <Text style={[styles.error, { color: C.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, zIndex: 10 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm + 4,
  },
  clearBtn: { padding: 4 },
  dropdown: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { fontSize: FontSize.md },
  error: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
});
