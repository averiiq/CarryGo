import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button, Input } from '@/components';
import { CitySearchField } from '@/components/feature/CitySearchField';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import { ParcelImagePicker } from '@/components/feature/ParcelImagePicker';
import { useFormDraft } from '@/hooks/useFormDraft';
import { ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import { uploadParcelImage } from '@/services/storage.service';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import SafetyOnboarding from '@/components/feature/SafetyOnboarding';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateParcelMutation } from '@/features/listings/queries';
import { useSafetyAgreement } from '@/hooks/useSafetyAgreement';
import { DocumentsIllustration, ElectronicsIllustration, ClothingIllustration, FoodIllustration, MedicineIllustration, OtherIllustration, ProductIllustration, ProductIllustrationVariant } from '@/components/illustrations';

const STEPS = [
  { label: 'Route & Date' },
  { label: 'Parcel Details' },
  { label: 'Review & Send' },
];

const CATEGORY_ILLUSTRATIONS: Record<ParcelCategory, React.FC<{ size?: number; color?: string; active?: boolean }>> = {
  documents: DocumentsIllustration,
  electronics: ElectronicsIllustration,
  clothing: ClothingIllustration,
  food: FoodIllustration,
  medicine: MedicineIllustration,
  other: OtherIllustration,
};

const CATEGORIES: { type: ParcelCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'documents', label: 'Documents', icon: 'description', color: '#6B7280' },
  { type: 'electronics', label: 'Electronics', icon: 'devices', color: '#0F766E' },
  { type: 'clothing', label: 'Clothing', icon: 'checkroom', color: '#64748B' },
  { type: 'food', label: 'Food', icon: 'restaurant', color: '#EA580C' },
  { type: 'medicine', label: 'Medicine', icon: 'local-pharmacy', color: '#16A34A' },
  { type: 'other', label: 'Other', icon: 'inventory-2', color: '#4B5563' },
];

const WEIGHT_PRESETS = ['0.5', '1', '2', '5'];
const OFFER_PRESETS = ['100', '200', '500', '1000'];

type ParcelDraft = {
  fromCity: string;
  toCity: string;
  deliveryDate: string;
  category: ParcelCategory;
  description: string;
  weight: string;
  priceOffer: string;
  images: string[];
};

const EMPTY_DRAFT: ParcelDraft = {
  fromCity: '', toCity: '', deliveryDate: '', category: 'documents', description: '', weight: '', priceOffer: '', images: [],
};

function normalizeCity(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export default function CreateParcelScreen() {
  const params = useLocalSearchParams<{
    fromCity?: string;
    toCity?: string;
    deliveryDate?: string;
    category?: ParcelCategory;
    description?: string;
    weight?: string;
    priceOffer?: string;
    repost?: string;
  }>();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingCurrentLocation, setIsDetectingCurrentLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  const { hasAgreed: hasSafetyAgreed, markAgreed: markSafetyAgreed } = useSafetyAgreement(user?.id);

  const setFormValues = useCallback((values: ParcelDraft) => setForm(values), []);
  const { clearDraft, isDraftRestored } = useFormDraft('create_parcel', form, setFormValues);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const hasAppliedPrefill = useRef(false);

  useEffect(() => {
    if (hasAppliedPrefill.current || params.repost !== '1') return;

    const prefillCategory = params.category;
    const isValidCategory = prefillCategory && CATEGORIES.some((entry) => entry.type === prefillCategory);
    const nextForm: ParcelDraft = {
      fromCity: typeof params.fromCity === 'string' ? normalizeCity(params.fromCity) : '',
      toCity: typeof params.toCity === 'string' ? normalizeCity(params.toCity) : '',
      deliveryDate: typeof params.deliveryDate === 'string' ? params.deliveryDate : '',
      category: isValidCategory ? prefillCategory : 'documents',
      description: typeof params.description === 'string' ? params.description : '',
      weight: typeof params.weight === 'string' ? params.weight : '',
      priceOffer: typeof params.priceOffer === 'string' ? params.priceOffer : '',
      images: [],
    };

    if (
      nextForm.fromCity ||
      nextForm.toCity ||
      nextForm.deliveryDate ||
      nextForm.description ||
      nextForm.weight ||
      nextForm.priceOffer
    ) {
      setForm(nextForm);
      setFieldErrors({});
      setStep(0);
      setShowDraftBanner(false);
    }

    hasAppliedPrefill.current = true;
  }, [params]);

  const updateField = <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const prepareDraft = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const prepared: ParcelDraft = {
      ...form,
      fromCity: normalizeCity(form.fromCity),
      toCity: normalizeCity(form.toCity),
      deliveryDate: form.deliveryDate || toLocalDateKey(tomorrow),
      description: form.description.trim(),
      weight: form.weight.trim(),
      priceOffer: form.priceOffer.trim(),
    };

    if (
      prepared.fromCity !== form.fromCity ||
      prepared.toCity !== form.toCity ||
      prepared.deliveryDate !== form.deliveryDate ||
      prepared.description !== form.description ||
      prepared.weight !== form.weight ||
      prepared.priceOffer !== form.priceOffer
    ) {
      setForm(prepared);
    }

    return prepared;
  };

  const validateRouteStep = (draft: ParcelDraft) => {
    const errors: Record<string, string> = {};
    if (!draft.fromCity) errors.fromCity = 'Select origin city';
    if (!draft.toCity) errors.toCity = 'Select destination city';
    if (draft.fromCity && draft.toCity && draft.fromCity.toLowerCase() === draft.toCity.toLowerCase()) {
      errors.toCity = 'Must differ from origin';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return false;
    }
    return true;
  };

  const validateDetailsStep = (draft: ParcelDraft) => {
    const errors: Record<string, string> = {};
    if (draft.images.length < 1) errors.images = 'Add at least 1 parcel photo';
    const parcelWeight = Number(draft.weight);
    const offerAmount = Number(draft.priceOffer);
    if (!draft.weight) errors.weight = 'Enter weight';
    else if (!Number.isFinite(parcelWeight) || parcelWeight <= 0 || parcelWeight > 100) errors.weight = '0.1 - 100 kg';
    if (!draft.priceOffer) errors.priceOffer = 'Enter price offer';
    else if (!Number.isFinite(offerAmount) || offerAmount < 1 || offerAmount > 100000) errors.priceOffer = 'Rs 1 - Rs 1,00,000';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return false;
    }
    return true;
  };


  useEffect(() => {
    if (isDraftRestored) {
      setShowDraftBanner(true);
    }
  }, [isDraftRestored]);

  const routeChecks = useMemo(() => ([
    { label: 'Pickup city selected', done: Boolean(form.fromCity.trim()) },
    { label: 'Delivery city selected', done: Boolean(form.toCity.trim()) },
    { label: 'Route is valid', done: Boolean(form.fromCity && form.toCity && form.fromCity.toLowerCase() !== form.toCity.toLowerCase()) },
    { label: 'Send-by date selected', done: Boolean(form.deliveryDate) },
  ]), [form.fromCity, form.toCity, form.deliveryDate]);

  const detailChecks = useMemo(() => {
    const parcelWeight = Number(form.weight);
    const offerAmount = Number(form.priceOffer);
    return [
      { label: 'At least one photo added', done: form.images.length > 0 },
      { label: 'Weight set (0.1-100 kg)', done: Number.isFinite(parcelWeight) && parcelWeight > 0 && parcelWeight <= 100 },
      { label: 'Offer set (Rs 1-1,00,000)', done: Number.isFinite(offerAmount) && offerAmount >= 1 && offerAmount <= 100000 },
    ];
  }, [form.images.length, form.weight, form.priceOffer]);

  const currentChecks = step === 0 ? routeChecks : step === 1 ? detailChecks : [];
  const pendingChecks = currentChecks.filter((item) => !item.done);
  const nextHintAnim = useRef(new Animated.Value(1)).current;
  const wasStepCompleteRef = useRef(pendingChecks.length === 0);


  useEffect(() => {
    const isStepComplete = pendingChecks.length === 0;
    if (isStepComplete && !wasStepCompleteRef.current) {
      Haptic.success();
    }
    wasStepCompleteRef.current = isStepComplete;

    nextHintAnim.setValue(0.86);
    Animated.spring(nextHintAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 170,
      friction: 12,
    }).start();
  }, [pendingChecks.length, nextHintAnim]);
  const undoDraftRestore = () => {
    setForm(EMPTY_DRAFT);
    setFieldErrors({});
    setShowDraftBanner(false);
    clearDraft();
    Haptic.select();
  };
  const canMoveToStep = (targetStep: number) => {
    const prepared = prepareDraft();
    for (let checkStep = step; checkStep < targetStep; checkStep++) {
      if (checkStep === 0 && !validateRouteStep(prepared)) {
        setDirection('backward');
        setStep(0);
        return false;
      }
      if (checkStep === 1 && !validateDetailsStep(prepared)) {
        setDirection('backward');
        setStep(1);
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!canMoveToStep(Math.min(step + 1, 2))) {
      const pending = (step === 0 ? routeChecks : detailChecks)
        .filter((item) => !item.done)
        .map((item) => item.label);
      if (pending.length > 0) {
        showAlert('Complete this step', pending.join(' - '));
      }
      return;
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
    if (index === step) return;
    if (index > step && !canMoveToStep(index)) return;
    setDirection(index < step ? 'backward' : 'forward');
    setStep(index);
  };

  const handleUseCurrentLocation = async () => {
    if (isDetectingCurrentLocation) return;
    Haptic.tap();
    setLocationHint(null);
    setIsDetectingCurrentLocation(true);
    const { data, error } = await detectCurrentCity();
    setIsDetectingCurrentLocation(false);

    if (error || !data) {
      Haptic.warning();
      setLocationHint(error || 'Could not detect your current city.');
      return;
    }

    updateField('fromCity', data);
    setLocationHint(`Using ${data} as your pickup city.`);
    Haptic.success();
  };

  const handleSubmit = async () => {
    if (createParcelMutation.isPending || isSubmitting) return;
    const prepared = prepareDraft();
    if (!validateRouteStep(prepared)) {
      setDirection('backward');
      setStep(0);
      return;
    }
    if (!validateDetailsStep(prepared)) {
      setDirection('backward');
      setStep(1);
      return;
    }
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
    setFieldErrors({});
    setIsSubmitting(true);
    Haptic.confirm();
    try {
      const categoryLabel = CATEGORIES.find((entry) => entry.type === prepared.category)?.label ?? 'Parcel';
      const fallbackDescription = `${categoryLabel} parcel${prepared.weight ? ` (${prepared.weight}kg)` : ''}`;
      const parcelDescription = prepared.description || fallbackDescription;

      const uploadedUrls: string[] = [];
      for (let i = 0; i < prepared.images.length; i++) {
        const { data, error: uploadErr } = await uploadParcelImage(
          prepared.images[i],
          user.id,
          `draft_${Date.now()}_${i}`
        );
        if (uploadErr || !data) {
          throw new Error(uploadErr || `Failed to upload image ${i + 1}`);
        }
        uploadedUrls.push(data.cdnUrl);
      }

      const result = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.name || 'User',
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        category: prepared.category,
        description: parcelDescription,
        deliveryDate: prepared.deliveryDate,
        weight: Number(prepared.weight),
        priceOffer: Number(prepared.priceOffer),
        status: 'open',
        imageUris: uploadedUrls,
      });
      await notifyRouteSubscribers({
        listingType: 'parcel',
        listingId: result.id,
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        title: 'New Parcel on Your Route!',
        body: `${user.name || 'Someone'} needs delivery from ${prepared.fromCity} to ${prepared.toCity} by ${formatScheduleDate(prepared.deliveryDate)}.`,
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
    } finally {
      setIsSubmitting(false);
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
        {showDraftBanner ? (
          <View style={[styles.draftBanner, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
            <MaterialIcons name="restore" size={16} color={C.warning} />
            <Text style={[styles.draftBannerText, { color: C.textSecondary }]}>Draft restored from your last session.</Text>
            <Pressable onPress={undoDraftRestore} hitSlop={6}>
              <Text style={[styles.draftBannerAction, { color: C.warning }]}>Start fresh</Text>
            </Pressable>
          </View>
        ) : null}

        {step < 2 ? (
          <View style={[styles.checklistCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.checklistTitle, { color: C.textPrimary }]}>Step checklist</Text>
            {currentChecks.map((item) => (
              <View key={item.label} style={styles.checklistRow}>
                <MaterialIcons name={item.done ? 'check-circle' : 'radio-button-unchecked'} size={16} color={item.done ? C.success : C.textMuted} />
                <Text style={[styles.checklistText, { color: item.done ? C.textPrimary : C.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {step === 0 && (
          <StepRoute
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            C={C}
            onDatePress={() => setShowDatePicker(true)}
            onUseCurrentLocation={handleUseCurrentLocation}
            isDetectingCurrentLocation={isDetectingCurrentLocation}
            locationHint={locationHint}
          />
        )}
        {step === 1 && <StepDetails form={form} updateField={updateField} fieldErrors={fieldErrors} C={C} />}
        {step === 2 && <StepReview form={form} C={C} onEdit={handleStepPress} />}

        <View style={styles.footer}>
          {step < 2 ? (
            <Animated.View style={[styles.nextHintBar, { backgroundColor: pendingChecks.length > 0 ? C.warningSubtle : C.successSubtle, borderColor: pendingChecks.length > 0 ? C.warning + '55' : C.success + '55', opacity: nextHintAnim, transform: [{ translateY: nextHintAnim.interpolate({ inputRange: [0.86, 1], outputRange: [4, 0] }) }, { scale: nextHintAnim }] }]}>
              <MaterialIcons name={pendingChecks.length > 0 ? 'info-outline' : 'check-circle'} size={15} color={pendingChecks.length > 0 ? C.warning : C.success} />
              <Text style={[styles.nextHintText, { color: C.textSecondary }]} numberOfLines={1}>
                {pendingChecks.length > 0
                  ? `Before next: ${pendingChecks.slice(0, 2).map((item) => item.label).join(' • ')}`
                  : 'Looks good - you can continue to the next step.'}
              </Text>
            </Animated.View>
          ) : null}
          {step > 0 && (
            <Button title="Back" onPress={goBack} variant="outline" style={{ flex: 1 }} />
          )}
          {step < 2 ? (
            <Button title="Next" onPress={goNext} fullWidth={step === 0} style={step > 0 ? { flex: 2 } : undefined} />
          ) : (
            <Button
              title="Send Parcel"
              onPress={handleSubmit}
              loading={createParcelMutation.isPending || isSubmitting}
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

function StepRoute({ form, updateField, fieldErrors, C, onDatePress, onUseCurrentLocation, isDetectingCurrentLocation, locationHint }: {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  onDatePress: () => void;
  onUseCurrentLocation: () => void;
  isDetectingCurrentLocation: boolean;
  locationHint: string | null;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled keyboardDismissMode="on-drag">
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Where&apos;s it going?</Text>
      <StepHero
        title='Share a secure parcel route'
        subtitle='A clear route and handover date helps trusted travellers match with confidence.'
        illustration="route"
        C={C}
      />
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Choose route and preferred handover day clearly
      </Text>

      <View style={styles.fieldGroup}>
        <CitySearchField
          label="From"
          value={form.fromCity}
          onSelect={(city) => updateField('fromCity', city)}
          dotColor={C.success}
          error={fieldErrors.fromCity}
          placeholder="Pickup city..."
          onUseCurrentLocation={onUseCurrentLocation}
          isDetectingCurrentLocation={isDetectingCurrentLocation}
        />
        <CitySearchField
          label="To"
          value={form.toCity}
          onSelect={(city) => updateField('toCity', city)}
          dotColor={C.error}
          error={fieldErrors.toCity}
          placeholder="Delivery city..."
        />
        {locationHint ? (
          <Text style={[styles.locationHint, { color: locationHint.startsWith('Using ') ? C.success : C.textMuted }]}>
            {locationHint}
          </Text>
        ) : null}
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
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardDismissMode="on-drag">
      <StepHero
        title='Add parcel essentials'
        subtitle='Category, weight, and photos reduce confusion and improve match quality.'
        illustration="parcel"
        C={C}
      />
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Parcel details</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Add parcel details so travellers can trust quickly
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
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
                onPress={() => { Haptic.select(); updateField('category', cat.type); }}
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
            label="Price Offer (Rs)"
            placeholder="e.g. 150"
            value={form.priceOffer}
            onChangeText={(v) => updateField('priceOffer', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.priceOffer}
          />
        </View>
        <View style={styles.presetRow}>
          {WEIGHT_PRESETS.map((value) => (
            <Pressable
              key={'weight-' + value}
              style={({ pressed }) => [
                styles.presetChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                form.weight === value && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => { Haptic.select(); updateField('weight', value); }}
            >
              <Text style={[styles.presetText, { color: form.weight === value ? C.primary : C.textSecondary }]}>{value} kg</Text>
            </Pressable>
          ))}
          {OFFER_PRESETS.map((value) => (
            <Pressable
              key={'offer-' + value}
              style={({ pressed }) => [
                styles.presetChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                form.priceOffer === value && { backgroundColor: C.successSubtle, borderColor: C.success + '66' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => { Haptic.select(); updateField('priceOffer', value); }}
            >
              <Text style={[styles.presetText, { color: form.priceOffer === value ? C.success : C.textSecondary }]}>Rs {value}</Text>
            </Pressable>
          ))}
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
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardDismissMode="on-drag">
      <StepHero
        title='Review and send confidently'
        subtitle='Your summary sets expectations before you connect with verified travellers.'
        illustration="requests"
        C={C}
      />
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Review your parcel</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Review and publish with complete clarity
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
        {form.images.length > 0 && (
          <View style={styles.reviewImagesRow}>
            {form.images.map((uri, i) => (
              <View key={i} style={[styles.reviewImageThumb, { borderColor: C.surfaceBorder }]}>
                <Image source={{ uri }} style={styles.reviewImageImg} contentFit="cover" />
              </View>
            ))}
          </View>
        )}
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
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>Rs {form.priceOffer}</Text>
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
          After listing, you&apos;ll see travellers on your route. Tap Send Request to book one.
        </Text>
      </View>
    </ScrollView>
  );
}

function StepHero({
  title,
  subtitle,
  illustration,
  C,
}: {
  title: string;
  subtitle: string;
  illustration: ProductIllustrationVariant;
  C: any;
}) {
  return (
    <View style={[styles.heroCard, { borderColor: C.surfaceBorder }]}>
      <View style={styles.heroImage}><ProductIllustration variant={illustration} size={130} /></View>
      <View style={[styles.heroOverlay, { backgroundColor: C.primarySubtle }]} />
      <View style={[styles.heroGlow, { backgroundColor: C.primarySubtle }]} />
      <Text style={[styles.heroTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.xl, paddingBottom: 132 },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.md,
    minHeight: 148,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    right: -4,
    bottom: -18,
    opacity: 0.5,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlow: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.55,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.35,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    lineHeight: 21,
  },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, letterSpacing: -0.6 },
  stepSubtitle: { fontSize: FontSize.md, marginTop: -Spacing.xs, lineHeight: 23 },

  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  locationHint: { fontSize: FontSize.xs, marginLeft: 2 },
  row: { flexDirection: 'row', gap: Spacing.md },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  presetText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: -4 },

  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, borderWidth: 1.2, padding: Spacing.mdl, minHeight: 76,
  },
  scheduleIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleHintText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryCard: {
    alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.smd, paddingVertical: Spacing.mdl,
    borderRadius: BorderRadius.xl, borderWidth: 1.2,
    width: '31%', flexGrow: 1,
  },
  categoryIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  reviewCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1.2, padding: Spacing.xl, gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  reviewLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.8 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reviewDot: { width: 12, height: 12, borderRadius: 6 },
  reviewValue: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  reviewConnector: { paddingLeft: 4, height: 16, justifyContent: 'center' },
  reviewLine: { width: 2, flex: 1, marginLeft: 4, borderRadius: 1 },
  reviewMeta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: 4,
  },
  reviewMetaText: { fontSize: FontSize.sm },
  reviewImagesRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  reviewImageThumb: {
    flex: 1, aspectRatio: 1, borderRadius: BorderRadius.lg, borderWidth: 1.2, overflow: 'hidden',
  },
  reviewImageImg: { width: '100%', height: '100%' },
  reviewDetailsGrid: {
    flexDirection: 'row', gap: Spacing.md, marginTop: 4,
  },
  reviewDetailItem: { flex: 1, alignItems: 'center', gap: 6 },
  reviewDetailIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewDetailLabel: { fontSize: FontSize.xs },
  reviewDetailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  descriptionBox: {
    borderRadius: BorderRadius.md, padding: Spacing.sm + 2, marginTop: 4,
  },
  descriptionText: { fontSize: FontSize.sm, lineHeight: 22 },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.2,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 22 },

  draftBanner: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  draftBannerText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  draftBannerAction: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  checklistCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  checklistTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checklistText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  nextHintBar: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    top: -48,
  },
  nextHintText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  footer: {
    flexDirection: 'row', gap: Spacing.md,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});


