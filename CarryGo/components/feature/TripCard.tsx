import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const vehicleIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler',
  car: 'directions-car',
  bus: 'directions-bus',
  train: 'train',
  flight: 'flight',
};

const vehicleColors: Record<string, [string, string]> = {
  bike: ['#D97706', '#B45309'],
  car: ['#2563EB', '#1D4ED8'],
  bus: ['#7C3AED', '#6D28D9'],
  train: ['#0F766E', '#0D9488'],
  flight: ['#16A34A', '#15803D'],
};

interface TripCardProps {
  trip: Trip;
  matchScore?: number;
  onMatchPress?: () => void;
  onPress?: () => void;
  showRequestButton?: boolean;
  onRequest?: () => void;
  compact?: boolean;
}

export const TripCard = React.memo(function TripCard({
  trip,
  matchScore,
  onMatchPress,
  onPress,
  showRequestButton,
  onRequest,
}: TripCardProps) {
  const { C } = useThemeColors();
  const vGradient = vehicleColors[trip.vehicleType] || ['#059669', '#064E3B'];
  const vColor = vGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, ...Motion.springFast }).start();
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
          {
            backgroundColor: C.surface,
            borderColor: C.surfaceBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.userSection}>
            <LinearGradient
              colors={vGradient}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarLetter}>
                {trip.userName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.userMeta}>
              <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>
                {trip.userName}
              </Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={[styles.ratingText, { color: C.textSecondary }]}>
                  {trip.userRating.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.vehicleChip, { backgroundColor: vColor + '12', borderColor: vColor + '28' }]}>
            <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={13} color={vColor} />
            <Text style={[styles.vehicleLabel, { color: vColor }]}>
              {trip.vehicleType.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.cityBlock}>
            <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.fromCity}
            </Text>
          </View>

          <View style={styles.arrowBlock}>
            <View style={[styles.arrowLine, { borderColor: C.surfaceBorder }]} />
            <View style={[styles.arrowIconCircle, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="arrow-forward" size={13} color={C.primary} />
            </View>
          </View>

          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.cityLabel, { color: C.textMuted }]}>TO</Text>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {trip.toCity}
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
              {trip.availableCapacity} kg
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
              <Text style={[styles.priceAmount, { color: C.primaryDark }]}>
                ₹{trip.pricePerKg}
              </Text>
              <Text style={[styles.priceUnit, { color: C.textMuted }]}>/kg</Text>
            </View>
          </View>

          {showRequestButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primaryDark },
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
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  userMeta: {
    gap: 2,
  },
  userName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
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
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  vehicleLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cityBlock: {
    flex: 1,
    gap: 2,
  },
  cityLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  cityName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  matchItem: {
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  specText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceContainer: {
    gap: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
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
    paddingVertical: 10,
    borderRadius: 10,
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
});
