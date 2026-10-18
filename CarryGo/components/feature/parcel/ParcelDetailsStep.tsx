import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Input } from '@/components/ui/Input';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import {
  DocumentsIllustration,
  ElectronicsIllustration,
  ClothingIllustration,
  FoodIllustration,
  MedicineIllustration,
  OtherIllustration,
} from '@/components/illustrations';
import { PriceEstimate } from '@/services/price-estimator.service';
import { ParcelCategory } from '@/types';
import {
  ParcelDraft,
  PARCEL_CATEGORIES,
  PARCEL_WEIGHT_PRESETS,
  PARCEL_OFFER_PRESETS,
} from './types';

const CATEGORY_ILLUSTRATIONS: Record<
  ParcelCategory,
  React.FC<{ size?: number; color?: string; active?: boolean }>
> = {
  documents: DocumentsIllustration,
  electronics: ElectronicsIllustration,
  clothing: ClothingIllustration,
  food: FoodIllustration,
  medicine: MedicineIllustration,
  other: OtherIllustration,
};

interface ParcelDetailsStepProps {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  priceRecommendation?: PriceEstimate | null;
  isEstimatingPrice?: boolean;
}

export function ParcelDetailsStep({
  form,
  updateField,
  fieldErrors,
  C,
  priceRecommendation,
  isEstimatingPrice,
}: ParcelDetailsStepProps) {
  const activeOfferPresets = priceRecommendation
    ? Array.from(
        new Set([
          String(priceRecommendation.minPrice),
          String(priceRecommendation.suggestedPrice),
          String(priceRecommendation.maxPrice),
        ])
      )
    : PARCEL_OFFER_PRESETS;

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
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
          <MaterialIcons name="inventory-2" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Parcel details</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
            Add parcel category, photos, weight and offer
          </Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {PARCEL_CATEGORIES.map((cat) => {
            const Illustration = CATEGORY_ILLUSTRATIONS[cat.type];
            const isActive = form.category === cat.type;
            return (
              <Pressable
                key={cat.type}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                  isActive && { backgroundColor: cat.color + '14', borderColor: cat.color },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('category', cat.type);
                }}
              >
                <Illustration size={40} color={isActive ? cat.color : C.textMuted} active={isActive} />
                <Text style={[styles.categoryLabel, { color: isActive ? cat.color : C.textSecondary }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ParcelImagePicker
        images={form.images}
        onImagesChange={(imgs) => updateField('images', imgs)}
        error={fieldErrors.images}
      />

      <View style={styles.fieldGroup}>
        <Input
          label="Description"
          placeholder="What's inside? Any special handling?"
          value={form.description}
          onChangeText={(v) => updateField('description', v)}
          multiline
          numberOfLines={3}
          maxLength={300}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          error={fieldErrors.description}
        />
        <Text style={[styles.charCount, { color: C.textMuted }]}>{form.description.length}/300</Text>
      </View>

      {/* Smart Price Guidance Card */}
      {priceRecommendation ? (
        <View
          style={[
            styles.smartPriceCard,
            { backgroundColor: C.surface, borderColor: C.primary + '40' },
          ]}
        >
          <View style={styles.smartPriceTop}>
            <View style={[styles.smartPriceBadge, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="auto-awesome" size={13} color={C.primary} />
              <Text style={[styles.smartPriceBadgeText, { color: C.primary }]}>
                CarryGo Smart Estimate
              </Text>
            </View>
            <Text
              style={[
                styles.smartPriceDemandText,
                { color: priceRecommendation.demandLevel === 'high' ? C.warning : C.success },
              ]}
            >
              {priceRecommendation.demandLevel === 'high'
                ? '🔥 High Traveler Demand'
                : '⚡ Recommended Rate'}
            </Text>
          </View>

          <View style={styles.smartPriceBody}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smartPriceAmount, { color: C.textPrimary }]}>
                ₹{priceRecommendation.suggestedPrice}
              </Text>
              <Text style={[styles.smartPriceRange, { color: C.textMuted }]}>
                Suggested bracket: ₹{priceRecommendation.minPrice} – ₹{priceRecommendation.maxPrice}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smartPriceApplyBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                Haptic.success();
                updateField('priceOffer', String(priceRecommendation.suggestedPrice));
              }}
            >
              <Text style={styles.smartPriceApplyText}>
                Apply ₹{priceRecommendation.suggestedPrice}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : isEstimatingPrice ? (
        <View
          style={[
            styles.smartPriceLoadingCard,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          ]}
        >
          <MaterialIcons name="hourglass-empty" size={16} color={C.primary} />
          <Text style={[styles.smartPriceLoadingText, { color: C.textMuted }]}>
            Calculating best corridor rate...
          </Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Input
          label="Weight (kg)"
          placeholder="e.g. 0.5"
          value={form.weight}
          onChangeText={(v) => updateField('weight', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.weight}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Weight:</Text>
          <View style={styles.presetRow}>
            {PARCEL_WEIGHT_PRESETS.map((value) => (
              <Pressable
                key={'weight-' + value}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.weight === value && {
                    backgroundColor: C.primarySubtle,
                    borderColor: C.primary,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('weight', value);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.weight === value ? C.primary : C.textSecondary },
                  ]}
                >
                  {value} kg
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Input
          label="Price Offer (₹)"
          placeholder="e.g. 150"
          value={form.priceOffer}
          onChangeText={(v) => updateField('priceOffer', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.priceOffer}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Offers:</Text>
          <View style={styles.presetRow}>
            {activeOfferPresets.map((value) => (
              <Pressable
                key={'offer-' + value}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.priceOffer === value && {
                    backgroundColor: C.successSubtle,
                    borderColor: C.success,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('priceOffer', value);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.priceOffer === value ? C.success : C.textSecondary },
                  ]}
                >
                  ₹{value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
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
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: -4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryCard: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.mdl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    width: '31%',
    flexGrow: 1,
  },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  presetSection: {
    gap: Spacing.xs,
    marginTop: 2,
  },
  presetSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  presetText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  smartPriceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    padding: Spacing.md,
    gap: Spacing.sm,
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
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  smartPriceBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  smartPriceDemandText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  smartPriceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  smartPriceAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  smartPriceRange: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  smartPriceApplyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  smartPriceApplyText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  smartPriceLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm + 2,
  },
  smartPriceLoadingText: {
    fontSize: FontSize.xs,
  },
});
