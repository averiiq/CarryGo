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
  documents: ['#8B5CF6', '#7C3AED'],
  electronics: ['#06B6D4', '#0891B2'],
  clothing: ['#F59E0B', '#D97706'],
  food: ['#10B981', '#059669'],
  medicine: ['#EF4444', '#DC2626'],
  other: ['#6B7280', '#4B5563'],
};

interface ParcelCardProps {
  parcel: Parcel;
  onPress?: () => void;
  showCarryButton?: boolean;
  onCarry?: () => void;
}

export const ParcelCard = React.memo(function ParcelCard({ parcel, onPress, showCarryButton, onCarry }: ParcelCardProps) {
  const { C, isDark } = useThemeColors();
  const cGradient = categoryGradients[parcel.category] || ['#7C3AED', '#6D28D9'];
  const cColor = cGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const statusColor = parcel.status === 'open' ? '#10B981' : parcel.status === 'in_transit' ? '#3B82F6' : C.textMuted;
  const statusLabel = parcel.status === 'in_transit' ? 'In Transit' : parcel.status.charAt(0).toUpperCase() + parcel.status.slice(1);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md }}>
      <Animated.View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
        <View style={styles.inner}>
          {/* Top section */}
          <View style={styles.topSection}>
            {/* Category badge */}
            <View style={styles.catBadge}>
              <LinearGradient colors={cGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={20} color="#fff" />
            </View>

            {/* Route + description */}
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

            {/* Status */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Middle - weight, category, date chips */}
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
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
              <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons name="calendar" size={12} color={C.textSecondary} />
                <Text style={[styles.metaLabel, { color: C.textSecondary }]}>By {formatScheduleDate(parcel.deliveryDate)}</Text>
              </View>
            )}
          </View>

          {/* Bottom - sender + price */}
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
              <LinearGradient colors={['#10B98120', '#05966905']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={[styles.priceValue, { color: '#10B981' }]}>
                <Text style={styles.priceCurrency}>₹</Text>{parcel.priceOffer}
              </Text>
            </View>
          </View>

          {showCarryButton && (
            <Pressable
              style={({ pressed }) => [styles.carryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={onCarry}
            >
              <LinearGradient colors={cGradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
              <MaterialIcons name="local-shipping" size={15} color="#fff" />
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: { padding: Spacing.lg, gap: Spacing.md },

  // Top section
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

  // Meta
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  metaLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Bottom
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
