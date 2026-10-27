import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardPadding } from '@/hooks/useKeyboardPadding';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import {
  TripRouteStep,
  TripDetailsStep,
  TripReviewStep,
  VEHICLES,
  VEHICLE_MAX_CAPACITY,
  calculateRouteDistance,
  calculatePriceGuidance,
} from '@/components/feature/trip';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormDraft } from '@/hooks/useFormDraft';
import { VehicleType, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import { KycMandatoryModal } from '@/components/feature/KycMandatoryModal';
import { useCreateTripMutation } from '@/features/listings/queries';
import { getUserErrorMessage } from '@/lib/error-handler';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
];

const ALL_CATEGORIES: ParcelCategory[] = ['documents', 'electronics', 'clothing', 'food', 'medicine', 'other'];

export type TripDraft = {
  fromCity: string;
  toCity: string;
  stopovers: string[];
  date: string;
  time: string;
  vehicle: VehicleType;
  capacity: string;
  price: string;
  allowedCategories?: ParcelCategory[];
};

const EMPTY_DRAFT: TripDraft = {
  fromCity: '',
  toCity: '',
  stopovers: [],
  date: '',
  time: '',
  vehicle: 'car',
  capacity: '10',
  price: '',
  allowedCategories: ALL_CATEGORIES,
};

function normalizeCity(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export default function CreateTripScreen() {
  const params = useLocalSearchParams<{
    fromCity?: string;
    toCity?: string;
    date?: string;
    time?: string;
    vehicle?: VehicleType;
    capacity?: string;
    price?: string;
    repost?: string;
  }>();
  const { user } = useAuth();
  const createTripMutation = useCreateTripMutation();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { footerOffset } = useKeyboardPadding();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [form, setForm] = useState<TripDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const isKycApproved = Boolean(
    user?.kycStatus === 'approved' ||
    user?.verified ||
    user?.isAadhaarVerified
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingCurrentLocation, setIsDetectingCurrentLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  // Corridor distance calculation (incorporating starting Pick, Stopovers, and final Drop)
  const corridorDistance = useMemo(() => {
    if (!form.fromCity || !form.toCity) return 0;
    return calculateRouteDistance(form.fromCity, form.toCity, form.stopovers);
  }, [form.fromCity, form.toCity, form.stopovers]);

  // Negotiable price algorithm: calculates fair fare and provides distance-based guidance
  const recommendedPrice = useMemo(() => {
    if (!corridorDistance) return null;
    return calculatePriceGuidance(corridorDistance, form.vehicle, form.price);
  }, [corridorDistance, form.vehicle, form.price]);

  const hasExternalPrefill = Boolean(
    params.fromCity ||
    params.toCity ||
    params.capacity ||
    params.repost === '1'
  );

  const setFormValues = useCallback((values: TripDraft) => {
    setForm((prev) => {
      const fromCity = typeof params.fromCity === 'string' && params.fromCity ? normalizeCity(params.fromCity) : (values.fromCity || prev.fromCity);
      const toCity = typeof params.toCity === 'string' && params.toCity ? normalizeCity(params.toCity) : (values.toCity || prev.toCity);
      const capacity = typeof params.capacity === 'string' && params.capacity ? params.capacity : (values.capacity || prev.capacity);
      const todayKey = toLocalDateKey(new Date());
      const date = values.date && values.date >= todayKey ? values.date : todayKey;
      return {
        ...values,
        fromCity,
        toCity,
        capacity,
        stopovers: Array.isArray(values.stopovers) ? values.stopovers : prev.stopovers,
        date: values.date ? date : prev.date,
      };
    });
  }, [params.fromCity, params.toCity, params.capacity]);

  const { clearDraft, isDraftRestored } = useFormDraft('create_trip', form, setFormValues);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const hasAppliedPrefill = useRef(false);

  useEffect(() => {
    if (hasAppliedPrefill.current) return;
    if (!hasExternalPrefill) return;

    const prefillVehicle = params.vehicle;
    const isValidVehicle = prefillVehicle && VEHICLES.some((item) => item.type === prefillVehicle);
    const nextForm: TripDraft = {
      fromCity: typeof params.fromCity === 'string' ? normalizeCity(params.fromCity) : '',
      toCity: typeof params.toCity === 'string' ? normalizeCity(params.toCity) : '',
      stopovers: [],
      date: typeof params.date === 'string' && params.date ? params.date : toLocalDateKey(new Date()),
      time: typeof params.time === 'string' && params.time ? params.time : '10:00 AM',
      vehicle: isValidVehicle ? prefillVehicle : 'car',
      capacity: typeof params.capacity === 'string' && params.capacity ? params.capacity : '10',
      price: typeof params.price === 'string' && params.price ? params.price : '80',
    };

    if (
      nextForm.fromCity ||
      nextForm.toCity ||
      nextForm.date ||
      nextForm.time ||
      nextForm.capacity ||
      nextForm.price
    ) {
      setForm(nextForm);
      setFieldErrors({});
      setStep(0);
      setShowDraftBanner(false);
    }

    hasAppliedPrefill.current = true;
  }, [hasExternalPrefill, params]);

  const updateField = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const prepareDraft = () => {
    const todayKey = toLocalDateKey(new Date());
    const prepared: TripDraft = {
      ...form,
      fromCity: normalizeCity(form.fromCity),
      toCity: normalizeCity(form.toCity),
      stopovers: (form.stopovers || []).map(normalizeCity).filter(Boolean),
      date: form.date && form.date >= todayKey ? form.date : todayKey,
      time: form.time || '10:00 AM',
      capacity: form.capacity.trim(),
      price: form.price.trim(),
      allowedCategories: form.allowedCategories && form.allowedCategories.length > 0 ? form.allowedCategories : ALL_CATEGORIES,
    };

    if (
      prepared.fromCity !== form.fromCity ||
      prepared.toCity !== form.toCity ||
      prepared.date !== form.date ||
      prepared.time !== form.time ||
      prepared.capacity !== form.capacity ||
      prepared.price !== form.price ||
      prepared.allowedCategories !== form.allowedCategories
    ) {
      setForm(prepared);
    }

    return prepared;
  };

  const validateRouteStep = (draft: TripDraft) => {
    const errors: Record<string, string> = {};
    const todayKey = toLocalDateKey(new Date());

    if (!draft.fromCity) errors.fromCity = 'Select origin city';
    if (!draft.toCity) errors.toCity = 'Select destination city';

    if (draft.fromCity && draft.toCity && draft.fromCity.toLowerCase() === draft.toCity.toLowerCase()) {
      errors.toCity = 'Must differ from origin';
    }

    if (draft.stopovers && draft.stopovers.length > 0) {
      const invalidStop = draft.stopovers.find(
        (s) =>
          s.toLowerCase().trim() === draft.fromCity.toLowerCase().trim() ||
          s.toLowerCase().trim() === draft.toCity.toLowerCase().trim()
      );
      if (invalidStop) {
        errors.stopovers = `Stopover '${invalidStop}' cannot match Pick or Drop`;
      }
    }

    if (!draft.date) {
      errors.date = 'Select travel date';
    } else if (draft.date < todayKey) {
      errors.date = 'Travel date cannot be in the past';
    }

    if (!draft.time) {
      errors.time = 'Select departure time';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return false;
    }
    return true;
  };

  const validateDetailsStep = (draft: TripDraft) => {
    const errors: Record<string, string> = {};
    const capacityKg = Number(draft.capacity);
    const pricePerKg = Number(draft.price);
    const maxCapacity = VEHICLE_MAX_CAPACITY[draft.vehicle] || 100;

    if (!draft.capacity) {
      errors.capacity = 'Enter capacity';
    } else if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
    } else if (capacityKg > maxCapacity) {
      errors.capacity = `Max ${maxCapacity} kg for ${draft.vehicle}`;
    }

    if (!draft.price) {
      errors.price = 'Enter price per kg';
    } else if (!Number.isFinite(pricePerKg) || pricePerKg < 1 || pricePerKg > 50000) {
      errors.price = 'Rs 1 - Rs 50,000';
    }

    if (!draft.allowedCategories || draft.allowedCategories.length === 0) {
      errors.allowedCategories = 'Select at least 1 item category you can carry';
    }

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
      setLocationHint(error || 'Could not detect your origin city. Please choose from the list.');
      return;
    }

    updateField('fromCity', data);
    setLocationHint(`Using ${data} as your origin city.`);
    Haptic.success();
  };

  const handleSubmit = async () => {
    if (createTripMutation.isPending || isSubmitting) return;
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
      showAlert('Sign In Required', 'Please sign in before posting a trip.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
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
      const realRating = user.totalRatings && user.totalRatings > 0 ? (user.rating || 5.0) : 0;
      const userAvatar = user.avatar || user.selfieUrl || (user as any).avatarUrl || (user as any).userSelfieUrl;
      const result = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'User',
        userAvatar: userAvatar || undefined,
        userRating: realRating,
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        date: prepared.date,
        time: prepared.time,
        vehicleType: form.vehicle,
        availableCapacity: Number(prepared.capacity),
        pricePerKg: Number(prepared.price),
        status: 'active',
        allowedCategories: prepared.allowedCategories,
        stopovers: prepared.stopovers,
      });

      try {
        await notifyRouteSubscribers({
          listingType: 'trip',
          listingId: result.id,
          fromCity: prepared.fromCity,
          toCity: prepared.toCity,
          title: 'New Trip on Your Route!',
          body: `${user?.fullName || user?.name || 'Someone'} is travelling ${prepared.fromCity} to ${prepared.toCity} on ${formatScheduleDate(prepared.date)}.`,
        });
      } catch (notifyErr) {
        console.warn('Failed to notify route subscribers:', notifyErr);
      }

      clearDraft();
      Haptic.success();
      router.replace({ pathname: '/trip/[id]', params: { id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Trip Not Posted',
        getUserErrorMessage(error, 'Failed to post trip. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KycMandatoryModal
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        actionType="trip"
      />
      <SevenDaySchedulePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d, t) => {
          updateField('date', d);
          if (t) updateField('time', t);
        }}
        C={C}
        initialDate={form.date}
        initialTime={form.time}
        title="Trip in the next 7 days"
        subtitle="Pick your travel day and departure time."
        timeLabel="Departure time"
        confirmLabel="Confirm Trip Time"
      />

      <WizardContainer
        steps={STEPS}
        currentStep={step}
        onStepPress={handleStepPress}
        direction={direction}
        title="Post a Trip"
        onBack={() => {
          if (step > 0) {
            goBack();
          } else {
            router.back();
          }
        }}
        footer={
          <View
            style={[
              styles.footerContainer,
              {
                backgroundColor: C.surface,
                borderTopColor: C.surfaceBorder,
                paddingBottom: Math.max(insets.bottom, Spacing.md),
                marginBottom: footerOffset,
              },
            ]}
          >
            <View style={styles.footerInner}>
              {step > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back to previous step"
                  onPress={goBack}
                  style={({ pressed }) => [
                    styles.backBtnPill,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                    },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <MaterialIcons name="arrow-back" size={18} color={C.textPrimary} />
                  <Text style={[styles.backBtnText, { color: C.textPrimary }]}>Back</Text>
                </Pressable>
              )}

              {step === 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to Trip Details"
                  onPress={goNext}
                  style={({ pressed }) => [
                    styles.greenActionBtn,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={styles.greenActionBtnText}>Continue to Details</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              ) : step === 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Review Trip"
                  onPress={goNext}
                  style={({ pressed }) => [
                    styles.greenActionBtn,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={styles.greenActionBtnText}>Review Trip</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Publish Trip"
                  onPress={handleSubmit}
                  disabled={createTripMutation.isPending || isSubmitting}
                  style={({ pressed }) => [
                    styles.greenActionBtn,
                    (createTripMutation.isPending || isSubmitting) && { opacity: 0.6 },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {createTripMutation.isPending || isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="rocket-launch" size={18} color="#FFFFFF" />
                      <Text style={styles.greenActionBtnText}>
                        Publish Trip{form.price ? ` • ₹${form.price}/kg` : ''}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        }
      >
        {showDraftBanner ? (
          <View
            style={[
              styles.draftBanner,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            ]}
          >
            <MaterialIcons name="restore" size={15} color="#10B981" />
            <Text style={[styles.draftBannerText, { color: C.textSecondary }]}>
              Draft restored from your last session
            </Text>
            <Pressable onPress={undoDraftRestore} hitSlop={8}>
              <Text style={[styles.draftBannerAction, { color: '#10B981' }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={() => setShowDraftBanner(false)} hitSlop={8} style={{ marginLeft: 4 }}>
              <MaterialIcons name="close" size={15} color={C.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {step === 0 && (
          <TripRouteStep
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            onDatePress={() => setShowDatePicker(true)}
            onUseCurrentLocation={handleUseCurrentLocation}
            isDetectingCurrentLocation={isDetectingCurrentLocation}
            locationHint={locationHint}
          />
        )}

        {step === 1 && (
          <TripDetailsStep
            form={form}
            updateField={updateField}
            fieldErrors={fieldErrors}
            recommendedPrice={recommendedPrice}
          />
        )}

        {step === 2 && (
          <TripReviewStep
            form={form}
            onEdit={handleStepPress}
            hasKyc={isKycApproved}
          />
        )}
      </WizardContainer>
    </>
  );
}

const styles = StyleSheet.create({
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
  footerContainer: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  backBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  // Green action button strictly matching index.styles.ts UI theme
  greenActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
    gap: Spacing.sm,
  },
  greenActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
});
