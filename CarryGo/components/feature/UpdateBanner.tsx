import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { Haptic } from '@/services/haptics.service';

/**
 * UpdateBanner / UpdateModal
 * Renders a full, polished update popup modal when an OTA update is downloading or ready to install.
 */
export function UpdateBanner() {
  const { C } = useThemeColors();
  const { isUpdateReady, isDownloading, applyUpdate } = useAppUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Re-surface popup if an update finishes downloading and becomes ready to install
  useEffect(() => {
    if (isUpdateReady) {
      setDismissed(false);
    }
  }, [isUpdateReady]);

  const isVisible = (isUpdateReady || isDownloading) && !dismissed;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [isVisible, scaleAnim, opacityAnim]);

  const handleRestart = async () => {
    Haptic.select();
    setIsApplying(true);
    try {
      await applyUpdate();
    } catch {
      setIsApplying(false);
    }
  };

  const handleDismiss = () => {
    Haptic.tap();
    setDismissed(true);
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Backdrop touch to dismiss */}
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <Animated.View
          style={[
            styles.dialogCard,
            {
              backgroundColor: C.surface,
              borderColor: C.surfaceBorder,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: C.surfaceElevated }]}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close update dialog"
          >
            <Ionicons name="close" size={18} color={C.textMuted} />
          </TouchableOpacity>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconRing,
              {
                backgroundColor: isUpdateReady ? '#ECFDF5' : '#EFF6FF',
                borderColor: isUpdateReady ? '#A7F3D0' : '#BFDBFE',
              },
            ]}
          >
            {isDownloading ? (
              <ActivityIndicator size="large" color="#2563EB" />
            ) : (
              <Ionicons name="sparkles" size={32} color="#059669" />
            )}
          </View>

          {/* Status Chip */}
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isUpdateReady ? '#ECFDF5' : '#EFF6FF',
                borderColor: isUpdateReady ? '#A7F3D0' : '#BFDBFE',
              },
            ]}
          >
            {isUpdateReady && <View style={styles.greenPulseDot} />}
            <Text
              style={[
                styles.statusChipText,
                { color: isUpdateReady ? '#059669' : '#2563EB' },
              ]}
            >
              {isUpdateReady ? 'UPDATE READY TO INSTALL' : 'DOWNLOADING UPDATE'}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.dialogTitle, { color: C.textPrimary }]}>
            {isUpdateReady ? 'New Version Ready!' : 'Downloading Update...'}
          </Text>

          {/* Description */}
          <Text style={[styles.dialogDescription, { color: C.textSecondary }]}>
            {isUpdateReady
              ? 'A new update for CarryGo has been downloaded. Restart the app now to apply the latest improvements and performance fixes.'
              : 'Installing enhancements in the background. You can continue using the app while this completes.'}
          </Text>

          {/* Feature Highlights Box */}
          <View style={[styles.featuresBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.featureRow}>
              <Ionicons name="flash" size={15} color={C.primary} />
              <Text style={[styles.featureText, { color: C.textPrimary }]}>
                Instant restart in 1-2 seconds
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={15} color={C.primary} />
              <Text style={[styles.featureText, { color: C.textPrimary }]}>
                Your account & active sessions stay intact
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="sparkles" size={15} color={C.primary} />
              <Text style={[styles.featureText, { color: C.textPrimary }]}>
                Latest speed, security & UI refinements
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {isUpdateReady ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: C.primary }]}
                onPress={handleRestart}
                disabled={isApplying}
                activeOpacity={0.88}
              >
                {isApplying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>
                  {isApplying ? 'Restarting CarryGo...' : 'Restart & Apply Update'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: C.textMuted }]}>
                  Remind Me Later
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.secondaryOutlineButton, { borderColor: C.surfaceBorder }]}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryOutlineButtonText, { color: C.textPrimary }]}>
                  Continue in Background
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl + 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg + 2,
    paddingTop: Spacing.xl + 4,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
    ...Shadow.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xs + 2,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  dialogTitle: {
    fontSize: FontSize.lg + 2,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  dialogDescription: {
    fontSize: FontSize.sm - 0.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  featuresBox: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.xs,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
  secondaryOutlineButton: {
    width: '100%',
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});

