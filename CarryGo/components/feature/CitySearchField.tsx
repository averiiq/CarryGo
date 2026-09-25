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
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Sync internal query when value prop changes from outside (e.g. location auto-detect)
  React.useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filteredCities = query.trim().length > 0
    ? ALL_CITY_NAMES.filter((c) => c.toLowerCase().includes(query.toLowerCase().trim())).slice(0, 6)
    : [];

  const showCustomOption = query.trim().length >= 2 &&
    !filteredCities.some(c => c.toLowerCase() === query.toLowerCase().trim());

  const showCurrentLocationOption = Boolean(onUseCurrentLocation);

  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelect = useCallback((city: string) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    onSelect(city);
    setQuery(city);
    setIsOpen(false);
    Haptic.select();
    inputRef.current?.blur();
  }, [onSelect]);

  const handleLocationPress = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (isDetectingCurrentLocation) return;
    Haptic.tap();
    setIsOpen(false);
    inputRef.current?.blur();
    onUseCurrentLocation?.();
  }, [isDetectingCurrentLocation, onUseCurrentLocation]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsOpen(true);
    setQuery(value || '');
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setQuery(value || '');
    }, 280);
  };

  const handleClear = () => {
    setQuery('');
    onSelect('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: error ? C.error : C.textSecondary }]}>{label}</Text>
        {showCurrentLocationOption && !value && (
          <Pressable
            onPress={handleLocationPress}
            disabled={isDetectingCurrentLocation}
            style={({ pressed }) => [
              styles.quickGpsBtn,
              { backgroundColor: C.primarySubtle },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={6}
          >
            {isDetectingCurrentLocation ? (
              <ActivityIndicator size="small" color={C.primary} style={{ transform: [{ scale: 0.75 }] }} />
            ) : (
              <MaterialIcons name="my-location" size={12} color={C.primary} />
            )}
            <Text style={[styles.quickGpsText, { color: C.primary }]}>
              {isDetectingCurrentLocation ? 'Detecting GPS...' : 'Use GPS'}
            </Text>
          </Pressable>
        )}
      </View>

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
          onChangeText={(text) => {
            setQuery(text);
            if (!isOpen) setIsOpen(true);
            if (!text) onSelect('');
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          selectionColor={C.primary}
          autoCorrect={false}
        />

        {Boolean(value || query) && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={C.textMuted} />
          </Pressable>
        )}

        {showCurrentLocationOption && (
          <Pressable
            onPress={handleLocationPress}
            disabled={isDetectingCurrentLocation}
            style={({ pressed }) => [
              styles.locationIconBtn,
              { backgroundColor: isDetectingCurrentLocation ? C.primarySubtle : C.surfaceElevated },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            accessibilityLabel="Use current location"
          >
            {isDetectingCurrentLocation ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <MaterialIcons name="my-location" size={16} color={C.primary} />
            )}
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
              onPress={handleLocationPress}
              disabled={isDetectingCurrentLocation}
            >
              {isDetectingCurrentLocation ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <MaterialIcons name="my-location" size={17} color={C.primary} />
              )}
              <Text style={[styles.optionText, { color: C.primary, fontWeight: FontWeight.semibold }]}>
                {isDetectingCurrentLocation ? 'Detecting current city...' : currentLocationLabel}
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
              accessibilityRole="button"
              accessibilityLabel={`Select ${city}`}
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  quickGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  quickGpsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
  locationIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
