import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button, Input } from '@/components';
import { formatScheduleDate, SevenDaySchedulePicker } from '@/components/feature/SevenDaySchedulePicker';
import { ParcelCategory } from '@/types';
import { CITIES } from '@/constants/mockData';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { notifyRouteSubscribers } from '@/services/subscriptions.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useCreateParcelMutation } from '@/features/listings/queries';

const CATEGORIES: { type: ParcelCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }[] = [
  { type: 'documents', label: 'Documents', icon: 'description', color: '#8B5CF6' },
  { type: 'electronics', label: 'Electronics', icon: 'devices', color: '#06B6D4' },
  { type: 'clothing', label: 'Clothing', icon: 'checkroom', color: '#F59E0B' },
  { type: 'food', label: 'Food', icon: 'restaurant', color: '#22C55E' },
  { type: 'medicine', label: 'Medicine', icon: 'local-pharmacy', color: '#EF4444' },
  { type: 'other', label: 'Other', icon: 'inventory-2', color: '#4F8EF7' },
];

export default function CreateParcelScreen() {
  const { user } = useAuth();
  const createParcelMutation = useCreateParcelMutation();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [category, setCategory] = useState<ParcelCategory>('documents');
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [weight, setWeight] = useState('');
  const [priceOffer, setPriceOffer] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [showKyc, setShowKyc] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isKycApproved = FeatureFlags.kycProvider && user?.kycStatus === 'approved';
  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  const selectedCategory = CATEGORIES.find(c => c.type === category);

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
    if (!FeatureFlags.kycProvider) {
      Haptic.warning();
      showAlert('Parcel Listing Unavailable', `${disabledFeatureMessage.kyc} Parcel listing stays paused in this build.`);
      return;
    }
    if (!isKycApproved) {
      Haptic.warning();
      showAlert('KYC Required', 'You need to complete identity verification before sending a parcel.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify Now', onPress: () => setShowKyc(true) },
      ]);
      return;
    }
    const errors: Record<string, string> = {};
    if (!fromCity) errors.fromCity = 'Select origin city';
    if (!toCity) errors.toCity = 'Select destination city';
    if (fromCity && toCity && fromCity === toCity) errors.toCity = 'Must differ from origin';
    if (!deliveryDate) errors.deliveryDate = 'Select send-by date';
    if (!description) errors.description = 'Describe your parcel';
    const parcelWeight = Number(weight);
    const offerAmount = Number(priceOffer);
    if (!weight) errors.weight = 'Enter weight';
    else if (!Number.isFinite(parcelWeight) || parcelWeight <= 0 || parcelWeight > 100) errors.weight = '0.1 – 100 kg';
    if (!priceOffer) errors.priceOffer = 'Enter price offer';
    else if (!Number.isFinite(offerAmount) || offerAmount < 1 || offerAmount > 100000) errors.priceOffer = '₹1 – ₹1,00,000';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptic.error();
      return;
    }
    setFieldErrors({});
    Haptic.confirm();
    try {
      const result = await createParcelMutation.mutateAsync({
        userId: user.id,
        userName: user.name || 'User',
        fromCity, toCity, category, description,
        deliveryDate,
        weight: parcelWeight,
        priceOffer: offerAmount,
        status: 'open',
      });
      await notifyRouteSubscribers({
        listingType: 'parcel',
        listingId: result.id,
        fromCity,
        toCity,
        title: 'New Parcel on Your Route!',
        body: `${user.name || 'Someone'} needs delivery from ${fromCity} to ${toCity} by ${formatScheduleDate(deliveryDate)}.`,
      });
      Haptic.success();
      // Navigate directly to matching screen — no dialog, immediate UX
      router.replace({ pathname: '/matching', params: { mode: 'parcel', id: result.id } });
    } catch (error) {
      Haptic.error();
      showAlert(
        'Parcel Not Listed',
        error instanceof Error ? error.message : 'Failed to list parcel. Please try again.',
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
        setCitySearch('');
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
              style={({ pressed }) => [
                styles.cityOption,
                { borderBottomColor: C.surfaceBorder, backgroundColor: pressed ? C.surfaceElevated : 'transparent' },
              ]}
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
        onComplete={() => { setShowKyc(false); }}
      />
      <SevenDaySchedulePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => setDeliveryDate(d)}
        C={C}
        initialDate={deliveryDate}
        includeTime={false}
        title="Send within 7 days"
        subtitle="Pick the day your parcel should be ready for handover."
        confirmLabel="Use This Date"
      />
      <CityPicker forField="from" />
      <CityPicker forField="to" />

      <KeyboardAvoidingView style={[styles.container, { backgroundColor: C.background }]} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
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
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Send By</Text>
            <Pressable
              style={({ pressed }) => [
                styles.scheduleBtn,
                { backgroundColor: C.surface, borderColor: deliveryDate ? C.primary : fieldErrors.deliveryDate ? C.error : C.surfaceBorder },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptic.tap();
                setFieldErrors(e => {
                  const { deliveryDate: _, ...rest } = e;
                  return rest;
                });
                setShowDatePicker(true);
              }}
            >
              <View style={[styles.scheduleIconBox, { backgroundColor: deliveryDate ? C.primarySubtle : C.surfaceElevated }]}>
                <MaterialIcons name="event-available" size={20} color={deliveryDate ? C.primary : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                {deliveryDate ? (
                  <>
                    <Text style={[styles.scheduleDateText, { color: C.textPrimary }]}>{formatScheduleDate(deliveryDate)}</Text>
                    <Text style={[styles.scheduleHintText, { color: C.textSecondary }]}>Ready for pickup or handover</Text>
                  </>
                ) : (
                  <Text style={[styles.schedulePlaceholder, { color: fieldErrors.deliveryDate ? C.error : C.textMuted }]}>
                    {fieldErrors.deliveryDate || 'Choose a day in the next 7 days'}
                  </Text>
                )}
              </View>
              {deliveryDate ? (
                <View style={[styles.scheduleEditBtn, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="edit" size={14} color={C.primary} />
                </View>
              ) : (
                <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
              )}
            </Pressable>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.type}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    { backgroundColor: C.surface, borderColor: C.surfaceBorder },
                    category === cat.type && { borderColor: cat.color, backgroundColor: cat.color + '12' },
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => { setCategory(cat.type); Haptic.select(); }}
                >
                  <View style={[
                    styles.catIconBox,
                    { backgroundColor: category === cat.type ? cat.color + '20' : C.surfaceElevated },
                  ]}>
                    <MaterialIcons name={cat.icon} size={16} color={category === cat.type ? cat.color : C.textMuted} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: category === cat.type ? cat.color : C.textSecondary }]}>
                    {cat.label}
                  </Text>
                  {category === cat.type ? (
                    <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                      <MaterialIcons name="check" size={9} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Parcel Details</Text>
            <Input
              label="Description"
              placeholder="Describe your parcel (what is inside, special handling...)"
              value={description}
              onChangeText={(v) => { setDescription(v); setFieldErrors(e => { const { description: _, ...rest } = e; return rest; }); }}
              multiline
              numberOfLines={3}
              maxLength={300}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              error={fieldErrors.description}
            />
            <View style={styles.row}>
              <Input label="Weight (kg)" placeholder="e.g. 0.5" value={weight} onChangeText={(v) => { setWeight(v); setFieldErrors(e => { const { weight: _, ...rest } = e; return rest; }); }} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} error={fieldErrors.weight} />
              <Input label="Price Offer (₹)" placeholder="e.g. 150" value={priceOffer} onChangeText={(v) => { setPriceOffer(v); setFieldErrors(e => { const { priceOffer: _, ...rest } = e; return rest; }); }} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} error={fieldErrors.priceOffer} />
            </View>
          </View>

          {/* Summary */}
          {fromCity && toCity && deliveryDate && weight && priceOffer ? (
            <View style={[styles.summaryCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: selectedCategory ? selectedCategory.color + '20' : C.primarySubtle }]}>
                <MaterialIcons name={selectedCategory?.icon || 'inventory-2'} size={20} color={selectedCategory?.color || C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryRoute, { color: C.textPrimary }]}>{fromCity} → {toCity}</Text>
                <Text style={[styles.summaryDetails, { color: C.textSecondary }]}>
                  {formatScheduleDate(deliveryDate)} - {selectedCategory?.label} - {weight}kg - Rs {priceOffer} offered
                </Text>
              </View>
            </View>
          ) : null}

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
            <MaterialIcons name="info-outline" size={16} color={C.primary} />
            <Text style={[styles.infoText, { color: C.textSecondary }]}>
              After listing, you will immediately see travellers on your route. Tap Send Request to book one.
            </Text>
          </View>

          <Button
            title="List Parcel → Find Travellers"
            onPress={handleSubmit}
            loading={createParcelMutation.isPending}
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
  scheduleHintText: { fontSize: FontSize.sm, marginTop: 2 },
  schedulePlaceholder: { fontSize: FontSize.md },
  scheduleEditBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    position: 'relative',
  },
  catIconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  catCheck: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },

  row: { flexDirection: 'row', gap: Spacing.md },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1,
  },
  summaryIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryRoute: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summaryDetails: { fontSize: FontSize.xs, marginTop: 2 },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  // Picker
  pickerOverlay: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '75%',
  },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  pickerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  cityOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1,
  },
  cityDotSmall: { width: 8, height: 8, borderRadius: 4 },
  cityOptionText: { fontSize: FontSize.md },
});
