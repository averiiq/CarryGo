import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, Animated, StyleSheet, Easing, Platform } from 'react-native';
import { useRef, useEffect, useMemo, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { ThemeColors, TouchTarget, TabBarGeometry } from '@/constants/theme';
import { isRequestIncoming } from '@/services/requests.service';

import { AnimatedIcon, type AnimatedIconName } from '@/components';

function TabBadge({
  count,
  C,
  isFocused,
  isSmallDevice,
}: {
  count: number;
  C: ThemeColors;
  isFocused?: boolean;
  isSmallDevice?: boolean;
}) {
  if (count === 0) return null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: C.error,
          borderColor: isFocused ? C.primary : C.card,
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
      return { label: 'Requests', icon: 'swap-horizontal', outlineIcon: 'swap-horizontal-outline', animatedIcon: 'activity', badge: pendingRequests };
    case 'messages':
      return { label: 'Messages', icon: 'chatbubbles', outlineIcon: 'chatbubbles-outline', animatedIcon: 'messageSquare', badge: unreadMessages };
    case 'profile':
      return { label: 'Profile', icon: 'person', outlineIcon: 'person-outline', animatedIcon: 'user', dotAlert: kycPending };
    default:
      return { label: routeName, icon: 'ellipse', outlineIcon: 'ellipse-outline', animatedIcon: 'home' };
  }
}

function FloatingCapsuleTabBar({
  state,
  descriptors,
  navigation,
  pendingRequests,
  unreadMessages,
  kycPending,
  C,
  insetsBottom,
}: BottomTabBarProps & {
  pendingRequests: number;
  unreadMessages: number;
  kycPending: boolean;
  C: ThemeColors;
  insetsBottom: number;
}) {
  const { isSmallDevice, isTablet, isLandscape, width: screenWidth } = useResponsive();
  const indexAnim = useRef(new Animated.Value(state.index)).current;

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

  useEffect(() => {
    if (activeVisibleIndex >= 0) {
      Animated.timing(indexAnim, {
        toValue: activeVisibleIndex,
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [indexAnim, activeVisibleIndex]);

  const tabCount = visibleRoutes.length;
  const H_PAD = isSmallDevice ? 4 : 6;
  const usableWidth = Math.max(0, barWidth - 2 * H_PAD);
  const slotWidth = tabCount > 0 ? usableWidth / tabCount : 0;
  const sliderWidth = Math.max(
    isSmallDevice ? 48 : 54,
    Math.min(slotWidth - (isSmallDevice ? 4 : 8), isTablet ? 96 : 74)
  );
  const sliderHeight = barHeight - (isSmallDevice ? 10 : 12);
  const sliderTop = Math.round((barHeight - sliderHeight) / 2);

  // Exact pixel-perfect horizontal translation range for each tab centered in its slot
  const outputRange = useMemo(
    () =>
      visibleRoutes.map((_, i) =>
        Math.round(H_PAD + i * slotWidth + Math.max(0, (slotWidth - sliderWidth) / 2))
      ),
    [H_PAD, sliderWidth, slotWidth, visibleRoutes]
  );

  const sliderTranslateX =
    outputRange.length > 1 && activeVisibleIndex >= 0
      ? indexAnim.interpolate({
          inputRange: visibleRoutes.map((_, i) => i),
          outputRange,
          extrapolate: 'clamp',
        })
      : new Animated.Value(0);

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
          backgroundColor: C.card,
          borderColor: C.cardBorder,
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
            transform: [{ translateX: sliderTranslateX }],
            backgroundColor: C.primary,
            opacity: activeVisibleIndex >= 0 ? 1 : 0,
          },
        ]}
      />

      <View style={[styles.tabRow, { paddingHorizontal: H_PAD }]}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeVisibleIndex === index;
          const tintColor = isFocused ? '#FFFFFF' : C.textSecondary;
          const meta = getTabMeta(route.name, pendingRequests, unreadMessages, kycPending);

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
                color: C.primarySubtle,
                borderless: true,
                radius: isSmallDevice ? 24 : 28,
              }}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] },
              ]}
            >
              <View style={styles.tabItem}>
                <View style={styles.iconContainer}>
                  <AnimatedIcon
                    name={meta.animatedIcon}
                    size={isSmallDevice ? 19 : 22}
                    color={tintColor}
                    playOnTrigger={isFocused}
                  />
                  {(meta.badge ?? 0) > 0 ? (
                    <TabBadge
                      count={meta.badge ?? 0}
                      C={C}
                      isFocused={isFocused}
                      isSmallDevice={isSmallDevice}
                    />
                  ) : null}
                  {meta.dotAlert && (meta.badge ?? 0) === 0 ? (
                    <View
                      style={[
                        styles.alertDot,
                        {
                          backgroundColor: C.error,
                          borderColor: isFocused ? C.primary : C.card,
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
                      color: tintColor,
                      fontSize: isSmallDevice ? 9.5 : 10.5,
                    },
                    isFocused && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                >
                  {meta.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, requiresProfileSetup } = useAuth();
  const { C } = useThemeColors();
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
          insetsBottom={insets.bottom}
        />
      )}
    >
      <Tabs.Screen name={'index'} options={{ title: 'Home' }} />
      <Tabs.Screen name={'requests'} options={{ title: 'Requests' }} />
      <Tabs.Screen name={'messages'} options={{ title: 'Messages' }} />
      <Tabs.Screen name={'profile'} options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
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
    borderRadius: 999,
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
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
    gap: 2,
    width: '100%',
    height: '100%',
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




