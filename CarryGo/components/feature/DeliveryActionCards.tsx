import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { DeliveryOtpEntry } from './DeliveryOtpEntry';
import { DELIVERY_OTP_LENGTH } from '@/constants/security';

type PickupCardProps = {
  onConfirmPickup: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function PickupActionCard({ onConfirmPickup, loading, C }: PickupCardProps) {
  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.warning + '0C', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B20' }]}>
          <MaterialIcons name="inventory" size={22} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Ready to Pick Up?</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Confirm you have collected the parcel from the sender
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: '#F59E0B', opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={onConfirmPickup}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : (
          <>
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Confirm Pickup</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

type DeliveryOtpCardProps = {
  enteredOtp: string;
  onOtpChange: (v: string) => void;
  onConfirmDelivery: () => void;
  loading: boolean;
  C: ThemeColors;
};

export function DeliveryOtpActionCard({ enteredOtp, onOtpChange, onConfirmDelivery, loading, C }: DeliveryOtpCardProps) {
  return (
    <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="lock-open" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: C.textPrimary }]}>Confirm Delivery</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Enter the OTP shown to the receiver to complete delivery
          </Text>
        </View>
      </View>
      <DeliveryOtpEntry value={enteredOtp} onChange={onOtpChange} C={C} />
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: enteredOtp.length === DELIVERY_OTP_LENGTH ? C.primary : C.surfaceElevated,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed && enteredOtp.length === DELIVERY_OTP_LENGTH ? 0.98 : 1 }],
          },
        ]}
        onPress={onConfirmDelivery}
        disabled={enteredOtp.length < DELIVERY_OTP_LENGTH || loading}
      >
        {loading ? <ActivityIndicator color={enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted} size="small" /> : (
          <>
            <MaterialIcons
              name="verified"
              size={18}
              color={enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted}
            />
            <Text style={[styles.primaryBtnText, { color: enteredOtp.length === DELIVERY_OTP_LENGTH ? '#fff' : C.textMuted }]}>
              Verify & Complete Delivery
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

type SuccessCardProps = {
  onRate: () => void;
  onViewPayment?: () => void;
  showPayment: boolean;
  C: ThemeColors;
};

export function DeliverySuccessCard({ onRate, onViewPayment, showPayment, C }: SuccessCardProps) {
  return (
    <View style={[styles.successCard, { backgroundColor: C.successSubtle, borderColor: C.success + '55' }]}>
      <LinearGradient colors={[C.success + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <Ionicons name="checkmark-circle" size={60} color={C.success} />
      <Text style={[styles.successTitle, { color: C.success }]}>Delivered!</Text>
      <Text style={[styles.successSub, { color: C.textSecondary }]}>
        Delivery is complete. Rate your experience below.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: C.success, opacity: pressed ? 0.88 : 1, alignSelf: 'stretch' },
        ]}
        onPress={onRate}
      >
        <MaterialIcons name="star" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Rate Experience</Text>
      </Pressable>
      {showPayment && onViewPayment ? (
        <Pressable
          style={({ pressed }) => [
            styles.outlineBtn,
            { borderColor: C.success + '55', opacity: pressed ? 0.8 : 1, alignSelf: 'stretch' },
          ]}
          onPress={onViewPayment}
        >
          <MaterialIcons name="account-balance-wallet" size={16} color={C.success} />
          <Text style={[styles.outlineBtnText, { color: C.success }]}>View Payment</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  actionIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  actionSub: { fontSize: FontSize.sm, lineHeight: 19, marginTop: 3 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md - 2, borderRadius: BorderRadius.md, borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  successCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.md, alignItems: 'center', overflow: 'hidden',
  },
  successTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold },
  successSub: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});
