import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { DigitalWaybillCard } from '@/components/feature/DigitalWaybillCard';
import { VEHICLES } from '@/components/feature/trip/TripDetailsStep';
import { VehicleType } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export interface TripReviewDraft {
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  capacity: string;
  price: string;
}

interface TripReviewStepProps {
  form: TripReviewDraft;
  onEdit: (step: number) => void;
  hasKyc?: boolean;
}

function StepHeader({
  title,
  subtitle,
  icon,
  C,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  C: any;
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerIconWrapper, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name={icon} size={22} color={C.primary} />
      </View>
      <View style={styles.headerTextContainer}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

export const TripReviewStep = memo(function TripReviewStep({
  form,
  onEdit,
  hasKyc,
}: TripReviewStepProps) {
  const { C } = useThemeColors();
  const selectedVehicle = VEHICLES.find((v) => v.type === form.vehicle);

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={130}
    >
      <StepHeader
        title="Review your trip"
        subtitle="Confirm every detail before publishing your trip itinerary"
        icon="fact-check"
        C={C}
      />

      <DigitalWaybillCard
        type="trip"
        fromCity={form.fromCity}
        toCity={form.toCity}
        date={form.date}
        time={form.time}
        categoryOrVehicle={selectedVehicle?.label || 'Car'}
        categoryOrVehicleIcon={selectedVehicle?.icon || 'directions-car'}
        weightOrCapacity={form.capacity}
        priceOrOffer={form.price}
        onEditRoute={() => onEdit(0)}
        onEditDetails={() => onEdit(1)}
        hasKyc={hasKyc}
      />
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepInner: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
