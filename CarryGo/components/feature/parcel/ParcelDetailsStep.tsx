import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Input } from '@/components/ui/Input';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { PriceEstimate } from '@/services/price-estimator.service';
import {
  ParcelDraft,
  PARCEL_CATEGORIES,
  PARCEL_CATEGORY_IMAGES,
  PARCEL_WEIGHT_PRESETS,
  PARCEL_OFFER_PRESETS,
} from './types';

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

  const charCount = form.description.length;
  const isNearLimit = charCount >= 280;

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      {/* Compact inline header */}
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>What are you sending?</Text>

      {/* Horizontal scrollable category selector */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {PARCEL_CATEGORIES.map((cat) => {
            const isActive = form.category === cat.type;
            const categoryImage = PARCEL_CATEGORY_IMAGES[cat.type];

            return (
              <Pressable
                key={cat.type}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${cat.label}`}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? C.primarySubtle : C.surface,
                    borderColor: isActive ? C.primary : C.surfaceBorder,
                    borderWidth: isActive ? 1.5 : 1,
                  },
                  isActive && {
                    shadowColor: C.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.14,
                    shadowRadius: 6,
                    elevation: 2,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('category', cat.type);
                }}
              >
                {/* Compact round image */}
                <View style={styles.categoryImgWrap}>
                  <Image
                    source={categoryImage}
                    style={styles.categoryImg}
                    contentFit="cover"
                    transition={200}
                  />
                  {isActive ? (
                    <View style={[styles.categoryCheckBadge, { backgroundColor: C.primary }]}>
                      <MaterialIcons name="check" size={10} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                {/* Label + tagline */}
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isActive ? C.primary : C.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
                <Text style={[styles.categoryTagline, { color: C.textMuted }]} numberOfLines={1}>
                  {cat.tagline}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Parcel Photos */}
      <View style={styles.fieldGroup}>
        <ParcelImagePicker
          images={form.images}
          onImagesChange={(imgs) => updateField('images', imgs)}
          error={fieldErrors.images}
          category={form.category}
        />
      </View>

      {/* Description */}
      <View style={styles.fieldGroup}>
        <Input
          label="Item description"
          placeholder="Briefly describe what's inside (e.g., college marksheet, wrapped electronics)"
          value={form.description}
          onChangeText={(v) => updateField('description', v)}
          multiline
          numberOfLines={3}
          maxLength={300}
          style={{ minHeight: 76, textAlignVertical: 'top' }}
          error={fieldErrors.description}
        />
        <Text
          style={[
            styles.charCount,
            { color: isNearLimit ? C.warning : C.textMuted },
            charCount >= 300 && { color: C.error },
          ]}
        >
          {charCount}/300
        </Text>
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
                Smart Estimate
              </Text>
            </View>
            <Text
              style={[
                styles.smartPriceDemandText,
                { color: priceRecommendation.demandLevel === 'high' ? C.warning : C.success },
              ]}
            >
              {priceRecommendation.demandLevel === 'high'
                ? '🔥 High Demand'
                : '⚡ Recommended'}
            </Text>
          </View>

          <View style={styles.smartPriceBody}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smartPriceAmount, { color: C.textPrimary }]}>
                ₹{priceRecommendation.suggestedPrice}
              </Text>
              <Text style={[styles.smartPriceRange, { color: C.textMuted }]}>
                ₹{priceRecommendation.minPrice} – ₹{priceRecommendation.maxPrice}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smartPriceApplyBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
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
            Calculating best rate...
          </Text>
        </View>
      ) : null}

      {/* Weight Input & Presets */}
      <View style={styles.fieldGroup}>
        <Input
          label="Weight (kg)"
          placeholder="e.g. 1"
          value={form.weight}
          onChangeText={(v) => updateField('weight', v)}
          keyboardType="decimal-pad"
          error={fieldErrors.weight}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            {PARCEL_WEIGHT_PRESETS.map((value) => (
              <Pressable
                key={`weight-${value}`}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.weight === value && {
                    backgroundColor: C.primarySubtle,
                    borderColor: C.primary,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
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

      {/* Price Offer Input & Quick Fare Presets — unified to primary blue */}
      <View style={styles.fieldGroup}>
        <Input
          label="Your delivery offer (₹)"
          placeholder="e.g. 200"
          value={form.priceOffer}
          onChangeText={(v) => updateField('priceOffer', v)}
          keyboardType="numeric"
          error={fieldErrors.priceOffer}
        />
        <View style={styles.presetSection}>
          <Text style={[styles.presetSectionLabel, { color: C.textMuted }]}>Quick Offers:</Text>
          <View style={styles.presetRow}>
            {activeOfferPresets.map((val) => (
              <Pressable
                key={`offer-${val}`}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  form.priceOffer === val && {
                    backgroundColor: C.primarySubtle,
                    borderColor: C.primary,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('priceOffer', val);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.priceOffer === val ? C.primary : C.textSecondary },
                  ]}
                >
                  ₹{val}
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
  stepInner: { gap: Spacing.lg, paddingBottom: 110 },
  stepTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },

  /* Horizontal scrollable category chips */
  categoryScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  categoryChip: {
    width: 108,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  categoryImgWrap: {
    width: '100%',
    height: 68,
    position: 'relative',
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryTagline: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
    paddingHorizontal: 4,
  },

  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: -2, marginRight: 4, fontWeight: FontWeight.medium },
  smartPriceCard: {
    borderRadius: BorderRadius.lg,
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
  smartPriceBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  smartPriceDemandText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  smartPriceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  smartPriceAmount: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  smartPriceRange: { fontSize: FontSize.xs, marginTop: 1 },
  smartPriceApplyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  smartPriceApplyText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  smartPriceLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  smartPriceLoadingText: { fontSize: FontSize.sm },
  presetSection: { gap: 6, marginTop: 4 },
  presetSectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginLeft: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
