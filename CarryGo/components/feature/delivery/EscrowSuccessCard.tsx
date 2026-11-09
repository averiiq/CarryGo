import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LottieAnimation, LottieErrorBoundary } from '@/components/ui/LottieViewWrapper';
import { Haptic } from '@/services/haptics.service';

export interface EscrowSuccessCardProps {
  payoutAmount: number;
  senderName?: string;
  routeText?: string;
  onRate?: () => void;
  onReturnToDashboard?: () => void;
  testID?: string;
}

export function EscrowSuccessCard({
  payoutAmount,
  senderName = 'Sender',
  routeText,
  onRate,
  onReturnToDashboard,
  testID = 'escrow-success-card',
}: EscrowSuccessCardProps) {
  const { C, S } = useThemeColors();
  const [lottieFailed, setLottieFailed] = useState(false);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        S.card,
        {
          backgroundColor: C.card,
          borderColor: C.surfaceBorder,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.08)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Lottie Animation: done.lottie with resilient fallback */}
      <View style={styles.animationContainer}>
        <LottieErrorBoundary name="successCheck">
          {!lottieFailed ? (
            <LottieView
              source={require('@/assets/lotti-animations/done.lottie')}
              autoPlay
              loop={false}
              style={styles.lottie}
              renderMode="AUTOMATIC"
              onAnimationFailure={() => setLottieFailed(true)}
            />
          ) : (
            <LottieAnimation name="successCheck" style={{ width: 80, height: 80 }} />
          )}
        </LottieErrorBoundary>
      </View>

      {/* Confirmation Headlines */}
      <View style={styles.headlineWrap}>
        <View style={[styles.verifiedPill, { backgroundColor: '#ECFDF5' }]}>
          <MaterialIcons name="verified" size={14} color="#10B981" />
          <Text style={styles.verifiedPillText}>OTP VERIFIED & HANDOVER COMPLETED</Text>
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          Escrow Payment Released! 🎉
        </Text>

        <Text style={[styles.message, { color: C.textSecondary }]}>
          ₹{payoutAmount} is being transferred to your registered bank account. The delivery journey has been
          officially closed.
        </Text>
      </View>

      {/* Payout Breakdown Bento Card */}
      <View
        style={[
          styles.breakdownBox,
          {
            backgroundColor: C.surfaceElevated,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelCol}>
            <Text style={[styles.breakdownLabel, { color: C.textMuted }]}>TRANSFERRED AMOUNT</Text>
            <Text style={[styles.breakdownAmount, { color: '#064E3B' }]}>₹{payoutAmount}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusBadgeText}>Transfer Initiated</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: C.surfaceBorder }]} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaKey, { color: C.textMuted }]}>Sender</Text>
            <Text style={[styles.metaVal, { color: C.textPrimary }]}>{senderName}</Text>
          </View>
          {routeText ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaKey, { color: C.textMuted }]}>Route</Text>
              <Text style={[styles.metaVal, { color: C.textPrimary }]}>{routeText}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Text style={[styles.metaKey, { color: C.textMuted }]}>Settlement</Text>
            <Text style={[styles.metaVal, { color: '#10B981' }]}>Instant Payout</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons strictly matching index.styles.ts */}
      <View style={styles.actionsWrap}>
        {onReturnToDashboard ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryReturnBtn,
              {
                backgroundColor: C.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? Motion.pressScale : 1 }],
              },
            ]}
            onPress={() => {
              Haptic.confirm();
              onReturnToDashboard();
            }}
            accessibilityRole="button"
            accessibilityLabel="Return to My Active Trips"
          >
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.primaryReturnBtnText}>Return to Active Trips</Text>
          </Pressable>
        ) : null}

        {onRate ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryRateBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? Motion.pressScale : 1 }],
              },
            ]}
            onPress={() => {
              Haptic.tap();
              onRate();
            }}
            accessibilityRole="button"
            accessibilityLabel="Rate Sender"
          >
            <Feather name="star" size={16} color="#D97706" />
            <Text style={[styles.secondaryRateBtnText, { color: C.textPrimary }]}>
              Rate {senderName}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  animationContainer: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lottie: {
    width: 130,
    height: 130,
    zIndex: 2,
  },
  badgeFallback: {
    position: 'absolute',
    zIndex: 1,
  },

  headlineWrap: {
    alignItems: 'center',
    gap: 8,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },

  breakdownBox: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabelCol: {
    gap: 2,
  },
  breakdownLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  breakdownAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#064E3B',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    gap: 2,
  },
  metaKey: {
    fontSize: 10,
  },
  metaVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  actionsWrap: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  primaryReturnBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  secondaryRateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  secondaryRateBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
