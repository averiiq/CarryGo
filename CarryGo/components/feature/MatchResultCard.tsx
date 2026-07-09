import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Trip, Parcel } from '@/types';
import { calculateRouteDistance, formatTransitTime, estimateTransitTime } from '@/services/route-intelligence.service';
import { Spacing, BorderRadius, FontSize, FontWeight, Motion } from '@/constants/theme';

interface MatchResultCardProps {
  trip: Trip;
  parcel?: Parcel;
  matchScore?: number; // 0-100
  onSendRequest?: () => void;
  onViewTrip?: () => void;
}

export const MatchResultCard = React.memo(function MatchResultCard({
  trip,
  parcel,
  matchScore = 0,
  onSendRequest,
  onViewTrip,
}: MatchResultCardProps) {
  const { C, S } = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  const distance = calculateRouteDistance(trip.fromCity, trip.toCity);
  const transitTime = estimateTransitTime(trip.fromCity, trip.toCity, trip.vehicleType);

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: Motion.cardScale,
      useNativeDriver: true,
      ...Motion.springFast,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...Motion.springDefault,
    }).start();

  const scoreColor = matchScore >= 80 ? C.success : matchScore >= 50 ? C.warning : C.error;

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onViewTrip}>
      <Animated.View
        style={[
          styles.card,
          S.sm,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] },
        ]}
      >
        <LinearGradient
          colors={[scoreColor + '08', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Match Score Badge */}
        <View style={styles.topRow}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '44' }]}>
            <MaterialIcons name="flash-on" size={14} color={scoreColor} />
            <Text style={[styles.scoreText, { color: scoreColor }]}>{matchScore}% Match</Text>
          </View>

          {/* Date alignment indicator */}
          {parcel && trip.date && (
            <View style={[styles.dateChip, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="event" size={12} color={C.textMuted} />
              <Text style={[styles.dateChipText, { color: C.textMuted }]}>{trip.date}</Text>
            </View>
          )}
        </View>

        {/* Route Visualization */}
        <View style={styles.routeSection}>
          <View style={styles.routeFrom}>
            <View style={[styles.routeDot, { backgroundColor: C.success }]} />
            <Text style={[styles.routeCity, { color: C.textPrimary }]}>{trip.fromCity}</Text>
          </View>
          <View style={styles.routeLineContainer}>
            <View style={[styles.routeLineDash, { borderColor: C.textMuted + '44' }]} />
            {distance && (
              <View style={[styles.distanceBadge, { backgroundColor: C.surfaceElevated }]}>
                <Text style={[styles.distanceText, { color: C.textMuted }]}>{distance} km</Text>
              </View>
            )}
          </View>
          <View style={styles.routeTo}>
            <View style={[styles.routeDot, { backgroundColor: C.error }]} />
            <Text style={[styles.routeCity, { color: C.textPrimary }]}>{trip.toCity}</Text>
          </View>
        </View>

        {/* Price comparison */}
        {parcel && (
          <View style={[styles.priceRow, { borderTopColor: C.surfaceBorder }]}>
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: C.textMuted }]}>Trip price</Text>
              <Text style={[styles.priceValue, { color: C.textPrimary }]}>
                Rs {trip.pricePerKg}/kg
              </Text>
            </View>
            <View style={[styles.priceDivider, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: C.textMuted }]}>Parcel offer</Text>
              <Text style={[styles.priceValue, { color: C.primary }]}>
                Rs {parcel.priceOffer}
              </Text>
            </View>
          </View>
        )}

        {/* Traveller Info */}
        <View style={[styles.travellerRow, { borderTopColor: C.surfaceBorder }]}>
          <View style={[styles.avatar, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>
              {trip.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.travellerInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.travellerName, { color: C.textPrimary }]} numberOfLines={1}>
                {trip.userName}
              </Text>
              {trip.userRating >= 4.5 && (
                <View style={[styles.verifiedBadge, { backgroundColor: C.successSubtle }]}>
                  <MaterialIcons name="verified" size={11} color={C.success} />
                </View>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={12} color={C.warning} />
                <Text style={[styles.statText, { color: C.textMuted }]}>
                  {trip.userRating.toFixed(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="directions-car" size={12} color={C.textMuted} />
                <Text style={[styles.statText, { color: C.textMuted }]}>
                  {trip.vehicleType}
                </Text>
              </View>
              {transitTime && (
                <View style={styles.statItem}>
                  <MaterialIcons name="schedule" size={12} color={C.textMuted} />
                  <Text style={[styles.statText, { color: C.textMuted }]}>
                    {formatTransitTime(transitTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Capacity indicator */}
          <View style={styles.capacityCol}>
            <Text style={[styles.capacityValue, { color: C.textPrimary }]}>
              {trip.availableCapacity}
            </Text>
            <Text style={[styles.capacityLabel, { color: C.textMuted }]}>kg left</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.primaryAction, { backgroundColor: C.primary }]}
            onPress={onSendRequest}
          >
            <Ionicons name="send" size={14} color="#fff" />
            <Text style={styles.primaryActionText}>Send Request</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.secondaryAction, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
            onPress={onViewTrip}
          >
            <MaterialIcons name="visibility" size={14} color={C.textSecondary} />
            <Text style={[styles.secondaryActionText, { color: C.textSecondary }]}>View Trip</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  dateChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  // Route visualization
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  routeFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeCity: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  routeLineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLineDash: {
    width: '100%',
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
  },
  distanceBadge: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },

  // Price comparison
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  priceLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  priceValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  priceDivider: {
    width: 1,
    height: 30,
  },

  // Traveller info
  travellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  travellerInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  travellerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  capacityCol: {
    alignItems: 'center',
  },
  capacityValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  capacityLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  primaryAction: {},
  primaryActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  secondaryAction: {
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
