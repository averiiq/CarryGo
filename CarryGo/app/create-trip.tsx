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
import { VehicleType } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateTripMutation } from '@/features/listings/queries';

const STEPS = [
  { label: 'Route' },
  { label: 'Details' },
  { label: 'Review' },
];

const VEHICLES: { type: VehicleType; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'bike', label: 'Bike', icon: 'two-wheeler', color: '#22C55E' },
  { type: 'car', label: 'Car', icon: 'directions-car', color: '#4F8EF7' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus', color: '#F59E0B' },
  { type: 'train', label: 'Train', icon: 'train', color: '#8B5CF6' },
  { type: 'flight', label: 'Flight', icon: 'flight', color: '#06B6D4' },
];

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

  const setFormValues = useCallback((values: TripDraft) => setForm(values), []);
  const { clearDraft } = useFormDraft('create_trip', form, setFormValues);

  const updateField = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const selectedVehicle = VEHICLES.find((v) => v.type === form.vehicle);

  const goNext = () => {
    if (step === 0) {
      const errors: Record<string, string> = {};
      if (!form.fromCity) errors.fromCity = 'Select origin city';
      if (!form.toCity) errors.toCity = 'Select destination city';
      if (form.fromCity && form.toCity && form.fromCity === form.toCity) {
        errors.toCity = 'Must differ from origin';
      }
      if (!form.date || !form.time) errors.date = 'Select date & time';
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        Haptic.error();
        return;
      }
    }
    if (step === 1) {
      const errors: Record<string, string> = {};
      const capacityKg = Number(form.capacity);
      const pricePerKg = Number(form.price);
      if (!form.capacity) errors.capacity = 'Enter capacity';
      else if (!Number.isFinite(capacityKg) || capacityKg <= 0 || capacityKg > 500) errors.capacity = '0.1 – 500 kg';
      if (!form.price) errors.price = 'Enter price per kg';
      else if (!Number.isFinite(pricePerKg) || pricePerKg < 1 || pricePerKg > 50000) errors.price = '₹1 – ₹50,000';
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
    if (createTripMutation.isPending) return;
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
    Haptic.confirm();
    try {
      const result = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'User',
        userRating: user.rating || 4.5,
        fromCity: form.fromCity,
        toCity: form.toCity,
        date: form.date,
        time: form.time,
        vehicleType: form.vehicle,
        availableCapacity: Number(form.capacity),
        pricePerKg: Number(form.price),
        status: 'active',
      });
      await notifyRouteSubscribers({
        listingType: 'trip',
        listingId: result.id,
        fromCity: form.fromCity,
        toCity: form.toCity,
        title: 'New Trip on Your Route!',
        body: `${user?.name || 'Someone'} is travelling ${form.fromCity} to ${form.toCity} on ${formatScheduleDate(form.date)}.`,
      });
      clearDraft();
      Haptic.success();
      router.replace({ pathname: '/matching', params: { mode: 'trip', id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Trip Not Posted',
        error instanceof Error ? error.message : 'Failed to post trip. Please try again.',
      );
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
              title="Post Trip"
              onPress={handleSubmit}
              loading={createTripMutation.isPending}
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
  form: TripDraft;
  updateField: <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => void;
  fieldErrors: Record<string, string>;
  C: any;
  onDatePress: () => void;
}) {
  return (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        />
        <CitySearchField
          label="To"
          value={form.toCity}
          onSelect={(city) => updateField('toCity', city)}
          dotColor={C.error}
          error={fieldErrors.toCity}
          placeholder="Destination city..."
        />
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
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Trip details</Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
        How are you travelling and how much can you carry?
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Vehicle</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLES.map((v) => (
            <Pressable
              key={v.type}
              style={({ pressed }) => [
                styles.vehicleCard,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                form.vehicle === v.type && { backgroundColor: v.color + '14', borderColor: v.color },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => { Haptic.select(); updateField('vehicle', v.type); }}
            >
              <View style={[styles.vehicleIconBox, { backgroundColor: form.vehicle === v.type ? v.color + '20' : C.surfaceElevated }]}>
                <MaterialIcons name={v.icon} size={24} color={form.vehicle === v.type ? v.color : C.textMuted} />
              </View>
              <Text style={[styles.vehicleLabel, { color: form.vehicle === v.type ? v.color : C.textSecondary }]}>
                {v.label}
              </Text>
            </Pressable>
          ))}
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
            label="Price / kg (₹)"
            placeholder="e.g. 80"
            value={form.price}
            onChangeText={(v) => updateField('price', v)}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
            error={fieldErrors.price}
          />
        </View>
        {form.capacity && form.price && Number(form.capacity) > 0 && Number(form.price) > 0 ? (
          <View style={[styles.earningHint, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="trending-up" size={16} color={C.success} />
            <Text style={[styles.earningText, { color: C.success }]}>
              Max earning: ₹{(Number(form.capacity) * Number(form.price)).toFixed(0)}
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
            <Text style={[styles.reviewDetailValue, { color: C.textPrimary }]}>₹{form.price}/kg</Text>
          </View>
        </View>
      </View>

      <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
        <MaterialIcons name="info-outline" size={16} color={C.primary} />
        <Text style={[styles.infoText, { color: C.textSecondary }]}>
          After posting, you'll immediately see open parcels on your route.
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

  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, padding: Spacing.md, minHeight: 68,
  },
  scheduleIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleTimeText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vehicleCard: {
    alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    width: '30%', flexGrow: 1,
  },
  vehicleIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  vehicleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  earningHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  earningText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

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
