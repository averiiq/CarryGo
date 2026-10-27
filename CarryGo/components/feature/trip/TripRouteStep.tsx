import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { InteractiveRouteCard } from '@/components/feature/InteractiveRouteCard';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { CitySelectModal } from '@/components/feature/CitySelectModal';
import { toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  calculateRouteDistance,
  getSuggestedStopovers,
} from './tripPricingAlgorithm';
import { findCity, getDistance } from '@/constants/indian-cities';

export interface TripRouteDraft {
  fromCity: string;
  toCity: string;
  stopovers?: string[];
  date: string;
  time: string;
  [key: string]: any;
}

interface TripRouteStepProps {
  form: TripRouteDraft;
  updateField: (key: any, value: any) => void;
  fieldErrors: Record<string, string>;
  onDatePress: () => void;
  onUseCurrentLocation: () => void;
  isDetectingCurrentLocation: boolean;
  locationHint: string | null;
}

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00 AM' },
  { label: 'Afternoon', time: '02:00 PM' },
  { label: 'Evening', time: '06:00 PM' },
  { label: 'Night', time: '09:00 PM' },
];

export const TripRouteStep = memo(function TripRouteStep({
  form,
  updateField,
  fieldErrors,
  onDatePress,
  onUseCurrentLocation,
  isDetectingCurrentLocation,
  locationHint,
}: TripRouteStepProps) {
  const { C } = useThemeColors();
  const [showStopoverModal, setShowStopoverModal] = useState(false);

  const stopovers = form.stopovers || [];

  // Route distance including stopovers
  const routeDistance = useMemo(() => {
    return calculateRouteDistance(form.fromCity, form.toCity, stopovers);
  }, [form.fromCity, form.toCity, stopovers]);

  // Dynamic suggested stopovers along this corridor
  const suggestedStopovers = useMemo(() => {
    return getSuggestedStopovers(form.fromCity, form.toCity, stopovers);
  }, [form.fromCity, form.toCity, stopovers]);

  // Quick date presets: Today, Tomorrow, +2 Days, +3 Days
  const quickDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const key = toLocalDateKey(d);
      let label = 'Today';
      if (i === 1) label = 'Tomorrow';
      else if (i === 2 || i === 3) {
        label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      }
      dates.push({ key, label });
    }
    return dates;
  }, []);

  const handleAddStopover = useCallback(
    (city: string) => {
      if (!city) return;
      const normalized = city.trim();
      if (
        normalized.toLowerCase() === form.fromCity.toLowerCase().trim() ||
        normalized.toLowerCase() === form.toCity.toLowerCase().trim() ||
        stopovers.some((s) => s.toLowerCase().trim() === normalized.toLowerCase())
      ) {
        Haptic.warning();
        return;
      }
      Haptic.select();
      updateField('stopovers', [...stopovers, normalized]);
      setShowStopoverModal(false);
    },
    [form.fromCity, form.toCity, stopovers, updateField]
  );

  const handleRemoveStopover = useCallback(
    (index: number) => {
      Haptic.tap();
      const updated = stopovers.filter((_, i) => i !== index);
      updateField('stopovers', updated);
    },
    [stopovers, updateField]
  );

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      {/* Clean Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
          Where are you travelling?
        </Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
          Set your origin, destination, and intermediate pickup points.
        </Text>
      </View>

      {/* Corridors */}
      <HaryanaCorridorChips
        activeFromCity={form.fromCity}
        activeToCity={form.toCity}
        onSelectCorridor={(from, to) => {
          Haptic.select();
          updateField('fromCity', from);
          updateField('toCity', to);
        }}
        title="Popular Corridors"
      />

      {/* Route Card: Pick & Drop */}
      <InteractiveRouteCard
        fromCity={form.fromCity}
        toCity={form.toCity}
        onFromCityChange={(city) => updateField('fromCity', city)}
        onToCityChange={(city) => updateField('toCity', city)}
        fromError={fieldErrors.fromCity}
        toError={fieldErrors.toCity}
        onUseCurrentLocation={onUseCurrentLocation}
        isDetectingCurrentLocation={isDetectingCurrentLocation}
        locationHint={locationHint}
      />

      {/* Dynamic Stopovers Section */}
      <View
        style={[
          styles.whiteCard,
          {
            backgroundColor: C.surface,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleBox}>
            <View style={[styles.iconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="add-location-alt" size={17} color="#10B981" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                  Dynamic Stopovers
                </Text>
                <View style={[styles.badgePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.badgeText, { color: '#059669' }]}>+2.4x Matches</Text>
                </View>
              </View>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Add intermediate pickup stops to collect more parcels.
              </Text>
            </View>
          </View>
        </View>

        {/* Existing Added Stopovers */}
        {stopovers.length > 0 ? (
          <View style={styles.stopoversList}>
            {stopovers.map((city, index) => {
              // Calculate segment distance from previous point
              const prevPointName = index === 0 ? form.fromCity : stopovers[index - 1];
              const cPrev = findCity(prevPointName);
              const cCurr = findCity(city);
              const segmentKm = cPrev && cCurr ? Math.round(getDistance(cPrev, cCurr)) : null;

              return (
                <View
                  key={`stop-${index}-${city}`}
                  style={[
                    styles.stopoverRow,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.stopoverLeft}>
                    <View style={[styles.stopNumberBadge, { backgroundColor: '#EEF4FF' }]}>
                      <Text style={[styles.stopNumberText, { color: C.primary }]}>
                        Stop {index + 1}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.stopCityName, { color: C.textPrimary }]}>
                        {city}
                      </Text>
                      {segmentKm ? (
                        <Text style={[styles.segmentDistText, { color: C.textMuted }]}>
                          +{segmentKm} km from {index === 0 ? 'origin' : `Stop ${index}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove stopover ${city}`}
                    onPress={() => handleRemoveStopover(index)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.removeStopBtn,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
                    ]}
                  >
                    <MaterialIcons name="close" size={17} color={C.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Action: Add Stopover Button */}
        <View style={styles.addStopActionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add intermediate stopover"
            onPress={() => {
              Haptic.tap();
              setShowStopoverModal(true);
            }}
            disabled={stopovers.length >= 5}
            style={({ pressed }) => [
              styles.addStopChipBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              stopovers.length >= 5 && { opacity: 0.4 },
            ]}
          >
            <MaterialIcons name="add" size={18} color="#10B981" />
            <Text style={[styles.addStopChipText, { color: C.textPrimary }]}>
              {stopovers.length > 0 ? 'Add Another Stopover' : 'Add Stopover City'}
            </Text>
          </Pressable>
        </View>

        {/* Corridor Suggested Stopovers Chips */}
        {form.fromCity && form.toCity && suggestedStopovers.length > 0 ? (
          <View style={styles.suggestedStopsSection}>
            <Text style={[styles.suggestedLabel, { color: C.textMuted }]}>
              POPULAR ON THIS ROUTE:
            </Text>
            <View style={styles.suggestedChipRow}>
              {suggestedStopovers.map((suggestedCity) => (
                <Pressable
                  key={suggestedCity}
                  accessibilityRole="button"
                  accessibilityLabel={`Add suggested stopover: ${suggestedCity}`}
                  onPress={() => handleAddStopover(suggestedCity)}
                  style={({ pressed }) => [
                    styles.suggestedStopChip,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                    },
                    pressed && {
                      backgroundColor: '#ECFDF5',
                      borderColor: '#10B981',
                      transform: [{ scale: 0.96 }],
                    },
                  ]}
                >
                  <MaterialIcons name="add" size={13} color="#10B981" />
                  <Text style={[styles.suggestedStopText, { color: C.textPrimary }]}>
                    {suggestedCity}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Route Sequence Preview Summary */}
        {form.fromCity && form.toCity ? (
          <View style={[styles.routeSummaryStrip, { backgroundColor: '#F8FAFC', borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="timeline" size={16} color="#10B981" />
            <Text style={[styles.routeSummaryText, { color: C.textSecondary }]}>
              <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>
                {form.fromCity}
              </Text>
              {stopovers.map((s) => ` → ${s}`)}
              <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>
                {` → ${form.toCity}`}
              </Text>
              {routeDistance > 0 ? ` (~${routeDistance} km total)` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Departure Schedule Card */}
      <View
        style={[
          styles.whiteCard,
          {
            backgroundColor: C.surface,
            borderColor: fieldErrors.date ? C.error : C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleBox}>
            <View style={[styles.iconBubble, { backgroundColor: '#EEF4FF' }]}>
              <MaterialIcons name="event" size={17} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Departure Schedule
              </Text>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Pick your travel day and departure time.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            onPress={() => {
              Haptic.tap();
              onDatePress();
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.calendarIconBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="calendar-month" size={16} color={C.primary} />
          </Pressable>
        </View>

        {/* Quick Date Chips */}
        <View style={styles.chipRow}>
          {quickDates.map((d) => {
            const isSelected = form.date === d.key;
            return (
              <Pressable
                key={d.key}
                accessibilityRole="button"
                accessibilityLabel={`Date: ${d.label}`}
                onPress={() => {
                  Haptic.select();
                  updateField('date', d.key);
                }}
                style={({ pressed }) => [
                  styles.pillChip,
                  {
                    backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    {
                      color: isSelected ? '#059669' : C.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {fieldErrors.date ? (
          <Text style={[styles.errorText, { color: C.error }]}>{fieldErrors.date}</Text>
        ) : null}

        {/* Departure Time Chips */}
        <View style={styles.chipRow}>
          {TIME_PRESETS.map((t) => {
            const isSelected = form.time === t.time;
            return (
              <Pressable
                key={t.label}
                accessibilityRole="button"
                accessibilityLabel={`Time: ${t.label}`}
                onPress={() => {
                  Haptic.select();
                  updateField('time', t.time);
                }}
                style={({ pressed }) => [
                  styles.pillChip,
                  {
                    backgroundColor: isSelected ? '#EEF4FF' : C.surfaceElevated,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    {
                      color: isSelected ? C.primary : C.textSecondary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.regular,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Stopover Selection Modal */}
      <CitySelectModal
        visible={showStopoverModal}
        onClose={() => setShowStopoverModal(false)}
        onSelect={handleAddStopover}
        title="Select Stopover City"
        subtitle="Choose an intermediate location to collect parcels on the way"
        selectedCity=""
        oppositeCity={form.fromCity}
        dotColor="#10B981"
      />
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepInner: {
    padding: Spacing.md,
    gap: 14,
    paddingBottom: Spacing.xl + 40,
  },
  header: {
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  whiteCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: FontSize.md - 1,
    fontWeight: FontWeight.bold,
  },
  cardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stopoversList: {
    gap: 8,
  },
  stopoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  stopoverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stopNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  stopNumberText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  stopCityName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  segmentDistText: {
    fontSize: 10,
    marginTop: 1,
  },
  removeStopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addStopChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  addStopChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  suggestedStopsSection: {
    gap: 6,
    marginTop: 2,
  },
  suggestedLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  suggestedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestedStopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  suggestedStopText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  routeSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 2,
  },
  routeSummaryText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  calendarIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillChipText: {
    fontSize: FontSize.xs,
  },
  errorText: {
    fontSize: FontSize.xs,
    marginTop: -2,
  },
});
