import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { INDIAN_CITIES, IndianCity } from '@/constants/indian-cities';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface CitySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
  title: string;
  subtitle?: string;
  selectedCity?: string;
  dotColor?: string;
  onUseCurrentLocation?: () => void;
  isDetectingLocation?: boolean;
}

const POPULAR_HUBS = [
  'Gurugram',
  'Delhi',
  'Faridabad',
  'Rohtak',
  'Panipat',
  'Chandigarh',
  'Hisar',
  'Sonipat',
  'Karnal',
  'Ambala',
  'Rewari',
];

export function CitySelectModal({
  visible,
  onClose,
  onSelect,
  title,
  subtitle,
  selectedCity,
  dotColor = '#10B981',
  onUseCurrentLocation,
  isDetectingLocation = false,
}: CitySelectModalProps) {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  // Reset query when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
    }
  }, [visible]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return INDIAN_CITIES;
    }
    return INDIAN_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q))
    );
  }, [query]);

  const showCustomOption = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      q.length >= 2 &&
      !INDIAN_CITIES.some((c) => c.name.toLowerCase() === q)
    );
  }, [query]);

  const handleSelectCity = useCallback(
    (cityName: string) => {
      Haptic.select();
      onSelect(cityName);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleUseGps = useCallback(() => {
    if (isDetectingLocation) return;
    Haptic.tap();
    onUseCurrentLocation?.();
    onClose();
  }, [isDetectingLocation, onUseCurrentLocation, onClose]);

  const renderCityItem = useCallback(
    ({ item }: { item: IndianCity }) => {
      const isSelected = selectedCity?.toLowerCase() === item.name.toLowerCase();

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}`}
          onPress={() => handleSelectCity(item.name)}
          style={({ pressed }) => [
            styles.cityRow,
            { borderBottomColor: C.surfaceBorderLight },
            isSelected && { backgroundColor: C.primarySubtle },
            pressed && { backgroundColor: C.surfaceElevated },
          ]}
        >
          <View style={[styles.cityIconWrap, { backgroundColor: isSelected ? C.primary : C.surfaceElevated }]}>
            <MaterialIcons
              name="location-on"
              size={18}
              color={isSelected ? '#fff' : dotColor}
            />
          </View>

          <View style={styles.cityInfo}>
            <Text style={[styles.cityName, { color: C.textPrimary }]}>
              {item.name}
            </Text>
            <Text style={[styles.cityState, { color: C.textMuted }]}>
              {item.state || 'Haryana Corridor'}
              {item.tier ? ` • ${item.tier.toUpperCase()}` : ''}
            </Text>
          </View>

          {isSelected ? (
            <MaterialIcons name="check-circle" size={20} color={C.primary} />
          ) : (
            <MaterialIcons name="north-west" size={16} color={C.textMuted} style={{ opacity: 0.6 }} />
          )}
        </Pressable>
      );
    },
    [C, dotColor, handleSelectCity, selectedCity]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: C.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Bar */}
        <View style={[styles.headerBar, { borderBottomColor: C.surfaceBorder, paddingTop: Math.max(insets.top, 14) }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close city selector"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="close" size={22} color={C.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.dotIndicator, { backgroundColor: dotColor }]} />
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{title}</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: C.textMuted }]}>
              {subtitle || 'Select transit hub or corridor city'}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Pinned Search Input at Top - NEVER OBSCURED BY KEYBOARD */}
        <View style={[styles.searchBoxWrap, { backgroundColor: C.background, borderBottomColor: C.surfaceBorder }]}>
          <View style={[styles.searchInputInner, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="search" size={20} color={C.primary} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city, town, or district..."
              placeholderTextColor={C.textMuted}
              style={[styles.searchInput, { color: C.textPrimary }]}
              autoFocus={true}
              autoCorrect={false}
              autoCapitalize="words"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                style={styles.clearSearchBtn}
              >
                <MaterialIcons name="cancel" size={18} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Quick GPS Action */}
        {onUseCurrentLocation && (
          <Pressable
            onPress={handleUseGps}
            disabled={isDetectingLocation}
            style={({ pressed }) => [
              styles.gpsRow,
              { backgroundColor: C.surface, borderBottomColor: C.surfaceBorderLight },
              pressed && { backgroundColor: C.primarySubtle },
            ]}
          >
            <View style={[styles.gpsIconBox, { backgroundColor: C.primarySubtle }]}>
              {isDetectingLocation ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <MaterialIcons name="my-location" size={18} color={C.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.gpsTitle, { color: C.primary }]}>
                {isDetectingLocation ? 'Detecting current city GPS...' : 'Use Current Location'}
              </Text>
              <Text style={[styles.gpsSub, { color: C.textMuted }]}>
                Auto-fill your active district via device location
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={C.primary} />
          </Pressable>
        )}

        {/* Popular Corridor Hubs (1-Tap Fast Chips) */}
        {!query && (
          <View style={[styles.popularSection, { borderBottomColor: C.surfaceBorderLight }]}>
            <Text style={[styles.popularHeading, { color: C.textSecondary }]}>
              POPULAR TRANSIT HUBS
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={POPULAR_HUBS}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.popularChipsList}
              renderItem={({ item }) => {
                const isSelected = selectedCity?.toLowerCase() === item.toLowerCase();
                return (
                  <Pressable
                    onPress={() => handleSelectCity(item)}
                    style={({ pressed }) => [
                      styles.hubChip,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hubChipText,
                        { color: isSelected ? C.primary : C.textPrimary },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Custom City Option if Query doesn't exactly match */}
        {showCustomOption && (
          <Pressable
            onPress={() => handleSelectCity(query.trim())}
            style={({ pressed }) => [
              styles.customCityRow,
              { backgroundColor: C.primarySubtle, borderBottomColor: C.primary + '33' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="add-location-alt" size={20} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.customCityText, { color: C.primary }]}>
                Use &quot;{query.trim()}&quot;
              </Text>
              <Text style={[styles.customCitySub, { color: C.textMuted }]}>
                Custom location not in standard directory
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={16} color={C.primary} />
          </Pressable>
        )}

        {/* All Filtered Cities List */}
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => `${item.name}-${item.state}`}
          renderItem={renderCityItem}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={40} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No cities found</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>
                Tap &quot;Use {query.trim()}&quot; above to use this custom location.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  searchBoxWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.2,
    paddingHorizontal: Spacing.sm + 4,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    gap: Spacing.sm + 2,
  },
  gpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  gpsSub: {
    fontSize: 11,
    marginTop: 1,
  },
  popularSection: {
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  popularHeading: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs + 2,
  },
  popularChipsList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs + 2,
  },
  hubChip: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  hubChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  customCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  customCityText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  customCitySub: {
    fontSize: 11,
    marginTop: 1,
  },
  listContent: {
    paddingTop: Spacing.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm + 4,
  },
  cityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  cityState: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
