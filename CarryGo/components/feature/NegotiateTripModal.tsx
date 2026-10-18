import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Trip, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

export interface NegotiationParams {
  pickupLandmark: string;
  dropLandmark: string;
  offeredPrice: number;
  message: string;
}

export interface NegotiateTripModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
  parcel?: Parcel | null;
  initialPrice?: number;
  onSendCounterOffer: (params: NegotiationParams) => Promise<void>;
  onStartChat: (params: NegotiationParams) => Promise<void>;
  isSubmitting?: boolean;
}

export function NegotiateTripModal({
  visible,
  onClose,
  trip,
  parcel,
  initialPrice,
  onSendCounterOffer,
  onStartChat,
  isSubmitting = false,
}: NegotiateTripModalProps) {
  const { C, isDark } = useThemeColors();

  const baseListedPrice = useMemo(() => {
    if (typeof initialPrice === 'number' && initialPrice > 0) return initialPrice;
    if (trip && parcel) return Math.max(80, Math.round(trip.pricePerKg * (parcel.weight || 1)));
    if (trip) return Math.max(80, Math.round(trip.pricePerKg * 2));
    return 180;
  }, [initialPrice, trip, parcel]);

  const [pickupLandmark, setPickupLandmark] = useState('');
  const [dropLandmark, setDropLandmark] = useState('');
  const [offeredPrice, setOfferedPrice] = useState(baseListedPrice);
  const [customNote, setCustomNote] = useState('');
  const [isChatStarting, setIsChatStarting] = useState(false);

  useEffect(() => {
    if (visible && trip) {
      setPickupLandmark(parcel?.fromCity || trip.fromCity || '');
      setDropLandmark(parcel?.toCity || trip.toCity || '');
      setOfferedPrice(baseListedPrice);
      setCustomNote('');
    }
  }, [visible, trip, parcel, baseListedPrice]);

  if (!trip) return null;

  const priceDiff = offeredPrice - baseListedPrice;

  const adjustPrice = (delta: number) => {
    Haptic.select();
    setOfferedPrice((prev) => Math.max(50, prev + delta));
  };

  const handleSendOffer = async () => {
    Haptic.confirm();
    const formattedMessage = [
      `🤝 Delivery Negotiation Proposed:`,
      `• Offered Fare: ₹${offeredPrice} (Listed: ₹${baseListedPrice})`,
      `• Pickup Spot: ${pickupLandmark || trip.fromCity}`,
      `• Drop-off Spot: ${dropLandmark || trip.toCity}`,
      customNote ? `• Note: "${customNote.trim()}"` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await onSendCounterOffer({
      pickupLandmark: pickupLandmark.trim() || trip.fromCity,
      dropLandmark: dropLandmark.trim() || trip.toCity,
      offeredPrice,
      message: formattedMessage,
    });
  };

  const handleChat = async () => {
    if (isChatStarting) return;
    Haptic.confirm();
    setIsChatStarting(true);
    try {
      const formattedMessage = [
        `Hi ${trip.userName}! I would like to negotiate details for your trip from ${trip.fromCity} to ${trip.toCity}:`,
        `• Proposed Fare: ₹${offeredPrice}`,
        `• Pickup Point: ${pickupLandmark || trip.fromCity}`,
        `• Drop Point: ${dropLandmark || trip.toCity}`,
        customNote ? `• Note: "${customNote.trim()}"` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await onStartChat({
        pickupLandmark: pickupLandmark.trim() || trip.fromCity,
        dropLandmark: dropLandmark.trim() || trip.toCity,
        offeredPrice,
        message: formattedMessage,
      });
    } finally {
      setIsChatStarting(false);
    }
  };

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
      showHandle
      enablePanDownToClose
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.textPrimary }]}>Negotiate Delivery</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>
              Propose pickup & drop landmarks, fare offer, or chat with {trip.userName}.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close negotiation"
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Route Snapshot Card */}
        <View style={[styles.routeCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={styles.routeHeader}>
            <View style={styles.routeIconBox}>
              <MaterialIcons name="directions-car" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeCities, { color: C.textPrimary }]}>
                {trip.fromCity} → {trip.toCity}
              </Text>
              <Text style={[styles.routeMeta, { color: C.textSecondary }]}>
                {trip.date} at {trip.time} · {trip.availableCapacity} kg capacity
              </Text>
            </View>
            <View style={[styles.listedBadge, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.listedBadgeText, { color: C.primary }]}>
                Listed: ₹{baseListedPrice}
              </Text>
            </View>
          </View>

          {parcel ? (
            <View style={[styles.parcelSnippet, { borderTopColor: C.surfaceBorder }]}>
              <MaterialIcons name="inventory-2" size={14} color={C.textMuted} />
              <Text style={[styles.parcelSnippetText, { color: C.textSecondary }]}>
                Your Parcel: {parcel.category.toUpperCase()} ({parcel.weight} kg)
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 1: Pickup & Drop Location Negotiation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            1. Pickup & Drop Locations
          </Text>
          <Text style={[styles.sectionHint, { color: C.textMuted }]}>
            Suggest convenient landmarks or handover points along the route.
          </Text>

          {/* Pickup Input */}
          <View style={[styles.inputBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.inputPrefix}>
              <View style={[styles.locationDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.inputLabel, { color: C.textMuted }]}>Pickup Spot</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: C.textPrimary }]}
              value={pickupLandmark}
              onChangeText={setPickupLandmark}
              placeholder={`e.g. ${trip.fromCity} Bus Stand Gate 2`}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.quickChipsRow}>
            {[`${trip.fromCity} Bus Stand`, `${trip.fromCity} Railway Stn`, 'Highway Toll Plaza'].map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => {
                  Haptic.select();
                  setPickupLandmark(suggestion);
                }}
                style={[
                  styles.quickChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  pickupLandmark === suggestion && { backgroundColor: C.primarySubtle, borderColor: C.primary + '80' },
                ]}
              >
                <Text style={[
                  styles.quickChipText,
                  { color: pickupLandmark === suggestion ? C.primary : C.textSecondary },
                ]}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Drop Input */}
          <View style={[styles.inputBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.inputPrefix}>
              <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.inputLabel, { color: C.textMuted }]}>Drop-off Spot</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: C.textPrimary }]}
              value={dropLandmark}
              onChangeText={setDropLandmark}
              placeholder={`e.g. ${trip.toCity} Junction or City Center`}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.quickChipsRow}>
            {[`${trip.toCity} Bus Stand`, `${trip.toCity} Railway Stn`, 'City Center'].map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => {
                  Haptic.select();
                  setDropLandmark(suggestion);
                }}
                style={[
                  styles.quickChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  dropLandmark === suggestion && { backgroundColor: C.primarySubtle, borderColor: C.primary + '80' },
                ]}
              >
                <Text style={[
                  styles.quickChipText,
                  { color: dropLandmark === suggestion ? C.primary : C.textSecondary },
                ]}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section 2: Fare Counter-Offer */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
              2. Propose Price / Fare
            </Text>
            <View style={[styles.diffBadge, {
              backgroundColor: priceDiff < 0 ? '#FEF2F2' : priceDiff > 0 ? '#ECFDF5' : C.surfaceElevated,
            }]}>
              <Text style={[styles.diffBadgeText, {
                color: priceDiff < 0 ? '#DC2626' : priceDiff > 0 ? '#059669' : C.textSecondary,
              }]}>
                {priceDiff === 0
                  ? 'Matches Listed Fare'
                  : priceDiff < 0
                  ? `₹${Math.abs(priceDiff)} lower`
                  : `₹${priceDiff} priority bonus`}
              </Text>
            </View>
          </View>

          {/* Price Selector Display */}
          <View style={[styles.priceControlCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Pressable
              onPress={() => adjustPrice(-20)}
              style={({ pressed }) => [
                styles.priceAdjustBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={6}
            >
              <MaterialIcons name="remove" size={22} color={C.textPrimary} />
            </Pressable>

            <View style={styles.priceCenterDisplay}>
              <Text style={[styles.rupeeSign, { color: C.textPrimary }]}>₹</Text>
              <TextInput
                style={[styles.priceInput, { color: C.textPrimary }]}
                value={String(offeredPrice)}
                onChangeText={(val) => {
                  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
                  setOfferedPrice(isNaN(num) ? 0 : num);
                }}
                keyboardType="numeric"
              />
            </View>

            <Pressable
              onPress={() => adjustPrice(20)}
              style={({ pressed }) => [
                styles.priceAdjustBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={6}
            >
              <MaterialIcons name="add" size={22} color={C.textPrimary} />
            </Pressable>
          </View>

          {/* Quick preset chips */}
          <View style={styles.presetChipsRow}>
            {[-50, -20, 0, 20, 50].map((delta) => {
              const target = delta === 0 ? baseListedPrice : baseListedPrice + delta;
              const isSelected = offeredPrice === target;
              return (
                <Pressable
                  key={delta}
                  onPress={() => {
                    Haptic.select();
                    setOfferedPrice(Math.max(50, target));
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? C.primary : C.surfaceElevated,
                      borderColor: isSelected ? C.primary : C.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.presetChipText, { color: isSelected ? '#FFFFFF' : C.textSecondary }]}>
                    {delta === 0 ? 'Exact' : delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 3: Note / Instructions for Traveler */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            3. Note for {trip.userName} (Optional)
          </Text>
          <View style={[styles.noteBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <TextInput
              style={[styles.noteInput, { color: C.textPrimary }]}
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="e.g. Can meet at 7:15 PM sharp. Box is sealed and fragile."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.quickChipsRow}>
            {['Can meet on highway', 'Sealed box', 'Urgent delivery', 'Flexible on time'].map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => {
                  Haptic.select();
                  setCustomNote((prev) => (prev ? `${prev} · ${suggestion}` : suggestion));
                }}
                style={[
                  styles.quickChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                ]}
              >
                <Text style={[styles.quickChipText, { color: C.textSecondary }]}>
                  + {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Action Buttons: Chat Before Booking + Submit Counter-Offer */}
        <View style={styles.actionsContainer}>
          {/* Chat Before Booking */}
          <Pressable
            disabled={isSubmitting || isChatStarting}
            onPress={handleChat}
            style={({ pressed }) => [
              styles.chatBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderColor: C.surfaceBorder,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {isChatStarting ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <>
                <MaterialIcons name="chat" size={18} color={C.primary} />
                <Text style={[styles.chatBtnText, { color: C.textPrimary }]}>Chat Before Booking</Text>
              </>
            )}
          </Pressable>

          {/* Submit Counter-Offer */}
          <Pressable
            disabled={isSubmitting || isChatStarting}
            onPress={handleSendOffer}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Send Counter-Offer (₹{offeredPrice})</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCities: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  routeMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  listedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  parcelSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  parcelSnippetText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  sectionHint: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  inputPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  textInput: {
    fontSize: 15,
    fontWeight: FontWeight.medium,
    padding: 0,
  },
  priceControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  priceAdjustBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCenterDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeSign: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    marginRight: 4,
  },
  priceInput: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    minWidth: 70,
    textAlign: 'center',
    padding: 0,
  },
  presetChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  noteBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  noteInput: {
    fontSize: 14,
    minHeight: 54,
    textAlignVertical: 'top',
    padding: 0,
  },
  actionsContainer: {
    gap: 10,
    marginTop: Spacing.sm,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
});
