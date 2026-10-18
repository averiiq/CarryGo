import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { InteractiveRouteCard } from '@/components/feature/InteractiveRouteCard';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { ParcelDraft, PREFERRED_TIME_PRESETS } from './types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ParcelRouteStepProps {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  onDatePress: () => void;
  onUseCurrentLocation: () => void;
  isDetectingCurrentLocation: boolean;
  locationHint: string | null;
}

export function ParcelRouteStep({
  form,
  updateField,
  fieldErrors,
  C,
  onDatePress,
  onUseCurrentLocation,
  isDetectingCurrentLocation,
  locationHint,
}: ParcelRouteStepProps) {
  const [showTimeWindow, setShowTimeWindow] = useState(
    form.preferredTime !== undefined && form.preferredTime !== 'anytime'
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
      {/* Compact inline header */}
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Where's it going?</Text>

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

      {/* Date selector — compact */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Send by</Text>
        <Pressable
          style={({ pressed }) => [
            styles.scheduleBtn,
            {
              backgroundColor: C.surface,
              borderColor: form.deliveryDate
                ? C.primary
                : fieldErrors.deliveryDate
                  ? C.error
                  : C.surfaceBorder,
            },
            pressed && { opacity: 0.85, transform: [{ scale: Motion.cardScale }] },
          ]}
          onPress={() => {
            Haptic.tap();
            onDatePress();
          }}
        >
          <View
            style={[
              styles.scheduleIconBox,
              { backgroundColor: form.deliveryDate ? C.primarySubtle : C.surfaceElevated },
            ]}
          >
            <MaterialIcons
              name="event-available"
              size={18}
              color={form.deliveryDate ? C.primary : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            {form.deliveryDate ? (
              <>
                <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>
                  {formatScheduleDate(form.deliveryDate)}
                </Text>
                <Text style={[styles.scheduleHintText, { color: C.textSecondary }]}>
                  Ready for handover
                </Text>
              </>
            ) : (
              <Text
                style={[
                  styles.schedulePlaceholder,
                  { color: fieldErrors.deliveryDate ? C.error : C.textMuted },
                ]}
              >
                {fieldErrors.deliveryDate || 'Choose a day in the next 7 days'}
              </Text>
            )}
          </View>
          <MaterialIcons
            name={form.deliveryDate ? 'edit' : 'chevron-right'}
            size={16}
            color={form.deliveryDate ? C.primary : C.textMuted}
          />
        </Pressable>
      </View>

      {/* Collapsible Preferred Handover Window */}
      <View style={styles.fieldGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.timeToggleRow,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            Haptic.select();
            setShowTimeWindow((prev) => !prev);
          }}
        >
          <View style={styles.timeToggleLeft}>
            <MaterialIcons name="schedule" size={16} color={C.textSecondary} />
            <Text style={[styles.fieldLabel, { color: C.textSecondary, marginLeft: 0 }]}>
              Preferred handover window
            </Text>
          </View>
          <View style={styles.timeToggleRight}>
            <Text style={[styles.timeSubtext, { color: C.textMuted }]}>Optional</Text>
            <MaterialIcons
              name={showTimeWindow ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={20}
              color={C.textMuted}
            />
          </View>
        </Pressable>

        {showTimeWindow ? (
          <View style={styles.timeGrid}>
            {PREFERRED_TIME_PRESETS.map((t) => {
              const isSelected = (form.preferredTime || 'anytime') === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={({ pressed }) => [
                    styles.timeChip,
                    {
                      backgroundColor: isSelected ? C.primarySubtle : C.surface,
                      borderColor: isSelected ? C.primary : C.surfaceBorder,
                    },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => {
                    Haptic.select();
                    updateField('preferredTime', t.id);
                  }}
                >
                  <View
                    style={[
                      styles.timeIconWrap,
                      { backgroundColor: isSelected ? C.primary + '20' : C.surfaceElevated },
                    ]}
                  >
                    <MaterialIcons
                      name={t.icon}
                      size={14}
                      color={isSelected ? C.primary : C.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.timeLabel,
                        { color: isSelected ? C.primary : C.textPrimary },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={[styles.timeRangeText, { color: isSelected ? C.primary : C.textMuted }]}>
                      {t.timeRange}
                    </Text>
                  </View>
                  {isSelected ? (
                    <MaterialIcons name="check-circle" size={14} color={C.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.lg, paddingBottom: 110 },
  stepTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    minHeight: 56,
  },
  scheduleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleHintText: { fontSize: FontSize.xs, marginTop: 1 },
  schedulePlaceholder: { fontSize: FontSize.sm },

  timeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  timeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeSubtext: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeChip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.2,
  },
  timeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  timeRangeText: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
  },
});
