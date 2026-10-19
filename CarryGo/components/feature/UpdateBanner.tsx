import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { Haptic } from '@/services/haptics.service';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

export interface UpdateBannerProps {
  testID?: string;
  forceVisible?: boolean;
}

export function getUpdateDialogMeta(params: {
  isUpdateReady: boolean;
  isDownloading: boolean;
  updateMessage?: string | null;
  channel?: string | null;
  runtimeVersion?: string | null;
}) {
  const statusTitle = params.isUpdateReady ? 'New Version Ready!' : 'Downloading Update...';
  const chipLabel = params.isUpdateReady ? 'UPDATE READY TO INSTALL' : 'STREAMING UPDATE (OTA)';
  const primaryActionText = params.isUpdateReady ? 'Restart & Apply Update' : 'Continue in Background';
  const subtitle = params.isUpdateReady
    ? 'CarryGo has downloaded a fresh performance & feature bundle. Restart now to experience the latest improvements.'
    : 'Streaming new enhancements silently in the background. You can continue using the app while this completes.';

  return {
    statusTitle,
    chipLabel,
    primaryActionText,
    subtitle,
    releaseNotes: params.updateMessage ? `"${params.updateMessage}"` : null,
    channelLabel: params.channel || 'preview',
    runtimeLabel: params.runtimeVersion || '1.0.0',
  };
}

/**
 * UpdateBanner / UpdateModal
 * Renders an ultra-polished, modern in-app update popup when an OTA update
 * is downloading or ready to install.
 */
export function UpdateBanner({ testID, forceVisible }: UpdateBannerProps) {
  const { C, isDark } = useThemeColors();
  const {
    isUpdateReady: hookUpdateReady,
    isDownloading: hookDownloading,
    applyUpdate,
    updateMessage,
    versionInfo,
  } = useAppUpdates();

  const isUpdateReady = forceVisible ? true : hookUpdateReady;
  const isDownloading = forceVisible ? false : hookDownloading;

  const [dismissed, setDismissed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const streamAnim = useRef(new Animated.Value(0)).current;
  const buttonPressAnim = useRef(new Animated.Value(1)).current;

  // Re-surface popup if an update finishes downloading and becomes ready to install
  useEffect(() => {
    if (isUpdateReady) {
      setDismissed(false);
    }
  }, [isUpdateReady]);

  const isVisible = Boolean(forceVisible || ((isUpdateReady || isDownloading) && !dismissed));

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      // Soft ambient pulse loop for hero icon
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      // Streaming shimmer loop for downloading progress
      const streamLoop = Animated.loop(
        Animated.timing(streamAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        })
      );
      streamLoop.start();

      return () => {
        pulseLoop.stop();
        streamLoop.stop();
      };
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [isVisible, scaleAnim, opacityAnim, pulseAnim, streamAnim]);

  const handleRestart = async () => {
    Haptic.success();
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

  const handlePressIn = () => {
    Animated.spring(buttonPressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonPressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (!isVisible) return null;

  const channelLabel = versionInfo?.channel || 'preview';
  const runtimeLabel = versionInfo?.runtimeVersion || '1.0.0';

  return (
    <Modal
      testID={testID || 'carrygo-update-modal'}
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Backdrop touch to dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss update popup backdrop"
        />

        <Animated.View
          style={[
            styles.dialogCard,
            {
              backgroundColor: C.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : C.surfaceBorder,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Ambient Gradient Accent Line */}
          <LinearGradient
            colors={
              isUpdateReady
                ? ['#059669', '#10B981', '#34D399']
                : ['#1D4ED8', '#2563EB', '#60A5FA']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topAccentBar}
          />

          {/* Floating Close Button */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
            onPress={handleDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close update dialog"
          >
            <Ionicons name="close" size={17} color={C.textMuted} />
          </Pressable>

          {/* Hero Icon with Ambient Glow */}
          <View style={styles.heroWrap}>
            <Animated.View
              style={[
                styles.glowAura,
                {
                  backgroundColor: isUpdateReady
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.22)'
                      : 'rgba(16, 185, 129, 0.15)'
                    : isDark
                    ? 'rgba(37, 99, 235, 0.22)'
                    : 'rgba(37, 99, 235, 0.15)',
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <LinearGradient
              colors={
                isUpdateReady
                  ? ['#10B981', '#059669']
                  : ['#3B82F6', '#1D4ED8']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCenter}
            >
              {isDownloading ? (
                <View style={styles.downloadIconWrap}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <MaterialIcons
                    name="cloud-download"
                    size={22}
                    color="#FFFFFF"
                    style={styles.cloudIconOverlay}
                  />
                </View>
              ) : (
                <AnimatedIcon
                  name="checkmark"
                  size={36}
                  color="#FFFFFF"
                  interactive={false}
                  autoPlay
                  loop={false}
                />
              )}
            </LinearGradient>
          </View>

          {/* Live Status Pill */}
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isUpdateReady
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.15)'
                    : '#ECFDF5'
                  : isDark
                  ? 'rgba(37, 99, 235, 0.15)'
                  : '#EFF6FF',
                borderColor: isUpdateReady
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.35)'
                    : '#A7F3D0'
                  : isDark
                  ? 'rgba(37, 99, 235, 0.35)'
                  : '#BFDBFE',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isUpdateReady ? '#10B981' : '#3B82F6' },
              ]}
            />
            <Text
              style={[
                styles.statusChipText,
                { color: isUpdateReady ? '#059669' : '#2563EB' },
              ]}
            >
              {isUpdateReady ? 'UPDATE READY TO INSTALL' : 'STREAMING UPDATE (OTA)'}
            </Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.dialogTitle, { color: C.textPrimary }]}>
            {isUpdateReady ? 'New Version Ready!' : 'Downloading Update...'}
          </Text>

          <Text style={[styles.dialogDescription, { color: C.textSecondary }]}>
            {isUpdateReady
              ? 'CarryGo has downloaded a fresh performance & feature bundle. Restart now to experience the latest improvements.'
              : 'Streaming new enhancements silently in the background. You can continue using the app while this completes.'}
          </Text>

          {/* Streaming Progress Bar (When Downloading) */}
          {isDownloading ? (
            <View style={[styles.streamBarContainer, { backgroundColor: C.surfaceElevated }]}>
              <Animated.View
                style={[
                  styles.streamBarFill,
                  {
                    transform: [
                      {
                        translateX: streamAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-160, 260],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['transparent', '#3B82F6', '#60A5FA', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>
          ) : null}

          {/* Developer Release Notes Banner (if provided via EAS update) */}
          {updateMessage ? (
            <View
              style={[
                styles.releaseNotesBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  borderColor: C.surfaceBorder,
                },
              ]}
            >
              <View style={styles.releaseNotesHeader}>
                <Ionicons name="sparkles" size={13} color={C.primary} />
                <Text style={[styles.releaseNotesTitle, { color: C.primary }]}>
                  WHAT'S NEW IN THIS RELEASE
                </Text>
              </View>
              <Text
                style={[styles.releaseNotesText, { color: C.textPrimary }]}
                numberOfLines={3}
              >
                "{updateMessage}"
              </Text>
            </View>
          ) : null}

          {/* Feature Guarantees Checklist */}
          <View
            style={[
              styles.featuresBox,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.surfaceElevated,
                borderColor: C.surfaceBorder,
              },
            ]}
          >
            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
                ]}
              >
                <Ionicons name="flash" size={14} color="#10B981" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: C.textPrimary }]}>
                  Instant 1-Second Reload
                </Text>
                <Text style={[styles.featureSub, { color: C.textMuted }]}>
                  No App Store reinstall needed
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' },
                ]}
              >
                <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: C.textPrimary }]}>
                  Zero Disruption Guarantee
                </Text>
                <Text style={[styles.featureSub, { color: C.textMuted }]}>
                  Active trips, parcels & login stay intact
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="ribbon" size={14} color="#D97706" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: C.textPrimary }]}>
                  Verified Cloud Release
                </Text>
                <Text style={[styles.featureSub, { color: C.textMuted }]}>
                  Branch: {channelLabel} • v{runtimeLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {isUpdateReady ? (
            <View style={styles.buttonGroup}>
              <Animated.View style={{ transform: [{ scale: buttonPressAnim }] }}>
                <Pressable
                  style={styles.primaryButtonWrap}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onPress={handleRestart}
                  disabled={isApplying}
                  accessibilityRole="button"
                  accessibilityLabel="Restart and apply update"
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradient}
                  >
                    {isApplying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="refresh" size={19} color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryButtonText}>
                      {isApplying ? 'Restarting CarryGo...' : 'Restart & Apply Update'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Remind me later"
              >
                <Text style={[styles.secondaryButtonText, { color: C.textMuted }]}>
                  Remind Me Later
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryOutlineButton,
                  {
                    borderColor: C.surfaceBorder,
                    backgroundColor: C.surfaceElevated,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Continue in background"
              >
                <Text style={[styles.secondaryOutlineButtonText, { color: C.textPrimary }]}>
                  Continue in Background
                </Text>
              </Pressable>
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
    backgroundColor: 'rgba(10, 15, 30, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 365,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 6,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Shadow.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.32,
        shadowRadius: 32,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroWrap: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  heroCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  downloadIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudIconOverlay: {
    position: 'absolute',
    opacity: 0.25,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xs + 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  dialogTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  dialogDescription: {
    fontSize: FontSize.sm - 0.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  streamBarContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  streamBarFill: {
    width: 100,
    height: '100%',
  },
  releaseNotesBox: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
    gap: 4,
  },
  releaseNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  releaseNotesTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  releaseNotesText: {
    fontSize: FontSize.xs + 0.5,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  featuresBox: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.semibold,
  },
  featureSub: {
    fontSize: 11,
    marginTop: 1,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.xs,
  },
  primaryButtonWrap: {
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md - 0.5,
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
    height: 46,
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
