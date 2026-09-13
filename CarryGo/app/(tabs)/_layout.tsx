import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { useRef, useEffect, useMemo, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsive } from '@/hooks/useResponsive';
import { Haptic } from '@/services/haptics.service';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { ThemeColors, TouchTarget } from '@/constants/theme';

function TabBadge({ count, C, isFocused }: { count: number; C: ThemeColors; isFocused?: boolean }) {
  if (count === 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: C.error, borderColor: isFocused ? C.primary : C.card }]}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  dotAlert?: boolean;
};

function getTabMeta(routeName: string, pendingRequests: number, unreadMessages: number, kycPending: boolean): TabMeta {
  switch (routeName) {
    case 'index':
      return { label: 'Home', icon: 'home', outlineIcon: 'home-outline' };
    case 'requests':
      return { label: 'Requests', icon: 'swap-horizontal', outlineIcon: 'swap-horizontal-outline', badge: pendingRequests };
    case 'messages':
      return { label: 'Messages', icon: 'chatbubbles', outlineIcon: 'chatbubbles-outline', badge: unreadMessages };
    case 'profile':
      return { label: 'Profile', icon: 'person', outlineIcon: 'person-outline', dotAlert: kycPending };
    default:
      return { label: routeName, icon: 'ellipse', outlineIcon: 'ellipse-outline' };
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

  // Responsive geometry calculations across device classes
  const isConstrained = isTablet || isLandscape;
  const barHeight = isSmallDevice ? 58 : isTablet ? 66 : 64;
  const bottomOffset = insetsBottom > 0 ? insetsBottom + (isSmallDevice ? 2 : 4) : (isSmallDevice ? 10 : 14);
  const horizontalMargin = isSmallDevice ? 12 : 16;
  const targetBarWidth = isConstrained
    ? Math.min(500, screenWidth - 48)
    : screenWidth - horizontalMargin * 2;

  const [measuredBarWidth, setMeasuredBarWidth] = useState(targetBarWidth);
  const barWidth = measuredBarWidth > 0 ? measuredBarWidth : targetBarWidth;

  // Keep bar width synchronized across window resizes/orientation changes
  useEffect(() => {
    setMeasuredBarWidth(targetBarWidth);
  }, [targetBarWidth]);

  useEffect(() => {
    Animated.timing(indexAnim, {
      toValue: state.index,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indexAnim, state.index]);

  const tabCount = state.routes.length;
  const H_PAD = 6;
  const usableWidth = Math.max(0, barWidth - 2 * H_PAD);
  const slotWidth = tabCount > 0 ? usableWidth / tabCount : 0;
  const sliderWidth = Math.max(isSmallDevice ? 52 : 58, Math.min(slotWidth - 6, isTablet ? 96 : 76));
  const sliderHeight = barHeight - (isSmallDevice ? 12 : 14);
  const sliderTop = Math.round((barHeight - sliderHeight) / 2);

  // Exact pixel-perfect horizontal translation range for each tab
  const outputRange = useMemo(
    () =>
      state.routes.map((_, i) =>
        Math.round(H_PAD + i * slotWidth + Math.max(0, (slotWidth - sliderWidth) / 2))
      ),
    [sliderWidth, slotWidth, state.routes]
  );

  const sliderTranslateX =
    outputRange.length > 1
      ? indexAnim.interpolate({
          inputRange: state.routes.map((_, i) => i),
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
          },
        ]}
      />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
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
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              hitSlop={TouchTarget.smallHitSlop}
              android_ripple={{ color: C.primarySubtle, borderless: true, radius: 28 }}
              style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.tabItem}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isFocused ? meta.icon : meta.outlineIcon}
                    size={isSmallDevice ? 19 : 20}
                    color={tintColor}
                  />
                  {(meta.badge ?? 0) > 0 ? (
                    <TabBadge count={meta.badge ?? 0} C={C} isFocused={isFocused} />
                  ) : null}
                  {meta.dotAlert && (meta.badge ?? 0) === 0 ? (
                    <View
                      style={[
                        styles.alertDot,
                        { backgroundColor: C.error, borderColor: isFocused ? C.primary : C.card },
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
  if (requiresProfileSetup) return <Redirect href={'/profile-setup'} />;

  const requests = requestsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const pendingRequests = requests.filter(
    (request) => request.travellerId === user.id && request.status === 'pending',
  ).length;
  const unreadMessages = conversations.filter(
    (conversation) => conversation.lastMessage && !conversation.lastMessage.read && conversation.lastMessage.senderId !== user.id,
  ).length;
  const isKycApproved = user.kycStatus === 'approved' || Boolean(user.verified) || Boolean(user.isAadhaarVerified);
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
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




