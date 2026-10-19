import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Input } from '@/components/ui/Input';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { VehicleType, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface TripDetailsDraft {
  vehicle: VehicleType;
  capacity: string;
  price: string;
  allowedCategories?: ParcelCategory[];
  [key: string]: any;
}

export const VEHICLE_MAX_CAPACITY: Record<VehicleType, number> = {
  bike: 15,
  car: 100,
  bus: 100,
  train: 150,
  flight: 25,
};

export const VEHICLE_IMAGES: Record<VehicleType, any> = {
  car: require('@/assets/images/vehicles/car.jpg'),
  bike: require('@/assets/images/vehicles/bike.jpg'),
  bus: require('@/assets/images/vehicles/bus.jpg'),
  train: require('@/assets/images/vehicles/train.jpg'),
  flight: require('@/assets/images/vehicles/flight.jpg'),
};

export const CARRY_CATEGORY_IMAGES: Record<ParcelCategory, any> = {
  documents: require('@/assets/images/categories/documents.jpg'),
  electronics: require('@/assets/images/categories/electronics.jpg'),
  clothing: require('@/assets/images/categories/clothing.jpg'),
  food: require('@/assets/images/categories/food.jpg'),
  medicine: require('@/assets/images/categories/medicine.jpg'),
  other: require('@/assets/images/categories/other.jpg'),
};

export const VEHICLES: {
  type: VehicleType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}[] = [
  { type: 'car', label: 'Car', icon: 'directions-car', color: '#2563EB' },
  { type: 'bike', label: 'Bike', icon: 'two-wheeler', color: '#16A34A' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus', color: '#D97706' },
  { type: 'train', label: 'Train', icon: 'train', color: '#0D9488' },
  { type: 'flight', label: 'Flight', icon: 'flight', color: '#7C3AED' },
];

export const CARRY_CATEGORIES: {
  type: ParcelCategory;
  label: string;
  tagline: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { type: 'documents', label: 'Documents', tagline: 'Letters, books & files', icon: 'description' },
  { type: 'electronics', label: 'Electronics', tagline: 'Phones & tech gadgets', icon: 'devices' },
  { type: 'clothing', label: 'Clothing', tagline: 'Apparel, shoes & fabric', icon: 'checkroom' },
  { type: 'food', label: 'Food & Sweets', tagline: 'Dry & packaged foods', icon: 'restaurant' },
  { type: 'medicine', label: 'Medicine', tagline: 'Prescription & first aid', icon: 'local-pharmacy' },
  { type: 'other', label: 'General / Box', tagline: 'Small boxes & cartons', icon: 'inventory-2' },
];

export const VEHICLE_QUICK_DEFAULTS: Record<VehicleType, { capacity: string; price: string }> = {
  bike: { capacity: '3', price: '70' },
  car: { capacity: '10', price: '120' },
  bus: { capacity: '20', price: '80' },
  train: { capacity: '15', price: '90' },
  flight: { capacity: '8', price: '250' },
};

export const CAPACITY_PRESETS = ['2', '5', '10', '15', '25', '50'];
export const PRICE_PRESETS = ['60', '80', '100', '150', '250'];

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
          '100',
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
      {/* Clean Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Trip Details</Text>
      </View>

      {/* Smaller, Simpler Travel Mode Cards */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Travel Mode</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          contentContainerStyle={styles.vehicleRow}
        >
          {VEHICLES.map((v) => {
            const isActive = form.vehicle === v.type;
            const vehicleImage = VEHICLE_IMAGES[v.type];

            return (
              <Pressable
                key={v.type}
                accessibilityRole="button"
                accessibilityLabel={`Select ${v.label}`}
                onPress={() => {
                  Haptic.select();
                  updateField('vehicle', v.type);
                  const defaults = VEHICLE_QUICK_DEFAULTS[v.type];
                  if (!form.capacity || Number(form.capacity) > VEHICLE_MAX_CAPACITY[v.type]) {
                    updateField('capacity', defaults.capacity);
                  }
                  if (!form.price) updateField('price', defaults.price);
                }}
                style={({ pressed }) => [
                  styles.compactVehicleCard,
                  {
                    backgroundColor: isActive ? C.primarySubtle : C.surface,
                    borderColor: isActive ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
              >
                {/* 3D Image */}
                <View style={styles.compactImgWrap}>
                  <Image
                    source={vehicleImage}
                    style={styles.compactImg}
                    contentFit="contain"
                  />
                </View>

                {/* Name */}
                <Text
                  style={[
                    styles.compactVehicleName,
                    {
                      color: isActive ? C.primary : C.textPrimary,
                      fontWeight: isActive ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {v.label}
                </Text>

                {/* Capacity badge */}
                <Text style={[styles.compactVehicleCap, { color: C.textMuted }]}>
                  {VEHICLE_MAX_CAPACITY[v.type]} kg
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Suggested Corridor Rate (Compact) */}
      {recommendedPrice ? (
        <View style={[styles.compactGuidanceCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="auto-awesome" size={13} color={C.primary} />
              <Text style={[styles.guidanceLabel, { color: C.primary }]}>Suggested Rate</Text>
            </View>
            <Text style={[styles.guidancePrice, { color: C.textPrimary }]}>
              ₹{recommendedPrice.suggested}/kg{' '}
              <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: FontWeight.regular }}>
                (₹{recommendedPrice.min} – ₹{recommendedPrice.max})
              </Text>
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply suggested rate"
            onPress={() => {
              Haptic.success();
              updateField('price', String(recommendedPrice.suggested));
            }}
            hitSlop={6}
            style={({ pressed }) => [
              styles.applyBtn,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Available Space / Capacity Input */}
      <View style={styles.fieldGroup}>
        <Input
          label={`Available Space (kg) — Max ${maxCapacity} kg`}
          placeholder={`e.g. ${form.capacity || '5'}`}
          value={form.capacity}
          onChangeText={(v) => updateField('capacity', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.capacity}
        />
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
                  { color: form.capacity === value ? C.primary : C.textSecondary, fontWeight: form.capacity === value ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                {value} kg
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Price Per Kg Input */}
      <View style={styles.fieldGroup}>
        <Input
          label="Price per kg (₹)"
          placeholder="e.g. 80"
          value={form.price}
          onChangeText={(v) => updateField('price', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.price}
        />
        <View style={styles.presetRow}>
          {activePricePresets.map((value) => (
            <Pressable
              key={`price-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`Set price to Rs ${value}`}
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
                  { color: form.price === value ? C.success : C.textSecondary, fontWeight: form.price === value ? FontWeight.bold : FontWeight.medium },
                ]}
              >
                ₹{value}/kg
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* What can you carry? Multi-selection */}
      <View style={styles.fieldGroup}>
        <View style={styles.categoryHeader}>
          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>What can you carry?</Text>
          <Pressable
            onPress={() => {
              Haptic.tap();
              const allTypes = CARRY_CATEGORIES.map((c) => c.type);
              const current = form.allowedCategories || allTypes;
              if (current.length === allTypes.length) {
                updateField('allowedCategories', ['documents']);
              } else {
                updateField('allowedCategories', allTypes);
              }
            }}
            hitSlop={8}
          >
            <Text style={[styles.toggleAllText, { color: C.primary }]}>
              {(form.allowedCategories || []).length === CARRY_CATEGORIES.length ? 'Clear All' : 'Select All'}
            </Text>
          </Pressable>
        </View>

        {fieldErrors.allowedCategories ? (
          <Text style={[styles.errorText, { color: C.error }]}>{fieldErrors.allowedCategories}</Text>
        ) : null}

        <View style={styles.carryCategoryGrid}>
          {CARRY_CATEGORIES.map((cat) => {
            const currentList = form.allowedCategories || CARRY_CATEGORIES.map((c) => c.type);
            const isSelected = currentList.includes(cat.type);
            const catImage = CARRY_CATEGORY_IMAGES[cat.type];

            return (
              <Pressable
                key={cat.type}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Allow carrying ${cat.label}`}
                onPress={() => {
                  Haptic.select();
                  const next = isSelected
                    ? currentList.filter((t: string) => t !== cat.type)
                    : [...currentList, cat.type];
                  updateField('allowedCategories', next);
                }}
                style={({ pressed }) => [
                  styles.compactCategoryCard,
                  {
                    backgroundColor: isSelected ? C.primarySubtle : C.surface,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Image
                  source={catImage}
                  style={styles.compactCatImg}
                  contentFit="cover"
                />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.catTitle, { color: isSelected ? C.primary : C.textPrimary }]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.catSub, { color: C.textMuted }]} numberOfLines={1}>
                    {cat.tagline}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkboxCircle,
                    {
                      borderColor: isSelected ? C.primary : C.surfaceBorder,
                      backgroundColor: isSelected ? C.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected ? <MaterialIcons name="check" size={12} color="#FFFFFF" /> : null}
                </View>
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
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },
  vehicleRow: {
    gap: 8,
    paddingVertical: 2,
  },
  compactVehicleCard: {
    width: 74,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  compactImgWrap: {
    width: 44,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactImg: {
    width: '100%',
    height: '100%',
  },
  compactVehicleName: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  compactVehicleCap: {
    fontSize: 10,
    textAlign: 'center',
  },
  compactGuidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  guidanceLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  guidancePrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: FontSize.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  carryCategoryGrid: {
    gap: 6,
  },
  compactCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  compactCatImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  catTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  catSub: {
    fontSize: 10,
    marginTop: 1,
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.xs,
    marginTop: -2,
  },
});
