import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

function normalizeCity(val?: string) {
  return (val || '').trim().toLowerCase();
}

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

interface SendRequestModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
  userParcels: Parcel[];
  onConfirmRequest: (parcelId: string, trip: Trip, calculatedPrice: number) => Promise<void>;
  onCreateParcel: (fromCity: string, toCity: string) => void;
  isSubmitting?: boolean;
}

export function SendRequestModal({
  visible,
  onClose,
  trip,
  userParcels,
  onConfirmRequest,
  onCreateParcel,
  isSubmitting = false,
}: SendRequestModalProps) {
  const { C } = useThemeColors();
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  const matchingParcels = React.useMemo(() => {
    if (!trip) return [];
    return userParcels.filter((parcel) => {
      const open = parcel.status === 'open';
      const routeMatch =
        normalizeCity(parcel.fromCity) === normalizeCity(trip.fromCity) &&
        normalizeCity(parcel.toCity) === normalizeCity(trip.toCity);
      const capacityMatch = parcel.weight <= (trip.availableCapacity || 0);
      return open && routeMatch && capacityMatch;
    });
  }, [trip, userParcels]);

  useEffect(() => {
    if (matchingParcels.length > 0) {
      setSelectedParcelId(matchingParcels[0].id);
    } else {
      setSelectedParcelId(null);
    }
  }, [matchingParcels]);

  if (!trip) return null;

  const selectedParcel = matchingParcels.find((p) => p.id === selectedParcelId) || matchingParcels[0];
  const calculatedCost = selectedParcel
    ? Math.round(selectedParcel.weight * (trip.pricePerKg || 0))
    : 0;

  const handleConfirm = async () => {
    if (!selectedParcelId || isSubmitting) return;
    Haptic.confirm();
    await onConfirmRequest(selectedParcelId, trip, calculatedCost);
  };

  const handleCreateParcel = () => {
    Haptic.tap();
    onClose();
    onCreateParcel(trip.fromCity, trip.toCity);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Handle */}
          <View style={[styles.dragHandle, { backgroundColor: C.surfaceBorder }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="send" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: C.textPrimary }]}>Send Delivery Request</Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>
                  Request {trip.userName} to carry your parcel
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={C.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Trip Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.routeRow}>
                <View style={styles.cityCol}>
                  <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
                  <Text style={[styles.cityName, { color: C.textPrimary }]}>{trip.fromCity}</Text>
                </View>
                <View style={[styles.arrowCircle, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
                </View>
                <View style={[styles.cityCol, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.cityLabel, { color: C.textMuted }]}>TO</Text>
                  <Text style={[styles.cityName, { color: C.textPrimary }]}>{trip.toCity}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryMetaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{trip.date}</Text>
                </View>
                <View style={styles.metaPill}>
                  <MaterialIcons name="scale" size={13} color={C.textSecondary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>
                    {trip.availableCapacity} kg space
                  </Text>
                </View>
                <View style={styles.rateContainer}>
                  <Text style={[styles.rateLabel, { color: C.textMuted }]}>RATE</Text>
                  <Text style={[styles.rateValue, { color: C.primary }]}>₹{trip.pricePerKg}/kg</Text>
                </View>
              </View>
            </View>

            {/* Matching Parcels vs No Parcels */}
            {matchingParcels.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                  Select your parcel to send:
                </Text>
                <View style={styles.parcelList}>
                  {matchingParcels.map((parcel) => {
                    const selected = selectedParcelId === parcel.id;
                    const catIcon = categoryIcons[parcel.category] || 'inventory-2';
                    const parcelCost = Math.round(parcel.weight * (trip.pricePerKg || 0));

                    return (
                      <Pressable
                        key={parcel.id}
                        style={[
                          styles.parcelOption,
                          {
                            backgroundColor: selected ? C.primarySubtle : C.surface,
                            borderColor: selected ? C.primary : C.surfaceBorder,
                          },
                        ]}
                        onPress={() => {
                          Haptic.tap();
                          setSelectedParcelId(parcel.id);
                        }}
                      >
                        <View style={styles.parcelLeft}>
                          <View
                            style={[
                              styles.radioCircle,
                              {
                                borderColor: selected ? C.primary : C.textMuted,
                                backgroundColor: selected ? C.primary : 'transparent',
                              },
                            ]}
                          >
                            {selected ? <View style={styles.radioDot} /> : null}
                          </View>
                          <View style={styles.parcelInfo}>
                            <View style={styles.parcelTitleRow}>
                              <MaterialIcons name={catIcon} size={15} color={C.primary} />
                              <Text style={[styles.parcelCategory, { color: C.textPrimary }]}>
                                {parcel.category.toUpperCase()} ({parcel.weight} kg)
                              </Text>
                            </View>
                            <Text style={[styles.parcelDesc, { color: C.textMuted }]} numberOfLines={1}>
                              {parcel.description || 'Package delivery'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.parcelCostCol}>
                          <Text style={[styles.parcelCostLabel, { color: C.textMuted }]}>Cost</Text>
                          <Text style={[styles.parcelCostVal, { color: C.primary }]}>₹{parcelCost}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="inventory" size={26} color={C.primary} />
                </View>
                <Text style={[styles.emptyHeading, { color: C.textPrimary }]}>
                  No Open Parcel for this Route
                </Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  {trip.userName} is traveling from {trip.fromCity} to {trip.toCity}. Create a parcel on this route to request delivery.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.createParcelBtn,
                    { backgroundColor: C.primary },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleCreateParcel}
                >
                  <MaterialIcons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.createParcelBtnText}>Create Parcel for this Route</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          {matchingParcels.length > 0 ? (
            <View style={[styles.footer, { borderTopColor: C.surfaceBorder }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: C.primary },
                  (!selectedParcelId || isSubmitting) && { opacity: 0.5 },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
                disabled={!selectedParcelId || isSubmitting}
                onPress={handleConfirm}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>
                      Send Request (₹{calculatedCost})
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityCol: {
    flex: 1,
    gap: 2,
  },
  cityLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  cityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.sm,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  metaText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  rateValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  parcelList: {
    gap: 8,
  },
  parcelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  parcelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  parcelInfo: {
    gap: 2,
    flex: 1,
  },
  parcelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  parcelCategory: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  parcelDesc: {
    fontSize: 11,
  },
  parcelCostCol: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  parcelCostLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  parcelCostVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  createParcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  createParcelBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
