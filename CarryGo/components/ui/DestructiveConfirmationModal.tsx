import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface DestructiveConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  consequences?: string[];
  requiredMatchText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function DestructiveConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Keep',
  consequences,
  requiredMatchText,
  loading = false,
  onConfirm,
  onClose,
}: DestructiveConfirmationModalProps) {
  const insets = useSafeAreaInsets();
  const { C, isDark } = useThemeColors();
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (visible) {
      setInputText('');
      Haptic.warning();
    }
  }, [visible]);

  const canConfirm = !requiredMatchText || inputText.trim().toUpperCase() === requiredMatchText.toUpperCase();

  const handleConfirm = () => {
    if (!canConfirm || loading) return;
    Haptic.confirm();
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={loading ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={loading ? undefined : onClose}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: C.card,
              borderColor: C.errorBorder || '#FCA5A5',
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            },
          ]}
        >
          {/* Top Warning Icon Header */}
          <View style={[styles.iconWrap, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' }]}>
            <MaterialIcons name="warning-amber" size={28} color={C.error || '#EF4444'} />
          </View>

          <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: C.textSecondary }]}>{message}</Text>

          {/* Consequences List */}
          {consequences && consequences.length > 0 && (
            <View style={[styles.consequencesBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              {consequences.map((c, i) => (
                <View key={i} style={styles.consequenceRow}>
                  <MaterialIcons name="info-outline" size={14} color={C.error || '#EF4444'} />
                  <Text style={[styles.consequenceText, { color: C.textSecondary }]}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Type to Confirm Guard */}
          {requiredMatchText && (
            <View style={styles.matchGuardWrap}>
              <Text style={[styles.matchLabel, { color: C.textMuted }]}>
                Type <Text style={{ fontWeight: 'bold', color: C.textPrimary }}>{requiredMatchText}</Text> to proceed:
              </Text>
              <TextInput
                style={[
                  styles.matchInput,
                  {
                    color: C.textPrimary,
                    borderColor: canConfirm && inputText.length > 0 ? C.primary : C.surfaceBorder,
                    backgroundColor: C.surfaceElevated,
                  },
                ]}
                placeholder={requiredMatchText}
                placeholderTextColor={C.textMuted}
                autoCapitalize="characters"
                value={inputText}
                onChangeText={setInputText}
              />
            </View>
          )}

          {/* Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: C.surfaceElevated,
                  borderColor: C.surfaceBorder,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: C.textPrimary }]}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm || loading}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: C.error || '#EF4444',
                  opacity: !canConfirm || loading ? 0.5 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
              )}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  consequencesBox: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
    marginTop: Spacing.xs,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  consequenceText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  matchGuardWrap: {
    width: '100%',
    gap: 4,
    marginTop: Spacing.xs,
  },
  matchLabel: {
    fontSize: FontSize.xs,
  },
  matchInput: {
    width: '100%',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

