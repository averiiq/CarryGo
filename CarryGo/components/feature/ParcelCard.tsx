import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatScheduleDate } from './SevenDaySchedulePicker';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

const categoryGradients: Record<string, [string, string]> = {
  documents: ['#6B7280', '#4B5563'],
  electronics: ['#0F766E', '#0D9488'],
  clothing: ['#64748B', '#475569'],
  food: ['#EA580C', '#C2410C'],
  medicine: ['#16A34A', '#15803D'],
  other: ['#4B5563', '#334155'],
};

interface ParcelCardProps {
  parcel: Parcel;
  matchScore?: number;
  onMatchPress?: () => void;
  onPress?: () => void;
  showCarryButton?: boolean;
  onCarry?: () => void;
}

export const ParcelCard = React.memo(function ParcelCard({ parcel, matchScore, onMatchPress, onPress, showCarryButton, onCarry }: ParcelCardProps) {
  const { C } = useThemeColors();
  const cGradient = categoryGradients[parcel.category] || ['#6B7280', '#4B5563'];
  const cColor = cGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const statusColor = parcel.status === 'open' ? C.success : parcel.status === 'in_transit' ? C.primary : C.textMuted;
  const statusLabel = parcel.status === 'in_transit' ? 'In Transit' : parcel.status.charAt(0).toUpperCase() + parcel.status.slice(1);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md }}>
      <Animated.View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
        <View style={styles.inner}>
          <View style={styles.topSection}>
            <View style={styles.catBadge}>
              <LinearGradient colors={cGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={20} color={C.textInverse} />
            </View>

            <View style={styles.headerContent}>
              <View style={styles.routeRow}>
                <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>{parcel.fromCity}</Text>
                <View style={[styles.arrowCircle, { backgroundColor: cColor + '14' }]}>
                  <MaterialIcons name="arrow-forward" size={10} color={cColor} />
                </View>
                <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>{parcel.toCity}</Text>
              </View>
              <Text style={[styles.description, { color: C.textSecondary }]} numberOfLines={1}>{parcel.description}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {typeof matchScore === 'number' && (
              <Pressable
                style={({ pressed }) => [
                  styles.metaChip,
                  styles.matchChip,
                  { backgroundColor: C.primary + '14' },
                  pressed && onMatchPress ? { opacity: 0.82 } : null,
                ]}
                onPress={onMatchPress}
                disabled={!onMatchPress}
              >
                <MaterialIcons name={'auto-awesome'} size={12} color={C.primary} />
                <Text style={[styles.metaLabel, { color: C.primary }]}>{matchScore}% match</Text>
                <MaterialIcons name={'info-outline'} size={12} color={C.primary} />
              </Pressable>
            )}
            <View style={[styles.metaChip, { backgroundColor: C.surfaceElevated }]}> 
              <MaterialIcons name="scale" size={12} color={C.textSecondary} />
              <Text style={[styles.metaLabel, { color: C.textSecondary }]}>{parcel.weight}kg</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: cColor + '10' }]}>
              <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={12} color={cColor} />
              <Text style={[styles.metaLabel, { color: cColor }]}>
                {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
              </Text>
            </View>
            {parcel.deliveryDate && (
              <View style={[styles.metaChip, { backgroundColor: C.surfaceElevated }]}> 
                <Ionicons name="calendar" size={12} color={C.textSecondary} />
                <Text style={[styles.metaLabel, { color: C.textSecondary }]}>By {formatScheduleDate(parcel.deliveryDate)}</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.senderSection}>
              <LinearGradient colors={cGradient} style={styles.senderAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.senderLetter}>{parcel.userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.senderName, { color: C.textPrimary }]}>{parcel.userName}</Text>
                {!parcel.deliveryDate && (
                  <Text style={[styles.timeAgo, { color: C.textMuted }]}>
                    {new Date(parcel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.priceBox}>
              <LinearGradient colors={[C.successSubtle, C.primarySubtle]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={[styles.priceValue, { color: C.success }]}> 
                <Text style={styles.priceCurrency}>Rs </Text>{parcel.priceOffer}
              </Text>
            </View>
          </View>

          {showCarryButton && (
            <Pressable
              style={({ pressed }) => [styles.carryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={onCarry}
            >
              <LinearGradient colors={[C.primary, C.primaryDark]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
              <MaterialIcons name="local-shipping" size={15} color={C.textInverse} />
              <Text style={styles.carryBtnText}>Carry This Parcel</Text>
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
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  inner: { padding: Spacing.lg, gap: Spacing.md },

  topSection: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  catBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  headerContent: { flex: 1, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cityName: { fontSize: 16, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },
  arrowCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: FontSize.sm, lineHeight: 18 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: BorderRadius.full, flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: FontWeight.bold },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  matchChip: { borderWidth: 1, borderColor: 'transparent' },
  metaLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  senderSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  senderAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  senderLetter: { color: '#fff', fontSize: 12, fontWeight: FontWeight.bold },
  senderName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  timeAgo: { fontSize: FontSize.xs, marginTop: 1 },

  priceBox: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: 14, overflow: 'hidden',
  },
  priceCurrency: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  priceValue: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },

  carryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, overflow: 'hidden',
  },
  carryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
