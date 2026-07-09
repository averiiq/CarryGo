import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { KycStatus } from '@/types';

interface KycStatusCardProps {
  status: KycStatus;
  rejectionReason?: string;
  onStartVerification: () => void;
  onResubmit: () => void;
}

const STATUS_CONFIG: Record<KycStatus, {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
}> = {
  pending: {
    icon: 'verified-user',
    label: 'Verify Your Identity',
    description: 'Complete KYC to unlock all features like sending parcels and accepting trips.',
  },
  submitted: {
    icon: 'hourglass-top',
    label: 'Verification In Progress',
    description: 'Your documents are being reviewed. This usually takes 24-48 hours.',
  },
  approved: {
    icon: 'check-circle',
    label: 'Identity Verified',
    description: 'Your identity has been verified. You have full access to all features.',
  },
  rejected: {
    icon: 'error',
    label: 'Verification Failed',
    description: 'Your documents could not be verified. Please review the reason and resubmit.',
  },
};

export default function KycStatusCard({
  status,
  rejectionReason,
  onStartVerification,
  onResubmit,
}: KycStatusCardProps) {
  const { C, S } = useThemeColors();
  const config = STATUS_CONFIG[status];

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return C.success;
      case 'rejected': return C.error;
      case 'submitted': return C.warning;
      default: return C.primary;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'approved': return C.successSubtle;
      case 'rejected': return C.errorSubtle;
      case 'submitted': return C.warningSubtle;
      default: return C.primarySubtle;
    }
  };

  const statusColor = getStatusColor();
  const statusBg = getStatusBg();

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: C.surface }, S.sm]}>
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: statusBg }]}>
          <MaterialIcons name={config.icon} size={24} color={statusColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{config.label}</Text>
          <Text style={[styles.description, { color: C.textSecondary }]}>{config.description}</Text>
        </View>
      </View>

      {status === 'rejected' && rejectionReason ? (
        <View style={[styles.reasonBox, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }]}>
          <MaterialIcons name="info-outline" size={16} color={C.error} />
          <Text style={[styles.reasonText, { color: C.textSecondary }]}>{rejectionReason}</Text>
        </View>
      ) : null}

      {status === 'pending' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start identity verification"
          onPress={onStartVerification}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          <Text style={styles.actionText}>Verify Now</Text>
        </Pressable>
      ) : null}

      {status === 'rejected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resubmit verification documents"
          onPress={onResubmit}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="refresh" size={18} color="#fff" />
          <Text style={styles.actionText}>Resubmit</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  reasonText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
