import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import type { Trip } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  getRouteTimelineMeta,
  formatBlaBlaPrice,
} from './matching/blaBlaHelpers';

const VEHICLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

export interface BlaBlaTripCardProps {
  trip: Trip;
  price?: number;
  onPress?: () => void;
  showLightning?: boolean;
  showAcUnit?: boolean;
  testID?: string;
}

export const BlaBlaTripCard = React.memo(function BlaBlaTripCard({
  trip,
  price,
  onPress,
  showLightning = true,
  showAcUnit,
  testID,
}: BlaBlaTripCardProps) {
  const { C, isDark } = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const timeline = getRouteTimelineMeta(trip);
  const effectivePrice = typeof price === 'number' && price > 0 ? price : (trip.pricePerKg * 2 || 180);
  const priceMeta = formatBlaBlaPrice(effectivePrice);

  const vehicleIcon = VEHICLE_ICONS[trip.vehicleType?.toLowerCase() || 'car'] || 'directions-car';
  const ratingDisplay = trip.userRating && trip.userRating > 0 ? trip.userRating.toFixed(1) : '5.0';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.985,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 30,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptic.select();
    onPress?.();
  };

  const accessibilityLabel = `Trip by ${trip.userName || 'Traveler'}, departure from ${trip.fromCity} at ${timeline.departureTime}, arrival at ${trip.toCity} at ${timeline.arrivalTime}, duration ${timeline.durationLabel}, price ₹${priceMeta.amount}`;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E6EAF0',
          },
          pressed && { opacity: 0.96 },
        ]}
      >
        {/* ── Top Section: Timeline & Route & Price ── */}
        <View style={styles.topSection}>
          {/* Time column + duration */}
          <View style={styles.timesCol}>
            <Text style={[styles.timeText, { color: C.textPrimary }]}>
              {timeline.departureTime}
            </Text>
            <Text style={[styles.durationText, { color: C.textMuted }]}>
              {timeline.durationLabel}
            </Text>
            <Text style={[styles.timeText, { color: C.textPrimary }]}>
              {timeline.arrivalTime}
            </Text>
          </View>

          {/* Vertical route line */}
          <View style={styles.timelineAxis}>
            <View style={[styles.timelineRing, { borderColor: isDark ? '#94A3B8' : '#334155' }]} />
            <View style={[styles.timelineTrack, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />
            <View style={[styles.timelineRing, { borderColor: isDark ? '#94A3B8' : '#334155' }]} />
          </View>

          {/* Cities column */}
          <View style={styles.citiesCol}>
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.fromCity}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.toCity}
            </Text>
          </View>

          {/* Price block */}
          <View style={styles.priceContainer}>
            <Text style={[styles.priceCurrency, { color: C.textPrimary }]}>₹ </Text>
            <Text style={[styles.priceAmount, { color: C.textPrimary }]}>{priceMeta.amount}</Text>
            <Text style={[styles.priceDecimal, { color: C.textPrimary }]}>{priceMeta.decimal}</Text>
          </View>
        </View>

        {/* ── Subtle Hairline Divider ── */}
        <View style={[styles.hairline, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]} />

        {/* ── Bottom Section: Traveler Info & Indicators ── */}
        <View style={styles.bottomSection}>
          <View style={styles.travelerRow}>
            {/* Mode of travel icon */}
            <View style={styles.vehicleIconWrap}>
              <MaterialIcons name={vehicleIcon} size={18} color={C.textMuted} />
            </View>

            {/* Avatar with verified badge */}
            <View style={styles.avatarWrap}>
              {trip.userAvatar ? (
                <Image
                  source={{ uri: trip.userAvatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={[styles.avatarInitials, { color: C.textPrimary }]}>
                    {(trip.userName || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Verified checkmark badge */}
              <View style={[styles.verifiedBadge, { backgroundColor: '#2563EB', borderColor: C.surface }]}>
                <MaterialIcons name="check" size={9} color="#FFFFFF" />
              </View>
            </View>

            {/* Traveler name & rating */}
            <View style={styles.travelerMeta}>
              <Text style={[styles.travelerName, { color: C.textPrimary }]} numberOfLines={1}>
                {trip.userName || 'Verified Traveler'}
              </Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={13} color="#F59E0B" style={styles.starIcon} />
                <Text style={[styles.ratingText, { color: C.textSecondary }]}>
                  {ratingDisplay}
                </Text>
              </View>
            </View>
          </View>

          {/* Right feature indicators (lightning / ac) */}
          <View style={styles.indicatorsRow}>
            {showLightning ? (
              <View style={styles.indicatorIconWrap}>
                <MaterialIcons name="bolt" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </View>
            ) : null}
            {showAcUnit || trip.vehicleType === 'car' ? (
              <View style={styles.indicatorIconWrap}>
                <MaterialIcons name="ac-unit" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
  },
  timesCol: {
    width: 52,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  timeText: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  durationText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginVertical: 4,
  },
  timelineAxis: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginHorizontal: 6,
  },
  timelineRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  timelineTrack: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  citiesCol: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingLeft: 4,
  },
  cityText: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingLeft: Spacing.sm,
    paddingTop: 1,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  priceDecimal: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  hairline: {
    height: 1,
    marginTop: 14,
    marginBottom: 12,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  travelerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  vehicleIconWrap: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  verifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerMeta: {
    flex: 1,
  },
  travelerName: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  starIcon: {
    marginRight: 3,
  },
  ratingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indicatorIconWrap: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
