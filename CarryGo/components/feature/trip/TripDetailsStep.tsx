import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Input } from '@/components/ui/Input';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { VehicleType } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  BikeIllustration,
  CarIllustration,
  BusIllustration,
  TrainIllustration,
  FlightIllustration,
} from '@/components/illustrations';

export interface TripDetailsDraft {
  vehicle: VehicleType;
  capacity: string;
  price: string;
  [key: string]: any;
}

export const VEHICLE_MAX_CAPACITY: Record<VehicleType, number> = {
  bike: 15,
  car: 100,
  bus: 100,
  train: 150,
  flight: 25,
};

export const VEHICLES: {
  type: VehicleType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { type: 'bike', label: 'Bike', icon: 'two-wheeler', color: '#16A34A' },
  { type: 'car', label: 'Car', icon: 'directions-car', color: '#4B5563' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus', color: '#6B7280' },
  { type: 'train', label: 'Train', icon: 'train', color: '#0F766E' },
  { type: 'flight', label: 'Flight', icon: 'flight', color: '#15803D' },
];

export const VEHICLE_ILLUSTRATIONS: Record<
  VehicleType,
  React.FC<{ size?: number; color?: string; active?: boolean }>
> = {
  bike: BikeIllustration,
  car: CarIllustration,
  bus: BusIllustration,
  train: TrainIllustration,
  flight: FlightIllustration,
};

export const VEHICLE_QUICK_DEFAULTS: Record<VehicleType, { capacity: string; price: string }> = {
  bike: { capacity: '3', price: '70' },
  car: { capacity: '10', price: '120' },
  bus: { capacity: '20', price: '80' },
  train: { capacity: '15', price: '90' },
  flight: { capacity: '8', price: '250' },
};

export const CAPACITY_PRESETS = ['2', '5', '10', '15'];
export const PRICE_PRESETS = ['60', '100', '150', '250'];

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

interface TripDetailsStepProps {
  form: TripDetailsDraft;
  updateField: (key: any, value: any) => void;
  fieldErrors: Record<string, string>;
  recommendedPrice?: {
    suggested: number;
    min: number;
    max: number;
    distanceKm: number;
  } | null;
}

export const TripDetailsStep = memo(function TripDetailsStep({
  form,
  updateField,
  fieldErrors,
  recommendedPrice,
}: TripDetailsStepProps) {
  const { C } = useThemeColors();

  const activePricePresets = recommendedPrice
    ? Array.from(
        new Set([
          String(recommendedPrice.min),
          String(recommendedPrice.suggested),
          String(recommendedPrice.max),
        ])
      )
    : PRICE_PRESETS;

  const maxCapacity = VEHICLE_MAX_CAPACITY[form.vehicle] || 100;

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      <StepHeader
        title="Trip details"
        subtitle="How are you travelling and how much can you carry?"
        icon="luggage"
        C={C}
      />

      {/* Vehicle Type Selection Grid */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Travel Mode</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLES.map((v) => {
            const Illustration = VEHICLE_ILLUSTRATIONS[v.type];
            const isActive = form.vehicle === v.type;
            return (
              <Pressable
                key={v.type}
                accessibilityRole="button"
                accessibilityLabel={`Select ${v.label} as travel mode`}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.vehicleCard,
                  { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                  isActive && { backgroundColor: v.color + '14', borderColor: v.color },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('vehicle', v.type);
                  const defaults = VEHICLE_QUICK_DEFAULTS[v.type];
                  if (!form.capacity) updateField('capacity', defaults.capacity);
                  if (!form.price) updateField('price', defaults.price);
                }}
              >
                <Illustration size={44} color={isActive ? v.color : C.textMuted} active={isActive} />
                <Text style={[styles.vehicleLabel, { color: isActive ? v.color : C.textSecondary }]}>
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Smart Route Guidance Card */}
      {recommendedPrice ? (
        <View style={[styles.smartPriceCard, { backgroundColor: C.surface, borderColor: C.primary + '40' }]}>
          <View style={styles.smartPriceTop}>
            <View style={[styles.smartPriceBadge, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="auto-awesome" size={13} color={C.primary} />
              <Text style={[styles.smartPriceBadgeText, { color: C.primary }]}>Corridor Rate Guidance</Text>
            </View>
            <Text style={[styles.smartPriceDemandText, { color: C.primary }]}>
              ~{recommendedPrice.distanceKm} km route
            </Text>
          </View>

          <View style={styles.smartPriceBody}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smartPriceAmount, { color: C.textPrimary }]}>
                ₹{recommendedPrice.suggested}{' '}
                <Text
                  style={{
                    fontSize: FontSize.sm,
                    fontWeight: FontWeight.regular,
                    color: C.textSecondary,
                  }}
                >
                  / kg
                </Text>
              </Text>
              <Text style={[styles.smartPriceRange, { color: C.textMuted }]}>
                Typical corridor bracket: ₹{recommendedPrice.min} – ₹{recommendedPrice.max} / kg
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Apply suggested fare of Rs ${recommendedPrice.suggested} per kg`}
              style={({ pressed }) => [
                styles.smartPriceApplyBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                Haptic.success();
                updateField('price', String(recommendedPrice.suggested));
              }}
            >
              <Text style={styles.smartPriceApplyText}>Apply ₹{recommendedPrice.suggested}/kg</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Available Space / Capacity Input */}
      <View style={styles.fieldGroup}>
        <Input
          label={`Available Space (kg) — Max ${maxCapacity} kg for ${form.vehicle}`}
          placeholder={`e.g. ${form.capacity || '5'}`}
          value={form.capacity}
          onChangeText={(v) => updateField('capacity', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.capacity}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Capacity:</Text>
          <View style={styles.presetRow}>
            {CAPACITY_PRESETS.filter((v) => Number(v) <= maxCapacity).map((value) => (
              <Pressable
                key={`capacity-${value}`}
                accessibilityRole="button"
                accessibilityLabel={`Set capacity to ${value} kg`}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.capacity === value && {
                    backgroundColor: C.primarySubtle,
                    borderColor: C.primary,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('capacity', value);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.capacity === value ? C.primary : C.textSecondary },
                  ]}
                >
                  {value} kg
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Price Per Kg Input */}
      <View style={styles.fieldGroup}>
        <Input
          label="Price / kg (₹)"
          placeholder="e.g. 80"
          value={form.price}
          onChangeText={(v) => updateField('price', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.price}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Fare:</Text>
          <View style={styles.presetRow}>
            {activePricePresets.map((value) => (
              <Pressable
                key={`price-${value}`}
                accessibilityRole="button"
                accessibilityLabel={`Set price to Rs ${value} per kg`}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.price === value && {
                    backgroundColor: C.successSubtle,
                    borderColor: C.success,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('price', value);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.price === value ? C.success : C.textSecondary },
                  ]}
                >
                  ₹{value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Potential Earnings Preview */}
      {form.capacity && form.price && Number(form.capacity) > 0 && Number(form.price) > 0 ? (
        <View
          style={[
            styles.earningHint,
            { backgroundColor: C.successSubtle, borderColor: C.success + '40', borderWidth: 1 },
          ]}
        >
          <MaterialIcons name="trending-up" size={18} color={C.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.earningText, { color: C.textPrimary }]}>
              Potential Earnings:{' '}
              <Text style={{ color: C.success, fontWeight: FontWeight.bold }}>
                ₹{(Number(form.capacity) * Number(form.price)).toFixed(0)}
              </Text>
            </Text>
            <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
              Carrying packages on your journey offsets travel expenses & tolls!
            </Text>
          </View>
        </View>
      ) : null}
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
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  vehicleCard: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: 4,
  },
  vehicleLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  smartPriceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm + 4,
    gap: Spacing.xs + 2,
  },
  smartPriceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  smartPriceBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  smartPriceDemandText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  smartPriceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: 2,
  },
  smartPriceAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  smartPriceRange: {
    fontSize: 11,
    marginTop: 1,
  },
  smartPriceApplyBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 4,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartPriceApplyText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  presetSection: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  presetSectionLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
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
  earningHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  earningText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
