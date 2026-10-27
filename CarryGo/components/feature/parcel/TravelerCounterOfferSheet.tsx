import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface TravelerCounterOfferSheetProps {
  visible: boolean;
  onClose: () => void;
  originalPrice: number;
  parcelWeight: number;
  senderName: string;
  onSubmitCounterOffer: (price: number, message?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const QUICK_DELTAS = [50, 100, 150, 200];

export function TravelerCounterOfferSheet({
  visible,
  onClose,
  originalPrice,
  parcelWeight,
  senderName,
  onSubmitCounterOffer,
  isSubmitting = false,
}: TravelerCounterOfferSheetProps) {
  const { C } = useThemeColors();
  const [offerPrice, setOfferPrice] = useState<number>(originalPrice);
  const [priceInput, setPriceInput] = useState<string>(String(originalPrice));
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (visible) {
      const initial = Math.max(50, originalPrice);
      setOfferPrice(initial);
      setPriceInput(String(initial));
      setNote('');
    }
  }, [visible, originalPrice]);

  const handlePriceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPriceInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      setOfferPrice(num);
    }
  };

  const handleAdjustPrice = (delta: number) => {
    Haptic.select();
    const next = Math.max(50, offerPrice + delta);
    setOfferPrice(next);
    setPriceInput(String(next));
  };

  const handleQuickAdd = (amount: number) => {
    Haptic.select();
    const next = Math.max(50, originalPrice + amount);
    setOfferPrice(next);
    setPriceInput(String(next));
  };

  const handleSubmit = () => {
    const finalPrice = parseInt(priceInput, 10);
    if (isNaN(finalPrice) || finalPrice < 50) {
      Haptic.warning();
      return;
    }
    Haptic.confirm();
    onSubmitCounterOffer(finalPrice, note.trim() || undefined);
  };

  const isPriceValid = offerPrice >= 50 && offerPrice <= 100000;
  const isDifferentFromOriginal = offerPrice !== originalPrice;

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="85%"
      showHandle
      enablePanDownToClose
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetContainer}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
              Send Counter Offer
            </Text>
            <Text style={[styles.headerSubtitle, { color: C.textMuted }]}>
              Sender budget: ₹{originalPrice} for {parcelWeight} kg package
            </Text>
          </View>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close counter offer sheet"
          >
            <MaterialIcons name="close" size={20} color={C.textPrimary} />
          </Pressable>
        </View>

        {/* Price Input Card matching index.styles.ts */}
        <View
          style={[
            styles.priceCard,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.inputLabel, { color: C.textMuted }]}>
            YOUR PROPOSED REWARD
          </Text>

          <View style={styles.priceInputRow}>
            <Pressable
              style={[styles.stepperBtn, { backgroundColor: C.surfaceElevated }]}
              onPress={() => handleAdjustPrice(-50)}
              disabled={offerPrice <= 50}
              accessibilityRole="button"
              accessibilityLabel="Decrease price by 50 rupees"
            >
              <MaterialIcons name="remove" size={22} color={C.textPrimary} />
            </Pressable>

            <View style={styles.amountDisplayWrap}>
              <Text style={[styles.currencyPrefix, { color: '#064E3B' }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: '#064E3B' }]}
                keyboardType="numeric"
                value={priceInput}
                onChangeText={handlePriceChange}
                maxLength={6}
                accessibilityLabel="Counter offer amount in rupees"
              />
            </View>

            <Pressable
              style={[styles.stepperBtn, { backgroundColor: C.surfaceElevated }]}
              onPress={() => handleAdjustPrice(50)}
              accessibilityRole="button"
              accessibilityLabel="Increase price by 50 rupees"
            >
              <MaterialIcons name="add" size={22} color={C.textPrimary} />
            </Pressable>
          </View>

          {/* Quick preset chips */}
          <View style={styles.quickChipsRow}>
            {QUICK_DELTAS.map((delta) => {
              const target = originalPrice + delta;
              const isSelected = offerPrice === target;
              return (
                <Pressable
                  key={delta}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                      borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleQuickAdd(delta)}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      {
                        color: isSelected ? '#064E3B' : C.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                      },
                    ]}
                  >
                    +₹{delta}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isDifferentFromOriginal ? (
            <View style={styles.priceDiffBadge}>
              <MaterialIcons
                name={offerPrice > originalPrice ? 'trending-up' : 'trending-down'}
                size={14}
                color={offerPrice > originalPrice ? '#10B981' : '#D97706'}
              />
              <Text
                style={[
                  styles.priceDiffText,
                  { color: offerPrice > originalPrice ? '#064E3B' : '#B45309' },
                ]}
              >
                {offerPrice > originalPrice
                  ? `₹${offerPrice - originalPrice} above sender's budget`
                  : `₹${originalPrice - offerPrice} below sender's budget`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Optional Note for Sender */}
        <View style={styles.noteWrap}>
          <Text style={[styles.noteLabel, { color: C.textSecondary }]}>
            Note for {senderName} (Optional)
          </Text>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: C.card,
                borderColor: C.surfaceBorder,
                color: C.textPrimary,
              },
            ]}
            placeholder="e.g., Travelling in spacious car, can do door-to-door handover"
            placeholderTextColor={C.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            maxLength={200}
          />
        </View>

        {/* Green Action Button matching index.styles.ts */}
        <Pressable
          style={[
            styles.submitButton,
            {
              backgroundColor: isPriceValid ? '#10B981' : C.surfaceElevated,
              opacity: isSubmitting ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isPriceValid || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={`Submit counter offer of ${offerPrice} rupees`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                Submit Offer (₹{offerPrice})
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Price card
  priceCard: {
    borderRadius: BorderRadius.xl, // 24 from index.styles.ts
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    marginRight: 2,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: FontWeight.extrabold,
    minWidth: 100,
    textAlign: 'center',
    padding: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: FontSize.xs,
  },
  priceDiffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  priceDiffText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Note input
  noteWrap: {
    gap: 6,
  },
  noteLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  noteInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    minHeight: 64,
    textAlignVertical: 'top',
  },

  // Green Action Button strictly matching index.styles.ts
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 52,
    marginTop: Spacing.xs,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
