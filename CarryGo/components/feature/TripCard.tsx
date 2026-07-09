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

const vehicleColors: Record<string, string> = {
  bike: '#F59E0B',
  car: '#10B981',
  bus: '#8B5CF6',
  train: '#06B6D4',
  flight: '#3B82F6',
};

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
  showRequestButton?: boolean;
  onRequest?: () => void;
  compact?: boolean;
}

export const TripCard = React.memo(function TripCard({ trip, onPress, showRequestButton, onRequest }: TripCardProps) {
  const { C, S } = useThemeColors();
  const vColor = vehicleColors[trip.vehicleType] || C.primary;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: Motion.cardScale, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springDefault }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`Trip from ${trip.fromCity} to ${trip.toCity} on ${trip.date}, ${trip.availableCapacity}kg available at ${trip.pricePerKg} rupees per kg`}>
      <Animated.View style={[
        styles.card,
        S.sm,
        { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] },
      ]}>
        <LinearGradient
          colors={[vColor + '08', 'transparent']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.inner}>
          {/* Route visualization */}
          <View style={styles.routeRow}>
            <View style={styles.routeLeft}>
              <View style={styles.routeDots}>
                <View style={[styles.dotOuter, { borderColor: C.success + '60' }]}>
                  <View style={[styles.dotInner, { backgroundColor: C.success }]} />
                </View>
                <View style={[styles.routeLineV, { backgroundColor: C.surfaceBorderLight }]} />
                <View style={[styles.dotOuter, { borderColor: C.error + '60' }]}>
                  <View style={[styles.dotInner, { backgroundColor: C.error }]} />
                </View>
              </View>
              <View style={styles.citiesCol}>
                <View style={styles.cityRow}>
                  <Text style={[styles.cityText, { color: C.textPrimary }]}>{trip.fromCity}</Text>
                </View>
                <View style={styles.cityRow}>
                  <Text style={[styles.cityText, { color: C.textPrimary }]}>{trip.toCity}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.vehicleBadge, { backgroundColor: vColor + '14', borderColor: vColor + '30' }]}>
              <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={18} color={vColor} />
            </View>
          </View>

          {/* Info chips row */}
          <View style={styles.chipRow}>
            <View style={[styles.infoChip, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
              <Text style={[styles.chipText, { color: C.textSecondary }]}>{trip.date}</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="time-outline" size={12} color={C.textMuted} />
              <Text style={[styles.chipText, { color: C.textSecondary }]}>{trip.time}</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="scale" size={12} color={C.textMuted} />
              <Text style={[styles.chipText, { color: C.textSecondary }]}>{trip.availableCapacity}kg</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.travellerRow}>
              <View style={[styles.avatar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' }]}>
                <Text style={[styles.avatarText, { color: C.primary }]}>{trip.userName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={[styles.travellerName, { color: C.textPrimary }]}>{trip.userName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color={C.warning} />
                  <Text style={[styles.ratingText, { color: C.textMuted }]}>{trip.userRating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.priceBlock, { backgroundColor: C.primarySubtle, borderColor: C.primary + '25' }]}>
              <Text style={[styles.priceSymbol, { color: C.primary }]}>₹</Text>
              <Text style={[styles.price, { color: C.primary }]}>{trip.pricePerKg}</Text>
              <Text style={[styles.priceLabel, { color: C.primary + '90' }]}>/kg</Text>
            </View>
          </View>

          {showRequestButton ? (
            <Pressable
              style={({ pressed: p }) => [styles.requestBtn, { backgroundColor: C.primary }, p && { backgroundColor: C.primaryDark, transform: [{ scale: 0.98 }] }]}
              onPress={onRequest}
              accessibilityRole="button"
              accessibilityLabel="Send delivery request"
            >
              <LinearGradient colors={[C.primary, C.primaryDark]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <MaterialIcons name="send" size={15} color="#fff" />
              <Text style={styles.requestBtnText}>Send Request</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  inner: { padding: Spacing.md, gap: Spacing.md },

  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  routeDots: { alignItems: 'center', gap: 0, height: 52, justifyContent: 'space-between' },
  dotOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 6, height: 6, borderRadius: 3 },
  routeLineV: { width: 1.5, flex: 1, marginVertical: 2, borderRadius: 1 },
  citiesCol: { flex: 1, justifyContent: 'space-between', height: 52 },
  cityRow: { justifyContent: 'center' },
  cityText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  vehicleBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm + 2, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: FontSize.xs },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  travellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  travellerName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  ratingText: { fontSize: FontSize.xs },

  priceBlock: {
    flexDirection: 'row', alignItems: 'baseline', gap: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  priceSymbol: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  price: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  priceLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: BorderRadius.md, paddingVertical: Spacing.sm + 4,
    overflow: 'hidden',
  },
  requestBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
