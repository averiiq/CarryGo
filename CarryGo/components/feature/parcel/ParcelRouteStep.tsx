import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { InteractiveRouteCard } from '@/components/feature/InteractiveRouteCard';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { ParcelDraft } from './types';

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
      <View style={styles.stepHeaderWrap}>
        <View
          style={[
            styles.stepHeaderIcon,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '25', borderWidth: 1 },
          ]}
        >
          <MaterialIcons name="alt-route" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Where's it going?</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
            Choose route and preferred handover day
          </Text>
        </View>
      </View>

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
            pressed && { opacity: 0.85 },
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
              size={20}
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
            size={18}
            color={form.deliveryDate ? C.primary : C.textMuted}
          />
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.lg, paddingBottom: 132 },
  stepHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  stepHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.4 },
  stepSubtitle: { fontSize: FontSize.sm, marginTop: 2, lineHeight: 18 },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    padding: Spacing.mdl,
    minHeight: 76,
  },
  scheduleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleHintText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },
});
