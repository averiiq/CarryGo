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

const categoryColors: Record<string, string> = {
  documents: '#8B5CF6',
  electronics: '#06B6D4',
  clothing: '#F59E0B',
  food: '#10B981',
  medicine: '#EF4444',
  other: '#6B7280',
};

interface ParcelCardProps {
  parcel: Parcel;
  onPress?: () => void;
  showCarryButton?: boolean;
  onCarry?: () => void;
}

export const ParcelCard = React.memo(function ParcelCard({ parcel, onPress, showCarryButton, onCarry }: ParcelCardProps) {
  const { C, S } = useThemeColors();
  const cColor = categoryColors[parcel.category] || C.primary;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: Motion.cardScale, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const statusColor = parcel.status === 'open' ? C.success : parcel.status === 'in_transit' ? C.primary : C.textMuted;
  const statusBg = parcel.status === 'open' ? C.successSubtle : parcel.status === 'in_transit' ? C.primarySubtle : C.surfaceElevated;
  const statusLabel = parcel.status === 'in_transit' ? 'In Transit' : parcel.status.charAt(0).toUpperCase() + parcel.status.slice(1);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`Parcel from ${parcel.fromCity} to ${parcel.toCity}, ${parcel.weight}kg, offered ${parcel.priceOffer} rupees`}>
      <Animated.View style={[
        styles.card,
        S.sm,
        { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] },
      ]}>
        <LinearGradient
          colors={[cColor + '06', 'transparent']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: cColor + '14', borderColor: cColor + '25' }]}>
              <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={20} color={cColor} />
            </View>
            <View style={styles.routeInfo}>
              <View style={styles.routeRow}>
                <Text style={[styles.cityText, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
                <View style={[styles.arrowPill, { backgroundColor: C.surfaceElevated }]}>
                  <MaterialIcons name="arrow-forward" size={11} color={C.textMuted} />
                </View>
                <Text style={[styles.cityText, { color: C.textPrimary }]}>{parcel.toCity}</Text>
              </View>
              <Text style={[styles.descText, { color: C.textSecondary }]} numberOfLines={1}>{parcel.description}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={[styles.infoChip, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="scale" size={12} color={C.textMuted} />
              <Text style={[styles.infoChipText, { color: C.textSecondary }]}>{parcel.weight}kg</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: cColor + '10' }]}>
              <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={12} color={cColor} />
              <Text style={[styles.infoChipText, { color: cColor }]}>
                {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[styles.priceBlock, { backgroundColor: C.successSubtle, borderColor: C.success + '20' }]}>
              <Text style={[styles.priceSymbol, { color: C.success }]}>₹</Text>
              <Text style={[styles.price, { color: C.success }]}>{parcel.priceOffer}</Text>
            </View>
          </View>

          {/* Sender row */}
          <View style={styles.senderRow}>
            <View style={[styles.senderAvatar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '20' }]}>
              <Text style={[styles.senderAvatarText, { color: C.primary }]}>{parcel.userName.charAt(0)}</Text>
            </View>
            <Text style={[styles.senderName, { color: C.textSecondary }]}>{parcel.userName}</Text>
            <Ionicons name={parcel.deliveryDate ? 'calendar-outline' : 'time-outline'} size={11} color={C.textMuted} />
            <Text style={[styles.timeText, { color: C.textMuted }]}>
              {parcel.deliveryDate
                ? `By ${formatScheduleDate(parcel.deliveryDate)}`
                : new Date(parcel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>

          {showCarryButton ? (
            <Pressable
              style={({ pressed: p }) => [
                styles.carryBtn,
                { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' },
                p && { backgroundColor: C.primaryGlow, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onCarry}
              accessibilityRole="button"
              accessibilityLabel="Carry this parcel"
            >
              <MaterialIcons name="local-shipping" size={15} color={C.primary} />
              <Text style={[styles.carryBtnText, { color: C.primary }]}>Carry This Parcel</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  cardGradient: { ...StyleSheet.absoluteFillObject, borderRadius: BorderRadius.lg },
  inner: { padding: Spacing.md, gap: Spacing.sm + 2 },

  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  routeInfo: { flex: 1, gap: 3 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrowPill: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cityText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  descText: { fontSize: FontSize.sm, lineHeight: 18 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm + 2, paddingVertical: 5, borderRadius: BorderRadius.full },
  infoChipText: { fontSize: FontSize.xs },

  priceBlock: {
    flexDirection: 'row', alignItems: 'baseline', gap: 1,
    paddingHorizontal: Spacing.sm + 2, paddingVertical: 5,
    borderRadius: BorderRadius.sm, borderWidth: 1,
  },
  priceSymbol: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  price: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },

  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  senderAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  senderAvatarText: { fontSize: 10, fontWeight: FontWeight.bold },
  senderName: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  timeText: { fontSize: FontSize.xs },

  carryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: BorderRadius.md, paddingVertical: Spacing.sm + 3, borderWidth: 1,
  },
  carryBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
