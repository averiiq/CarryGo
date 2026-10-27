import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { DigitalWaybillCard } from '@/components/feature/DigitalWaybillCard';
import { VEHICLES, VEHICLE_IMAGES } from '@/components/feature/trip/TripDetailsStep';
import { VehicleType, ParcelCategory } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export interface TripReviewDraft {
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  capacity: string;
  price: string;
  allowedCategories?: ParcelCategory[];
  stopovers?: string[];
}

interface TripReviewStepProps {
  form: TripReviewDraft;
  onEdit: (step: number) => void;
  hasKyc?: boolean;
}

const CATEGORY_ICONS: Record<ParcelCategory, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'medical-services',
  other: 'category',
};

export const TripReviewStep = memo(function TripReviewStep({
  form,
  onEdit,
  hasKyc,
}: TripReviewStepProps) {
  const { C } = useThemeColors();
  const { user } = useAuth();
  const isKycApproved = Boolean(
    user?.kycStatus === 'approved' ||
    user?.verified ||
    user?.isAadhaarVerified
  );
  const selectedVehicle = VEHICLES.find((v) => v.type === form.vehicle) || VEHICLES[0];
  const vehicleImage = VEHICLE_IMAGES[form.vehicle];

  const userAvatar = user?.avatar || user?.selfieUrl || (user as any)?.avatarUrl || (user as any)?.userSelfieUrl;
  const userName = user?.fullName || user?.name || 'Verified Traveller';
  const userRating = user?.rating && user.rating > 0 ? user.rating : 5.0;
  const userHasKyc = hasKyc ?? isKycApproved;

  return (
    <KeyboardAwareScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepInner}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardDismissMode="on-drag"
      extraScrollHeight={80}
    >
      {/* Header Banner */}
      <View style={styles.headerRow}>
        <View style={[styles.headerIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="fact-check" size={20} color={C.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
          Review your trip
        </Text>
      </View>

      {/* Boarding Pass Waybill Card with Vehicle Image */}
      <DigitalWaybillCard
        type="trip"
        fromCity={form.fromCity}
        toCity={form.toCity}
        date={form.date}
        time={form.time}
        categoryOrVehicle={selectedVehicle?.label || 'Car'}
        categoryOrVehicleIcon={selectedVehicle?.icon || 'directions-car'}
        vehicleImage={vehicleImage}
        weightOrCapacity={form.capacity}
        priceOrOffer={form.price}
        onEditRoute={() => onEdit(0)}
        onEditDetails={() => onEdit(1)}
        hasKyc={userHasKyc}
        showTrustCard={false}
        userAvatar={userAvatar}
        userName={userName}
        userRating={userRating}
      />

      {/* Stopovers Summary Card */}
      {form.stopovers && form.stopovers.length > 0 ? (
        <View
          style={[
            styles.allowedCard,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <View style={styles.allowedHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="add-location-alt" size={15} color="#10B981" />
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Intermediate Stopovers
              </Text>
              <View style={[styles.countBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.countBadgeText, { color: '#059669' }]}>
                  {form.stopovers.length} {form.stopovers.length === 1 ? 'Stop' : 'Stops'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onEdit(0)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.editAction}
              accessibilityRole="button"
              accessibilityLabel="Edit stopovers"
            >
              <MaterialIcons name="edit" size={13} color={C.primary} />
              <Text style={[styles.editLink, { color: C.primary }]}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.allowedPillRow}>
            {form.stopovers.map((city, idx) => (
              <View
                key={`review-stop-${idx}-${city}`}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: C.surfaceElevated,
                    borderColor: C.surfaceBorderLight,
                  },
                ]}
              >
                <MaterialIcons name="place" size={13} color="#10B981" />
                <Text style={[styles.categoryPillText, { color: C.textPrimary }]}>
                  Stop {idx + 1}: {city}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Allowed Categories Card */}
      {form.allowedCategories && form.allowedCategories.length > 0 ? (
        <View
          style={[
            styles.allowedCard,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          <View style={styles.allowedHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="inventory-2" size={15} color={C.primary} />
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Items You Can Carry
              </Text>
              <View style={[styles.countBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.countBadgeText, { color: C.primary }]}>
                  {form.allowedCategories.length}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onEdit(1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.editAction}
              accessibilityRole="button"
              accessibilityLabel="Edit allowed categories"
            >
              <MaterialIcons name="edit" size={13} color={C.primary} />
              <Text style={[styles.editLink, { color: C.primary }]}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.allowedPillRow}>
            {form.allowedCategories.map((cat) => {
              const iconName = CATEGORY_ICONS[cat] || 'category';
              return (
                <View
                  key={cat}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorderLight,
                    },
                  ]}
                >
                  <MaterialIcons name={iconName} size={13} color={C.primary} />
                  <Text style={[styles.categoryPillText, { color: C.textPrimary }]}>
                    {cat}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Streamlined Trust & Safety Strip */}
      <View
        style={[
          styles.trustBox,
          {
            backgroundColor: C.card,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.trustHeaderRow}>
          <MaterialIcons name="shield" size={16} color={C.primary} />
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
            Trip Guarantees & Protection
          </Text>
        </View>

        <View style={styles.trustItemsList}>
          <View style={styles.trustItemRow}>
            <View style={[styles.trustIconCircle, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="verified-user" size={15} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustItemTitle, { color: C.textPrimary }]}>
                Verified Traveller Profile
              </Text>
              <Text style={[styles.trustItemSubtitle, { color: C.textMuted }]}>
                Senders see your identity trust badge on your listing.
              </Text>
            </View>
          </View>

          <View style={styles.trustItemRow}>
            <View style={[styles.trustIconCircle, { backgroundColor: C.successSubtle }]}>
              <MaterialIcons name="lock" size={15} color={C.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustItemTitle, { color: C.textPrimary }]}>
                Guaranteed Payout
              </Text>
              <Text style={[styles.trustItemSubtitle, { color: C.textMuted }]}>
                Funds deposited automatically upon 6-digit delivery OTP verification.
              </Text>
            </View>
          </View>

          <View style={styles.trustItemRow}>
            <View style={[styles.trustIconCircle, { backgroundColor: C.infoSubtle }]}>
              <MaterialIcons name="forum" size={15} color={C.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustItemTitle, { color: C.textPrimary }]}>
                Direct In-App Chat
              </Text>
              <Text style={[styles.trustItemSubtitle, { color: C.textMuted }]}>
                Confirm package dimensions and coordinate pickup points in real time.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepInner: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl + 20,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginBottom: 2,
    paddingHorizontal: Spacing.xs,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  allowedCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  allowedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editLink: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  allowedPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
  trustBox: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  trustHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustItemsList: {
    gap: Spacing.sm + 2,
  },
  trustItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  trustIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  trustItemTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  trustItemSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
});
