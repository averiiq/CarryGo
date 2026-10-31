import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface RequestSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'request_sent' | 'offer_sent';
  recipientName: string;
  price: number;
  fromCity: string;
  toCity: string;
  onViewRequests: () => void;
}

export function RequestSuccessModal({
  visible,
  onClose,
  type,
  recipientName,
  price,
  fromCity,
  toCity,
  onViewRequests,
}: RequestSuccessModalProps) {
  const { C } = useThemeColors();

  if (!visible) return null;

  const isOffer = type === 'offer_sent';
  const heading = isOffer ? 'Carry Offer Sent! 🚀' : 'Delivery Request Sent! 🎉';
  const subHeading = isOffer
    ? `Your offer to earn ₹${price} carrying to ${toCity} has been delivered to ${recipientName}.`
    : `Your request to deliver to ${toCity} for ₹${price} has been sent to ${recipientName}.`;

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="80%"
    >
      <View style={styles.container}>
        {/* Animated Celebration Icon */}
        <View style={[styles.iconRing, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <View style={[styles.iconCore, { backgroundColor: '#10B981' }]}>
            <MaterialIcons name="check" size={32} color="#FFFFFF" />
          </View>
        </View>

        <Text style={[styles.heading, { color: C.textPrimary }]}>{heading}</Text>
        <Text style={[styles.subHeading, { color: C.textSecondary }]}>{subHeading}</Text>

        {/* Route Capsule */}
        <View style={[styles.routeCapsule, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.cityText, { color: C.textPrimary }]}>{fromCity}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={C.primary} style={{ marginHorizontal: 6 }} />
          <Text style={[styles.cityText, { color: C.textPrimary }]}>{toCity}</Text>
          <View style={[styles.priceTag, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.priceText, { color: C.primaryDark }]}>₹{price}</Text>
          </View>
        </View>

        {/* What Happens Next Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.timelineTitle, { color: C.textMuted }]}>WHAT HAPPENS NEXT</Text>

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: '#10B981' }]}>
              <MaterialIcons name="check" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepHeading, { color: C.textPrimary }]}>Request Delivered</Text>
              <Text style={[styles.stepDesc, { color: C.textMuted }]}>
                {recipientName} has been notified via instant push alert.
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="time" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepHeading, { color: C.textPrimary }]}>Awaiting Acceptance</Text>
              <Text style={[styles.stepDesc, { color: C.textMuted }]}>
                You can chat with {recipientName} to discuss timing and details.
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: C.surfaceBorder }]}>
              <MaterialIcons name="security" size={12} color={C.textMuted} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepHeading, { color: C.textSecondary }]}>Booking & OTP Handover</Text>
              <Text style={[styles.stepDesc, { color: C.textMuted }]}>
                Funds are secured upon booking and payout is unlocked upon delivery OTP.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => {
              Haptic.confirm();
              onClose();
              onViewRequests();
            }}
            accessibilityRole="button"
            accessibilityLabel="Track in Requests"
          >
            <Text style={styles.primaryBtnText}>Track in Requests</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: C.surfaceBorder, backgroundColor: C.surfaceElevated },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>Back to Marketplace</Text>
          </Pressable>
        </View>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subHeading: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  routeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cityText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  priceTag: {
    marginLeft: Spacing.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  timelineCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  timelineTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm + 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  stepLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginLeft: 9,
    marginVertical: 3,
  },
  btnRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
