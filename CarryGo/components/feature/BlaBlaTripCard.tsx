import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import type { Trip } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { useResponsive } from '@/hooks/useResponsive';
import {
  getRouteTimelineMeta,
  formatBlaBlaPrice,
} from './matching/blaBlaHelpers';
import { resolveImageUrl, getUserAvatarSource, DEFAULT_AVATAR_ASSET } from '@/constants/images';

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
  currentUserAvatar?: string;
  isOwner?: boolean;
  onPress?: () => void;
  showLightning?: boolean;
  showAcUnit?: boolean;
  testID?: string;
  /** When rendered in a parcel-match context, pass the sub-segment the parcel matched on. Surfaces a "picks up in X" hint. */
  matchedSegment?: { from: string; to: string; viaStopover: boolean };
}

export const BlaBlaTripCard = React.memo(function BlaBlaTripCard({
  trip,
  price,
  currentUserAvatar,
  isOwner = false,
  onPress,
  showLightning = true,
  showAcUnit,
  testID,
  matchedSegment,
}: BlaBlaTripCardProps) {
  const { C, isDark } = useThemeColors();
  const { isSmallDevice } = useResponsive();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [avatarError, setAvatarError] = React.useState(false);

  const rawAvatar =
    (isOwner && currentUserAvatar ? currentUserAvatar : undefined) ||
    trip.userAvatar ||
    (trip as any).avatar ||
    (trip as any).avatar_url ||
    (trip as any).user_avatar ||
    (trip as any).selfieUrl ||
    (trip as any).userSelfieUrl;
  const avatarSource = getUserAvatarSource(rawAvatar, trip.userId || trip.id || trip.userName);

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
          isSmallDevice && { paddingHorizontal: Spacing.sm, paddingVertical: 12 },
          {
            backgroundColor: C.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E6EAF0',
          },
          pressed && { opacity: 0.96 },
        ]}
      >
        {matchedSegment && matchedSegment.viaStopover ? (
          <View style={[styles.matchedSegmentPill, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5', borderColor: isDark ? 'rgba(16,185,129,0.45)' : '#A7F3D0' }]}>
            <View style={styles.matchedSegmentLeft}>
              <MaterialIcons name="alt-route" size={12} color="#059669" />
              <Text style={[styles.matchedSegmentText, { color: isDark ? '#6EE7B7' : '#065F46' }]} numberOfLines={1}>
                Matches: <Text style={{ fontWeight: '700' }}>{matchedSegment.from}</Text> ➔ <Text style={{ fontWeight: '700' }}>{matchedSegment.to}</Text>
              </Text>
            </View>
            <View style={[styles.matchedSegmentBadge, { backgroundColor: isDark ? '#065F46' : '#10B981' }]}>
              <Text style={styles.matchedSegmentBadgeText}>On route</Text>
            </View>
          </View>
        ) : null}

        {/* ── Top Section: Timeline & Route & Price ── */}
        <View style={styles.topSection}>
          {/* Time column + duration */}
          <View style={[styles.timesCol, isSmallDevice && { width: 44 }]}>
            <Text style={[styles.timeText, isSmallDevice && { fontSize: 13 }, { color: C.textPrimary }]}>
              {timeline.departureTime}
            </Text>
            <Text style={[styles.durationText, isSmallDevice && { fontSize: 10 }, { color: C.textMuted }]}>
              {timeline.durationLabel}
            </Text>
            <Text style={[styles.timeText, isSmallDevice && { fontSize: 13 }, { color: C.textPrimary }]}>
              {timeline.arrivalTime}
            </Text>
          </View>

          {/* Vertical route line */}
          <View style={[styles.timelineAxis, isSmallDevice && { marginHorizontal: 3 }]}>
            <View style={[styles.timelineRing, { borderColor: isDark ? '#94A3B8' : '#334155' }]} />
            <View style={[styles.timelineTrack, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}>
              {trip.stopovers && trip.stopovers.length > 0 ? (
                <View style={styles.intermediateDotsWrap}>
                  {trip.stopovers.slice(0, 3).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.intermediateDot,
                        { backgroundColor: matchedSegment?.viaStopover ? '#10B981' : (isDark ? '#94A3B8' : '#64748B') }
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </View>
            <View style={[styles.timelineRing, { borderColor: isDark ? '#94A3B8' : '#334155' }]} />
          </View>

          {/* Cities column */}
          <View style={styles.citiesCol}>
            <Text style={[styles.cityText, isSmallDevice && { fontSize: 14 }, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.fromCity}
            </Text>
            {trip.stopovers && trip.stopovers.length > 0 ? (
              <View style={[styles.viaRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                <MaterialIcons name="add-road" size={10} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.viaText, { color: isDark ? '#CBD5E1' : '#475569' }]} numberOfLines={1}>
                  {trip.stopovers.length} {trip.stopovers.length === 1 ? 'stop' : 'stops'}: {trip.stopovers.slice(0, 2).join(', ')}{trip.stopovers.length > 2 ? ` +${trip.stopovers.length - 2}` : ''}
                </Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Text style={[styles.cityText, isSmallDevice && { fontSize: 14 }, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.toCity}
            </Text>
          </View>

          {/* Price block */}
          <View style={[styles.priceContainer, isSmallDevice && { paddingLeft: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[styles.priceCurrency, isSmallDevice && { fontSize: 14 }, { color: C.textPrimary }]}>₹ </Text>
              <Text style={[styles.priceAmount, isSmallDevice && { fontSize: 19 }, { color: C.textPrimary }]}>{priceMeta.amount}</Text>
              <Text style={[styles.priceDecimal, isSmallDevice && { fontSize: 11 }, { color: C.textPrimary }]}>{priceMeta.decimal}</Text>
            </View>
            {matchedSegment?.viaStopover ? (
              <Text style={[styles.priceSubLabel, { color: isDark ? '#6EE7B7' : '#059669' }]}>leg fare</Text>
            ) : null}
          </View>
        </View>

        {/* ── Subtle Hairline Divider ── */}
        <View style={[styles.hairline, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]} />

        {/* ── Bottom Section: Traveler Info & Indicators ── */}
        <View style={styles.bottomSection}>
          <View style={styles.travelerRow}>
            {/* Avatar with verified badge */}
            <View style={[styles.avatarWrap, isSmallDevice && { marginRight: 8 }]}>
              <Image
                source={avatarError ? DEFAULT_AVATAR_ASSET : avatarSource}
                style={[styles.avatarImage, isSmallDevice && { width: 34, height: 34, borderRadius: 17 }]}
                contentFit="cover"
                transition={200}
                onError={() => setAvatarError(true)}
              />
              {/* Verified checkmark badge */}
              <View style={[styles.verifiedBadge, { backgroundColor: '#10B981', borderColor: C.surface }]}>
                <MaterialIcons name="check" size={9} color="#FFFFFF" />
              </View>
            </View>

            {/* Traveler name & rating */}
            <View style={styles.travelerMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmallDevice ? 4 : 6 }}>
                <Text style={[styles.travelerName, isSmallDevice && { fontSize: 13 }, { color: C.textPrimary }]} numberOfLines={1}>
                  {trip.userName || 'Verified Traveler'}
                </Text>
                <MaterialIcons name={vehicleIcon} size={isSmallDevice ? 13 : 14} color={C.textMuted} />
              </View>
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

        {/* Allowed Categories Pill Strip */}
        {trip.allowedCategories && trip.allowedCategories.length > 0 && (
          <View style={[styles.allowedStrip, { borderTopColor: C.surfaceBorderLight || C.surfaceBorder }]}>
            <MaterialIcons name="inventory-2" size={12} color={C.textMuted} />
            <Text style={[styles.allowedLabel, { color: C.textMuted }]}>CAN CARRY:</Text>
            <View style={styles.allowedBadgesWrap}>
              {trip.allowedCategories.map((cat) => (
                <View
                  key={cat}
                  style={[
                    styles.allowedBadge,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  ]}
                >
                  <Text style={[styles.allowedBadgeText, { color: C.textSecondary }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    ...Shadow.card,
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intermediateDotsWrap: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  intermediateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
  viaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viaText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1,
  },
  matchedSegmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
    maxWidth: '100%',
  },
  matchedSegmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  matchedSegmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  matchedSegmentBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  matchedSegmentText: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: Spacing.sm,
    paddingTop: 1,
  },
  priceSubLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  allowedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  allowedLabel: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  allowedBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  allowedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  allowedBadgeText: {
    fontSize: 9.5,
    fontWeight: FontWeight.semibold,
  },
});
