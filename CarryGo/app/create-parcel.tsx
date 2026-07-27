import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button, Input } from '@/components';
import { CitySearchField } from '@/components/feature/CitySearchField';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker } from '@/components/feature/SevenDaySchedulePicker';
import { useFormDraft } from '@/hooks/useFormDraft';
import { ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import SafetyOnboarding from '@/components/feature/SafetyOnboarding';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateParcelMutation } from '@/features/listings/queries';
import { useSafetyAgreement } from '@/hooks/useSafetyAgreement';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
];

const CATEGORIES: { type: ParcelCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'documents', label: 'Documents', icon: 'description', color: '#8B5CF6' },
  { type: 'electronics', label: 'Electronics', icon: 'devices', color: '#06B6D4' },
  { type: 'clothing', label: 'Clothing', icon: 'checkroom', color: '#F59E0B' },
  { type: 'food', label: 'Food', icon: 'restaurant', color: '#22C55E' },
  { type: 'medicine', label: 'Medicine', icon: 'local-pharmacy', color: '#EF4444' },
  { type: 'other', label: 'Other', icon: 'inventory-2', color: '#4F8EF7' },
];

type ParcelDraft = {
  fromCity: string;
  toCity: string;
  deliveryDate: string;
  category: ParcelCategory;
  description: string;
  weight: string;
  priceOffer: string;
};

const EMPTY_DRAFT: ParcelDraft = {
  fromCity: '', toCity: '', deliveryDate: '', category: 'documents', description: '', weight: '', priceOffer: '',
};

export default function CreateParcelScreen() {
  const { user } = useAuth();
  const createParcelMutation = useCreateParcelMutation();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [form, setForm] = useState<ParcelDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const [showSafety, setShowSafety] = useState(false);

  const { hasAgreed: hasSafetyAgreed, markAgreed: markSafetyAgreed } = useSafetyAgreement(user?.id);

  const setFormValues = useCallback((values: ParcelDraft) => setForm(values), []);
  const { clearDraft } = useFormDraft('create_parcel', form, setFormValues);

  const updateField = <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const selectedCategory = CATEGORIES.find((c) => c.type === form.category);

  const goNext = () => {
    if (step === 0) {
      const errors: Record<string, string> = {};
      if (!form.fromCity) errors.fromCity = 'Select origin city';
      if (!form.toCity) errors.toCity = 'Select destination city';
      if (form.fromCity && form.toCity && form.fromCity === form.toCity) {
        errors.toCity = 'Must differ from origin';
      }
      if (!form.deliveryDate) errors.deliveryDate = 'Select send-by date';
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        Haptic.error();
        return;
      }
    }
    if (step === 1) {
      const errors: Record<string, string> = {};
      if (!form.description) errors.description = 'Describe your parcel';
      const parcelWeight = Number(form.weight);
      const offerAmount = Number(form.priceOffer);
      if (!form.weight) errors.weight = 'Enter weight';
      else if (!Number.isFinite(parcelWeight) || parcelWeight <= 0 || parcelWeight > 100) errors.weight = '0.1 – 100 kg';
      if (!form.priceOffer) errors.priceOffer = 'Enter price offer';
      else if (!Number.isFinite(offerAmount) || offerAmount < 1 || offerAmount > 100000) errors.priceOffer = '₹1 – ₹1,00,000';
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        Haptic.error();
        return;
      }
    }
    setFieldErrors({});
    setDirection('forward');
    Haptic.tap();
    setStep((s) => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setDirection('backward');
    Haptic.tap();
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleStepPress = (index: number) => {
    setDirection(index < step ? 'backward' : 'forward');
    setStep(index);
  };

  const handleSubmit = async () => {
    if (createParcelMutation.isPending) return;
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in before listing a parcel.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!hasSafetyAgreed) {
      Haptic.warning();
      setShowSafety(true);
      return;
    }
    if (!FeatureFlags.kycProvider) {
      Haptic.warning();
      showAlert('Parcel Listing Unavailable', `${disabledFeatureMessage.kyc} Parcel listing stays paused in this build.`);
      return;
    }
    if (!(FeatureFlags.kycProvider && user?.kycStatus === 'approved')) {
      Haptic.warning();
      showAlert('KYC Required', 'You need to complete identity verification before sending a parcel.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Now', onPress: () => setShowKyc(true) },
      ]);
      return;
    }
    Haptic.confirm();
    try {
      const result = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.name || 'User',
        fromCity: form.fromCity,
        toCity: form.toCity,
        category: form.category,
        description: form.description,
        deliveryDate: form.deliveryDate,
        weight: Number(form.weight),
        priceOffer: Number(form.priceOffer),
        status: 'open',
      });
      await notifyRouteSubscribers({
        listingType: 'parcel',
        listingId: result.id,
        fromCity: form.fromCity,
        toCity: form.toCity,
        title: 'New Parcel on Your Route!',
        body: `${user.name || 'Someone'} needs delivery from ${form.fromCity} to ${form.toCity} by ${formatScheduleDate(form.deliveryDate)}.`,
      });
      clearDraft();
      Haptic.success();
      router.replace({ pathname: '/matching', params: { mode: 'parcel', id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Parcel Not Listed',
        error instanceof Error ? error.message : 'Failed to list parcel. Please try again.',
      );
    }
  };

  return (
    <>
      <SafetyOnboarding
        visible={showSafety}
        onClose={() => setShowSafety(false)}
        onComplete={async () => {
          await markSafetyAgreed();
          setShowSafety(false);
        }}
      />
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => setShowKyc(false)}
      />
      <SevenDaySchedulePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => updateField('deliveryDate', d)}
        C={C}
        initialDate={form.deliveryDate}
        includeTime={false}
        title="Send within 7 days"
        subtitle="Pick the day your parcel should be ready for handover."
        confirmLabel="Use This Date"
      />

      <WizardContainer
        steps={STEPS}
        currentStep={step}
        onStepPress={handleStepPress}
        direction={direction}
      >
        {step === 0 && <StepRoute form={form} updateField={updateField} fieldErrors={fieldErrors} C={C} onDatePress={() => setShowDatePicker(true)} />}
        {step === 1 && <StepDetails form={form} updateField={updateField} fieldErrors={fieldErrors} C={C} />}
        {step === 2 && <StepReview form={form} C={C} onEdit={handleStepPress} />}

        <View style={styles.footer}>
          {step > 0 && (
            <Button title="Back" onPress={goBack} variant="outline" style={{ flex: 1 }} />
          )}
          {step < 2 ? (
            <Button title="Next" onPress={goNext} fullWidth={step === 0} style={step > 0 ? { flex: 2 } : undefined} />
          ) : (
            <Button
              title="Send Parcel"
              onPress={handleSubmit}
              loading={createParcelMutation.isPending}
              fullWidth={step === 0}
              style={step > 0 ? { flex: 2 } : undefined}
              icon={<MaterialIcons name="check" size={18} color="#fff" />}
            />
          )}
        </View>
      </WizardContainer>
    </>
  );
}

function StepRoute({ form, updateField, fieldErrors, C, onDatePress }: {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  onDatePress: () => void;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Where's it going?</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Set the pickup and delivery cities
      </Text>

      <View style={styles.fieldGroup}>
        <CitySearchField
          label="From"
          value={form.fromCity}
          onSelect={(city) => updateField('fromCity', city)}
          dotColor={C.success}
          error={fieldErrors.fromCity}
          placeholder="Pickup city..."
        />
        <CitySearchField
          label="To"
          value={form.toCity}
          onSelect={(city) => updateField('toCity', city)}
          dotColor={C.error}
          error={fieldErrors.toCity}
          placeholder="Delivery city..."
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Send by</Text>
        <Pressable
          style={({ pressed }) => [
            styles.scheduleBtn,
            { backgroundColor: C.surface, borderColor: form.deliveryDate ? C.primary : fieldErrors.deliveryDate ? C.error : C.surfaceBorder },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => { Haptic.tap(); onDatePress(); }}
        >
          <View style={[styles.scheduleIconBox, { backgroundColor: form.deliveryDate ? C.primarySubtle : C.surfaceElevated }]}>
            <MaterialIcons name="event-available" size={20} color={form.deliveryDate ? C.primary : C.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            {form.deliveryDate ? (
              <>
                <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>{formatScheduleDate(form.deliveryDate)}</Text>
                <Text style={[styles.scheduleHintText, { color: C.textSecondary }]}>Ready for handover</Text>
              </>
            ) : (
              <Text style={[styles.schedulePlaceholder, { color: fieldErrors.deliveryDate ? C.error : C.textMuted }]}>
                {fieldErrors.deliveryDate || 'Choose a day in the next 7 days'}
              </Text>
            )}
          </View>
          <MaterialIcons name={form.deliveryDate ? 'edit' : 'chevron-right'} size={18} color={form.deliveryDate ? C.primary : C.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StepDetails({ form, updateField, fieldErrors, C }: {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Parcel details</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        What are you sending and how much will you pay?
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.type}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                form.category === cat.type && { backgroundColor: cat.color + '14', borderColor: cat.color },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => { Haptic.select(); updateField('category', cat.type); }}
            >
              <View style={[styles.categoryIconBox, { backgroundColor: form.category === cat.type ? cat.color + '20' : C.surfaceElevated }]}>
                <MaterialIcons name={cat.icon} size={22} color={form.category === cat.type ? cat.color : C.textMuted} />
              </View>
              <Text style={[styles.categoryLabel, { color: form.category === cat.type ? cat.color : C.textSecondary }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

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

      <View style={styles.fieldGroup}>
        <View style={styles.row}>
          <Input
            label="Weight (kg)"
            placeholder="e.g. 0.5"
            value={form.weight}
            onChangeText={(v) => updateField('weight', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.weight}
          />
          <Input
            label="Price Offer (₹)"
            placeholder="e.g. 150"
            value={form.priceOffer}
            onChangeText={(v) => updateField('priceOffer', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.priceOffer}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function StepReview({ form, C, onEdit }: {
  form: ParcelDraft;
  C: any;
  onEdit: (step: number) => void;
}) {
  const selectedCategory = CATEGORIES.find((c) => c.type === form.category);

  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Review your parcel</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Confirm the details before listing
      </Text>

      <View style={[styles.reviewCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.reviewHeader}>
          <Text style={[styles.reviewLabel, { color: C.textMuted }]}>ROUTE & DATE</Text>
          <Pressable onPress={() => onEdit(0)} hitSlop={8}>
            <MaterialIcons name="edit" size={16} color={C.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <View style={[styles.reviewDot, { backgroundColor: C.success }]} />
          <Text style={[styles.reviewValue, { color: C.textPrimary }]}>{form.fromCity}</Text>
        </View>
        <View style={styles.reviewConnector}>
          <View style={[styles.reviewLine, { backgroundColor: C.surfaceBorderLight }]} />
        </View>
        <View style={styles.reviewRow}>
          <View style={[styles.reviewDot, { backgroundColor: C.error }]} />
          <Text style={[styles.reviewValue, { color: C.textPrimary }]}>{form.toCity}</Text>
        </View>
        <View style={[styles.reviewMeta, { borderTopColor: C.surfaceBorder }]}>
          <MaterialIcons name="event-available" size={14} color={C.textSecondary} />
          <Text style={[styles.reviewMetaText, { color: C.textSecondary }]}>
            Send by {formatScheduleDate(form.deliveryDate)}
          </Text>
        </View>
      </View>

      <View style={[styles.reviewCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.reviewHeader}>
          <Text style={[styles.reviewLabel, { color: C.textMuted }]}>PARCEL INFO</Text>
          <Pressable onPress={() => onEdit(1)} hitSlop={8}>
            <MaterialIcons name="edit" size={16} color={C.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewDetailsGrid}>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: selectedCategory ? selectedCategory.color + '20' : C.surfaceElevated }]}>
              <MaterialIcons name={selectedCategory?.icon || 'inventory-2'} size={20} color={selectedCategory?.color || C.textMuted} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Category</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>{selectedCategory?.label}</Text>
          </View>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="fitness-center" size={20} color={C.primary} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Weight</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>{form.weight} kg</Text>
          </View>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: C.successSubtle }]}>
              <MaterialIcons name="currency-rupee" size={20} color={C.success} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Offer</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>₹{form.priceOffer}</Text>
          </View>
        </View>
        {form.description ? (
          <View style={[styles.descriptionBox, { backgroundColor: C.surfaceElevated }]}>
            <Text style={[styles.descriptionText, { color: C.textSecondary }]} numberOfLines={3}>
              {form.description}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
        <MaterialIcons name="info-outline" size={16} color={C.primary} />
        <Text style={[styles.infoText, { color: C.textSecondary }]}>
          After listing, you'll see travellers on your route. Tap Send Request to book one.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.lg, paddingBottom: 100 },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  stepSubtitle: { fontSize: FontSize.md, marginTop: -Spacing.sm },

  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  row: { flexDirection: 'row', gap: Spacing.md },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: -4 },

  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, padding: Spacing.md, minHeight: 68,
  },
  scheduleIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleHintText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryCard: {
    alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    width: '30%', flexGrow: 1,
  },
  categoryIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  reviewCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  reviewLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.8 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reviewDot: { width: 10, height: 10, borderRadius: 5 },
  reviewValue: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  reviewConnector: { paddingLeft: 4, height: 16, justifyContent: 'center' },
  reviewLine: { width: 2, flex: 1, marginLeft: 4, borderRadius: 1 },
  reviewMeta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: 4,
  },
  reviewMetaText: { fontSize: FontSize.sm },
  reviewDetailsGrid: {
    flexDirection: 'row', gap: Spacing.md, marginTop: 4,
  },
  reviewDetailItem: { flex: 1, alignItems: 'center', gap: 6 },
  reviewDetailIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewDetailLabel: { fontSize: FontSize.xs },
  reviewDetailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  descriptionBox: {
    borderRadius: BorderRadius.md, padding: Spacing.sm + 2, marginTop: 4,
  },
  descriptionText: { fontSize: FontSize.sm, lineHeight: 20 },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  footer: {
    flexDirection: 'row', gap: Spacing.md,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
});
