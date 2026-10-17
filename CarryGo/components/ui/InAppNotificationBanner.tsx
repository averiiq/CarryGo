import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { getDeepLinkRoute } from '@/services/notifications.service';
import { useNotificationContext, InAppBannerData } from '@/contexts/NotificationContext';

export function InAppNotificationBanner() {
  const { banner, dismissBanner } = useNotificationContext();
  const { C, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (banner) {
      Haptic.success();
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [banner, translateY, opacity]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 || gestureState.vy < -0.5) {
          dismissBanner();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!banner) return null;

  const getIconConfig = (type?: string): { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string } => {
    switch (type) {
      case 'chat_message':
        return { icon: 'chat', color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' };
      case 'new_request':
      case 'request_received':
        return { icon: 'inventory-2', color: '#3B82F6', bg: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE' };
      case 'delivery_otp':
        return { icon: 'vpn-key', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5' };
      case 'delivery_pickup':
      case 'delivery_completed':
        return { icon: 'local-shipping', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5' };
      case 'payment_locked':
      case 'payment_released':
        return { icon: 'account-balance-wallet', color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.2)' : '#EDE9FE' };
      case 'rating':
        return { icon: 'star', color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' };
      default:
        return { icon: 'notifications', color: C.primary, bg: C.primarySubtle };
    }
  };

  const iconCfg = getIconConfig(banner.type);

  const handlePress = () => {
    Haptic.tap();
    dismissBanner();

    const targetRoute = banner.deepLink ?? getDeepLinkRoute(banner.type || 'general', banner.relatedId);
    if (targetRoute) {
      setTimeout(() => {
        router.push(targetRoute as Href);
      }, 100);
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === 'android' ? 8 : 4),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}: ${banner.body}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconCfg.bg }]}>
          <MaterialIcons name={iconCfg.icon} size={22} color={iconCfg.color} />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>
              {banner.title}
            </Text>
            <Text style={[styles.timeLabel, { color: C.textMuted }]}>now</Text>
          </View>
          <Text style={[styles.body, { color: C.textSecondary }]} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>

        <MaterialIcons name="chevron-right" size={20} color={C.textMuted} style={styles.arrow} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  textWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    flex: 1,
    marginRight: 6,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  body: {
    fontSize: FontSize.xs + 1,
    lineHeight: 18,
  },
  arrow: {
    marginLeft: 6,
  },
});
