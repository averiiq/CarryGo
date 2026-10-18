import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { DigitalWaybillCard } from '@/components/feature/DigitalWaybillCard';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { ParcelDraft, PARCEL_CATEGORIES } from './types';

interface ParcelReviewStepProps {
  form: ParcelDraft;
  C: any;
  onEdit: (step: number) => void;
  hasKyc?: boolean;
}

export function ParcelReviewStep({ form, C, onEdit, hasKyc }: ParcelReviewStepProps) {
  const selectedCategory = PARCEL_CATEGORIES.find((c) => c.type === form.category);

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      <View style={styles.stepHeaderWrap}>
        <View
          style={[
            styles.stepHeaderIcon,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '25', borderWidth: 1 },
          ]}
        >
          <MaterialIcons name="fact-check" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Review your parcel</Text>
          <Text style={[styles.stepSubtitle, { color: C.textSecondary }]}>
            Double-check details before publishing to travelers
          </Text>
        </View>
      </View>

      <DigitalWaybillCard
        type="parcel"
        fromCity={form.fromCity}
        toCity={form.toCity}
        date={form.deliveryDate}
        categoryOrVehicle={selectedCategory?.label || 'General Parcel'}
        categoryOrVehicleIcon={selectedCategory?.icon || 'inventory-2'}
        weightOrCapacity={form.weight}
        priceOrOffer={form.priceOffer}
        images={form.images}
        description={form.description}
        onEditRoute={() => onEdit(0)}
        onEditDetails={() => onEdit(1)}
        hasKyc={hasKyc}
      />

      <View
        style={[
          styles.infoBox,
          { backgroundColor: C.surface, borderColor: C.primary + '30' },
        ]}
      >
        <MaterialIcons name="security" size={20} color={C.primary} style={{ marginTop: 2 }} />
        <Text style={[styles.infoText, { color: C.textSecondary }]}>
          Your parcel offer is held securely in CarryGo Escrow until successful delivery verification.
        </Text>
      </View>
    </KeyboardAwareScrollView>
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
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.2,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 22 },
});
