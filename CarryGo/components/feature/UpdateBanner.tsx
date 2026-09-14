import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useAppUpdates } from '@/hooks/useAppUpdates';

export function UpdateBanner() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isUpdateReady, isDownloading, applyUpdate } = useAppUpdates();
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const isVisible = (isUpdateReady || isDownloading) && !dismissed;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top + Spacing.sm,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: C.surface,
            borderColor: C.primary,
            ...Shadow.md,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: C.primarySubtle }]}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Ionicons name="sparkles" size={18} color={C.primary} />
          )}
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: C.textPrimary }]}>
            {isDownloading ? 'Downloading Update...' : 'New Update Ready!'}
          </Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            {isDownloading
              ? 'Installing improvements in the background.'
              : 'Restart CarryGo to apply the latest features.'}
          </Text>
        </View>

        {isUpdateReady && (
          <TouchableOpacity
            style={[styles.restartBtn, { backgroundColor: C.primary }]}
            onPress={applyUpdate}
            activeOpacity={0.85}
          >
            <Text style={styles.restartBtnText}>Restart</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs - 1,
    marginTop: 1,
  },
  restartBtn: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  restartBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
});
