import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface KycOnboardingProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function KycOnboarding({ visible, onClose, onComplete }: KycOnboardingProps) {
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleStartVerification = () => {
    onClose();
    router.push('/kyc' as never);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: C.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: C.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
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
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: C.surfaceElevated }]}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={19} color={C.textMuted} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={[styles.notice, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
              <MaterialIcons name="info-outline" size={20} color={C.primary} />
              <Text style={[styles.noticeText, { color: C.textSecondary }]}>
                Verify your identity to send parcels, accept trips, and access all CarryGo features. You will need a government-issued ID and a selfie.
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
              onPress={onClose}
              style={({ pressed }) => [
                styles.laterButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.laterText, { color: C.textMuted }]}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FontSize.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 21,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  laterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
