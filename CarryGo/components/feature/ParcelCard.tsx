import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, Request } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion, LetterSpacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';

const categoryConfig: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string; border: string }> = {
  documents: { icon: 'description', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  electronics: { icon: 'devices', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  clothing: { icon: 'checkroom', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  food: { icon: 'restaurant', color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  medicine: { icon: 'medical-services', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  other: { icon: 'inventory-2', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
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
  const { C, S } = useThemeColors();
  const cMeta = categoryConfig[parcel.category] || categoryConfig.other;
  const scale = useRef(new Animated.Value(1)).current;

  const rawName = parcel.userName || 'User';
  const userName = rawName.trim();
  const avatarLetter = (userName.charAt(0) || 'U').toUpperCase();

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, ...Motion.springFast }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();

  const isParcelOpen = parcel.status === 'open';
  const statusColor = isParcelOpen
    ? C.success
    : parcel.status === 'in_transit'
      ? C.info
      : parcel.status === 'matched'
        ? '#7C3AED'
        : C.textMuted;
  const statusLabel = parcel.status === 'in_transit'
    ? 'In Transit'
    : parcel.status === 'open'
      ? 'Open'
      : parcel.status.charAt(0).toUpperCase() + parcel.status.slice(1);

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
          S.card,
          {
            backgroundColor: C.card,
            borderColor: isOwner ? C.primaryBorder : C.surfaceBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.senderSection}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, borderWidth: 1 }
              ]}
            >
              <Text style={[styles.avatarLetter, { color: C.primary }]}>
                {avatarLetter}
              </Text>
            </View>
            <View style={styles.senderMeta}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.senderName, { color: C.textPrimary }]} numberOfLines={1}>
                  {isOwner ? 'You' : userName}
                </Text>
                {isOwner ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                    <MaterialIcons name="person" size={10} color={C.primary} style={{ marginRight: 2 }} />
                    <Text style={[styles.ownerBadgeText, { color: C.primary }]}>Your Parcel</Text>
                  </View>
                ) : existingRequest?.status === 'accepted' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                    <Text style={[styles.ownerBadgeText, { color: C.success }]}>Accepted</Text>
                  </View>
                ) : existingRequest?.status === 'pending' ? (
                  <View style={[styles.ownerBadge, { backgroundColor: C.warningSubtle, borderColor: C.warningBorder }]}>
                    <Text style={[styles.ownerBadgeText, { color: C.warning }]}>Offer Sent</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.categorySubtitle, { color: C.textMuted }]}>
                {parcel.category.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.categoryChip, { backgroundColor: cMeta.bg, borderColor: cMeta.border }]}>
            <MaterialIcons name={cMeta.icon} size={13} color={cMeta.color} />
            <Text style={[styles.categoryChipText, { color: cMeta.color }]}>
              {parcel.category.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.routeContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={styles.cityBlock}>
            <View style={styles.cityIndicatorRow}>
              <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.cityLabel, { color: C.textMuted }]}>FROM</Text>
            </View>
            <Text style={[styles.cityName, { color: C.textPrimary }]} numberOfLines={1}>
              {parcel.fromCity}
            </Text>
          </View>

          <View style={styles.arrowBlock}>
            <View style={[styles.arrowLine, { borderColor: C.surfaceBorder }]} />
            <View style={[styles.arrowIconCircle, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="east" size={13} color={C.primary} />
            </View>
          </View>

          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <View style={[styles.cityIndicatorRow, { justifyContent: 'flex-end' }]}>
              <Text style={[styles.cityLabel, { color: C.textMuted }]}>TO</Text>
              <MaterialIcons name="place" size={11} color={C.primary} style={{ marginLeft: 2 }} />
            </View>
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

          <View style={[styles.statusChip, { backgroundColor: statusColor + '12', borderColor: statusColor + '28' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
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
                { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder, borderWidth: 1 },
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
                { backgroundColor: C.primary },
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
                { backgroundColor: C.warningSubtle, borderColor: C.warningBorder, borderWidth: 1 },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => (onViewRequest ? onViewRequest(existingRequest.id) : onPress?.())}
            >
              <MaterialIcons name="schedule" size={14} color={C.warning} />
              <Text style={[styles.actionButtonText, { color: C.warning }]}>Offer Sent</Text>
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
          ) : !isParcelOpen ? (
            <View style={[styles.closedChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={[styles.closedDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.closedText, { color: C.textSecondary }]}>{statusLabel}</Text>
            </View>
          ) : showCarryButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={onCarry}
            >
              <MaterialIcons name="local-shipping" size={14} color="#FFFFFF" />
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
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  senderName: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  categorySubtitle: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: LetterSpacing.wider,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  cityBlock: {
    flex: 1,
    gap: 3,
  },
  cityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cityLabel: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  cityName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  descriptionText: {
    fontSize: FontSize.sm,
    lineHeight: 19,
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
    gap: 4.5,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 9,
  },
  matchItem: {
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  specText: {
    fontSize: 11.5,
    fontWeight: FontWeight.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceContainer: {
    gap: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceAmount: {
    fontSize: 21,
    fontWeight: FontWeight.extrabold,
    letterSpacing: LetterSpacing.tight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 10.5,
    borderRadius: 12,
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
  closedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  closedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  closedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
});
