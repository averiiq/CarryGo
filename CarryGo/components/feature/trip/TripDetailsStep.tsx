import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Input } from '@/components/ui/Input';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { VehicleType, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { PriceGuidance } from './tripPricingAlgorithm';

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
  recommendedPrice?: PriceGuidance | null;
}

export const TripDetailsStep = memo(function TripDetailsStep({
  form,
  updateField,
  fieldErrors,
  recommendedPrice,
}: TripDetailsStepProps) {
  const { C } = useThemeColors();

  const maxCapacity = VEHICLE_MAX_CAPACITY[form.vehicle] || 100;

  // Active price presets tailored to corridor distance algorithm
  const activePricePresets = recommendedPrice
    ? Array.from(
        new Set([
          String(recommendedPrice.min),
          String(recommendedPrice.suggested),
          String(recommendedPrice.max),
          String(Math.round(recommendedPrice.max * 1.25)),
        ])
      )
    : PRICE_PRESETS;

  // Potential earnings calculation
  const capacityNum = Number(form.capacity);
  const priceNum = Number(form.price);
  const potentialEarnings =
    Number.isFinite(capacityNum) && Number.isFinite(priceNum) && capacityNum > 0 && priceNum > 0
      ? Math.round(capacityNum * priceNum)
      : 0;

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
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
          Configure your commute mode, space, and price per kg.
        </Text>
      </View>

      {/* Commute Mode: Visually Consistent Chip-Based Selection */}
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
            <View style={[styles.iconBubble, { backgroundColor: '#EEF4FF' }]}>
              <MaterialIcons name="commute" size={17} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Commute Mode
              </Text>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Select your mode of transport.
              </Text>
            </View>
          </View>
        </View>

        {/* Chip-Based Selection matching index.styles.ts */}
        <View style={styles.vehicleRow}>
          {VEHICLES.map((v) => {
            const isSelected = form.vehicle === v.type;
            const vehicleMax = VEHICLE_MAX_CAPACITY[v.type];

            return (
              <Pressable
                key={v.type}
                accessibilityRole="button"
                accessibilityLabel={`Commute mode: ${v.label}. Max ${vehicleMax} kg`}
                onPress={() => {
                  Haptic.select();
                  updateField('vehicle', v.type);
                  const defaults = VEHICLE_QUICK_DEFAULTS[v.type];
                  if (!form.capacity || Number(form.capacity) > vehicleMax) {
                    updateField('capacity', defaults.capacity);
                  }
                  if (!form.price && defaults.price) {
                    updateField('price', defaults.price);
                  }
                }}
                style={({ pressed }) => [
                  styles.vehicleChip,
                  {
                    backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <MaterialIcons
                  name={v.icon}
                  size={16}
                  color={isSelected ? '#059669' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.vehicleChipText,
                    {
                      color: isSelected ? '#059669' : C.textPrimary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {v.label}
                </Text>
                <View
                  style={[
                    styles.capPill,
                    {
                      backgroundColor: isSelected ? '#D1FAE5' : C.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.capPillText,
                      { color: isSelected ? '#047857' : C.textMuted },
                    ]}
                  >
                    {vehicleMax} kg
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Available Space / Capacity Card */}
      <View
        style={[
          styles.whiteCard,
          {
            backgroundColor: C.surface,
            borderColor: fieldErrors.capacity ? C.error : C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleBox}>
            <View style={[styles.iconBubble, { backgroundColor: '#F0FDF4' }]}>
              <MaterialIcons name="fitness-center" size={17} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Available Space (kg)
              </Text>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Maximum {maxCapacity} kg allowed for {form.vehicle}.
              </Text>
            </View>
          </View>
        </View>

        <Input
          placeholder={`Enter capacity (max ${maxCapacity} kg)`}
          value={form.capacity}
          onChangeText={(v) => updateField('capacity', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.capacity}
        />

        {/* Quick Capacity Preset Chips */}
        <View style={styles.presetRow}>
          {CAPACITY_PRESETS.filter((v) => Number(v) <= maxCapacity).map((value) => {
            const isSelected = form.capacity === value;
            return (
              <Pressable
                key={`capacity-${value}`}
                accessibilityRole="button"
                accessibilityLabel={`Set capacity to ${value} kg`}
                style={({ pressed }) => [
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? '#EEF4FF' : C.surfaceElevated,
                    borderColor: isSelected ? C.primary : C.surfaceBorder,
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
                    {
                      color: isSelected ? C.primary : C.textSecondary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  {value} kg
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Pricing & Algorithm Section */}
      <View
        style={[
          styles.whiteCard,
          {
            backgroundColor: C.surface,
            borderColor: fieldErrors.price ? C.error : C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleBox}>
            <View style={[styles.iconBubble, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="currency-rupee" size={17} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Set Price per kg
              </Text>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Your delivery fee per kilogram carried.
              </Text>
            </View>
          </View>
        </View>

        {/* Crucial Suggested Price Indicator (Negotiable Price Algorithm) */}
        {recommendedPrice ? (
          <View
            style={[
              styles.suggestedPriceBox,
              {
                backgroundColor: '#F0FDF4',
                borderColor: '#A7F3D0',
              },
            ]}
          >
            <View style={styles.suggestedTopRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MaterialIcons name="auto-awesome" size={14} color="#059669" />
                  <Text style={[styles.suggestedBadgeLabel, { color: '#059669' }]}>
                    Suggested Corridor Rate
                  </Text>
                </View>

                <Text style={[styles.suggestedRateText, { color: '#064E3B' }]}>
                  ₹{recommendedPrice.suggested}/kg
                  <Text style={styles.suggestedRangeText}>
                    {'  '}(Fair range: ₹{recommendedPrice.min} – ₹{recommendedPrice.max})
                  </Text>
                </Text>

                <Text style={[styles.suggestedDistText, { color: '#047857' }]}>
                  Based on ~{recommendedPrice.distanceKm} km route • {form.vehicle} mode
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
                  styles.applyRateBtn,
                  { backgroundColor: '#10B981' },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
                ]}
              >
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
                <Text style={styles.applyRateBtnText}>Apply</Text>
              </Pressable>
            </View>

            {/* Dynamic Price Health Guide to prevent overcharging for short routes */}
            {recommendedPrice.health !== 'none' ? (
              <View
                style={[
                  styles.healthGuideStrip,
                  {
                    backgroundColor:
                      recommendedPrice.health === 'fair' || recommendedPrice.health === 'budget'
                        ? '#ECFDF5'
                        : recommendedPrice.health === 'moderate'
                        ? '#FFFBEB'
                        : '#FEF2F2',
                    borderColor:
                      recommendedPrice.health === 'fair' || recommendedPrice.health === 'budget'
                        ? '#A7F3D0'
                        : recommendedPrice.health === 'moderate'
                        ? '#FDE68A'
                        : '#FECACA',
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    recommendedPrice.health === 'fair' || recommendedPrice.health === 'budget'
                      ? 'verified'
                      : recommendedPrice.health === 'moderate'
                      ? 'info'
                      : 'warning'
                  }
                  size={15}
                  color={recommendedPrice.healthColor}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.healthGuideLabel,
                      { color: recommendedPrice.healthColor },
                    ]}
                  >
                    {recommendedPrice.healthLabel}
                  </Text>
                  <Text style={[styles.healthGuideDesc, { color: C.textSecondary }]}>
                    {recommendedPrice.healthDescription}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Price Input Field */}
        <Input
          placeholder="e.g. 80"
          value={form.price}
          onChangeText={(v) => updateField('price', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.price}
        />

        {/* Quick Price Preset Chips */}
        <View style={styles.presetRow}>
          {activePricePresets.map((value) => {
            const isSelected = form.price === value;
            return (
              <Pressable
                key={`price-${value}`}
                accessibilityRole="button"
                accessibilityLabel={`Set price to Rs ${value}`}
                style={({ pressed }) => [
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
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
                    {
                      color: isSelected ? '#059669' : C.textSecondary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                >
                  ₹{value}/kg
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Potential Earnings Preview */}
        {potentialEarnings > 0 ? (
          <View
            style={[
              styles.earningsBanner,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
              },
            ]}
          >
            <MaterialIcons name="account-balance-wallet" size={17} color="#10B981" />
            <Text style={[styles.earningsText, { color: C.textPrimary }]}>
              Estimated trip earnings:{' '}
              <Text style={{ fontWeight: FontWeight.bold, color: '#059669' }}>
                ₹{potentialEarnings}
              </Text>{' '}
              for full capacity
            </Text>
          </View>
        ) : null}
      </View>

      {/* What can you carry? Multi-selection */}
      <View
        style={[
          styles.whiteCard,
          {
            backgroundColor: C.surface,
            borderColor: fieldErrors.allowedCategories ? C.error : C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.cardTitleBox}>
            <View style={[styles.iconBubble, { backgroundColor: '#EEF4FF' }]}>
              <MaterialIcons name="inventory-2" size={17} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                What can you carry?
              </Text>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>
                Choose parcel categories you're willing to transport.
              </Text>
            </View>
          </View>

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
              {(form.allowedCategories || []).length === CARRY_CATEGORIES.length
                ? 'Clear All'
                : 'Select All'}
            </Text>
          </Pressable>
        </View>

        {fieldErrors.allowedCategories ? (
          <Text style={[styles.errorText, { color: C.error }]}>
            {fieldErrors.allowedCategories}
          </Text>
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
                    backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                    borderColor: isSelected ? '#10B981' : C.surfaceBorder,
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
                  <Text
                    style={[
                      styles.catTitle,
                      { color: isSelected ? '#064E3B' : C.textPrimary },
                    ]}
                  >
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
                      borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                      backgroundColor: isSelected ? '#10B981' : 'transparent',
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
  // Commute Mode chip styles strictly aligned with index.styles.ts
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  vehicleChipText: {
    fontSize: FontSize.sm,
  },
  capPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  capPillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  // Suggested Price Indicator
  suggestedPriceBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 12,
    gap: 8,
  },
  suggestedTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  suggestedBadgeLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestedRateText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  suggestedRangeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: '#047857',
  },
  suggestedDistText: {
    fontSize: 11,
  },
  applyRateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  applyRateBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  healthGuideStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  healthGuideLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  healthGuideDesc: {
    fontSize: 10,
    marginTop: 1,
    lineHeight: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: FontSize.xs,
  },
  earningsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  earningsText: {
    fontSize: FontSize.xs,
    flex: 1,
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
