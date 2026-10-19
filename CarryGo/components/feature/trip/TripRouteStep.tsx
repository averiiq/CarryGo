import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { InteractiveRouteCard } from '@/components/feature/InteractiveRouteCard';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface TripRouteDraft {
  fromCity: string;
  toCity: string;
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

      {/* Route Card */}
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

      {/* Compact Schedule Card */}
      <View style={[styles.scheduleCard, { backgroundColor: C.surface, borderColor: fieldErrors.date ? C.error : C.surfaceBorder }]}>
        <View style={styles.scheduleHeaderRow}>
          <View style={styles.scheduleTitleBox}>
            <MaterialIcons name="event" size={16} color={C.primary} />
            <Text style={[styles.scheduleTitle, { color: C.textPrimary }]}>Departure Schedule</Text>
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

        {/* Compact Quick Date Chips */}
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
                    backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    { color: isSelected ? C.primary : C.textPrimary, fontWeight: isSelected ? FontWeight.bold : FontWeight.medium },
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

        {/* Compact Time Chips */}
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
                    backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    { color: isSelected ? C.primary : C.textSecondary, fontWeight: isSelected ? FontWeight.bold : FontWeight.regular },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepInner: {
    padding: Spacing.md,
    gap: 12,
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
  scheduleCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 12,
    gap: 10,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  calendarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
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
