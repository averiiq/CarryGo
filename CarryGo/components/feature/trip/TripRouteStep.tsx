import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { InteractiveRouteCard } from '@/components/feature/InteractiveRouteCard';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { formatScheduleDate, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
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

function StepHeader({
  title,
  subtitle,
  icon,
  C,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  C: any;
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerIconWrapper, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name={icon} size={22} color={C.primary} />
      </View>
      <View style={styles.headerTextContainer}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

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
      <StepHeader
        title="Where are you going?"
        subtitle="Choose your journey route, date, and departure time"
        icon="flight-takeoff"
        C={C}
      />

      <HaryanaCorridorChips
        activeFromCity={form.fromCity}
        activeToCity={form.toCity}
        onSelectCorridor={(from, to) => {
          updateField('fromCity', from);
          updateField('toCity', to);
        }}
        title="Popular Corridors (1-Tap Route)"
      />

      {/* Modern Interactive Route Card with City Swap */}
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Departure Schedule</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select travel date and departure time"
          style={({ pressed }) => [
            styles.scheduleBtn,
            {
              backgroundColor: C.surface,
              borderColor: fieldErrors.date ? C.error : form.date ? C.primary : C.surfaceBorder,
            },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            Haptic.tap();
            onDatePress();
          }}
        >
          <View style={[styles.scheduleIconBox, { backgroundColor: form.date ? C.primarySubtle : C.surfaceElevated }]}>
            <MaterialIcons name="event" size={20} color={form.date ? C.primary : C.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            {form.date ? (
              <>
                <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>
                  {formatScheduleDate(form.date)}
                </Text>
                <Text style={[styles.scheduleTimeText, { color: C.textSecondary }]}>
                  {form.time || 'Tap to choose time'}
                </Text>
              </>
            ) : (
              <Text style={[styles.schedulePlaceholder, { color: fieldErrors.date ? C.error : C.textMuted }]}>
                {fieldErrors.date || 'Select date & time'}
              </Text>
            )}
          </View>
          <MaterialIcons
            name={form.date ? 'edit' : 'chevron-right'}
            size={18}
            color={form.date ? C.primary : C.textMuted}
          />
        </Pressable>

        {fieldErrors.date ? (
          <Text style={[styles.errorHelperText, { color: C.error }]}>{fieldErrors.date}</Text>
        ) : null}

        {/* Quick Time of Day Chips */}
        <View style={styles.presetRow}>
          {TIME_PRESETS.map((t) => {
            const isSelected = form.time === t.time;
            return (
              <Pressable
                key={t.label}
                accessibilityRole="button"
                accessibilityLabel={`Set time to ${t.label} (${t.time})`}
                onPress={() => {
                  Haptic.select();
                  updateField('time', t.time);
                }}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  isSelected && { backgroundColor: C.primarySubtle, borderColor: C.primary + '88' },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.presetText, { color: isSelected ? C.primary : C.textSecondary }]}>
                  {t.label} ({t.time})
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
    gap: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  fieldGroup: {
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  scheduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDateText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  scheduleTimeText: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  schedulePlaceholder: {
    fontSize: FontSize.sm,
  },
  errorHelperText: {
    fontSize: FontSize.xs,
    marginTop: 2,
    marginLeft: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  presetChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
