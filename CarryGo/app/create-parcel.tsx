import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardPadding } from '@/hooks/useKeyboardPadding';
import { Button, Input, KeyboardAwareScrollView } from '@/components';
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
import { KycMandatoryModal } from '@/components/feature/KycMandatoryModal';
import SafetyOnboarding from '@/components/feature/SafetyOnboarding';
import { HaryanaCorridorChips } from '@/components/feature/HaryanaCorridorChips';
import { estimatePrice, PriceEstimate } from '@/services/price-estimator.service';
import { useCreateParcelMutation } from '@/features/listings/queries';
import { getUserErrorMessage } from '@/lib/error-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafetyAgreement } from '@/hooks/useSafetyAgreement';
import { DocumentsIllustration, ElectronicsIllustration, ClothingIllustration, FoodIllustration, MedicineIllustration, OtherIllustration } from '@/components/illustrations';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
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
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [form, setForm] = useState<ParcelDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const isKycApproved = Boolean(
    user?.kycStatus === 'approved' ||
    user?.kycStatus === 'submitted' ||
    user?.verified ||
    user?.isAadhaarVerified
  );
  const [showSafety, setShowSafety] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingCurrentLocation, setIsDetectingCurrentLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [priceRecommendation, setPriceRecommendation] = useState<PriceEstimate | null>(null);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const { footerOffset } = useKeyboardPadding();

  // Auto-calculate smart pricing recommendation when route, weight or category are specified
  useEffect(() => {
    if (!form.fromCity || !form.toCity) {
      setPriceRecommendation(null);
      return;
    }

    let isMounted = true;
    const weightNum = Number(form.weight) || 1;
    setIsEstimatingPrice(true);

    const timer = setTimeout(() => {
      estimatePrice({
        fromCity: form.fromCity,
        toCity: form.toCity,
        weight: weightNum,
        category: form.category,
        deliveryDate: form.deliveryDate,
      })
        .then((est) => {
          if (isMounted) {
            setPriceRecommendation(est);
            setIsEstimatingPrice(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsEstimatingPrice(false);
        });
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [form.fromCity, form.toCity, form.weight, form.category, form.deliveryDate]);

  const { hasAgreed: hasSafetyAgreed, markAgreed: markSafetyAgreed } = useSafetyAgreement(user?.id);

  const hasExternalPrefill = Boolean(
    params.fromCity ||
    params.toCity ||
    params.category ||
    params.repost === '1'
  );

  const setFormValues = useCallback((values: ParcelDraft) => {
    setForm((prev) => {
      const fromCity = typeof params.fromCity === 'string' && params.fromCity ? normalizeCity(params.fromCity) : (values.fromCity || prev.fromCity);
      const toCity = typeof params.toCity === 'string' && params.toCity ? normalizeCity(params.toCity) : (values.toCity || prev.toCity);
      return {
        ...values,
        fromCity,
        toCity,
      };
    });
  }, [params.fromCity, params.toCity]);

  const { clearDraft, isDraftRestored } = useFormDraft('create_parcel', form, setFormValues);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const hasAppliedPrefill = useRef(false);

  useEffect(() => {
    if (hasAppliedPrefill.current) return;
    if (!hasExternalPrefill) return;

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
  }, [hasExternalPrefill, params]);

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
    setLocationHint('Detecting your current location via GPS...');
    setIsDetectingCurrentLocation(true);
    const { data, error } = await detectCurrentCity();
    setIsDetectingCurrentLocation(false);

    if (error || !data) {
      Haptic.warning();
      setLocationHint(error || 'Could not detect your current city. Please choose from the list.');
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
    if (!isKycApproved) {
      Haptic.warning();
      setShowKyc(true);
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
        getUserErrorMessage(error, 'Failed to list parcel. Please try again.'),
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
      <KycMandatoryModal
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        actionType="parcel"
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
          <View style={[styles.draftBanner, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="restore" size={15} color={C.primary} />
            <Text style={[styles.draftBannerText, { color: C.textSecondary }]}>Draft restored from last session</Text>
            <Pressable onPress={undoDraftRestore} hitSlop={8}>
              <Text style={[styles.draftBannerAction, { color: C.primary }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={() => setShowDraftBanner(false)} hitSlop={8} style={{ marginLeft: 4 }}>
              <MaterialIcons name="close" size={15} color={C.textMuted} />
            </Pressable>
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
        {step === 1 && (
          <StepDetails
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            C={C}
            priceRecommendation={priceRecommendation}
            isEstimatingPrice={isEstimatingPrice}
          />
        )}
        {step === 2 && <StepReview form={form} C={C} onEdit={handleStepPress} hasKyc={isKycApproved} />}

        <View
          style={[
            styles.footer,
            {
              backgroundColor: C.background,
              borderTopColor: C.surfaceBorder,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
              bottom: footerOffset,
            },
          ]}
        >
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
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      <StepHeader
        title="Where's it going?"
        subtitle="Choose route and preferred handover day"
        icon="alt-route"
        C={C}
      />

      <HaryanaCorridorChips
        activeFromCity={form.fromCity}
        activeToCity={form.toCity}
        onSelectCorridor={(from, to) => {
          updateField('fromCity', from);
          updateField('toCity', to);
        }}
        title="Popular Corridors (1-Tap Route)"
      />

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
          <Text
            style={[
              styles.locationHint,
              {
                color: locationHint.startsWith('Using ')
                  ? C.success
                  : locationHint.startsWith('Detecting')
                    ? C.primary
                    : C.error,
              },
            ]}
          >
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
    </KeyboardAwareScrollView>
  );
}

function StepDetails({
  form,
  updateField,
  fieldErrors,
  C,
  priceRecommendation,
  isEstimatingPrice,
}: {
  form: ParcelDraft;
  updateField: <K extends keyof ParcelDraft>(key: K, value: ParcelDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  priceRecommendation?: PriceEstimate | null;
  isEstimatingPrice?: boolean;
}) {
  const activeOfferPresets = priceRecommendation
    ? Array.from(new Set([
        String(priceRecommendation.minPrice),
        String(priceRecommendation.suggestedPrice),
        String(priceRecommendation.maxPrice),
      ]))
    : OFFER_PRESETS;

  return (
    <KeyboardAwareScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardDismissMode="on-drag" extraScrollHeight={130}>
      <StepHeader
        title="Parcel details"
        subtitle="Add parcel category, photos, weight and offer"
        icon="inventory-2"
        C={C}
      />

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

      {/* Smart Price Guidance Card (Uber / Ola / Zepto style) */}
      {priceRecommendation ? (
        <View style={[styles.smartPriceCard, { backgroundColor: C.surface, borderColor: C.primary + '40' }]}>
          <View style={styles.smartPriceTop}>
            <View style={[styles.smartPriceBadge, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="auto-awesome" size={13} color={C.primary} />
              <Text style={[styles.smartPriceBadgeText, { color: C.primary }]}>CarryGo Smart Estimate</Text>
            </View>
            <Text style={[styles.smartPriceDemandText, { color: priceRecommendation.demandLevel === 'high' ? C.warning : C.success }]}>
              {priceRecommendation.demandLevel === 'high' ? '🔥 High Traveler Demand' : '⚡ Recommended Rate'}
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
              <Text style={styles.smartPriceApplyText}>Apply ₹{priceRecommendation.suggestedPrice}</Text>
            </Pressable>
          </View>
        </View>
      ) : isEstimatingPrice ? (
        <View style={[styles.smartPriceLoadingCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="hourglass-empty" size={16} color={C.primary} />
          <Text style={[styles.smartPriceLoadingText, { color: C.textMuted }]}>
            Calculating best corridor rate...
          </Text>
        </View>
      ) : null}

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
          {activeOfferPresets.map((value) => (
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
    </KeyboardAwareScrollView>
  );
}

function StepReview({ form, C, onEdit, hasKyc }: {
  form: ParcelDraft;
  C: any;
  onEdit: (step: number) => void;
  hasKyc?: boolean;
}) {
  const selectedCategory = CATEGORIES.find((c) => c.type === form.category);

  return (
    <KeyboardAwareScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardDismissMode="on-drag" extraScrollHeight={130}>
      <StepHeader
        title="Review your parcel"
        subtitle="Double-check details before publishing to travelers"
        icon="fact-check"
        C={C}
      />

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

      {!hasKyc ? (
        <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <MaterialIcons name="security" size={16} color="#D97706" />
          <Text style={[styles.infoText, { color: '#92400E' }]}>
            Identity verification is mandatory before listing parcels. You will be prompted to verify via Aadhaar OTP upon tapping Send Parcel.
          </Text>
        </View>
      ) : null}

      <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
        <MaterialIcons name="info-outline" size={16} color={C.primary} />
        <Text style={[styles.infoText, { color: C.textSecondary }]}>
          After listing, you&apos;ll see travellers on your route. Tap Send Request to book one.
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

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
    <View style={styles.stepHeaderWrap}>
      <View style={[styles.stepHeaderIcon, { backgroundColor: C.primarySubtle, borderColor: C.primary + '25', borderWidth: 1 }]}>
        <MaterialIcons name={icon} size={22} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepTitle, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
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
  draftBannerAction: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
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
  footer: {
    flexDirection: 'row', gap: Spacing.md,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});


