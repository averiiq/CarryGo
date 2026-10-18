import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Input } from '@/components/ui/Input';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
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

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      {/* Header */}
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
          <Text style={[styles.stepTitle, { color: C.textPrimary }]}>What are you sending?</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
            Select category, photos, weight and delivery offer
          </Text>
        </View>
      </View>

      {/* Real Visual Category Selection */}
      <View style={styles.fieldGroup}>
        <View style={styles.categoryHeaderRow}>
          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
          <Text style={[styles.categorySubLabel, { color: C.textMuted }]}>Tap to choose package type</Text>
        </View>

        <View style={styles.categoryGrid}>
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
                  styles.categoryCard,
                  {
                    backgroundColor: C.card,
                    borderColor: isActive ? C.primary : C.surfaceBorder,
                    borderWidth: isActive ? 2 : 1,
                  },
                  isActive && {
                    shadowColor: C.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.16,
                    shadowRadius: 8,
                    elevation: 3,
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('category', cat.type);
                }}
              >
                {/* Real Image Container */}
                <View style={styles.categoryImageWrap}>
                  <Image
                    source={categoryImage}
                    style={styles.categoryImage}
                    contentFit="cover"
                    transition={200}
                  />
                  {isActive ? (
                    <View style={[styles.categoryCheckBadge, { backgroundColor: C.primary }]}>
                      <MaterialIcons name="check" size={13} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                {/* Content info */}
                <View style={styles.categoryContent}>
                  <View style={styles.categoryTitleRow}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '18' }]}>
                      <MaterialIcons name={cat.icon} size={13} color={cat.color} />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: isActive ? C.primary : C.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </View>
                  <Text style={[styles.categoryTagline, { color: C.textMuted }]} numberOfLines={1}>
                    {cat.tagline}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Parcel Photos */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Parcel photos</Text>
        <ParcelImagePicker
          images={form.images}
          onImagesChange={(imgs) => updateField('images', imgs)}
          error={fieldErrors.images}
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

      {/* Price Offer Input & Quick Fare Presets */}
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
                    backgroundColor: C.successSubtle,
                    borderColor: C.success,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('priceOffer', val);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: form.priceOffer === val ? C.success : C.textSecondary },
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
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  categorySubLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  categoryImageWrap: {
    width: '100%',
    height: 94,
    backgroundColor: '#00000010',
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    padding: Spacing.sm,
    gap: 2,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  categoryTagline: {
    fontSize: FontSize.xs - 1,
    marginLeft: 26,
  },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: -2, marginRight: 4 },
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
