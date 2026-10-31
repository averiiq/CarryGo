import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Input } from '@/components/ui/Input';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import {
  ParcelDraft,
  PARCEL_CATEGORIES,
  PARCEL_CATEGORY_IMAGES,
  PARCEL_WEIGHT_PRESETS,
} from './types';

interface ParcelDetailsStepProps {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
}

export function ParcelDetailsStep({
  form,
  updateField,
  fieldErrors,
  C,
}: ParcelDetailsStepProps) {
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
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
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
