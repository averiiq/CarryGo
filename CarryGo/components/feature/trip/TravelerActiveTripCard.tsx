import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Trip, Request, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { resolveImageUrl, getCategoryFallbackImage } from '@/constants/images';
import Svg, { Circle } from 'react-native-svg';

const VEHICLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

export interface TravelerActiveTripCardProps {
  trip: Trip;
  requests: Request[];
  parcels?: Parcel[];
  onPress: () => void;
  onUpdateStatus: (trip: Trip, acceptedRequests: Request[]) => void;
  onFindParcels?: (trip: Trip) => void;
  onChatWithSender?: (req: Request) => void;
  onCancelTrip?: (trip: Trip) => void;
  testID?: string;
}

export function TravelerActiveTripCard({
  trip,
  requests,
  parcels = [],
  onPress,
  onUpdateStatus,
  onFindParcels,
  onChatWithSender,
  onCancelTrip,
  testID,
}: TravelerActiveTripCardProps) {
  const { C, S } = useThemeColors();

  const totalCapacity = Number(trip.availableCapacity) || 0;

  // 1. Filter accepted or completed requests for this specific trip
  const acceptedRequests = useMemo(() => {
    return requests.filter(
      (r) => r.tripId === trip.id && (r.status === 'accepted' || r.status === 'completed')
    );
  }, [requests, trip.id]);

  // 2. Data Logic: Dynamically calculate filled capacity by summing parcel weights
  const filledWeight = useMemo(() => {
    return acceptedRequests.reduce((sum, req) => {
      const parcelObj = parcels.find((p) => p.id === req.parcelId);
      const weight = req.parcelWeight ?? parcelObj?.weight ?? 0;
      return sum + Number(weight);
    }, 0);
  }, [acceptedRequests, parcels]);

  // 3. Data Logic: Remaining capacity subtracting accepted parcels from total trip capacity
  const remainingCapacity = Math.max(0, totalCapacity - filledWeight);

  // 4. Fill percentage
  const fillPercentage =
    totalCapacity > 0 ? Math.min(100, Math.round((filledWeight / totalCapacity) * 100)) : 0;

  // Earnings calculation for this trip
  const totalEarned = useMemo(() => {
    return acceptedRequests.reduce((sum, req) => sum + Number(req.price || 0), 0);
  }, [acceptedRequests]);

  const vehicleIcon = VEHICLE_ICONS[trip.vehicleType?.toLowerCase() || 'car'] || 'directions-car';

  const handleUpdateStatusPress = () => {
    Haptic.confirm();
    onUpdateStatus(trip, acceptedRequests);
  };

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        S.card,
        {
          backgroundColor: C.card,
          borderColor: C.surfaceBorder,
        },
      ]}
    >
      {/* Top Header: Vehicle icon, Route, Departure Date & Status Pill */}
      <Pressable style={styles.headerPressable} onPress={onPress}>
        <View style={styles.topRow}>
          <View style={[styles.vehicleIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <MaterialIcons name={vehicleIcon} size={20} color="#10B981" />
          </View>

          <View style={styles.routeCol}>
            <View style={styles.routeTitleRow}>
              <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
                {trip.fromCity}
              </Text>
              <MaterialIcons name="arrow-forward" size={14} color="#10B981" />
              <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
                {trip.toCity}
              </Text>
            </View>

            <Text style={[styles.scheduleText, { color: C.textMuted }]}>
              {trip.date} • {trip.time}
              {trip.stopovers && trip.stopovers.length > 0
                ? ` • +${trip.stopovers.length} stopover${trip.stopovers.length > 1 ? 's' : ''}`
                : ''}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: '#ECFDF5' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusPillText}>
              {trip.status === 'active' ? 'ACTIVE' : trip.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Capacity Progress Section (Ring Chart + Dynamic Progress Bar) */}
      <View
        style={[
          styles.capacityBox,
          {
            backgroundColor: C.surfaceElevated,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.capacityBodyRow}>
          {/* Visual Ring Chart */}
          <View style={styles.ringChartWrap}>
            <Svg width={54} height={54} viewBox="0 0 54 54">
              <Circle
                cx={27}
                cy={27}
                r={21}
                stroke={C.surfaceBorder}
                strokeWidth={5}
                fill="none"
              />
              <Circle
                cx={27}
                cy={27}
                r={21}
                stroke={
                  fillPercentage >= 100
                    ? '#EF4444'
                    : fillPercentage >= 85
                      ? '#F59E0B'
                      : '#10B981'
                }
                strokeWidth={5}
                fill="none"
                strokeDasharray={`${(2 * Math.PI * 21).toFixed(2)}`}
                strokeDashoffset={`${(2 * Math.PI * 21 * (1 - fillPercentage / 100)).toFixed(2)}`}
                strokeLinecap="round"
                transform="rotate(-90 27 27)"
              />
            </Svg>
            <View style={styles.ringCenterTextWrap}>
              <Text style={[styles.ringPercentText, { color: C.textPrimary }]}>
                {fillPercentage}%
              </Text>
            </View>
          </View>

          {/* Right Column: Values & Progress Bar */}
          <View style={styles.capacityDetailsCol}>
            <View style={styles.capacityHeaderRow}>
              <View style={styles.capacityLabelRow}>
                <MaterialIcons name="fitness-center" size={12} color="#10B981" />
                <Text style={[styles.capacityTitle, { color: C.textMuted }]}>
                  CAPACITY FILLED
                </Text>
              </View>

              <Text style={[styles.capacityValueText, { color: C.textPrimary }]}>
                <Text
                  style={[
                    styles.capacityBoldAmount,
                    { color: fillPercentage >= 90 ? '#D97706' : '#10B981' },
                  ]}
                >
                  {filledWeight.toFixed(1)} kg
                </Text>
                {' '}/ {totalCapacity} kg
              </Text>
            </View>

            {/* Visual Progress Bar strictly matching index.styles.ts */}
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceBorder }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${fillPercentage}%`,
                    backgroundColor:
                      fillPercentage >= 100
                        ? '#EF4444'
                        : fillPercentage >= 85
                          ? '#F59E0B'
                          : '#10B981',
                  },
                ]}
              />
            </View>

            {/* Remaining Space Footnote */}
            <View style={styles.capacityFootnoteRow}>
              <MaterialIcons
                name={remainingCapacity > 0 ? 'check-circle' : 'warning'}
                size={12}
                color={remainingCapacity > 0 ? '#10B981' : '#F59E0B'}
              />
              <Text style={[styles.capacityFootnote, { color: C.textSecondary }]}>
                {remainingCapacity > 0
                  ? `${remainingCapacity.toFixed(1)} kg remaining space available`
                  : 'Trip capacity is fully booked!'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Accepted Parcels List */}
      <View style={styles.acceptedSection}>
        <View style={styles.acceptedHeaderRow}>
          <Text style={[styles.acceptedHeading, { color: C.textPrimary }]}>
            Accepted Parcels ({acceptedRequests.length})
          </Text>
          {remainingCapacity > 0 && onFindParcels ? (
            <Pressable
              style={styles.findMorePill}
              onPress={() => {
                Haptic.tap();
                onFindParcels(trip);
              }}
              hitSlop={8}
            >
              <MaterialIcons name="add" size={13} color="#10B981" />
              <Text style={styles.findMorePillText}>Fill Remaining</Text>
            </Pressable>
          ) : null}
        </View>

        {acceptedRequests.length === 0 ? (
          <View
            style={[
              styles.emptyAcceptedBox,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
              },
            ]}
          >
            <MaterialIcons name="inventory-2" size={24} color={C.textMuted} />
            <Text style={[styles.emptyAcceptedTitle, { color: C.textPrimary }]}>
              No parcels accepted yet
            </Text>
            <Text style={[styles.emptyAcceptedSub, { color: C.textMuted }]}>
              Accept parcel requests on this route to earn money and fill your {remainingCapacity} kg capacity.
            </Text>
            {onFindParcels ? (
              <Pressable
                style={[styles.findParcelsBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  Haptic.confirm();
                  onFindParcels(trip);
                }}
              >
                <MaterialIcons name="search" size={15} color="#FFFFFF" />
                <Text style={styles.findParcelsBtnText}>Find Parcels to Carry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.acceptedList}>
            {acceptedRequests.map((req) => {
              const parcelObj = parcels.find((p) => p.id === req.parcelId);
              const weight = req.parcelWeight ?? parcelObj?.weight ?? 0;
              const category = req.parcelCategory || parcelObj?.category || 'documents';
              const rawPhoto = parcelObj?.imageUri || parcelObj?.imageUris?.[0];
              const photoUrl = resolveImageUrl(rawPhoto);
              const fallbackImg = getCategoryFallbackImage(category);

              return (
                <View
                  key={req.id}
                  style={[
                    styles.parcelItemCard,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: C.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.parcelThumbnailWrap}>
                    <Image
                      source={photoUrl ? { uri: photoUrl } : fallbackImg}
                      style={styles.parcelThumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.parcelWeightPill}>
                      <Text style={styles.parcelWeightText}>{weight} kg</Text>
                    </View>
                  </View>

                  <View style={styles.parcelInfoCol}>
                    <Text
                      style={[styles.parcelTitle, { color: C.textPrimary }]}
                      numberOfLines={1}
                    >
                      {parcelObj?.description || `${category.toUpperCase()} Package`}
                    </Text>
                    <Text style={[styles.parcelSenderText, { color: C.textMuted }]}>
                      Sender: {req.senderName || 'Verified Sender'}
                    </Text>
                    <View style={styles.parcelStatusRow}>
                      <View style={[styles.parcelStatusDot, { backgroundColor: '#10B981' }]} />
                      <Text style={[styles.parcelStatusText, { color: '#064E3B' }]}>
                        {req.status === 'completed' ? 'Delivered' : 'Ready for Handover'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.parcelRewardCol}>
                    <Text style={[styles.agreedRewardAmount, { color: '#064E3B' }]}>
                      ₹{req.price}
                    </Text>
                    <Text style={[styles.agreedRewardLabel, { color: C.textMuted }]}>
                      REWARD
                    </Text>

                    {onChatWithSender ? (
                      <Pressable
                        style={[
                          styles.itemChatBtn,
                          { backgroundColor: C.card, borderColor: C.surfaceBorder },
                        ]}
                        onPress={() => {
                          Haptic.tap();
                          onChatWithSender(req);
                        }}
                        hitSlop={6}
                      >
                        <Ionicons name="chatbubble-outline" size={13} color="#10B981" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Footer Actions: Update Status / Journey Button strictly matching index.styles.ts */}
      <View style={[styles.footerRow, { borderTopColor: C.surfaceBorder }]}>
        <View style={styles.earningsSummaryCol}>
          <Text style={[styles.earningsLabel, { color: C.textMuted }]}>
            TOTAL EARNINGS
          </Text>
          <Text style={[styles.earningsVal, { color: '#064E3B' }]}>
            ₹{totalEarned}
          </Text>
        </View>

        {/* Primary Green Action Button: Update Status / Journey (Transition into Phase 5) */}
        <Pressable
          style={[styles.statusUpdateBtn, { backgroundColor: '#10B981' }]}
          onPress={handleUpdateStatusPress}
          accessibilityRole="button"
          accessibilityLabel="Update status and journey"
        >
          <MaterialIcons name="navigation" size={16} color="#FFFFFF" />
          <Text style={styles.statusUpdateBtnText}>Update Status / Journey</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl, // 24 from index.styles.ts
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerPressable: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCol: {
    flex: 1,
    gap: 3,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  scheduleText: {
    fontSize: FontSize.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    color: '#064E3B',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },

  // Capacity visual
  capacityBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  capacityBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ringChartWrap: {
    width: 54,
    height: 54,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentText: {
    fontSize: 11,
    fontWeight: FontWeight.extrabold,
  },
  capacityDetailsCol: {
    flex: 1,
    gap: 8,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  capacityTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  capacityValueText: {
    fontSize: FontSize.xs,
  },
  capacityBoldAmount: {
    fontWeight: FontWeight.extrabold,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityFootnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  capacityFootnote: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },

  // Accepted parcels section
  acceptedSection: {
    gap: Spacing.sm,
  },
  acceptedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acceptedHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  findMorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  findMorePillText: {
    color: '#10B981',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  emptyAcceptedBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  emptyAcceptedTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  emptyAcceptedSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  findParcelsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  findParcelsBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Accepted list
  acceptedList: {
    gap: 8,
  },
  parcelItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  parcelThumbnailWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  parcelThumbnail: {
    width: '100%',
    height: '100%',
  },
  parcelWeightPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  parcelWeightText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: FontWeight.bold,
  },
  parcelInfoCol: {
    flex: 1,
    gap: 2,
  },
  parcelTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  parcelSenderText: {
    fontSize: 10,
  },
  parcelStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  parcelStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  parcelStatusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  parcelRewardCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  agreedRewardAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  agreedRewardLabel: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  itemChatBtn: {
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  earningsSummaryCol: {
    gap: 1,
  },
  earningsLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  earningsVal: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },

  // Green Action Button strictly matching index.styles.ts
  statusUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusUpdateBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
