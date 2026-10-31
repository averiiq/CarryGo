import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardPadding } from '@/hooks/useKeyboardPadding';
import { Button, Input, KeyboardAwareScrollView } from '@/components';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import {
  TripRouteStep,
  TripDetailsStep,
  TripReviewStep,
  VEHICLES,
  VEHICLE_MAX_CAPACITY,
} from '@/components/feature/trip';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormDraft } from '@/hooks/useFormDraft';
import { VehicleType, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { KycMandatoryModal } from '@/components/feature/KycMandatoryModal';
import { findCity, getDistance } from '@/constants/indian-cities';
import { useCreateTripMutation } from '@/features/listings/queries';
import { getUserErrorMessage } from '@/lib/error-handler';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
];

const ALL_CATEGORIES: ParcelCategory[] = ['documents', 'electronics', 'clothing', 'food', 'medicine', 'other'];

type TripDraft = {
  fromCity: string;
  toCity: string;
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
  date: '',
  time: '',
  vehicle: 'car',
  capacity: '',
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
  const { user, refreshUser } = useAuth();
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

  // Corridor distance and recommended fare guidance
  const corridorDistance = useMemo(() => {
    if (!form.fromCity || !form.toCity) return null;
    const c1 = findCity(form.fromCity);
    const c2 = findCity(form.toCity);
    if (!c1 || !c2) return 160;
    return getDistance(c1, c2);
  }, [form.fromCity, form.toCity]);

  const recommendedPrice = useMemo(() => {
    if (!corridorDistance) return null;
    const vehicleMultipliers: Record<VehicleType, number> = {
      bike: 0.8,
      car: 1.0,
      bus: 0.85,
      train: 0.75,
      flight: 1.8,
    };
    const mult = vehicleMultipliers[form.vehicle] || 1.0;
    let base = 60;
    if (corridorDistance > 250) base = 110;
    else if (corridorDistance > 120) base = 85;
    else base = 65;

    const rec = Math.round(base * mult);
    const min = Math.max(30, Math.round(rec * 0.75));
    const max = Math.round(rec * 1.35);
    return { suggested: rec, min, max, distanceKm: corridorDistance };
  }, [corridorDistance, form.vehicle]);

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
    if (!draft.date) {
      errors.date = 'Select travel date';
    } else if (draft.date < todayKey) {
      errors.date = 'Travel date cannot be in the past';
    }
    if (!draft.time) {
      errors.time = 'Select departure time';
    } else if (draft.date === todayKey) {
      const match = draft.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (hour * 60 + minute <= nowMinutes) {
          errors.time = 'Departure time has already passed';
        }
      }
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
        getUserErrorMessage(error, 'Failed to post trip. Please try again.'),
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
        onSelect={(d, t) => { updateField('date', d); updateField('time', t || ''); }}
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
                <Button
                  title="Back"
                  onPress={goBack}
                  variant="outline"
                  size="md"
                  style={styles.backButton}
                  icon={<MaterialIcons name="arrow-back" size={18} color={C.textPrimary} />}
                />
              )}
              {step === 0 ? (
                <Button
                  title="Continue to Details"
                  onPress={goNext}
                  fullWidth
                  size="md"
                  style={styles.primaryButtonFull}
                  icon={<MaterialIcons name="arrow-forward" size={18} color="#fff" />}
                />
              ) : step === 1 ? (
                <Button
                  title="Review Trip"
                  onPress={goNext}
                  size="md"
                  style={styles.primaryButton}
                  icon={<MaterialIcons name="arrow-forward" size={18} color="#fff" />}
                />
              ) : (
                <Button
                  title="Publish Trip"
                  onPress={handleSubmit}
                  loading={createTripMutation.isPending || isSubmitting}
                  size="md"
                  style={styles.primaryButton}
                  icon={<MaterialIcons name="rocket-launch" size={18} color="#fff" />}
                />
              )}
            </View>
          </View>
        }
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
        {step === 2 && <TripReviewStep form={form} onEdit={handleStepPress} hasKyc={isKycApproved} />}
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
  backButton: {
    minWidth: 92,
    flexShrink: 0,
  },
  primaryButton: {
    flex: 1,
  },
  primaryButtonFull: {
    flex: 1,
  },
});


