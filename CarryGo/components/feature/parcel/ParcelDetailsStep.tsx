import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Input } from '@/components/ui/Input';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
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
  onEditRoute?: () => void;
}

const QUICK_TAGS = [
  { label: 'Documents', text: 'Documents in envelope' },
  { label: 'Gadget', text: 'Electronics in box' },
  { label: 'Clothes', text: 'Clothing / Apparel' },
  { label: 'Box', text: 'Sealed parcel box' },
  { label: 'Medicine', text: 'Prescription medicines' },
  { label: 'Fragile', text: 'Fragile item - handle with care' },
];

export function ParcelDetailsStep({
  form,
  updateField,
  fieldErrors,
  C,
  onEditRoute,
}: ParcelDetailsStepProps) {
  const charCount = form.description.length;
  const isNearLimit = charCount >= 270;

  const handleAdjustWeight = (delta: number) => {
    Haptic.select();
    const current = Number(form.weight) || 1;
    const next = Math.max(0.5, Math.min(25, Math.round((current + delta) * 10) / 10));
    updateField('weight', String(next));
  };

  const handleTagPress = (text: string) => {
    Haptic.select();
    if (!form.description.trim()) {
      updateField('description', text);
    } else if (!form.description.includes(text)) {
      updateField('description', `${form.description.trim()}, ${text}`);
    }
  };

  const selectedCategory = useMemo(() => {
    return PARCEL_CATEGORIES.find((c) => c.type === form.category) || PARCEL_CATEGORIES[0];
  }, [form.category]);

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={120}
    >
      {/* ── Route Pill Bar ── */}
      {form.fromCity && form.toCity ? (
        <Pressable
          onPress={onEditRoute}
          style={({ pressed }) => [
            styles.routeCapsule,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && onEditRoute && { opacity: 0.8 },
          ]}
        >
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
            <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
              {form.fromCity}
            </Text>
            <MaterialIcons name="arrow-forward" size={13} color={C.textMuted} style={{ marginHorizontal: 6 }} />
            <View style={[styles.routeDot, { backgroundColor: C.success }]} />
            <Text style={[styles.routeCity, { color: C.textPrimary }]} numberOfLines={1}>
              {form.toCity}
            </Text>
          </View>
          {onEditRoute ? (
            <View style={styles.routeActionRow}>
              <Text style={[styles.routeActionText, { color: C.primary }]}>Change</Text>
              <MaterialIcons name="chevron-right" size={16} color={C.primary} />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {/* ── Category Carousel (Modern Artwork Cards) ── */}
      <View style={styles.categorySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: C.textPrimary }]}>Select Category</Text>
          <View style={[styles.activeCategoryPill, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.activeCategoryPillText, { color: C.primary }]}>
              {selectedCategory.label}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          keyboardShouldPersistTaps="handled"
        >
          {PARCEL_CATEGORIES.map((cat) => {
            const isActive = form.category === cat.type;
            const categoryImage = PARCEL_CATEGORY_IMAGES[cat.type];

            return (
              <Pressable
                key={cat.type}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
                accessibilityState={{ selected: isActive }}
                onPress={() => {
                  Haptic.select();
                  updateField('category', cat.type);
                }}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: isActive ? C.primarySubtle : C.surface,
                    borderColor: isActive ? C.primary : C.surfaceBorder,
                    borderWidth: isActive ? 2 : 1,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
              >
                {/* 3D Abstract Image Graphic */}
                <View style={styles.artworkContainer}>
                  <Image
                    source={categoryImage}
                    style={styles.artworkImage}
                    contentFit="cover"
                    transition={150}
                  />
                  {isActive ? (
                    <View style={[styles.activeCheckBadge, { backgroundColor: C.primary }]}>
                      <MaterialIcons name="check" size={11} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                {/* Category Label Below Image */}
                <Text
                  style={[
                    styles.categoryTitle,
                    {
                      color: isActive ? C.primary : C.textPrimary,
                      fontWeight: isActive ? FontWeight.bold : FontWeight.semibold,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Unified Package Details Card ── */}
      <View style={[styles.unifiedCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        {/* 1. Photos */}
        <View style={styles.cardBlock}>
          <View style={styles.blockHeader}>
            <View style={styles.blockTitleRow}>
              <MaterialIcons name="photo-camera" size={17} color={C.primary} />
              <Text style={[styles.blockTitle, { color: C.textPrimary }]}>Parcel Photos</Text>
            </View>
            <Text style={[styles.blockBadge, { color: C.textMuted }]}>
              {form.images?.length || 0}/4 (Min 1)
            </Text>
          </View>

          <ParcelImagePicker
            images={form.images}
            onImagesChange={(imgs) => updateField('images', imgs)}
            error={fieldErrors.images}
          />
        </View>

        <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorderLight }]} />

        {/* 2. Description */}
        <View style={styles.cardBlock}>
          <View style={styles.blockHeader}>
            <View style={styles.blockTitleRow}>
              <MaterialIcons name="edit" size={16} color={C.primary} />
              <Text style={[styles.blockTitle, { color: C.textPrimary }]}>Description</Text>
            </View>
            <Text
              style={[
                styles.blockBadge,
                { color: isNearLimit ? C.warning : C.textMuted },
                charCount >= 300 && { color: C.error },
              ]}
            >
              {charCount}/300
            </Text>
          </View>

          {/* Quick Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickTagsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_TAGS.map((tag) => (
              <Pressable
                key={tag.label}
                onPress={() => handleTagPress(tag.text)}
                style={({ pressed }) => [
                  styles.quickTagChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={[styles.quickTagText, { color: C.textSecondary }]}>
                  {tag.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Input
            placeholder="e.g. Smartphone in box, Degree certificate in envelope"
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={2}
            maxLength={300}
            style={styles.descInput}
            error={fieldErrors.description}
          />
        </View>

        <View style={[styles.cardDivider, { backgroundColor: C.surfaceBorderLight }]} />

        {/* 3. Weight */}
        <View style={styles.cardBlock}>
          <View style={styles.blockHeader}>
            <View style={styles.blockTitleRow}>
              <MaterialIcons name="scale" size={17} color={C.primary} />
              <Text style={[styles.blockTitle, { color: C.textPrimary }]}>Package Weight</Text>
            </View>
            <Text style={[styles.blockBadge, { color: C.textMuted }]}>in kg</Text>
          </View>

          {/* Stepper Display */}
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
              onPress={() => handleAdjustWeight(-0.5)}
              style={({ pressed }) => [
                styles.stepperBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <MaterialIcons name="remove" size={18} color={C.textPrimary} />
            </Pressable>

            <View style={[styles.stepperCenter, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <TextInput
                keyboardType="decimal-pad"
                value={form.weight}
                onChangeText={(v) => updateField('weight', v)}
                placeholder="1.0"
                placeholderTextColor={C.textMuted}
                style={[styles.stepperInput, { color: C.textPrimary }]}
                maxLength={4}
              />
              <Text style={[styles.stepperUnit, { color: C.textMuted }]}>kg</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase weight"
              onPress={() => handleAdjustWeight(0.5)}
              style={({ pressed }) => [
                styles.stepperBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <MaterialIcons name="add" size={18} color={C.textPrimary} />
            </Pressable>
          </View>

          {fieldErrors.weight ? (
            <Text style={[styles.errorText, { color: C.error }]}>{fieldErrors.weight}</Text>
          ) : null}

          {/* Preset Pills */}
          <View style={styles.presetRow}>
            {PARCEL_WEIGHT_PRESETS.map((value) => {
              const isActive = form.weight === value;
              return (
                <Pressable
                  key={`weight-${value}`}
                  onPress={() => {
                    Haptic.select();
                    updateField('weight', value);
                  }}
                  style={({ pressed }) => [
                    styles.presetPill,
                    {
                      backgroundColor: isActive ? C.primarySubtle : C.surfaceElevated,
                      borderColor: isActive ? C.primary : C.surfaceBorder,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      { color: isActive ? C.primary : C.textSecondary },
                    ]}
                  >
                    {value} kg
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.md, paddingBottom: 110 },

  /* Route Capsule */
  routeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeCity: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  routeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  routeActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  /* Category Section */
  categorySection: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  activeCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  activeCategoryPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  categoryScroll: {
    gap: 10,
    paddingRight: Spacing.md,
    paddingVertical: 2,
  },
  categoryCard: {
    width: 108,
    borderRadius: BorderRadius.lg,
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  artworkContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 12,
    textAlign: 'center',
  },

  /* Unified Card */
  unifiedCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardBlock: {
    gap: Spacing.sm,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  blockBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  cardDivider: {
    height: 1,
    width: '100%',
  },

  /* Quick Tags */
  quickTagsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  quickTagChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  descInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: {
    flex: 1,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    minWidth: 44,
  },
  stepperUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },

  /* Presets */
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  errorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
