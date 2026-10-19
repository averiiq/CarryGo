import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardPadding } from '@/hooks/useKeyboardPadding';
import { Button } from '@/components/ui/Button';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import { useFormDraft } from '@/hooks/useFormDraft';
import { ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import { uploadParcelImage } from '@/services/storage.service';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { KycMandatoryModal } from '@/components/feature/KycMandatoryModal';
import SafetyOnboarding from '@/components/feature/SafetyOnboarding';
import { estimatePrice, PriceEstimate } from '@/services/price-estimator.service';
import { useCreateParcelMutation } from '@/features/listings/queries';
import { getUserErrorMessage } from '@/lib/error-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafetyAgreement } from '@/hooks/useSafetyAgreement';
import {
  ParcelDraft,
  EMPTY_PARCEL_DRAFT,
  PARCEL_CATEGORIES,
  normalizeParcelCity,
  validateParcelRoute,
  validateParcelDetails,
  ParcelRouteStep,
  ParcelDetailsStep,
  ParcelAvailableTripsStep,
} from '@/components/feature/parcel';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Available Trips' },
];

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
  const [form, setForm] = useState<ParcelDraft>(EMPTY_PARCEL_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const isKycApproved = Boolean(
    user?.kycStatus === 'approved' ||
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
            if (est?.suggestedPrice) {
              setForm((prev) => ({ ...prev, priceOffer: String(est.suggestedPrice) }));
            }
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
      const fromCity = typeof params.fromCity === 'string' && params.fromCity ? normalizeParcelCity(params.fromCity) : (values.fromCity || prev.fromCity);
      const toCity = typeof params.toCity === 'string' && params.toCity ? normalizeParcelCity(params.toCity) : (values.toCity || prev.toCity);
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
    const isValidCategory = prefillCategory && PARCEL_CATEGORIES.some((entry) => entry.type === prefillCategory);
    const nextForm: ParcelDraft = {
      fromCity: typeof params.fromCity === 'string' ? normalizeParcelCity(params.fromCity) : '',
      toCity: typeof params.toCity === 'string' ? normalizeParcelCity(params.toCity) : '',
      deliveryDate: typeof params.deliveryDate === 'string' ? params.deliveryDate : '',
      preferredTime: 'anytime',
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
      fromCity: normalizeParcelCity(form.fromCity),
      toCity: normalizeParcelCity(form.toCity),
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
    const errors = validateParcelRoute(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return false;
    }
    return true;
  };

  const validateDetailsStep = (draft: ParcelDraft) => {
    const errors = validateParcelDetails(draft);
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
    setForm(EMPTY_PARCEL_DRAFT);
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

  const handleSelectTrip = (targetTrip: any) => {
    const prepared = prepareDraft();
    Haptic.confirm();
    router.push({
      pathname: '/trip/[id]',
      params: {
        id: targetTrip.id,
        draftFromCity: prepared.fromCity,
        draftToCity: prepared.toCity,
        draftWeight: prepared.weight,
        draftCategory: prepared.category,
        draftPrice: prepared.priceOffer,
        draftDesc: prepared.description,
      },
    });
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
      const categoryLabel = PARCEL_CATEGORIES.find((entry) => entry.type === prepared.category)?.label ?? 'Parcel';
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

      const userAvatar = user.avatar || user.selfieUrl || (user as any).avatarUrl || (user as any).userSelfieUrl;
      const result = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'User',
        userAvatar: userAvatar || undefined,
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        category: prepared.category,
        description: parcelDescription,
        deliveryDate: prepared.deliveryDate,
        weight: Number(prepared.weight),
        priceOffer: Number(prepared.priceOffer) || priceRecommendation?.suggestedPrice || 0,
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
        title="Send a Parcel"
        onBack={() => {
          if (step > 0) {
            goBack();
          } else {
            router.back();
          }
        }}
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
          <ParcelRouteStep
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
          <ParcelDetailsStep
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            C={C}
            priceRecommendation={priceRecommendation}
            isEstimatingPrice={isEstimatingPrice}
          />
        )}
        {step === 2 && (
          <ParcelAvailableTripsStep
            form={form}
            C={C}
            onSelectTrip={handleSelectTrip}
            onEditDetails={() => {
              setDirection('backward');
              setStep(1);
            }}
            onPostOpenRequest={handleSubmit}
            isPostingOpenRequest={createParcelMutation.isPending || isSubmitting}
          />
        )}

        {step < 2 ? (
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
            <Button
              title={step === 0 ? 'Continue to Details' : 'Find Available Trips'}
              onPress={goNext}
              fullWidth={step === 0}
              style={step > 0 ? { flex: 2 } : undefined}
            />
          </View>
        ) : null}
      </WizardContainer>
    </>
  );
}

const styles = StyleSheet.create({
  draftBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  draftBannerText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  draftBannerAction: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});


