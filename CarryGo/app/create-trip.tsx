import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button, Input } from '@/components';
import { CitySearchField } from '@/components/feature/CitySearchField';
import { WizardContainer } from '@/components/feature/WizardContainer';
import { formatScheduleDate, SevenDaySchedulePicker, toLocalDateKey } from '@/components/feature/SevenDaySchedulePicker';
import { useFormDraft } from '@/hooks/useFormDraft';
import { VehicleType } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { Haptic } from '@/services/haptics.service';
import { detectCurrentCity } from '@/services/location.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateTripMutation } from '@/features/listings/queries';
import { BikeIllustration, CarIllustration, BusIllustration, TrainIllustration, FlightIllustration } from '@/components/illustrations';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
];

const VEHICLE_ILLUSTRATIONS: Record<VehicleType, React.FC<{ size?: number; color?: string; active?: boolean }>> = {
  bike: BikeIllustration,
  car: CarIllustration,
  bus: BusIllustration,
  train: TrainIllustration,
  flight: FlightIllustration,
};

const VEHICLES: { type: VehicleType; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'bike', label: 'Bike', icon: 'two-wheeler', color: '#16A34A' },
  { type: 'car', label: 'Car', icon: 'directions-car', color: '#4B5563' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus', color: '#6B7280' },
  { type: 'train', label: 'Train', icon: 'train', color: '#0F766E' },
  { type: 'flight', label: 'Flight', icon: 'flight', color: '#15803D' },
];

const VEHICLE_QUICK_DEFAULTS: Record<VehicleType, { capacity: string; price: string }> = {
  bike: { capacity: '3', price: '70' },
  car: { capacity: '10', price: '120' },
  bus: { capacity: '20', price: '80' },
  train: { capacity: '15', price: '90' },
  flight: { capacity: '8', price: '250' },
};

const CAPACITY_PRESETS = ['2', '5', '10', '15'];
const PRICE_PRESETS = ['60', '100', '150', '250'];

type TripDraft = {
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  capacity: string;
  price: string;
};

const EMPTY_DRAFT: TripDraft = {
  fromCity: '', toCity: '', date: '', time: '', vehicle: 'car', capacity: '', price: '',
};

function normalizeCity(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export default function CreateTripScreen() {
  const { user, refreshUser } = useAuth();
  const createTripMutation = useCreateTripMutation();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [form, setForm] = useState<TripDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingCurrentLocation, setIsDetectingCurrentLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  const setFormValues = useCallback((values: TripDraft) => setForm(values), []);
  const { clearDraft } = useFormDraft('create_trip', form, setFormValues);

  const updateField = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const prepareDraft = () => {
    const prepared: TripDraft = {
      ...form,
      fromCity: normalizeCity(form.fromCity),
      toCity: normalizeCity(form.toCity),
      date: form.date || toLocalDateKey(new Date()),
      time: form.time || '10:00 AM',
      capacity: form.capacity.trim(),
      price: form.price.trim(),
    };

    if (
      prepared.fromCity !== form.fromCity ||
      prepared.toCity !== form.toCity ||
      prepared.date !== form.date ||
      prepared.time !== form.time ||
      prepared.capacity !== form.capacity ||
      prepared.price !== form.price
    ) {
      setForm(prepared);
    }

    return prepared;
  };

  const validateRouteStep = (draft: TripDraft) => {
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

  const validateDetailsStep = (draft: TripDraft) => {
    const errors: Record<string, string> = {};
    const capacityKg = Number(draft.capacity);
    const pricePerKg = Number(draft.price);
    if (!draft.capacity) errors.capacity = 'Enter capacity';
    else if (!Number.isFinite(capacityKg) || capacityKg <= 0 || capacityKg > 500) errors.capacity = '0.1 - 500 kg';
    if (!draft.price) errors.price = 'Enter price per kg';
    else if (!Number.isFinite(pricePerKg) || pricePerKg < 1 || pricePerKg > 50000) errors.price = 'Rs 1 - Rs 50,000';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return false;
    }
    return true;
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
    if (!canMoveToStep(Math.min(step + 1, 2))) return;
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
    if (!FeatureFlags.kycProvider) {
      Haptic.warning();
      showAlert('Trip Posting Unavailable', `${disabledFeatureMessage.kyc} Trip posting stays paused in this build.`);
      return;
    }
    if (!(FeatureFlags.kycProvider && user?.kycStatus === 'approved')) {
      Haptic.warning();
      showAlert('KYC Required', 'You need to complete identity verification before posting a trip.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Now', onPress: () => setShowKyc(true) },
      ]);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    Haptic.confirm();
    try {
      const result = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'User',
        userRating: user.rating || 4.5,
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        date: prepared.date,
        time: prepared.time,
        vehicleType: form.vehicle,
        availableCapacity: Number(prepared.capacity),
        pricePerKg: Number(prepared.price),
        status: 'active',
      });
      await notifyRouteSubscribers({
        listingType: 'trip',
        listingId: result.id,
        fromCity: prepared.fromCity,
        toCity: prepared.toCity,
        title: 'New Trip on Your Route!',
        body: `${user?.name || 'Someone'} is travelling ${prepared.fromCity} to ${prepared.toCity} on ${formatScheduleDate(prepared.date)}.`,
      });
      clearDraft();
      Haptic.success();
      router.replace({ pathname: '/trip/[id]', params: { id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Trip Not Posted',
        error instanceof Error ? error.message : 'Failed to post trip. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => { setShowKyc(false); refreshUser(); }}
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
      >
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
          {step > 0 && (
            <Button title="Back" onPress={goBack} variant="outline" style={{ flex: 1 }} />
          )}
          {step < 2 ? (
            <Button title="Next" onPress={goNext} fullWidth={step === 0} style={step > 0 ? { flex: 2 } : undefined} />
          ) : (
            <Button
              title="Post Trip"
              onPress={handleSubmit}
              loading={createTripMutation.isPending || isSubmitting}
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
  form: TripDraft;
  updateField: <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  onDatePress: () => void;
  onUseCurrentLocation: () => void;
  isDetectingCurrentLocation: boolean;
  locationHint: string | null;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <StepHero
        title="Plan a smooth journey"
        subtitle="Pick your route and make it easy for senders to trust you quickly."
        image={require('@/assets/images/onboarding-1.webp')}
        C={C}
      />
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Where are you going?</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Set your route and travel schedule
      </Text>

      <View style={styles.fieldGroup}>
        <CitySearchField
          label="From"
          value={form.fromCity}
          onSelect={(city) => updateField('fromCity', city)}
          dotColor={C.success}
          error={fieldErrors.fromCity}
          placeholder="Origin city..."
          onUseCurrentLocation={onUseCurrentLocation}
          isDetectingCurrentLocation={isDetectingCurrentLocation}
        />
        <CitySearchField
          label="To"
          value={form.toCity}
          onSelect={(city) => updateField('toCity', city)}
          dotColor={C.error}
          error={fieldErrors.toCity}
          placeholder="Destination city..."
        />
        {locationHint ? (
          <Text style={[styles.locationHint, { color: locationHint.startsWith('Using ') ? C.success : C.textMuted }]}>
            {locationHint}
          </Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>When</Text>
        <Pressable
          style={({ pressed }) => [
            styles.scheduleBtn,
            { backgroundColor: C.surface, borderColor: form.date ? C.primary : fieldErrors.date ? C.error : C.surfaceBorder },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => { Haptic.tap(); onDatePress(); }}
        >
          <View style={[styles.scheduleIconBox, { backgroundColor: form.date ? C.primarySubtle : C.surfaceElevated }]}>
            <MaterialIcons name="event" size={20} color={form.date ? C.primary : C.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            {form.date ? (
              <>
                <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>{formatScheduleDate(form.date)}</Text>
                <Text style={[styles.scheduleTimeText, { color: C.textSecondary }]}>{form.time}</Text>
              </>
            ) : (
              <Text style={[styles.schedulePlaceholder, { color: fieldErrors.date ? C.error : C.textMuted }]}>
                {fieldErrors.date || 'Select date & time'}
              </Text>
            )}
          </View>
          <MaterialIcons name={form.date ? 'edit' : 'chevron-right'} size={18} color={form.date ? C.primary : C.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StepDetails({ form, updateField, fieldErrors, C }: {
  form: TripDraft;
  updateField: <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false}>
      <StepHero
        title="Set your carrying details"
        subtitle="Clear capacity and price build confidence and better route matches."
        image={require('@/assets/images/onboarding-2.webp')}
        C={C}
      />
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Trip details</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        How are you travelling and how much can you carry?
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Vehicle</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLES.map((v) => {
            const Illustration = VEHICLE_ILLUSTRATIONS[v.type];
            const isActive = form.vehicle === v.type;
            return (
              <Pressable
                key={v.type}
                style={({ pressed }) => [
                  styles.vehicleCard,
                  { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                  isActive && { backgroundColor: v.color + '14', borderColor: v.color },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  Haptic.select();
                  updateField('vehicle', v.type);
                  const defaults = VEHICLE_QUICK_DEFAULTS[v.type];
                  if (!form.capacity) updateField('capacity', defaults.capacity);
                  if (!form.price) updateField('price', defaults.price);
                }}
              >
                <Illustration size={44} color={isActive ? v.color : C.textMuted} active={isActive} />
                <Text style={[styles.vehicleLabel, { color: isActive ? v.color : C.textSecondary }]}>
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.row}>
          <Input
            label="Capacity (kg)"
            placeholder="e.g. 5"
            value={form.capacity}
            onChangeText={(v) => updateField('capacity', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.capacity}
          />
          <Input
            label="Price / kg (Rs)"
            placeholder="e.g. 80"
            value={form.price}
            onChangeText={(v) => updateField('price', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.price}
          />
        </View>
        <View style={styles.presetRow}>
          {CAPACITY_PRESETS.map((value) => (
            <Pressable
              key={`capacity-${value}`}
              style={({ pressed }) => [
                styles.presetChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                form.capacity === value && { backgroundColor: C.primarySubtle, borderColor: C.primary + '66' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => { Haptic.select(); updateField('capacity', value); }}
            >
              <Text style={[styles.presetText, { color: form.capacity === value ? C.primary : C.textSecondary }]}>
                {value} kg
              </Text>
            </Pressable>
          ))}
          {PRICE_PRESETS.map((value) => (
            <Pressable
              key={`price-${value}`}
              style={({ pressed }) => [
                styles.presetChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                form.price === value && { backgroundColor: C.successSubtle, borderColor: C.success + '66' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => { Haptic.select(); updateField('price', value); }}
            >
              <Text style={[styles.presetText, { color: form.price === value ? C.success : C.textSecondary }]}>Rs {value}</Text>
            </Pressable>
          ))}
        </View>
        {form.capacity && form.price && Number(form.capacity) > 0 && Number(form.price) > 0 ? (
          <View style={[styles.earningHint, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="trending-up" size={16} color={C.success} />
            <Text style={[styles.earningText, { color: C.success }]}>
              Max earning: Rs {(Number(form.capacity) * Number(form.price)).toFixed(0)}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function StepReview({ form, C, onEdit }: {
  form: TripDraft;
  C: any;
  onEdit: (step: number) => void;
}) {
  const selectedVehicle = VEHICLES.find((v) => v.type === form.vehicle);

  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false}>
      <StepHero
        title="Review before publishing"
        subtitle="One final check keeps pickup, timing, and expectations perfectly aligned."
        image={require('@/assets/images/onboarding-3.webp')}
        C={C}
      />
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Review your trip</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        Make sure everything looks good before posting
      </Text>

      <View style={[styles.reviewCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.reviewHeader}>
          <Text style={[styles.reviewLabel, { color: C.textMuted }]}>ROUTE & SCHEDULE</Text>
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
          <MaterialIcons name="event" size={14} color={C.textSecondary} />
          <Text style={[styles.reviewMetaText, { color: C.textSecondary }]}>
            {formatScheduleDate(form.date)} · {form.time}
          </Text>
        </View>
      </View>

      <View style={[styles.reviewCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.reviewHeader}>
          <Text style={[styles.reviewLabel, { color: C.textMuted }]}>TRIP DETAILS</Text>
          <Pressable onPress={() => onEdit(1)} hitSlop={8}>
            <MaterialIcons name="edit" size={16} color={C.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewDetailsGrid}>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: selectedVehicle ? selectedVehicle.color + '20' : C.surfaceElevated }]}>
              <MaterialIcons name={selectedVehicle?.icon || 'directions-car'} size={20} color={selectedVehicle?.color || C.textMuted} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Vehicle</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>{selectedVehicle?.label}</Text>
          </View>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="fitness-center" size={20} color={C.primary} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Capacity</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>{form.capacity} kg</Text>
          </View>
          <View style={styles.reviewDetailItem}>
            <View style={[styles.reviewDetailIcon, { backgroundColor: C.successSubtle }]}>
              <MaterialIcons name="currency-rupee" size={20} color={C.success} />
            </View>
            <Text style={[styles.reviewDetailLabel, { color: C.textMuted }]}>Price</Text>
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>Rs {form.price}/kg</Text>
          </View>
        </View>
      </View>

      <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
        <MaterialIcons name="info-outline" size={16} color={C.primary} />
        <Text style={[styles.infoText, { color: C.textSecondary }]}>
          After posting, you&apos;ll immediately see open parcels on your route.
        </Text>
      </View>
    </ScrollView>
  );
}

function StepHero({
  title,
  subtitle,
  image,
  C,
}: {
  title: string;
  subtitle: string;
  image: number;
  C: any;
}) {
  return (
    <View style={[styles.heroCard, { borderColor: C.surfaceBorder }]}> 
      <Image source={image} style={styles.heroImage} contentFit="cover" transition={180} />
      <View style={[styles.heroOverlay, { backgroundColor: C.overlayLight }]} />
      <View style={[styles.heroGlow, { backgroundColor: C.primarySubtle }]} />
      <Text style={[styles.heroTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: { gap: Spacing.lg, paddingBottom: 124 },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.md,
    minHeight: 136,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 84,
    height: 84,
    borderRadius: 42,
    opacity: 0.55,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  stepSubtitle: { fontSize: FontSize.md, marginTop: -Spacing.sm },

  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginLeft: 2 },
  locationHint: { fontSize: FontSize.xs, marginLeft: 2 },
  row: { flexDirection: 'row', gap: Spacing.md },

  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, borderWidth: 1.2, padding: Spacing.md, minHeight: 72,
  },
  scheduleIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleTimeText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vehicleCard: {
    alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl, borderWidth: 1.2,
    width: '31%', flexGrow: 1,
  },
  vehicleIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  earningHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  presetChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  presetText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  earningText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  reviewCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1.2, padding: Spacing.lg, gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  reviewLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.8 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reviewDot: { width: 12, height: 12, borderRadius: 6 },
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
  reviewDetailIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewDetailLabel: { fontSize: FontSize.xs },
  reviewDetailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.2,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  footer: {
    flexDirection: 'row', gap: Spacing.md,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
