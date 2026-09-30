import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Trip } from '@/types';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

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

export interface QuickCreateParcelParams {
  category: Parcel['category'];
  weight: number;
  description: string;
}

interface SendRequestModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
  userParcels: Parcel[];
  onConfirmRequest: (parcelId: string, trip: Trip, calculatedPrice: number) => Promise<void>;
  onCreateParcel: (fromCity: string, toCity: string) => void;
  onQuickCreateAndRequest?: (params: QuickCreateParcelParams, trip: Trip, calculatedPrice: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function SendRequestModal({
  visible,
  onClose,
  trip,
  userParcels,
  onConfirmRequest,
  onCreateParcel,
  onQuickCreateAndRequest,
  isSubmitting = false,
}: SendRequestModalProps) {
  const { C } = useThemeColors();
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<'existing' | 'quick'>('quick');

  // Quick Instant Booking state when user has no pre-existing parcel
  const [quickCategory, setQuickCategory] = useState<Parcel['category']>('documents');
  const [quickWeight, setQuickWeight] = useState<number>(1);
  const [quickDescription, setQuickDescription] = useState<string>('');

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
      setBookingMode('existing');
      setSelectedParcelId(matchingParcels[0].id);
    } else {
      setBookingMode('quick');
      setSelectedParcelId(null);
    }
  }, [matchingParcels]);

  if (!trip) return null;

  const selectedParcel = matchingParcels.find((p) => p.id === selectedParcelId) || matchingParcels[0];
  const calculatedCost = selectedParcel
    ? Math.round(selectedParcel.weight * (trip.pricePerKg || 0))
    : 0;

  const quickCalculatedCost = trip
    ? Math.max(80, Math.round(quickWeight * (trip.pricePerKg || 50)))
    : 0;

  const handleConfirm = async () => {
    if (!selectedParcelId || isSubmitting) return;
    Haptic.confirm();
    await onConfirmRequest(selectedParcelId, trip, calculatedCost);
  };

  const handleQuickCreate = async () => {
    if (isSubmitting || !trip) return;
    Haptic.confirm();
    if (onQuickCreateAndRequest) {
      await onQuickCreateAndRequest(
        {
          category: quickCategory,
          weight: quickWeight,
          description: quickDescription.trim() || `${quickCategory.toUpperCase()} package delivery`,
        },
        trip,
        quickCalculatedCost
      );
    } else {
      handleCreateParcel();
    }
  };

  const handleCreateParcel = () => {
    Haptic.tap();
    onClose();
    onCreateParcel(trip.fromCity, trip.toCity);
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
              <MaterialIcons name="send" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: C.textPrimary }]}>Send Delivery Request</Text>
              <Text style={[styles.subtitle, { color: C.textMuted }]}>
                Book {trip.userName} to carry along their route
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialIcons name="close" size={20} color={C.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Trip Route Summary Card */}
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

          {/* 100% Escrow Protection Banner */}
          <View style={[styles.escrowTrustBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <MaterialIcons name="security" size={16} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.escrowTrustTitle, { color: '#065F46' }]}>100% Escrow Protected Booking</Text>
              <Text style={[styles.escrowTrustSub, { color: '#047857' }]}>
                Funds are held safely in escrow and only released to {trip.userName} after delivery OTP is verified at destination.
              </Text>
            </View>
          </View>

          {/* Mode Switcher (if user has existing matching parcels) */}
          {matchingParcels.length > 0 ? (
            <View style={[styles.modeSwitcher, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Pressable
                style={[
                  styles.modeTab,
                  bookingMode === 'existing' && { backgroundColor: C.primary },
                ]}
                onPress={() => {
                  Haptic.select();
                  setBookingMode('existing');
                }}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={14}
                  color={bookingMode === 'existing' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    { color: bookingMode === 'existing' ? '#FFFFFF' : C.textSecondary },
                    bookingMode === 'existing' && { fontWeight: FontWeight.bold },
                  ]}
                >
                  My Parcels ({matchingParcels.length})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeTab,
                  bookingMode === 'quick' && { backgroundColor: C.primary },
                ]}
                onPress={() => {
                  Haptic.select();
                  setBookingMode('quick');
                }}
              >
                <MaterialIcons
                  name="bolt"
                  size={14}
                  color={bookingMode === 'quick' ? '#FFFFFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    { color: bookingMode === 'quick' ? '#FFFFFF' : C.textSecondary },
                    bookingMode === 'quick' && { fontWeight: FontWeight.bold },
                  ]}
                >
                  Instant New Package
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Existing Parcels List View */}
          {bookingMode === 'existing' && matchingParcels.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                Select parcel to send on this trip:
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
            /* Instant Quick Booking View */
            <View style={[styles.quickBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.quickHeaderRow}>
                <View style={[styles.quickIconCircle, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="bolt" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickHeading, { color: C.textPrimary }]}>
                    Instant Booking (1-Tap Request)
                  </Text>
                  <Text style={[styles.quickSub, { color: C.textMuted }]}>
                    Enter your package details to book {trip.userName} instantly.
                  </Text>
                </View>
              </View>

              {/* Package Category */}
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Package Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {(['documents', 'electronics', 'clothing', 'medicine', 'food', 'other'] as const).map((cat) => {
                  const isSel = quickCategory === cat;
                  const icon = categoryIcons[cat] || 'inventory-2';
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        Haptic.select();
                        setQuickCategory(cat);
                      }}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSel ? C.primary : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <MaterialIcons name={icon} size={14} color={isSel ? '#FFFFFF' : C.textSecondary} />
                      <Text style={[styles.catPillText, { color: isSel ? '#FFFFFF' : C.textSecondary }]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Weight Selector */}
              <View style={styles.weightHeaderRow}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary, marginBottom: 0 }]}>
                  Package Weight: <Text style={{ color: C.primary, fontWeight: '700' }}>{quickWeight} kg</Text>
                </Text>
                <Text style={[styles.capacityHint, { color: C.textMuted }]}>
                  (Max: {trip.availableCapacity} kg)
                </Text>
              </View>
              <View style={styles.weightPillRow}>
                {[0.5, 1, 2, 3, 5].map((w) => {
                  const isSel = quickWeight === w;
                  const disabled = w > (trip.availableCapacity || 10);
                  return (
                    <Pressable
                      key={w}
                      disabled={disabled}
                      onPress={() => {
                        Haptic.select();
                        setQuickWeight(w);
                      }}
                      style={[
                        styles.weightPill,
                        {
                          backgroundColor: isSel ? C.primarySubtle : C.surface,
                          borderColor: isSel ? C.primary : C.surfaceBorder,
                          opacity: disabled ? 0.35 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.weightPillText,
                          {
                            color: isSel ? C.primary : C.textSecondary,
                            fontWeight: isSel ? '700' : '500',
                          },
                        ]}
                      >
                        {w} kg
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Description Input */}
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Package Description</Text>
              <TextInput
                value={quickDescription}
                onChangeText={setQuickDescription}
                placeholder="e.g. Legal documents in sealed waterproof envelope"
                placeholderTextColor={C.textMuted}
                maxLength={120}
                style={[
                  styles.inputField,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.surfaceBorder,
                    color: C.textPrimary,
                  },
                ]}
              />

              {/* Live Cost Estimation Card */}
              <View style={[styles.costPreviewCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <View>
                  <Text style={[styles.costCalcLabel, { color: C.textMuted }]}>
                    ₹{trip.pricePerKg}/kg × {quickWeight} kg • 0% Platform Fee
                  </Text>
                  <Text style={[styles.costCalcTotal, { color: C.primary }]}>
                    Total Escrow Payable
                  </Text>
                </View>
                <Text style={[styles.costBigVal, { color: C.primary }]}>
                  ₹{quickCalculatedCost}
                </Text>
              </View>

              {/* Quick Submit Button */}
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
                    <MaterialIcons name="bolt" size={18} color="#FFFFFF" />
                    <Text style={styles.quickSubmitText}>
                      Send Request (₹{quickCalculatedCost})
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Secondary link to wizard */}
              <Pressable
                style={styles.fullWizardLink}
                onPress={handleCreateParcel}
                hitSlop={8}
              >
                <Text style={[styles.fullWizardLinkText, { color: C.textSecondary }]}>
                  Need photo documentation? <Text style={{ color: C.primary, fontWeight: '700' }}>Open Full Parcel Wizard</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* 3-Step Flow Preview */}
          <View style={[styles.flowPreviewCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.flowPreviewTitle, { color: C.textSecondary }]}>HOW THIS BOOKING WORKS</Text>
            <View style={styles.flowStepsRow}>
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.primary }]}>
                  <Text style={styles.flowStepNumText}>1</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textPrimary }]}>Send Request</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.surfaceBorder }]}>
                  <Text style={[styles.flowStepNumText, { color: C.textSecondary }]}>2</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textSecondary }]}>Accept & Pay Escrow</Text>
              </View>
              <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              <View style={styles.flowStepCol}>
                <View style={[styles.flowStepNum, { backgroundColor: C.surfaceBorder }]}>
                  <Text style={[styles.flowStepNumText, { color: C.textSecondary }]}>3</Text>
                </View>
                <Text style={[styles.flowStepText, { color: C.textSecondary }]}>Handover & Delivery OTP</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Existing Parcel Confirm Footer */}
        {bookingMode === 'existing' && matchingParcels.length > 0 ? (
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
  rateContainer: {
    alignItems: 'flex-end',
  },
  rateLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  rateValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  // Escrow Trust Banner
  escrowTrustBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  escrowTrustTitle: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
  },
  escrowTrustSub: {
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

  // Existing Parcels Section
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    marginBottom: 8,
  },
  parcelList: {
    gap: 8,
  },
  parcelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  parcelLeft: {
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
  parcelInfo: {
    flex: 1,
    gap: 2,
  },
  parcelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  parcelCategory: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  parcelDesc: {
    fontSize: 11,
  },
  parcelCostCol: {
    alignItems: 'flex-end',
  },
  parcelCostLabel: {
    fontSize: 9,
  },
  parcelCostVal: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  // Quick Instant Box
  quickBox: {
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
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 6,
  },
  catPillText: {
    fontSize: 11,
  },
  weightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityHint: {
    fontSize: 10,
  },
  weightPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weightPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  weightPillText: {
    fontSize: 11.5,
  },
  inputField: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 11.5,
  },
  costPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  costCalcLabel: {
    fontSize: 9.5,
  },
  costCalcTotal: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    marginTop: 1,
  },
  costBigVal: {
    fontSize: FontSize.md + 2,
    fontWeight: FontWeight.extrabold,
  },
  quickSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  quickSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  fullWizardLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  fullWizardLinkText: {
    fontSize: 10.5,
  },

  // 3-Step Flow Preview
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

  // Footer for existing parcel selection
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
