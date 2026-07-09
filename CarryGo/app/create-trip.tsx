import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button, Input } from '@/components';
import { VehicleType } from '@/types';
import { CITIES } from '@/constants/mockData';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Gradients } from '@/constants/theme';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { LinearGradient } from 'expo-linear-gradient';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateTripMutation } from '@/features/listings/queries';

const VEHICLES: { type: VehicleType; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'bike', label: 'Bike', icon: 'two-wheeler', color: '#22C55E' },
  { type: 'car', label: 'Car', icon: 'directions-car', color: '#4F8EF7' },
  { type: 'bus', label: 'Bus', icon: 'directions-bus', color: '#F59E0B' },
  { type: 'train', label: 'Train', icon: 'train', color: '#8B5CF6' },
  { type: 'flight', label: 'Flight', icon: 'flight', color: '#06B6D4' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TIMES = ['06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM','09:00 PM','10:00 PM'];

function DateTimePicker({ visible, onClose, onSelect, C }: {
  visible: boolean; onClose: () => void;
  onSelect: (date: string, time: string) => void; C: ThemeColors;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const [time, setTime] = useState('10:00 AM');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleApply = () => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(dateStr, time);
    onClose();
    Haptic.confirm();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.pickerOverlay, { backgroundColor: C.overlay }]} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.pickerHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>Select Date & Time</Text>

        <Text style={[styles.pickerLabel, { color: C.textMuted }]}>Date</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.monthRow}>
          {MONTHS.map((m, i) => (
            <Pressable
              key={m}
              style={[styles.monthChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                i === month && { backgroundColor: C.primarySubtle, borderColor: C.primary }]}
              onPress={() => { setMonth(i); setDay(Math.min(day, new Date(year, i + 1, 0).getDate())); Haptic.select(); }}
            >
              <Text style={[styles.monthText, { color: i === month ? C.primary : C.textSecondary }]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.dayRow}>
          {days.map(d => {
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <Pressable
                key={d}
                style={[styles.dayCell, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  d === day && { backgroundColor: C.primary, borderColor: C.primary },
                  isToday && d !== day && { borderColor: C.primary }]}
                onPress={() => { setDay(d); Haptic.select(); }}
              >
                <Text style={[styles.dayNum, { color: d === day ? '#fff' : C.textPrimary }]}>{d}</Text>
                {isToday ? <View style={[styles.todayDot, { backgroundColor: d === day ? '#fff' : C.primary }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.yearRow}>
          <Pressable onPress={() => setYear(y => Math.max(y - 1, today.getFullYear()))} style={[styles.yearBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="chevron-left" size={20} color={C.textSecondary} />
          </Pressable>
          <Text style={[styles.yearText, { color: C.textPrimary }]}>{year}</Text>
          <Pressable onPress={() => setYear(y => y + 1)} style={[styles.yearBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="chevron-right" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.pickerLabel, { color: C.textMuted }]}>Departure Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.timeRow}>
          {TIMES.map(t => (
            <Pressable
              key={t}
              style={[styles.timeChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                t === time && { backgroundColor: C.primarySubtle, borderColor: C.primary }]}
              onPress={() => { setTime(t); Haptic.select(); }}
            >
              <MaterialIcons name="schedule" size={11} color={t === time ? C.primary : C.textMuted} />
              <Text style={[styles.timeText, { color: t === time ? C.primary : C.textSecondary }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.previewRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="event" size={16} color={C.primary} />
          <Text style={[styles.previewText, { color: C.textPrimary }]}>
            {MONTHS[month]} {day}, {year} · {time}
          </Text>
        </View>

        <Pressable style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]} onPress={handleApply}>
          <LinearGradient colors={Gradients.primaryVibrant} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
          <MaterialIcons name="check" size={18} color="#fff" />
          <Text style={styles.applyText}>Confirm Date & Time</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function CreateTripScreen() {
  const { user, refreshUser } = useAuth();
  const createTripMutation = useCreateTripMutation();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [showKyc, setShowKyc] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isKycApproved = FeatureFlags.kycProvider && user?.kycStatus === 'approved';
  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  const selectedVehicle = VEHICLES.find(v => v.type === vehicle);

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
    if (!isKycApproved) {
      Haptic.warning();
      showAlert('KYC Required', 'You need to complete identity verification before posting a trip.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Now', onPress: () => setShowKyc(true) },
      ]);
      return;
    }
    const errors: Record<string, string> = {};
    if (!fromCity) errors.fromCity = 'Select origin city';
    if (!toCity) errors.toCity = 'Select destination city';
    if (fromCity && toCity && fromCity === toCity) {
      errors.toCity = 'Must differ from origin';
    }
    if (!date || !time) errors.date = 'Select date & time';
    const capacityKg = Number(capacity);
    const pricePerKg = Number(price);
    if (!capacity) errors.capacity = 'Enter capacity';
    else if (!Number.isFinite(capacityKg) || capacityKg <= 0 || capacityKg > 500) errors.capacity = '0.1 – 500 kg';
    if (!price) errors.price = 'Enter price per kg';
    else if (!Number.isFinite(pricePerKg) || pricePerKg < 1 || pricePerKg > 50000) errors.price = '₹1 – ₹50,000';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return;
    }
    setFieldErrors({});
    Haptic.confirm();
    try {
      const result = await createTripMutation.mutateAsync({
        userId: user.id,
        userName: user.fullName || user.name || 'User',
        userRating: user.rating || 4.5,
        fromCity, toCity, date, time,
        vehicleType: vehicle,
        availableCapacity: capacityKg,
        pricePerKg,
        status: 'active',
      });
      await notifyRouteSubscribers({
        listingType: 'trip',
        listingId: result.id,
        fromCity,
        toCity,
        title: 'New Trip on Your Route!',
        body: `${user?.name || 'Someone'} is travelling ${fromCity} to ${toCity} on ${date}.`,
      });
      /*
          subscribers
            .filter((uid: string) => uid !== user?.id)
            .map((uid: string) => createNotification({
              userId: uid,
              title: 'New Trip on Your Route!',
              body: `${user?.name || 'Someone'} is travelling ${fromCity} → ${toCity} on ${date}`,
              type: 'new_request',
              relatedId: result.id,
            }))
        );
      }
      */
      Haptic.success();
      // Navigate directly to matching — traveller sees available parcels on their route
      router.replace({ pathname: '/matching', params: { mode: 'trip', id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Trip Not Posted',
        error instanceof Error ? error.message : 'Failed to post trip. Please try again.',
      );
    }
  };

  const CityPicker = ({ forField }: { forField: 'from' | 'to' }) => (
    <Modal
      visible={forField === 'from' ? showFrom : showTo}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (forField === 'from') setShowFrom(false);
        else setShowTo(false);
      }}
    >
      <Pressable
        style={[styles.pickerOverlay, { backgroundColor: C.overlay }]}
        onPress={() => {
          if (forField === 'from') setShowFrom(false);
          else setShowTo(false);
          setCitySearch('');
        }}
      />
      <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.pickerHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>{forField === 'from' ? 'From City' : 'To City'}</Text>
        <Input placeholder="Search city..." value={citySearch} onChangeText={setCitySearch} autoFocus />
        <ScrollView style={{ maxHeight: 300 }}>
          {filteredCities.map(city => (
            <Pressable
              key={city}
              style={({ pressed }) => [styles.cityOption, { borderBottomColor: C.surfaceBorder, backgroundColor: pressed ? C.surfaceElevated : 'transparent' }]}
              onPress={() => {
                if (forField === 'from') setFromCity(city);
                else setToCity(city);
                setCitySearch('');
                if (forField === 'from') setShowFrom(false);
                else setShowTo(false);
                Haptic.select();
              }}
            >
              <View style={[styles.cityDotSmall, { backgroundColor: forField === 'from' ? C.success : C.error }]} />
              <Text style={[styles.cityOptionText, { color: C.textPrimary }]}>{city}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => { setShowKyc(false); refreshUser(); }}
      />
      <DateTimePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d, t) => { setDate(d); setTime(t); }}
        C={C}
      />
      <CityPicker forField="from" />
      <CityPicker forField="to" />

      <KeyboardAvoidingView style={[styles.container, { backgroundColor: C.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Route */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Route</Text>
            <View style={[styles.routeCard, { backgroundColor: C.surface, borderColor: fieldErrors.fromCity || fieldErrors.toCity ? C.error : C.surfaceBorder }]}>
              <Pressable style={styles.cityInput} onPress={() => { Haptic.tap(); setFieldErrors(e => { const { fromCity: _, ...rest } = e; return rest; }); setShowFrom(true); }}>
                <View style={[styles.cityDot, { backgroundColor: fieldErrors.fromCity ? C.error : C.success }]} />
                <Text style={fromCity ? [styles.cityText, { color: C.textPrimary }] : [styles.cityPlaceholder, { color: fieldErrors.fromCity ? C.error : C.textMuted }]}>
                  {fromCity || (fieldErrors.fromCity || 'From City')}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={C.textMuted} />
              </Pressable>
              <View style={[styles.routeDivider, { backgroundColor: C.surfaceElevated }]}>
                <View style={[styles.routeLine, { backgroundColor: C.surfaceBorderLight }]} />
                <MaterialIcons name="south" size={16} color={C.textMuted} />
                <View style={[styles.routeLine, { backgroundColor: C.surfaceBorderLight }]} />
              </View>
              <Pressable style={styles.cityInput} onPress={() => { Haptic.tap(); setFieldErrors(e => { const { toCity: _, ...rest } = e; return rest; }); setShowTo(true); }}>
                <View style={[styles.cityDot, { backgroundColor: fieldErrors.toCity ? C.error : C.error }]} />
                <Text style={toCity ? [styles.cityText, { color: C.textPrimary }] : [styles.cityPlaceholder, { color: fieldErrors.toCity ? C.error : C.textMuted }]}>
                  {toCity || (fieldErrors.toCity || 'To City')}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={C.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Schedule</Text>
            <Pressable
              style={({ pressed }) => [
                styles.scheduleBtn,
                { backgroundColor: C.surface, borderColor: date ? C.primary : fieldErrors.date ? C.error : C.surfaceBorder },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => { Haptic.tap(); setFieldErrors(e => { const { date: _, ...rest } = e; return rest; }); setShowDatePicker(true); }}
            >
              <View style={[styles.scheduleIconBox, { backgroundColor: date ? C.primarySubtle : C.surfaceElevated }]}>
                <MaterialIcons name="event" size={20} color={date ? C.primary : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                {date ? (
                  <>
                    <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>{date}</Text>
                    <Text style={[styles.scheduleTimeText, { color: C.textSecondary }]}>{time}</Text>
                  </>
                ) : (
                  <Text style={[styles.schedulePlaceholder, { color: fieldErrors.date ? C.error : C.textMuted }]}>{fieldErrors.date || 'Select date & departure time'}</Text>
                )}
              </View>
              {date ? (
                <View style={[styles.scheduleEditBtn, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="edit" size={14} color={C.primary} />
                </View>
              ) : (
                <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
              )}
            </Pressable>
          </View>

          {/* Vehicle Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Vehicle Type</Text>
            <View style={styles.vehicleGrid}>
              {VEHICLES.map(v => (
                <Pressable
                  key={v.type}
                  style={({ pressed }) => [
                    styles.vehicleChip,
                    { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                    vehicle === v.type && { backgroundColor: v.color + '14', borderColor: v.color },
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                  onPress={() => { Haptic.select(); setVehicle(v.type); }}
                >
                  <MaterialIcons name={v.icon} size={20} color={vehicle === v.type ? v.color : C.textMuted} />
                  <Text style={[styles.vehicleLabel, { color: vehicle === v.type ? v.color : C.textSecondary }]}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Capacity & Pricing */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Capacity & Pricing</Text>
            <View style={styles.row}>
              <Input label="Capacity (kg)" placeholder="e.g. 5" value={capacity} onChangeText={(v) => { setCapacity(v); setFieldErrors(e => { const { capacity: _, ...rest } = e; return rest; }); }} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} error={fieldErrors.capacity} />
              <Input label="Price / kg (₹)" placeholder="e.g. 80" value={price} onChangeText={(v) => { setPrice(v); setFieldErrors(e => { const { price: _, ...rest } = e; return rest; }); }} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} error={fieldErrors.price} />
            </View>
          </View>

          {/* Summary */}
          {fromCity && toCity && date && capacity && price ? (
            <View style={[styles.summaryCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: C.primary + '20' }]}>
                <MaterialIcons name={selectedVehicle?.icon || 'directions-car'} size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryRoute, { color: C.textPrimary }]}>{fromCity} → {toCity}</Text>
                <Text style={[styles.summaryDetails, { color: C.textSecondary }]}>
                  {date} · {time} · {capacity}kg · ₹{price}/kg
                </Text>
                {capacity && price ? (
                  <Text style={[styles.summaryEarning, { color: C.success }]}>
                    Max earning: ₹{(parseFloat(capacity) * parseFloat(price)).toFixed(0)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
            <MaterialIcons name="info-outline" size={16} color={C.primary} />
            <Text style={[styles.infoText, { color: C.textSecondary }]}>
              After posting, you will immediately see open parcels on your route. Tap Offer to Carry to earn.
            </Text>
          </View>

          <Button
            title="Post Trip → Find Parcels"
            onPress={handleSubmit}
            loading={createTripMutation.isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.lg },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },

  routeCard: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  cityInput: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, minHeight: 54 },
  cityDot: { width: 10, height: 10, borderRadius: 5 },
  cityText: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  cityPlaceholder: { flex: 1, fontSize: FontSize.md },
  routeDivider: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  routeLine: { flex: 1, height: 1 },

  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, padding: Spacing.md, minHeight: 68,
  },
  scheduleIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scheduleDateText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  scheduleTimeText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },
  scheduleEditBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  row: { flexDirection: 'row', gap: Spacing.md },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vehicleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
  },
  vehicleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1,
  },
  summaryIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryRoute: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summaryDetails: { fontSize: FontSize.xs, marginTop: 2 },
  summaryEarning: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 3 },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  // Picker shared styles
  pickerOverlay: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, padding: Spacing.lg, gap: Spacing.md,
  },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  pickerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  pickerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },

  monthRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  monthText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  dayRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  dayCell: {
    width: 44, height: 52, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  dayNum: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  todayDot: { width: 5, height: 5, borderRadius: 2.5 },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  yearBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, minWidth: 60, textAlign: 'center' },

  timeRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  timeText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1,
  },
  previewText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, overflow: 'hidden',
  },
  applyText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  cityOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1,
  },
  cityDotSmall: { width: 8, height: 8, borderRadius: 4 },
  cityOptionText: { fontSize: FontSize.md },
});
