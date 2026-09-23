import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Trip, Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion, LetterSpacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const vehicleConfig: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string; border: string }> = {
  bike: { icon: 'two-wheeler', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  car: { icon: 'directions-car', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  bus: { icon: 'directions-bus', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  train: { icon: 'train', color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' },
  flight: { icon: 'flight', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
};

interface TripCardProps {
  trip: Trip;
  matchScore?: number;
  onMatchPress?: () => void;
  onPress?: () => void;
  showRequestButton?: boolean;
  onRequest?: () => void;
  compact?: boolean;
  isOwner?: boolean;
  existingRequest?: Request | null;
  onTrackDelivery?: (requestId: string) => void;
  onViewRequest?: (requestId: string) => void;
}

export const TripCard = React.memo(function TripCard({
  trip,
  matchScore,
  onMatchPress,
  onPress,
  showRequestButton,
  onRequest,
  isOwner,
  existingRequest,
  onTrackDelivery,
  onViewRequest,
}: TripCardProps) {
  const { C, S } = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  if (!trip) return null;

  const vehicleTypeKey = (trip.vehicleType || 'car').toLowerCase();
  const vMeta = vehicleConfig[vehicleTypeKey] || vehicleConfig.car;
  const vehicleLabel = (trip.vehicleType || 'CAR').toUpperCase();

  const rawName = trip.userName || 'User';
  const userName = rawName.trim();
  const avatarLetter = (userName.charAt(0) || 'U').toUpperCase();

  const hasRating = typeof trip.userRating === 'number' && !isNaN(trip.userRating) && trip.userRating > 0;
  const userRating = hasRating ? trip.userRating : 0;

  const fromCity = trip.fromCity || 'Origin';
  const toCity = trip.toCity || 'Destination';
  const availableCapacity = typeof trip.availableCapacity === 'number' ? trip.availableCapacity : 0;
  const pricePerKg = typeof trip.pricePerKg === 'number' ? trip.pricePerKg : 0;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md }}
    >
      <Animated.View
        style={[
          styles.card,
          S.card,
          {
            backgroundColor: C.card,
            borderColor: isOwner ? C.primaryBorder : C.surfaceBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.userSection}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1 }
              ]}
            >
              <Text style={[styles.avatarLetter, { color: C.primary }]}>
                {avatarLetter}
              </Text>
            </View>
            <View style={styles.userMeta}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>
                  {isOwner ? 'You' : userName}
                </Text>
                {isOwner ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                    <MaterialIcons name="person" size={10} color={C.primary} style={{ marginRight: 2 }} />
                    <Text style={[styles.ownerBadgeText, { color: C.primary }]}>Your Trip</Text>
                  </View>
                ) : existingRequest?.status === 'accepted' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                    <Text style={[styles.ownerBadgeText, { color: C.success }]}>Accepted</Text>
                  </View>
                ) : existingRequest?.status === 'pending' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.warningSubtle, borderColor: C.warningBorder }]}>
                    <Text style={[styles.ownerBadgeText, { color: C.warning }]}>Requested</Text>
                  </View>
                ) : null}
              </View>
              {hasRating ? (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={[styles.ratingText, { color: C.textSecondary }]}>
                    {userRating.toFixed(1)}
                  </Text>
                </View>
              ) : (
                <View style={[styles.newBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <Text style={[styles.newBadgeText, { color: C.textMuted }]}>NEW</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.vehicleChip, { backgroundColor: vMeta.bg, borderColor: vMeta.border }]}>
            <MaterialIcons name={vMeta.icon} size={13} color={vMeta.color} />
            <Text style={[styles.vehicleLabel, { color: vMeta.color }]}>
              {vehicleLabel}
            </Text>
          </View>
        </View>

        <View style={[styles.routeContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={styles.cityBlock}>
            <View style={styles.cityIndicatorRow}>
              <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
            </View>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {fromCity}
            </Text>
          </View>

          <View style={styles.arrowBlock}>
            <View style={[styles.arrowLine, { borderColor: C.surfaceBorder }]} />
            <View style={[styles.arrowIconCircle, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="east" size={13} color={C.primary} />
            </View>
          </View>

          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <View style={[styles.cityIndicatorRow, { justifyContent: 'flex-end' }]}>
              <Text style={[styles.cityLabel, { color: C.textMuted }]}>TO</Text>
              <MaterialIcons name="place" size={11} color={C.primary} style={{ marginLeft: 2 }} />
            </View>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {toCity}
            </Text>
          </View>
        </View>

        <View style={styles.specsRow}>
          <View style={[styles.specItem, { backgroundColor: C.surfaceElevated }]}>
            <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
            <Text style={[styles.specText, { color: C.textSecondary }]}>{trip.date}</Text>
          </View>

          <View style={[styles.specItem, { backgroundColor: C.surfaceElevated }]}>
            <Ionicons name="time-outline" size={12} color={C.textSecondary} />
            <Text style={[styles.specText, { color: C.textSecondary }]}>{trip.time}</Text>
          </View>

          <View style={[styles.specItem, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="scale" size={12} color={C.textSecondary} />
            <Text style={[styles.specText, { color: C.textSecondary }]}>
              {availableCapacity} kg
            </Text>
          </View>

          {typeof matchScore === 'number' && (
            <Pressable
              style={[styles.specItem, styles.matchItem, { backgroundColor: C.primarySubtle }]}
              onPress={onMatchPress}
              disabled={!onMatchPress}
            >
              <MaterialIcons name="auto-awesome" size={12} color={C.primary} />
              <Text style={[styles.specText, { color: C.primary, fontWeight: FontWeight.bold }]}>
                {matchScore}% match
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.footerRow, { borderTopColor: C.surfaceBorderLight }]}>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: C.textMuted }]}>PRICE</Text>
            <View style={styles.priceValueRow}>
              <Text style={[styles.priceAmount, { color: C.primary }]}>
                ₹{pricePerKg}
              </Text>
              <Text style={[styles.priceUnit, { color: C.textMuted }]}>/kg</Text>
            </View>
          </View>

          {isOwner ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder, borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onPress}
            >
              <MaterialIcons name="tune" size={14} color={C.primary} />
              <Text style={[styles.actionButtonText, { color: C.primary }]}>Manage Trip</Text>
            </Pressable>
          ) : existingRequest?.status === 'accepted' ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onTrackDelivery ? onTrackDelivery(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="radar" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Track Delivery</Text>
            </Pressable>
          ) : existingRequest?.status === 'pending' ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.warningSubtle, borderColor: C.warningBorder, borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onViewRequest ? onViewRequest(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="schedule" size={14} color={C.warning} />
              <Text style={[styles.actionButtonText, { color: C.warning }]}>Request Sent</Text>
            </Pressable>
          ) : existingRequest?.status === 'completed' ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onTrackDelivery ? onTrackDelivery(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="check-circle" size={14} color={C.textSecondary} />
              <Text style={[styles.actionButtonText, { color: C.textSecondary }]}>Completed</Text>
            </Pressable>
          ) : trip.status !== 'active' ? (
            <View style={[styles.closedChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={[styles.closedDot, { backgroundColor: C.textMuted }]} />
              <Text style={[styles.closedText, { color: C.textSecondary }]}>
                {trip.status === 'completed' ? 'Completed' : 'Cancelled'}
              </Text>
            </View>
          ) : showRequestButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onRequest}
            >
              <MaterialIcons name="send" size={13} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Send Request</Text>
            </Pressable>
          ) : (
            <View style={styles.viewDetailsRow}>
              <Text style={[styles.viewDetailsText, { color: C.primary }]}>View Details</Text>
              <MaterialIcons name="chevron-right" size={16} color={C.primary} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  userMeta: {
    gap: 2,
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  userName: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  newBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  vehicleLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  cityBlock: {
    flex: 1,
    gap: 3,
  },
  cityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cityLabel: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  cityName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  arrowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    position: 'relative',
    width: 60,
  },
  arrowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  arrowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 9,
  },
  matchItem: {
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  specText: {
    fontSize: 11.5,
    fontWeight: FontWeight.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceContainer: {
    gap: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceAmount: {
    fontSize: 21,
    fontWeight: FontWeight.extrabold,
    letterSpacing: LetterSpacing.tight,
  },
  priceUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 10.5,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  closedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  closedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  closedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
});
