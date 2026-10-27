import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

export interface TravelerEscrowModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean | void>;
  payoutAmount: number;
  expectedOtp?: string | null;
  loading?: boolean;
  testID?: string;
}

export function TravelerEscrowModal({
  visible,
  onClose,
  onVerify,
  payoutAmount,
  expectedOtp,
  loading = false,
  testID = 'traveler-escrow-modal',
}: TravelerEscrowModalProps) {
  const { C } = useThemeColors();
  const [enteredOtp, setEnteredOtp] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setEnteredOtp('');
      setErrorText(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [visible]);

  const handleVerifyPress = async () => {
    const cleanOtp = enteredOtp.trim();
    if (cleanOtp.length < 4) {
      Haptic.error();
      setErrorText('Please enter the delivery OTP provided by the sender.');
      return;
    }

    setErrorText(null);
    Haptic.confirm();
    try {
      await onVerify(cleanOtp);
    } catch (err: any) {
      setErrorText(err?.message || 'Verification failed. Please check the code.');
    }
  };

  const handleQuickAutoFill = () => {
    const codeToUse = expectedOtp || '123456';
    Haptic.tap();
    setEnteredOtp(codeToUse);
    setErrorText(null);
  };

  const isReady = enteredOtp.trim().length >= 4;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: C.card,
              borderColor: C.surfaceBorder,
            },
          ]}
        >
          {/* Header Shield & Close */}
          <View style={styles.sheetTopRow}>
            <View style={[styles.shieldIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="security" size={26} color="#10B981" />
            </View>

            <Pressable
              style={[styles.closeBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              onPress={onClose}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={18} color={C.textPrimary} />
            </Pressable>
          </View>

          {/* Title & Escrow Callout */}
          <View style={styles.titleWrap}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              Escrow Release Trigger
            </Text>
            <View style={[styles.payoutBadge, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
              <Text style={styles.payoutBadgeLabel}>ESCROW PAYOUT:</Text>
              <Text style={styles.payoutBadgeValue}>₹{payoutAmount}</Text>
            </View>
          </View>

          {/* Mandatory Explanatory Text */}
          <View style={[styles.instructionBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Feather name="info" size={16} color="#10B981" style={{ marginTop: 2 }} />
            <Text style={[styles.instructionText, { color: C.textPrimary }]}>
              Ask the sender for the delivery OTP to complete the trip and release your escrow payment.
            </Text>
          </View>

          {/* Segmented / Highlighted OTP Input */}
          <View style={styles.inputContainer}>
            <Pressable
              style={styles.digitsRow}
              onPress={() => inputRef.current?.focus()}
            >
              {Array.from({ length: 6 }).map((_, idx) => {
                const char = enteredOtp[idx] || '';
                const isCurrent = idx === enteredOtp.length;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.digitBox,
                      {
                        backgroundColor: char ? '#ECFDF5' : C.surfaceElevated,
                        borderColor: char
                          ? '#10B981'
                          : isCurrent
                            ? '#10B981'
                            : C.surfaceBorder,
                        borderWidth: isCurrent ? 2 : 1.5,
                      },
                    ]}
                  >
                    <Text style={[styles.digitText, { color: char ? '#064E3B' : C.textPrimary }]}>
                      {char}
                    </Text>
                  </View>
                );
              })}
            </Pressable>

            {/* Hidden Input for Keyboard */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={enteredOtp}
              onChangeText={(text) => {
                setEnteredOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                setErrorText(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyPress}
              autoFocus
            />
          </View>

          {/* Error Message if any */}
          {errorText ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          ) : null}

          {/* Demo Auto-fill Helper */}
          <Pressable
            style={styles.demoHelperRow}
            onPress={handleQuickAutoFill}
            hitSlop={6}
          >
            <MaterialIcons name="bolt" size={14} color="#10B981" />
            <Text style={styles.demoHelperText}>
              {expectedOtp
                ? `Demo Helper: Tap to fill code (${expectedOtp})`
                : 'Demo Helper: Tap to fill test OTP (123456)'}
            </Text>
          </Pressable>

          {/* Primary Action Button strictly matching index.styles.ts (#10B981) */}
          <Pressable
            style={[
              styles.verifyBtn,
              {
                backgroundColor: isReady ? '#10B981' : '#A7F3D0',
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleVerifyPress}
            disabled={loading || !isReady}
            accessibilityRole="button"
            accessibilityLabel="Verify and release payment"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="lock-open" size={18} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>Verify & Release Payment</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Cancel button */}
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={[styles.cancelBtnText, { color: C.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    borderTopLeftRadius: BorderRadius.xl, // 24
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shieldIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    gap: 6,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  payoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  payoutBadgeLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  payoutBadgeValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    color: '#064E3B',
  },

  // Mandatory instruction box
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  instructionText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: FontWeight.semibold,
  },

  // Input & Digits
  inputContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  digitsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  digitBox: {
    width: 46,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: FontWeight.extrabold,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  demoHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  demoHelperText: {
    color: '#10B981',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Button strictly in #10B981
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 50,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
