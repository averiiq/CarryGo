import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSmartSearch, SortOption } from '@/hooks/useSmartSearch';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const RECENT_SEARCHES_KEY = 'carrygo_smart_recent_searches';
const MAX_RECENT = 6;

const POPULAR_ROUTES = [
  { from: 'Mumbai', to: 'Delhi' },
  { from: 'Bangalore', to: 'Chennai' },
  { from: 'Delhi', to: 'Jaipur' },
  { from: 'Hyderabad', to: 'Bangalore' },
  { from: 'Pune', to: 'Mumbai' },
  { from: 'Kolkata', to: 'Patna' },
];

interface SmartSearchBarProps {
  onFromChange?: (city: string) => void;
  onToChange?: (city: string) => void;
  onSearch?: (from: string, to: string) => void;
  initialFrom?: string;
  initialTo?: string;
}

export const SmartSearchBar = React.memo(function SmartSearchBar({
  onFromChange,
  onToChange,
  onSearch,
  initialFrom = '',
  initialTo = '',
}: SmartSearchBarProps) {
  const { C } = useThemeColors();
  const [fromCity, setFromCity] = useState(initialFrom);
  const [toCity, setToCity] = useState(initialTo);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedField, setFocusedField] = useState<'from' | 'to' | null>(null);
  const [recentSearches, setRecentSearches] = useState<{ from: string; to: string }[]>([]);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const fromRef = useRef<TextInput>(null);
  const toRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then(raw => {
      if (raw) {
        setRecentSearches(JSON.parse(raw));
      }
    });
  }, []);

  const saveRecentSearch = useCallback(
    async (from: string, to: string) => {
      if (!from || !to) return;
      const entry = { from, to };
      const updated = [
        entry,
        ...recentSearches.filter(s => !(s.from === from && s.to === to)),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    },
    [recentSearches],
  );

  const toggleExpand = useCallback(() => {
    Haptic.select();
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 200,
      friction: 22,
    }).start();
  }, [isExpanded, expandAnim]);

  const handleSearch = useCallback(() => {
    Haptic.confirm();
    fromRef.current?.blur();
    toRef.current?.blur();
    setFocusedField(null);
    saveRecentSearch(fromCity, toCity);
    if (onSearch) onSearch(fromCity, toCity);
  }, [fromCity, toCity, onSearch, saveRecentSearch]);

  const handleFromChange = useCallback(
    (text: string) => {
      setFromCity(text);
      if (onFromChange) onFromChange(text);
    },
    [onFromChange],
  );

  const handleToChange = useCallback(
    (text: string) => {
      setToCity(text);
      if (onToChange) onToChange(text);
    },
    [onToChange],
  );

  const handleSelectSuggestion = useCallback(
    (city: string) => {
      Haptic.tap();
      if (focusedField === 'from') {
        setFromCity(city);
        if (onFromChange) onFromChange(city);
        setFocusedField(null);
        toRef.current?.focus();
      } else {
        setToCity(city);
        if (onToChange) onToChange(city);
        setFocusedField(null);
      }
    },
    [focusedField, onFromChange, onToChange],
  );

  const handleApplyRecent = useCallback(
    (recent: { from: string; to: string }) => {
      Haptic.tap();
      setFromCity(recent.from);
      setToCity(recent.to);
      if (onFromChange) onFromChange(recent.from);
      if (onToChange) onToChange(recent.to);
      if (onSearch) onSearch(recent.from, recent.to);
    },
    [onFromChange, onToChange, onSearch],
  );

  // Generate suggestions based on currently focused field
  const currentText = focusedField === 'from' ? fromCity : toCity;
  const suggestions =
    currentText.length > 0
      ? INDIAN_CITIES.filter(c =>
          c.name.toLowerCase().includes(currentText.toLowerCase()),
        )
          .map(c => c.name)
          .slice(0, 6)
      : [];

  const expandHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  return (
    <View style={[styles.container, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {/* Search Fields */}
      <View style={styles.fieldsRow}>
        <View style={styles.fieldColumn}>
          <View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: focusedField === 'from' ? C.primary + '66' : C.surfaceBorder }]}>
            <View style={[styles.dot, { backgroundColor: C.success }]} />
            <TextInput
              ref={fromRef}
              style={[styles.input, { color: C.textPrimary }]}
              placeholder="From city"
              placeholderTextColor={C.textMuted}
              value={fromCity}
              onChangeText={handleFromChange}
              onFocus={() => setFocusedField('from')}
              onBlur={() => setTimeout(() => setFocusedField(f => f === 'from' ? null : f), 200)}
              returnKeyType="next"
              onSubmitEditing={() => toRef.current?.focus()}
            />
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: focusedField === 'to' ? C.primary + '66' : C.surfaceBorder }]}>
            <View style={[styles.dot, { backgroundColor: C.error }]} />
            <TextInput
              ref={toRef}
              style={[styles.input, { color: C.textPrimary }]}
              placeholder="To city"
              placeholderTextColor={C.textMuted}
              value={toCity}
              onChangeText={handleToChange}
              onFocus={() => setFocusedField('to')}
              onBlur={() => setTimeout(() => setFocusedField(f => f === 'to' ? null : f), 200)}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
        </View>

        <Pressable
          style={[styles.searchButton, { backgroundColor: (fromCity || toCity) ? C.primary : C.surfaceElevated }]}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color={(fromCity || toCity) ? '#fff' : C.textMuted} />
        </Pressable>
      </View>

      {/* Autocomplete Dropdown */}
      {focusedField && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {suggestions.map(city => (
            <Pressable
              key={city}
              style={[styles.suggestionItem, { borderBottomColor: C.surfaceBorder }]}
              onPress={() => handleSelectSuggestion(city)}
            >
              <MaterialIcons name="location-on" size={14} color={C.textMuted} />
              <Text style={[styles.suggestionText, { color: C.textPrimary }]}>{city}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Expand toggle for filters/recent */}
      <Pressable style={styles.expandToggle} onPress={toggleExpand}>
        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={C.textMuted}
        />
      </Pressable>

      {/* Expandable section: recent searches + popular routes */}
      <Animated.View style={[styles.expandable, { height: expandHeight, overflow: 'hidden' }]}>
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsRow}>
                {recentSearches.map((item, idx) => (
                  <Pressable
                    key={`${item.from}-${item.to}-${idx}`}
                    style={[styles.chip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                    onPress={() => handleApplyRecent(item)}
                  >
                    <Text style={[styles.chipText, { color: C.textPrimary }]}>{item.from}</Text>
                    <MaterialIcons name="arrow-forward" size={10} color={C.primary} />
                    <Text style={[styles.chipText, { color: C.textSecondary }]}>{item.to}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Popular Routes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {POPULAR_ROUTES.map(route => (
                <Pressable
                  key={`${route.from}-${route.to}`}
                  style={[styles.chip, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}
                  onPress={() => handleApplyRecent(route)}
                >
                  <Text style={[styles.chipText, { color: C.primary }]}>{route.from}</Text>
                  <MaterialIcons name="arrow-forward" size={10} color={C.primary} />
                  <Text style={[styles.chipText, { color: C.primary }]}>{route.to}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  fieldColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    height: 42,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  input: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    padding: 0,
  },
  searchButton: {
    width: 46,
    height: 88,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  suggestionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  expandToggle: {
    alignSelf: 'center',
    paddingVertical: 2,
  },
  expandable: {},
  section: {
    gap: 6,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
