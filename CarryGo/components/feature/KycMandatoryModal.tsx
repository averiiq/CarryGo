import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

interface KycMandatoryModalProps {
  visible: boolean;
  onClose: () => void;
  actionType?: 'trip' | 'parcel';
}

export function KycMandatoryModal({ visible, onClose, actionType = 'trip' }: KycMandatoryModalProps) {
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleStartKyc = () => {
    Haptic.confirm();
    onClose();
    router.push('/kyc' as never);
  };

  const actionNoun = actionType === 'trip' ? 'posting a trip' : 'sending a parcel';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: C.overlay }]}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: C.surface,
              borderColor: C.surfaceBorder,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
            },
            S.md,
          ]}
        >
          {/* Header Shield Beacon */}
          <View style={styles.topBadgeRow}>
            <View style={[styles.beaconIconBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
              <MaterialIcons name="verified-user" size={32} color={C.primary} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close verification modal"
              onPress={() => {
                Haptic.tap();
                onClose();
              }}
              style={[styles.closeBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              hitSlop={12}
            >
              <Feather name="x" size={18} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Heading */}
          <View style={styles.textBlock}>
            <View style={[styles.tagPill, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="security" size={12} color={C.primary} />
              <Text style={[styles.tagPillText, { color: C.primary }]}>MANDATORY VERIFICATION</Text>
            </View>
            <Text style={[styles.title, { color: C.textPrimary }]}>
              KYC Verification Required
            </Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>
              For the safety of all travellers and package owners across Haryana, government ID verification is mandatory before {actionNoun}.
            </Text>
          </View>

          {/* Feature Pillars */}
          <View style={[styles.pillarsCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.pillarRow}>
              <View style={[styles.checkCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="check" size={14} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pillarTitle, { color: C.textPrimary }]}>100% Aadhaar Verified Network</Text>
                <Text style={[styles.pillarSub, { color: C.textMuted }]}>
                  Instant 12-digit UIDAI OTP check prevents fraudulent routes and package theft.
                </Text>
              </View>
            </View>

            <View style={[styles.pillarDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.pillarRow}>
              <View style={[styles.checkCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="bolt" size={14} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pillarTitle, { color: C.textPrimary }]}>Takes Under 2 Minutes</Text>
                <Text style={[styles.pillarSub, { color: C.textMuted }]}>
                  Completely paperless. No document scans or waiting for manual approvals.
                </Text>
              </View>
            </View>

            <View style={[styles.pillarDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.pillarRow}>
              <View style={[styles.checkCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="lock" size={14} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pillarTitle, { color: C.textPrimary }]}>One-Time Only</Text>
                <Text style={[styles.pillarSub, { color: C.textMuted }]}>
                  Once verified, your account is unlocked permanently. You will never see this again.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify Identity Now"
              onPress={handleStartKyc}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                S.glow,
              ]}
            >
              <MaterialIcons name="verified-user" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Verify Identity Now</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Draft and Exit"
              onPress={() => {
                Haptic.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: C.textMuted }]}>Save Draft & Return Later</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  beaconIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textBlock: {
    marginBottom: Spacing.md,
  },
  tagPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 26,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  pillarsCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pillarTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  pillarSub: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  pillarDivider: {
    height: 1,
    width: '100%',
  },
  actionCol: {
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
});
