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
  bike: ['#F59E0B', '#D97706'],
  car: ['#10B981', '#059669'],
  bus: ['#8B5CF6', '#7C3AED'],
  train: ['#06B6D4', '#0891B2'],
  flight: ['#3B82F6', '#2563EB'],
};

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
  showRequestButton?: boolean;
  onRequest?: () => void;
  compact?: boolean;
}

export const TripCard = React.memo(function TripCard({ trip, onPress, showRequestButton, onRequest }: TripCardProps) {
  const { C, isDark } = useThemeColors();
  const vGradient = vehicleColors[trip.vehicleType] || ['#7C3AED', '#6D28D9'];
  const vColor = vGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md }}>
      <Animated.View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
        {/* Hero gradient header */}
        <LinearGradient
          colors={isDark ? [vGradient[0] + '20', vGradient[1] + '05'] : [vGradient[0] + '12', vGradient[1] + '03']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Vehicle badge - top right */}
        <View style={[styles.vehicleBadge, { backgroundColor: vColor + '18' }]}>
          <LinearGradient colors={vGradient} style={styles.vehicleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={18} color="#fff" />
        </View>

        <View style={styles.inner}>
          {/* Route - big and bold */}
          <View style={styles.routeSection}>
            <View style={styles.routeVisual}>
              <View style={[styles.originDot, { backgroundColor: '#10B981' }]} />
              <View style={[styles.routeDash, { borderColor: C.surfaceBorderLight }]} />
              <View style={[styles.destDot, { backgroundColor: C.error }]} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.fromCity, { color: C.textPrimary }]} numberOfLines={1}>{trip.fromCity}</Text>
              <Text style={[styles.toCity, { color: C.textPrimary }]} numberOfLines={1}>{trip.toCity}</Text>
            </View>
          </View>

          {/* Chips row */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Ionicons name="calendar" size={12} color={C.textSecondary} />
              <Text style={[styles.chipLabel, { color: C.textSecondary }]}>{trip.date}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Ionicons name="time" size={12} color={C.textSecondary} />
              <Text style={[styles.chipLabel, { color: C.textSecondary }]}>{trip.time}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: vColor + '12' }]}>
              <MaterialIcons name="scale" size={12} color={vColor} />
              <Text style={[styles.chipLabel, { color: vColor }]}>{trip.availableCapacity}kg</Text>
            </View>
          </View>

          {/* Footer - user + price */}
          <View style={styles.footer}>
            <View style={styles.userRow}>
              <LinearGradient colors={vGradient} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarLetter}>{trip.userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.userName, { color: C.textPrimary }]}>{trip.userName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={[styles.ratingVal, { color: C.textMuted }]}>{trip.userRating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.priceBox]}>
              <LinearGradient colors={isDark ? [C.primary + '25', C.primary + '10'] : [C.primary + '14', C.primary + '06']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={[styles.priceValue, { color: C.primary }]}>
                <Text style={styles.priceCurrency}>₹</Text>{trip.pricePerKg}
              </Text>
              <Text style={[styles.priceUnit, { color: C.primary + '88' }]}>/kg</Text>
            </View>
          </View>

          {showRequestButton && (
            <Pressable
              style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={onRequest}
            >
              <LinearGradient colors={vGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
              <MaterialIcons name="send" size={15} color="#fff" />
              <Text style={styles.requestBtnText}>Send Request</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80,
  },
  vehicleBadge: {
    position: 'absolute', top: Spacing.md, right: Spacing.md,
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  vehicleGradient: { ...StyleSheet.absoluteFillObject },

  inner: { padding: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.md },

  // Route
  routeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingRight: 48 },
  routeVisual: { alignItems: 'center', height: 50, justifyContent: 'space-between' },
  originDot: { width: 10, height: 10, borderRadius: 5 },
  routeDash: { height: 22, width: 0, borderLeftWidth: 2, borderStyle: 'dashed' },
  destDot: { width: 10, height: 10, borderRadius: 3 },
  routeText: { flex: 1, height: 50, justifyContent: 'space-between' },
  fromCity: { fontSize: 17, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },
  toCity: { fontSize: 17, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarGradient: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  userName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingVal: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  priceBox: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: 14, overflow: 'hidden',
  },
  priceCurrency: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  priceValue: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  priceUnit: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, overflow: 'hidden',
  },
  requestBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
