import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { FeatureFlags } from '@/constants/featureFlags';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { ThemeColors, Motion, Spacing, BorderRadius } from '@/constants/theme';

function TabBadge({ count, bgColor }: { count: number; bgColor: string }) {
  if (count === 0) return null;
  return (
    <View style={[tabStyles.badge, { backgroundColor: bgColor }]}>
      <Text style={tabStyles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function AnimatedTabIcon({
  focused, icon, outlineIcon, color, badge = 0, badgeColor, dotAlert = false,
  C,
}: {
  focused: boolean;
  icon: keyof typeof MaterialIcons.glyphMap | keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof MaterialIcons.glyphMap | keyof typeof Ionicons.glyphMap;
  color: string;
  badge?: number;
  badgeColor?: string;
  dotAlert?: boolean;
  C: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 0.6 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, ...Motion.springDefault }).start();
      Animated.timing(glowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [focused, scale, glowOpacity]);

  return (
    <Animated.View style={[tabStyles.iconWrap, { transform: [{ scale }] }]}>
      {focused ? <Animated.View style={[tabStyles.activeIndicator, { backgroundColor: C.primaryGlow, opacity: glowOpacity }]} /> : null}
      <View style={tabStyles.iconInner}>
        <Ionicons
          name={(focused ? icon : outlineIcon) as keyof typeof Ionicons.glyphMap}
          size={22}
          color={focused ? C.primary : color}
        />
        {badge > 0 && badgeColor ? <TabBadge count={badge} bgColor={badgeColor} /> : null}
        {dotAlert && badge === 0 ? (
          <View style={[tabStyles.alertDot, { backgroundColor: '#EF4444', borderColor: C.tabBarBg }]} />
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, requiresProfileSetup } = useAuth();
  const { C } = useThemeColors();
  const requestsQuery = useRequestsQuery(user?.id);
  const conversationsQuery = useConversationsQuery(user?.id);

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (requiresProfileSetup) return <Redirect href="/profile-setup" />;

  const requests = requestsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const pendingRequests = requests.filter(r => r.travellerId === user.id && r.status === 'pending').length;
  const unreadMessages = conversations.filter(c =>
    c.lastMessage && !c.lastMessage.read && c.lastMessage.senderId !== user.id
  ).length;
  const kycPending = FeatureFlags.kycProvider && (!user.kycStatus || user.kycStatus === 'pending');

  const tabH = Platform.select({ ios: insets.bottom + 64, android: insets.bottom + 68, default: 74 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabH,
          paddingTop: 10,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 10, default: 12 }),
          paddingHorizontal: Spacing.sm,
          backgroundColor: C.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: C.surfaceBorder + '40',
          elevation: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable
            {...props}
            onPress={(e) => {
              Haptic.select();
              props.onPress?.(e);
            }}
            android_ripple={{ color: C.primarySubtle, borderless: true, radius: 28 }}
            style={props.style}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="home" outlineIcon="home-outline" color={color} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="swap-horizontal" outlineIcon="swap-horizontal-outline" color={color} badge={pendingRequests} badgeColor="#EF4444" C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="chatbubbles" outlineIcon="chatbubbles-outline" color={color} badge={unreadMessages} badgeColor="#EF4444" C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="person" outlineIcon="person-outline" color={color} dotAlert={kycPending} C={C} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeIndicator: {
    position: 'absolute', top: -4, width: 36, height: 36,
    borderRadius: 12, opacity: 0.5,
  },
  iconInner: { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 26, width: 26 },
  badge: {
    position: 'absolute', top: -6, right: -10,
    borderRadius: 10,
    minWidth: 17, height: 17,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  alertDot: {
    position: 'absolute', top: -2, right: -3,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5,
  },
});
