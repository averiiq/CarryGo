import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { verifyTransactionPan } from '@/services/kyc.service';
import { Haptic } from '@/services/haptics.service';
import { useThemeColors } from '@/hooks/useThemeColors';

interface PanVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (panMasked: string) => void;
  title?: string;
  description?: string;
  canDismiss?: boolean;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const PanVerificationModal: React.FC<PanVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = 'One-Time PAN Verification',
  description = 'In compliance with Indian financial regulations, a one-time PAN verification is required to authorize withdrawals and payments.',
  canDismiss = true,
}) => {
  const { C } = useThemeColors();
  const { user, updateUser } = useAuth();
  const [pan, setPan] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanPan = pan.trim().toUpperCase();
  const isValidFormat = PAN_REGEX.test(cleanPan);

  const handleVerify = useCallback(async () => {
    if (!user) return;
    Keyboard.dismiss();

    if (!isValidFormat) {
      Haptic.error();
      setErrorMessage('Please enter a valid 10-character PAN (e.g. ABCDE1234F).');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    Haptic.confirm();

    try {
      const res = await verifyTransactionPan(user.id, cleanPan);
      if (res.error || !res.data) {
        Haptic.error();
        setErrorMessage(res.error || 'Failed to verify PAN.');
        setIsVerifying(false);
        return;
      }

      Haptic.success();
      updateUser({
        isPanVerified: true,
        panMasked: res.data.panMasked,
      });

      setPan('');
      setErrorMessage(null);
      onSuccess?.(res.data.panMasked || '');
      onClose();
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'PAN verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [user, cleanPan, isValidFormat, updateUser, onSuccess, onClose]);

  const handleDismiss = () => {
    if (!isVerifying && canDismiss) {
      setErrorMessage(null);
      setPan('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={[styles.modalCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.badgeCircle, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="badge" size={26} color={C.primary} />
                </View>
                {canDismiss && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={handleDismiss}
                    disabled={isVerifying}
                    hitSlop={12}
                    style={styles.closeBtn}
                  >
                    <MaterialIcons name="close" size={22} color={C.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Title & Description */}
              <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>{description}</Text>

              {/* Compliance Pill */}
              <View style={[styles.compliancePill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
                <MaterialIcons name="lock" size={14} color={C.primary} />
                <Text style={[styles.complianceText, { color: C.primary }]}>
                  RBI / PMLA Compliant • 256-Bit Encrypted
                </Text>
              </View>

              {/* PAN Input Box */}
              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: C.textPrimary }]}>
                    Permanent Account Number (PAN)
                  </Text>
                  <Text
                    style={[
                      styles.counterText,
                      { color: cleanPan.length === 10 ? (isValidFormat ? C.success : C.error) : C.textMuted },
                    ]}
                  >
                    {cleanPan.length}/10
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.panInput,
                    {
                      borderColor: errorMessage ? C.error : isValidFormat ? C.success : C.surfaceBorder,
                      backgroundColor: C.surfaceElevated,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="e.g. ABCDE1234F"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  value={pan}
                  onChangeText={(val) => {
                    setPan(val.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!isVerifying}
                />
                <Text style={[styles.helperText, { color: C.textMuted }]}>
                  Format: 5 letters, 4 numbers, 1 letter (ABCDE1234F)
                </Text>
              </View>

              {/* Error Message */}
              {errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
                  <MaterialIcons name="error-outline" size={18} color={C.error} />
                  <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
                </View>
              )}

              {/* Guarantee Box */}
              <View style={[styles.infoBox, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="security" size={16} color={C.success} />
                <Text style={[styles.infoText, { color: C.textSecondary }]}>
                  One-time verification only. Your PAN is hashed and safely protected against unauthorized misuse.
                </Text>
              </View>

              {/* Actions */}
              <Pressable
                accessibilityRole="button"
                onPress={handleVerify}
                disabled={isVerifying || cleanPan.length !== 10}
                style={({ pressed }) => [
                  styles.verifyBtn,
                  {
                    backgroundColor: C.primary,
                    opacity: isVerifying || cleanPan.length !== 10 ? 0.5 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                {isVerifying ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.btnText}>Verifying PAN...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <MaterialIcons name="verified-user" size={18} color="#fff" />
                    <Text style={styles.btnText}>Verify & Proceed</Text>
                  </View>
                )}
              </Pressable>

              {canDismiss && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleDismiss}
                  disabled={isVerifying}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelText, { color: C.textSecondary }]}>Do This Later</Text>
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  compliancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  complianceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  inputWrap: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  counterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  panInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 3,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  verifyBtn: {
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cancelBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
