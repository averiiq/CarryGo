import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRef, useEffect, useMemo, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { ThemeColors, TouchTarget, TabBarGeometry, BorderRadius } from '@/constants/theme';
import { isRequestIncoming } from '@/services/requests.service';

import { AnimatedIcon, type AnimatedIconName } from '@/components';

function TabBadge({
  count,
  C,
  isFocused,
  isSmallDevice,
  isDark,
}: {
  count: number;
  C: ThemeColors;
  isFocused?: boolean;
  isSmallDevice?: boolean;
  isDark?: boolean;
}) {
  if (count === 0) return null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: C.error,
          borderColor: isDark ? '#0F172A' : '#FFFFFF',
          minWidth: isSmallDevice ? 15 : 17,
          height: isSmallDevice ? 15 : 17,
          top: isSmallDevice ? -4 : -5,
          right: isSmallDevice ? -7 : -9,
        },
      ]}
      accessibilityLabel={`${count} unread`}
    >
      <Text
        style={[styles.badgeText, { fontSize: isSmallDevice ? 8.5 : 9.5 }]}
        maxFontSizeMultiplier={1.0}
      >
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
  animatedIcon: AnimatedIconName;
  badge?: number;
  dotAlert?: boolean;
};

function getTabMeta(routeName: string, pendingRequests: number, unreadMessages: number, kycPending: boolean): TabMeta {
  switch (routeName) {
    case 'index':
      return { label: 'Home', icon: 'home', outlineIcon: 'home-outline', animatedIcon: 'home' };
    case 'requests':
      return { label: 'Bookings', icon: 'swap-horizontal', outlineIcon: 'swap-horizontal-outline', animatedIcon: 'activity', badge: pendingRequests };
    case 'messages':
      return { label: 'Messages', icon: 'chatbubbles', outlineIcon: 'chatbubbles-outline', animatedIcon: 'messageSquare', badge: unreadMessages };
    case 'profile':
      return { label: 'Profile', icon: 'person', outlineIcon: 'person-outline', animatedIcon: 'user', dotAlert: kycPending };
    default:
      return { label: routeName, icon: 'ellipse', outlineIcon: 'ellipse-outline', animatedIcon: 'home' };
  }
}

interface TabButtonProps {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  isFocused: boolean;
  options: BottomTabBarProps['descriptors'][string]['options'];
  navigation: BottomTabBarProps['navigation'];
  isSmallDevice: boolean;
  isDark: boolean;
  C: ThemeColors;
  pendingRequests: number;
  unreadMessages: number;
  kycPending: boolean;
}

function TabButton({
  route,
  index,
  isFocused,
  options,
  navigation,
  isSmallDevice,
  isDark,
  C,
  pendingRequests,
  unreadMessages,
  kycPending,
}: TabButtonProps) {
  const meta = getTabMeta(route.name, pendingRequests, unreadMessages, kycPending);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 180,
    });
  }, [isFocused, activeProgress]);

  const activeLayerStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  const inactiveLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
  }));

  const onPress = () => {
    Haptic.select();
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <Pressable
      key={route.key}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel || `${meta.label} tab`}
      accessibilityHint={isFocused ? `Current screen: ${meta.label}` : `Navigates to ${meta.label}`}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={TouchTarget.smallHitSlop}
      android_ripple={{
        color: 'rgba(255, 255, 255, 0.16)',
        borderless: true,
        radius: isSmallDevice ? 24 : 28,
      }}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={styles.tabItem}>
        {/* Inactive Layer: Slate Gray */}
        <Animated.View style={[styles.tabContentLayer, inactiveLayerStyle]} pointerEvents="none">
          <View style={styles.iconContainer}>
            <AnimatedIcon
              name={meta.animatedIcon}
              size={isSmallDevice ? 19 : 22}
              color={C.textSecondary}
            />
            {(meta.badge ?? 0) > 0 ? (
              <TabBadge
                count={meta.badge ?? 0}
                C={C}
                isFocused={false}
                isSmallDevice={isSmallDevice}
                isDark={isDark}
              />
            ) : null}
            {meta.dotAlert && (meta.badge ?? 0) === 0 ? (
              <View
                style={[
                  styles.alertDot,
                  {
                    backgroundColor: C.warning,
                    borderColor: isDark ? '#0F172A' : '#FFFFFF',
                    top: isSmallDevice ? -1 : -2,
                    right: isSmallDevice ? -2 : -3,
                  },
                ]}
              />
            ) : null}
          </View>
          <Text
            style={[
              styles.tabLabel,
              {
                color: C.textSecondary,
                fontSize: isSmallDevice ? 9.5 : 10.5,
              },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {meta.label}
          </Text>
        </Animated.View>

        {/* Active Layer: Crisp White */}
        <Animated.View
          style={[styles.tabContentLayer, styles.tabContentLayerActive, activeLayerStyle]}
          pointerEvents="none"
        >
          <View style={styles.iconContainer}>
            <AnimatedIcon
              name={meta.animatedIcon}
              size={isSmallDevice ? 19 : 22}
              color="#FFFFFF"
              playOnTrigger={isFocused}
            />
            {(meta.badge ?? 0) > 0 ? (
              <TabBadge
                count={meta.badge ?? 0}
                C={C}
                isFocused={true}
                isSmallDevice={isSmallDevice}
                isDark={isDark}
              />
            ) : null}
            {meta.dotAlert && (meta.badge ?? 0) === 0 ? (
              <View
                style={[
                  styles.alertDot,
                  {
                    backgroundColor: C.warning,
                    borderColor: C.primary,
                    top: isSmallDevice ? -1 : -2,
                    right: isSmallDevice ? -2 : -3,
                  },
                ]}
              />
            ) : null}
          </View>
          <Text
            style={[
              styles.tabLabel,
              styles.tabLabelActive,
              {
                color: '#FFFFFF',
                fontSize: isSmallDevice ? 9.5 : 10.5,
              },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {meta.label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function FloatingCapsuleTabBar({
  state,
  descriptors,
  navigation,
  pendingRequests,
  unreadMessages,
  kycPending,
  C,
  isDark,
  insetsBottom,
}: BottomTabBarProps & {
  pendingRequests: number;
  unreadMessages: number;
  kycPending: boolean;
  C: ThemeColors;
  isDark: boolean;
  insetsBottom: number;
}) {
  const { isSmallDevice, isTablet, isLandscape, width: screenWidth } = useResponsive();

  // Responsive geometry calculations across device classes using standard TabBarGeometry
  const isConstrained = isTablet || isLandscape;
  const barHeight = TabBarGeometry.getHeight(isSmallDevice, isTablet);
  const bottomOffset = TabBarGeometry.getBottomOffset(insetsBottom, isSmallDevice);
  const horizontalMargin = isSmallDevice ? 10 : 16;
  const targetBarWidth = isConstrained
    ? Math.min(520, screenWidth - 48)
    : screenWidth - horizontalMargin * 2;

  const [measuredBarWidth, setMeasuredBarWidth] = useState(targetBarWidth);
  const barWidth = measuredBarWidth > 0 ? measuredBarWidth : targetBarWidth;

  // Keep bar width synchronized across window resizes/orientation changes
  useEffect(() => {
    setMeasuredBarWidth(targetBarWidth);
  }, [targetBarWidth]);

  // Filter visible tabs (excluding hidden routes like requests and profile where href: null)
  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => (descriptors[route.key]?.options as any)?.href !== null),
    [state.routes, descriptors]
  );

  const activeVisibleIndex = visibleRoutes.findIndex(
    (route) => route.key === state.routes[state.index]?.key
  );

  const tabCount = visibleRoutes.length;
  const H_PAD = isSmallDevice ? 4 : 6;
  const usableWidth = Math.max(0, barWidth - 2 * H_PAD);
  const slotWidth = tabCount > 0 ? usableWidth / tabCount : 0;
  const sliderWidth = Math.max(
    isSmallDevice ? 48 : 54,
    Math.round(slotWidth - (isSmallDevice ? 4 : 8))
  );
  const sliderHeight = barHeight - (isSmallDevice ? 8 : 10);
  const sliderTop = Math.round((barHeight - sliderHeight) / 2);

  const isMountedRef = useRef(false);
  const initialTargetX = useMemo(() => {
    if (activeVisibleIndex < 0 || slotWidth <= 0) return 0;
    return Math.round(
      H_PAD + activeVisibleIndex * slotWidth + Math.max(0, (slotWidth - sliderWidth) / 2)
    );
  }, [activeVisibleIndex, slotWidth, sliderWidth, H_PAD]);

  const translateX = useSharedValue(initialTargetX);

  useEffect(() => {
    if (activeVisibleIndex >= 0 && slotWidth > 0) {
      const targetX = Math.round(
        H_PAD + activeVisibleIndex * slotWidth + Math.max(0, (slotWidth - sliderWidth) / 2)
      );
      if (!isMountedRef.current) {
        translateX.value = targetX;
        isMountedRef.current = true;
      } else {
        translateX.value = withSpring(targetX, {
          damping: 24,
          stiffness: 280,
          mass: 0.75,
          overshootClamping: false,
        });
      }
    }
  }, [activeVisibleIndex, slotWidth, sliderWidth, H_PAD, translateX]);

  const animatedSliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useMemo(() => {
    if (isConstrained) {
      return {
        bottom: bottomOffset,
        left: (screenWidth - targetBarWidth) / 2,
        width: targetBarWidth,
        height: barHeight,
      };
    }
    return {
      bottom: bottomOffset,
      left: horizontalMargin,
      right: horizontalMargin,
      height: barHeight,
    };
  }, [isConstrained, bottomOffset, screenWidth, targetBarWidth, barHeight, horizontalMargin]);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.tabBarContainer,
        containerStyle,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : C.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : C.cardBorder,
          shadowColor: isDark ? '#000000' : '#0B192C',
          shadowOpacity: isDark ? 0.48 : 0.08,
        },
      ]}
      onLayout={(event) => {
        const measured = Math.round(event.nativeEvent.layout.width);
        if (measured > 0 && Math.abs(measured - barWidth) > 1) {
          setMeasuredBarWidth(measured);
        }
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeSlider,
          {
            top: sliderTop,
            height: sliderHeight,
            width: sliderWidth,
            backgroundColor: C.primary,
            opacity: activeVisibleIndex >= 0 ? 1 : 0,
          },
          animatedSliderStyle,
        ]}
      />

      <View style={[styles.tabRow, { paddingHorizontal: H_PAD }]}>
        {visibleRoutes.map((route, index) => (
          <TabButton
            key={route.key}
            route={route}
            index={index}
            isFocused={activeVisibleIndex === index}
            options={descriptors[route.key]?.options || {}}
            navigation={navigation}
            isSmallDevice={isSmallDevice}
            isDark={isDark}
            C={C}
            pendingRequests={pendingRequests}
            unreadMessages={unreadMessages}
            kycPending={kycPending}
          />
        ))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, requiresProfileSetup } = useAuth();
  const { C, isDark } = useThemeColors();
  const requestsQuery = useRequestsQuery(user?.id);
  const conversationsQuery = useConversationsQuery(user?.id);

  if (isLoading) return null;
  if (!user) return <Redirect href={'/login'} />;
  if (requiresProfileSetup) return <Redirect href={'/kyc'} />;

  const requests = requestsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const pendingRequests = requests.filter(
    (request) => isRequestIncoming(request, user.id) && request.status === 'pending',
  ).length;
  const unreadMessages = conversations.filter(
    (conversation) => conversation.lastMessage && !conversation.lastMessage.read && conversation.lastMessage.senderId !== user.id,
  ).length;
  const isKycApproved = user.kycStatus === 'approved' || Boolean(user.verified);
  const kycPending = !isKycApproved && (!user.kycStatus || user.kycStatus === 'pending');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <FloatingCapsuleTabBar
          {...props}
          pendingRequests={pendingRequests}
          unreadMessages={unreadMessages}
          kycPending={kycPending}
          C={C}
          isDark={isDark}
          insetsBottom={insets.bottom}
        />
      )}
    >
      <Tabs.Screen name={'index'} options={{ title: 'Home' }} />
      <Tabs.Screen name={'requests'} options={{ title: 'Bookings' }} />
      <Tabs.Screen name={'messages'} options={{ title: 'Messages' }} />
      <Tabs.Screen name={'profile'} options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    borderWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    borderRadius: 999,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  activeSlider: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tabContentLayer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
  },
  tabContentLayerActive: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 22,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 13,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  alertDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
});




