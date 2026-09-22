import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

function normalizeCity(val?: string) {
  return (val || '').trim().toLowerCase();
}

const vehicleIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

export interface QuickCarryTripParams {
  vehicleType: Trip['vehicleType'];
  date: string;
  time: string;
  capacity: number;
}

interface CarryParcelModalProps {
  visible: boolean;
  onClose: () => void;
  parcel: Parcel | null;
  userTrips: Trip[];
  onConfirmCarry: (tripId: string, parcel: Parcel) => Promise<void>;
  onPostTrip: (fromCity: string, toCity: string, minCapacity: number) => void;
  onQuickCreateAndCarry?: (quickParams: QuickCarryTripParams, parcel: Parcel) => Promise<void>;
  isSubmitting?: boolean;
}

export function CarryParcelModal({
  visible,
  onClose,
  parcel,
  userTrips,
  onConfirmCarry,
  onPostTrip,
  onQuickCreateAndCarry,
  isSubmitting = false,
}: CarryParcelModalProps) {
  const { C } = useThemeColors();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Quick trip creation state when no existing trip matches
  const [quickVehicle, setQuickVehicle] = useState<Trip['vehicleType']>('car');
  const [quickDateOption, setQuickDateOption] = useState<'today' | 'tomorrow' | 'day_after'>('today');
  const [quickCapacity, setQuickCapacity] = useState<number>(() => Math.max(10, Math.ceil((parcel?.weight || 2) + 3)));

  useEffect(() => {
    if (parcel) {
      setQuickCapacity(Math.max(10, Math.ceil(parcel.weight + 3)));
    }
  }, [parcel]);

  const matchingTrips = React.useMemo(() => {
    if (!parcel) return [];
    return userTrips.filter((trip) => {
      const active = trip.status === 'active';
      const routeMatch =
        normalizeCity(trip.fromCity) === normalizeCity(parcel.fromCity) &&
        normalizeCity(trip.toCity) === normalizeCity(parcel.toCity);
      const capacityMatch = (trip.availableCapacity || 0) >= parcel.weight;
      return active && routeMatch && capacityMatch;
    });
  }, [parcel, userTrips]);

  useEffect(() => {
    if (matchingTrips.length > 0) {
      setSelectedTripId(matchingTrips[0].id);
    } else {
      setSelectedTripId(null);
    }
  }, [matchingTrips]);

  if (!parcel) return null;

  const getSelectedDateIso = () => {
    const d = new Date();
    if (quickDateOption === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (quickDateOption === 'day_after') {
      d.setDate(d.getDate() + 2);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleConfirm = async () => {
    if (!selectedTripId || isSubmitting) return;
    Haptic.confirm();
    await onConfirmCarry(selectedTripId, parcel);
  };

  const handleQuickCreate = async () => {
    if (isSubmitting) return;
    if (onQuickCreateAndCarry) {
      Haptic.confirm();
      await onQuickCreateAndCarry({
        vehicleType: quickVehicle,
        date: getSelectedDateIso(),
        time: '10:00 AM',
        capacity: quickCapacity,
      }, parcel);
    } else {
      handlePostTrip();
    }
  };

  const handlePostTrip = () => {
    Haptic.tap();
    onClose();
    onPostTrip(parcel.fromCity, parcel.toCity, parcel.weight);
  };

  if (!parcel) return null;

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
    >
      <View style={{ paddingBottom: Spacing.md }}>
        {/* Header */}
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="local-shipping" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: C.textPrimary }]}>Carry This Parcel</Text>
                <Text style={[styles.subtitle, { color: C.textMuted }]}>
                  Offer to deliver for {parcel.userName}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={C.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Parcel Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.routeRow}>
                <View style={styles.cityCol}>
                  <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
                  <Text style={[styles.cityName, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
                </View>
                <View style={[styles.arrowCircle, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
                </View>
                <View style={[styles.cityCol, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.cityLabel, { color: C.textMuted }]}>TO</Text>
                  <Text style={[styles.cityName, { color: C.textPrimary }]}>{parcel.toCity}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryMetaRow}>
                <View style={styles.metaPill}>
                  <MaterialIcons name="scale" size={13} color={C.textSecondary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{parcel.weight} kg</Text>
                </View>
                <View style={styles.metaPill}>
                  <MaterialIcons name="inventory-2" size={13} color={C.textSecondary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{parcel.category}</Text>
                </View>
                <View style={styles.rewardContainer}>
                  <Text style={[styles.rewardLabel, { color: C.textMuted }]}>REWARD</Text>
                  <Text style={[styles.rewardValue, { color: C.primary }]}>₹{parcel.priceOffer}</Text>
                </View>
              </View>
            </View>

            {/* Matching Trips vs No Trips */}
            {matchingTrips.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                  Select your active trip to carry this:
                </Text>
                <View style={styles.tripList}>
                  {matchingTrips.map((trip) => {
                    const selected = selectedTripId === trip.id;
                    const vIcon = vehicleIcons[trip.vehicleType] || 'directions-car';

                    return (
                      <Pressable
                        key={trip.id}
                        style={[
                          styles.tripOption,
                          {
                            backgroundColor: selected ? C.primarySubtle : C.surface,
                            borderColor: selected ? C.primary : C.surfaceBorder,
                          },
                        ]}
                        onPress={() => {
                          Haptic.tap();
                          setSelectedTripId(trip.id);
                        }}
                      >
                        <View style={styles.tripLeft}>
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
                          <View style={styles.tripInfo}>
                            <View style={styles.tripTitleRow}>
                              <MaterialIcons name={vIcon} size={15} color={C.primary} />
                              <Text style={[styles.tripDate, { color: C.textPrimary }]}>
                                {trip.date} at {trip.time}
                              </Text>
                            </View>
                            <Text style={[styles.tripCapacity, { color: C.textMuted }]}>
                              Capacity: {trip.availableCapacity} kg available
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tripVehicleBadge, { color: C.primary }]}>
                          {trip.vehicleType.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={[styles.quickTripBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                <View style={styles.quickHeaderRow}>
                  <View style={[styles.quickIconCircle, { backgroundColor: C.primarySubtle }]}>
                    <MaterialIcons name="bolt" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quickHeading, { color: C.textPrimary }]}>
                      Quick Route & Carry Offer
                    </Text>
                    <Text style={[styles.quickSub, { color: C.textMuted }]}>
                      No active trip? Auto-post this route and send offer in 1 click.
                    </Text>
                  </View>
                </View>

                {/* Auto-detected route preview */}
                <View style={[styles.autoRouteCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  <View style={styles.autoRouteHeader}>
                    <View style={styles.autoRouteBadge}>
                      <MaterialIcons name="check-circle" size={12} color={C.success} />
                      <Text style={[styles.autoRouteBadgeText, { color: C.success }]}>
                        Auto-Completed Route
                      </Text>
                    </View>
                  </View>
                  <View style={styles.autoRouteRow}>
                    <Text style={[styles.autoRouteCity, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
                    <View style={[styles.autoRouteArrow, { backgroundColor: C.primarySubtle }]}>
                      <MaterialIcons name="arrow-forward" size={12} color={C.primary} />
                    </View>
                    <Text style={[styles.autoRouteCity, { color: C.textPrimary }]}>{parcel.toCity}</Text>
                  </View>
                </View>

                {/* Vehicle Selection */}
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Your Travel Vehicle</Text>
                <View style={styles.vehiclePillRow}>
                  {(['car', 'bike', 'train', 'bus', 'flight'] as const).map((v) => {
                    const isSel = quickVehicle === v;
                    const icon = vehicleIcons[v] || 'directions-car';
                    return (
                      <Pressable
                        key={v}
                        onPress={() => {
                          Haptic.select();
                          setQuickVehicle(v);
                        }}
                        style={[
                          styles.vehiclePill,
                          {
                            backgroundColor: isSel ? C.primary : C.surface,
                            borderColor: isSel ? C.primary : C.surfaceBorder,
                          },
                        ]}
                      >
                        <MaterialIcons name={icon} size={15} color={isSel ? '#FFFFFF' : C.textSecondary} />
                        <Text style={[styles.vehiclePillText, { color: isSel ? '#FFFFFF' : C.textSecondary }]}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Travel Day */}
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Departure Date</Text>
                <View style={styles.datePillRow}>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'tomorrow', label: 'Tomorrow' },
                    { key: 'day_after', label: 'In 2 Days' },
                  ].map((d) => {
                    const isSel = quickDateOption === d.key;
                    return (
                      <Pressable
                        key={d.key}
                        onPress={() => {
                          Haptic.select();
                          setQuickDateOption(d.key as any);
                        }}
                        style={[
                          styles.datePill,
                          {
                            backgroundColor: isSel ? C.primarySubtle : C.surface,
                            borderColor: isSel ? C.primary : C.surfaceBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePillText,
                            {
                              color: isSel ? C.primary : C.textSecondary,
                              fontWeight: isSel ? '700' : '500',
                            },
                          ]}
                        >
                          {d.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* One-tap CTA */}
                <Pressable
                  style={({ pressed }) => [
                    styles.quickSubmitBtn,
                    { backgroundColor: C.primary },
                    isSubmitting && { opacity: 0.6 },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                  disabled={isSubmitting}
                  onPress={handleQuickCreate}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
                      <Text style={styles.quickSubmitBtnText}>
                        Post Route & Carry (Earn ₹{parcel.priceOffer})
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Secondary link to wizard */}
                <Pressable onPress={handlePostTrip} style={styles.fullCustomLink} hitSlop={8}>
                  <Text style={[styles.fullCustomLinkText, { color: C.textMuted }]}>
                    Or open full trip creator in Wizard
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color={C.textMuted} />
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          {matchingTrips.length > 0 ? (
            <View style={[styles.footer, { borderTopColor: C.surfaceBorder }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: C.primary },
                  (!selectedTripId || isSubmitting) && { opacity: 0.5 },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
                disabled={!selectedTripId || isSubmitting}
                onPress={handleConfirm}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>
                      Send Carry Offer (₹{parcel.priceOffer})
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
      </View>
    </GestureBottomSheet>
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
  rewardContainer: {
    alignItems: 'flex-end',
  },
  rewardLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  rewardValue: {
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
  tripList: {
    gap: 8,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  tripLeft: {
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
  tripInfo: {
    gap: 2,
  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  tripCapacity: {
    fontSize: 11,
  },
  tripVehicleBadge: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.4,
  },
  quickTripBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  quickHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  quickSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  autoRouteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  autoRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoRouteBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  autoRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRouteCity: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  autoRouteArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehiclePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  vehiclePillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  datePillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 12,
  },
  quickSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  quickSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  fullCustomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  fullCustomLinkText: {
    fontSize: 11,
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
  postTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  postTripBtnText: {
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
