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
  bike: ['#64748B', '#475569'],
  car: ['#4B5563', '#374151'],
  bus: ['#6B7280', '#4B5563'],
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

export const TripCard = React.memo(function TripCard({ trip, matchScore, onMatchPress, onPress, showRequestButton, onRequest }: TripCardProps) {
  const { C } = useThemeColors();
  const vGradient = vehicleColors[trip.vehicleType] || ['#4B5563', '#374151'];
  const vColor = vGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
      <Animated.View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
        <LinearGradient
          colors={[vGradient[0] + '16', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={[styles.vehicleBadge, { backgroundColor: vColor + '18' }]}>
          <LinearGradient colors={vGradient} style={styles.vehicleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <MaterialIcons name={vehicleIcons[trip.vehicleType] || 'directions-car'} size={18} color={C.textInverse} />
        </View>

        <View style={styles.inner}>
          <View style={styles.routeSection}>
            <View style={styles.routeVisual}>
              <View style={[styles.originDot, { backgroundColor: C.success }]} />
              <View style={[styles.routeDash, { borderColor: C.surfaceBorderLight }]} />
              <View style={[styles.destDot, { backgroundColor: C.error }]} />
            </View>
            <View style={styles.routeText}>
              <Text style={[styles.fromCity, { color: C.textPrimary }]} numberOfLines={1}>{trip.fromCity}</Text>
              <Text style={[styles.toCity, { color: C.textPrimary }]} numberOfLines={1}>{trip.toCity}</Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {typeof matchScore === 'number' && (
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  styles.matchChip,
                  { backgroundColor: C.primary + '12' },
                  pressed && onMatchPress ? { opacity: 0.8 } : null,
                ]}
                onPress={onMatchPress}
                disabled={!onMatchPress}
              >
                <MaterialIcons name={'auto-awesome'} size={12} color={C.primary} />
                <Text style={[styles.chipLabel, { color: C.primary }]}>{matchScore}% match</Text>
                <MaterialIcons name={'info-outline'} size={12} color={C.primary} />
              </Pressable>
            )}
            <View style={[styles.chip, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="calendar" size={12} color={C.textSecondary} />
              <Text style={[styles.chipLabel, { color: C.textSecondary }]}>{trip.date}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="time" size={12} color={C.textSecondary} />
              <Text style={[styles.chipLabel, { color: C.textSecondary }]}>{trip.time}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: vColor + '12' }]}>
              <MaterialIcons name="scale" size={12} color={vColor} />
              <Text style={[styles.chipLabel, { color: vColor }]}>{trip.availableCapacity}kg</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.userRow}>
              <LinearGradient colors={vGradient} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarLetter}>{trip.userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.userName, { color: C.textPrimary }]}>{trip.userName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color={C.warning} />
                  <Text style={[styles.ratingVal, { color: C.textMuted }]}>{trip.userRating.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.priceBox}>
              <LinearGradient colors={[C.successSubtle, C.primarySubtle]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={[styles.priceValue, { color: C.success }]}> 
                <Text style={styles.priceCurrency}>Rs </Text>{trip.pricePerKg}
              </Text>
              <Text style={[styles.priceUnit, { color: C.success + 'CC' }]}>/kg</Text>
            </View>
          </View>

          {showRequestButton && (
            <Pressable
              style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={onRequest}
            >
              <LinearGradient colors={[C.primary, C.primaryDark]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
              <MaterialIcons name="send" size={15} color={C.textInverse} />
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  headerGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80,
  },
  vehicleBadge: {
    position: 'absolute', top: Spacing.smd, right: Spacing.smd,
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  vehicleGradient: { ...StyleSheet.absoluteFillObject },

  inner: { padding: Spacing.mdl, paddingTop: Spacing.md, gap: Spacing.md },

  routeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingRight: 48 },
  routeVisual: { alignItems: 'center', height: 50, justifyContent: 'space-between' },
  originDot: { width: 10, height: 10, borderRadius: 5 },
  routeDash: { height: 22, width: 0, borderLeftWidth: 2, borderStyle: 'dashed' },
  destDot: { width: 10, height: 10, borderRadius: 3 },
  routeText: { flex: 1, height: 50, justifyContent: 'space-between' },
  fromCity: { fontSize: 16, fontWeight: FontWeight.extrabold, letterSpacing: -0.25 },
  toCity: { fontSize: 16, fontWeight: FontWeight.extrabold, letterSpacing: -0.25 },

  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  matchChip: { borderWidth: 1, borderColor: 'transparent' },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

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
    borderRadius: 12, overflow: 'hidden',
  },
  priceCurrency: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  priceValue: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  priceUnit: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 13, overflow: 'hidden',
  },
  requestBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
