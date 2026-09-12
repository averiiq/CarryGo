import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Parcel, Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'medical-services',
  other: 'inventory-2',
};

const categoryGradients: Record<string, [string, string]> = {
  documents: ['#D97706', '#B45309'],
  electronics: ['#2563EB', '#1D4ED8'],
  clothing: ['#7C3AED', '#6D28D9'],
  food: ['#EA580C', '#C2410C'],
  medicine: ['#DC2626', '#B91C1C'],
  other: ['#4F46E5', '#4338CA'],
};

interface ParcelCardProps {
  parcel: Parcel;
  matchScore?: number;
  onMatchPress?: () => void;
  onPress?: () => void;
  showCarryButton?: boolean;
  onCarry?: () => void;
  isOwner?: boolean;
  existingRequest?: Request | null;
  onTrackDelivery?: (requestId: string) => void;
  onViewRequest?: (requestId: string) => void;
}

export const ParcelCard = React.memo(function ParcelCard({
  parcel,
  matchScore,
  onMatchPress,
  onPress,
  showCarryButton,
  onCarry,
  isOwner,
  existingRequest,
  onTrackDelivery,
  onViewRequest,
}: ParcelCardProps) {
  const { C } = useThemeColors();
  const cGradient = categoryGradients[parcel.category] || ['#0F766E', '#0D9488'];
  const cColor = cGradient[0];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const statusColor = parcel.status === 'open' ? C.success : parcel.status === 'in_transit' ? C.primary : C.textMuted;
  const statusLabel = parcel.status === 'in_transit' ? 'In Transit' : parcel.status.charAt(0).toUpperCase() + parcel.status.slice(1);

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
            borderColor: isOwner ? C.primary + '44' : C.surfaceBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.senderSection}>
            <LinearGradient
              colors={cGradient}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarLetter}>
                {parcel.userName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.senderMeta}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.senderName, { color: C.textPrimary }]} numberOfLines={1}>
                  {isOwner ? 'You' : parcel.userName}
                </Text>
                {isOwner ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
                    <Text style={[styles.ownerBadgeText, { color: C.primary }]}>Your Parcel</Text>
                  </View>
                ) : existingRequest?.status === 'accepted' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: '#10B98118', borderColor: '#10B98144' }]}>
                    <Text style={[styles.ownerBadgeText, { color: '#10B981' }]}>Accepted</Text>
                  </View>
                ) : existingRequest?.status === 'pending' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B44' }]}>
                    <Text style={[styles.ownerBadgeText, { color: '#F59E0B' }]}>Offer Sent</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.categorySubtitle, { color: C.textMuted }]}>
                {parcel.category.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.statusChip, { backgroundColor: statusColor + '12', borderColor: statusColor + '28' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.cityBlock}>
            <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {parcel.fromCity}
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
              {parcel.toCity}
            </Text>
          </View>
        </View>

        {parcel.description ? (
          <Text style={[styles.descriptionText, { color: C.textSecondary }]} numberOfLines={1}>
            {parcel.description}
          </Text>
        ) : null}

        <View style={styles.specsRow}>
          <View style={[styles.specItem, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="scale" size={12} color={C.textSecondary} />
            <Text style={[styles.specText, { color: C.textSecondary }]}>
              {parcel.weight} kg
            </Text>
          </View>

          <View style={[styles.specItem, { backgroundColor: cColor + '10' }]}>
            <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={12} color={cColor} />
            <Text style={[styles.specText, { color: cColor, fontWeight: FontWeight.semibold }]}>
              {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
            </Text>
          </View>

          {parcel.deliveryDate ? (
            <View style={[styles.specItem, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
              <Text style={[styles.specText, { color: C.textSecondary }]}>
                By {formatScheduleDate(parcel.deliveryDate)}
              </Text>
            </View>
          ) : null}

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
            <Text style={[styles.priceLabel, { color: C.textMuted }]}>REWARD OFFER</Text>
            <View style={styles.priceValueRow}>
              <Text style={[styles.priceAmount, { color: C.primary }]}>
                ₹{parcel.priceOffer}
              </Text>
            </View>
          </View>

          {isOwner ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primarySubtle, borderColor: C.primary + '55', borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onPress}
            >
              <MaterialIcons name="tune" size={14} color={C.primary} />
              <Text style={[styles.actionButtonText, { color: C.primary }]}>Manage Parcel</Text>
            </Pressable>
          ) : existingRequest?.status === 'accepted' ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: '#10B981' },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onTrackDelivery ? onTrackDelivery(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="local-shipping" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Process Delivery</Text>
            </Pressable>
          ) : existingRequest?.status === 'pending' ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.surfaceElevated, borderColor: '#F59E0B77', borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onViewRequest ? onViewRequest(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="schedule" size={14} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Offer Sent</Text>
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
              <Text style={[styles.actionButtonText, { color: C.textSecondary }]}>Delivered</Text>
            </Pressable>
          ) : showCarryButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onCarry}
            >
              <MaterialIcons name="local-shipping" size={13} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Carry Parcel</Text>
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
  senderSection: {
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
  senderMeta: {
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
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  senderName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  categorySubtitle: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
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
  descriptionText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: -2,
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
