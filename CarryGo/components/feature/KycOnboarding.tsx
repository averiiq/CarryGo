import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';
import { LottieAnimation } from '@/components/ui/LottieViewWrapper';
import { Haptic } from '@/services/haptics.service';

interface KycOnboardingProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function KycOnboarding({ visible, onClose }: KycOnboardingProps) {
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleStartVerification = () => {
    Haptic.confirm();
    onClose();
    router.push('/kyc' as never);
  };

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="75%"
      showHandle
      enablePanDownToClose
    >
      <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
        <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
          <View style={[styles.icon, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="verified-user" size={20} color={C.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: C.textPrimary }]}>Identity Verification</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>Complete KYC to unlock all features</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close identity verification"
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            style={[styles.closeButton, { backgroundColor: C.surfaceElevated }]}
            hitSlop={12}
          >
            <MaterialIcons name="close" size={19} color={C.textMuted} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={{ width: 140, height: 110, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}>
            <LottieAnimation name="aadharVerification" style={{ width: 140, height: 110 }} />
          </View>
          <View style={[styles.notice, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
            <MaterialIcons name="info-outline" size={20} color={C.primary} />
            <Text style={[styles.noticeText, { color: C.textSecondary }]}>
              Verify your identity instantly using your 12-digit Aadhaar number with official UIDAI OTP and a quick selfie. No physical document upload required.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleStartVerification}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
              S.glow,
            ]}
          >
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            <Text style={styles.actionText}>Start Verification</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            style={({ pressed }) => [
              styles.laterButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.laterText, { color: C.textMuted }]}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
  },
  actionText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  laterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
