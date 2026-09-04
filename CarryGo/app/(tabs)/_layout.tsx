import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { useRef, useEffect, useMemo, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { FeatureFlags } from '@/constants/featureFlags';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { ThemeColors, Motion, Spacing } from '@/constants/theme';

function TabBadge({ count, C }: { count: number; C: ThemeColors }) {
  if (count === 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: C.error, borderColor: C.tabBarBg }]}>
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
  bottomPad,
}: BottomTabBarProps & {
  pendingRequests: number;
  unreadMessages: number;
  kycPending: boolean;
  C: ThemeColors;
  bottomPad: number;
}) {
  const indexAnim = useRef(new Animated.Value(state.index)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.timing(indexAnim, {
      toValue: state.index,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indexAnim, state.index]);

  const tabCount = state.routes.length;
  const slotWidth = barWidth > 0 ? barWidth / tabCount : 0;
  const sliderWidth = slotWidth > 0 ? Math.max(50, slotWidth - 18) : 50;

  const outputRange = useMemo(
    () => state.routes.map((_, i) => i * slotWidth + Math.max(0, (slotWidth - sliderWidth) / 2)),
    [sliderWidth, slotWidth, state.routes]
  );

  const sliderTranslateX = outputRange.length > 1
    ? indexAnim.interpolate({
        inputRange: state.routes.map((_, i) => i),
        outputRange,
        extrapolate: 'clamp',
      })
    : new Animated.Value(0);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          bottom: 16,
          left: 28,
          right: 28,
          height: 66 + bottomPad,
          paddingBottom: bottomPad,
        },
      ]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      <View style={[StyleSheet.absoluteFill, styles.tabBarBg]}>
        <BlurView
          intensity={62}
          tint={C.statusBarStyle === 'light' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: C.statusBarStyle === 'light' ? 'rgba(8,14,20,0.68)' : 'rgba(255,255,255,0.82)' },
          ]}
        />
        <View style={[StyleSheet.absoluteFill, styles.glassEdge]} />
        <View style={styles.glassHighlight} />
      </View>

      {barWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeSlider,
            {
              width: sliderWidth,
              transform: [{ translateX: sliderTranslateX }],
              backgroundColor: C.primaryDark + 'E6',
            },
          ]}
        />
      ) : null}

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tintColor = isFocused ? C.textInverse : C.textMuted;
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
              android_ripple={{ color: C.primarySubtle, borderless: true, radius: 34 }}
              style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <View style={styles.tabItem}>
                <View style={styles.iconContainer}>
                  <Ionicons name={isFocused ? meta.icon : meta.outlineIcon} size={21} color={tintColor} />
                  {(meta.badge ?? 0) > 0 ? <TabBadge count={meta.badge ?? 0} C={C} /> : null}
                  {meta.dotAlert && (meta.badge ?? 0) === 0 ? (
                    <View style={[styles.alertDot, { backgroundColor: C.error, borderColor: C.tabBarBg }]} />
                  ) : null}
                </View>
                <Text
                  style={[styles.tabLabel, { color: tintColor }, isFocused && styles.tabLabelActive]}
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
  const kycPending = FeatureFlags.kycProvider && (!user.kycStatus || user.kycStatus === 'pending');

  const bottomPad = Platform.select({ ios: Math.max(insets.bottom, 10), android: Math.max(insets.bottom, 8), default: 10 });

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
          bottomPad={bottomPad}
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
    paddingTop: 6,
    borderTopWidth: 0,
    elevation: 18,
    shadowColor: '#05130D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabBarBg: {
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.46)',
  },
  glassEdge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 1,
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
    top: 8,
    bottom: 8,
    borderRadius: 999,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    zIndex: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 72,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 24,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 12,
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




