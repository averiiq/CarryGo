import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
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
  const [carryMode, setCarryMode] = useState<'existing' | 'quick'>('quick');

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
      setCarryMode('existing');
      setSelectedTripId(matchingTrips[0].id);
    } else {
      setCarryMode('quick');
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

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="90%"
    >
      <View style={{ paddingBottom: Spacing.md }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="local-shipping" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: C.textPrimary }]}>Carry This Parcel</Text>
              <Text style={[styles.subtitle, { color: C.textMuted }]}>
                Earn ₹{parcel.priceOffer} carrying for {parcel.userName}
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

          {/* Guaranteed Earnings Banner */}
          <View style={[styles.earningsBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <MaterialIcons name="security" size={16} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.earningsTitle, { color: '#065F46' }]}>Guaranteed Payout • ₹{parcel.priceOffer}</Text>
              <Text style={[styles.earningsSub, { color: '#047857' }]}>
                Sender deposits full amount in escrow before pickup. Released directly to your wallet upon destination OTP confirmation.
              </Text>
            </View>
          </View>

          {/* Mode Switcher (if user has active matching trips) */}
          {matchingTrips.length > 0 ? (
            <View style={[styles.modeSwitcher, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Pressable
                style={[
                  styles.modeTab,
                  carryMode === 'existing' && { backgroundColor: C.primary },
                ]}
                onPress={() => {
                  Haptic.select();
                  setCarryMode('existing');
                }}
              >
                <MaterialIcons
                  name="directions-car"
                  size={14}
                  color={carryMode === 'existing' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    { color: carryMode === 'existing' ? '#FFFFFF' : C.textSecondary },
                    carryMode === 'existing' && { fontWeight: FontWeight.bold },
                  ]}
                >
                  My Trips ({matchingTrips.length})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeTab,
                  carryMode === 'quick' && { backgroundColor: C.primary },
                ]}
                onPress={() => {
                  Haptic.select();
                  setCarryMode('quick');
                }}
              >
                <MaterialIcons
                  name="bolt"
                  size={14}
                  color={carryMode === 'quick' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    { color: carryMode === 'quick' ? '#FFFFFF' : C.textSecondary },
                    carryMode === 'quick' && { fontWeight: FontWeight.bold },
                  ]}
                >
                  Quick Route & Carry
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Matching Trips vs Quick Route */}
          {carryMode === 'existing' && matchingTrips.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                Select active trip to attach this parcel:
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
                    Instant Route & Carry Offer
                  </Text>
                  <Text style={[styles.quickSub, { color: C.textMuted }]}>
                    Auto-publish this route and send offer to {parcel.userName} in 1 tap.
                  </Text>
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
                      Send Carry Offer (Earn ₹{parcel.priceOffer})
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Secondary link to wizard */}
              <Pressable onPress={handlePostTrip} style={styles.fullCustomLink} hitSlop={8}>
                <Text style={[styles.fullCustomLinkText, { color: C.textMuted }]}>
                  Need custom route waypoints? Open Full Wizard
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={C.textMuted} />
              </Pressable>
            </View>
          )}

          {/* 3-Step Carrier Flow Preview */}
          <View style={[styles.flowPreviewCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.flowPreviewTitle, { color: C.textSecondary }]}>HOW CARRYING WORKS</Text>
            <View style={styles.flowStepsRow}>
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.primary }]}>
                  <Text style={styles.flowStepNumText}>1</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textPrimary }]}>Send Carry Offer</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.surfaceBorder }]}>
                  <Text style={[styles.flowStepNumText, { color: C.textSecondary }]}>2</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textSecondary }]}>Sender Accepts & Funds Escrow</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.surfaceBorder }]}>
                  <Text style={[styles.flowStepNumText, { color: C.textSecondary }]}>3</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textSecondary }]}>Handover OTP & Deliver</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Existing Trip Confirm Footer */}
        {carryMode === 'existing' && matchingTrips.length > 0 ? (
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
    paddingTop: Spacing.xs,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 8,
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
  },
  metaText: {
    fontSize: 12,
    fontWeight: FontWeight.medium,
  },
  rewardContainer: {
    alignItems: 'flex-end',
  },
  rewardLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  rewardValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Earnings Banner
  earningsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  earningsTitle: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  earningsSub: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },

  // Mode Switcher
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
    marginBottom: 10,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeTabText: {
    fontSize: 11.5,
  },

  // Section
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    marginBottom: 8,
  },
  tripList: {
    gap: 8,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  tripInfo: {
    flex: 1,
    gap: 2,
  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tripDate: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  tripCapacity: {
    fontSize: 11,
  },
  tripVehicleBadge: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },

  // Quick Trip Box
  quickTripBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  quickHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHeading: {
    fontSize: 12.5,
    fontWeight: FontWeight.bold,
  },
  quickSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vehiclePillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  vehiclePillText: {
    fontSize: 10.5,
  },
  datePillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  datePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11.5,
  },
  quickSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  quickSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  fullCustomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  fullCustomLinkText: {
    fontSize: 10.5,
  },

  // Flow Preview
  flowPreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    marginBottom: 6,
  },
  flowPreviewTitle: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  flowStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowStepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  flowStepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStepNumText: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  flowStepText: {
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 12,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
});
