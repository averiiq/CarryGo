import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { useRef, useEffect } from 'react';
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

function AnimatedTabIcon({
  focused, icon, outlineIcon, label, color, badge = 0, dotAlert = false, C,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  outlineIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  badge?: number;
  dotAlert?: boolean;
  C: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const translateY = useRef(new Animated.Value(focused ? -2 : 0)).current;
  const pillWidth = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springFast }),
        Animated.spring(translateY, { toValue: -2, useNativeDriver: true, ...Motion.springFast }),
        Animated.timing(pillWidth, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, ...Motion.springDefault }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...Motion.springDefault }),
        Animated.timing(pillWidth, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }
  }, [focused, scale, translateY, pillWidth]);

  const indicatorWidth = pillWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });

  return (
    <Animated.View style={[styles.tabItem, { transform: [{ scale }, { translateY }] }]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={focused ? icon : outlineIcon}
          size={23}
          color={focused ? C.primary : color}
        />
        {badge > 0 && <TabBadge count={badge} C={C} />}
        {dotAlert && badge === 0 && (
          <View style={[styles.alertDot, { backgroundColor: C.error, borderColor: C.tabBarBg }]} />
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? C.primary : C.textMuted },
          focused && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: C.primary, width: indicatorWidth },
        ]}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, requiresProfileSetup } = useAuth();
  const { C, isDark } = useThemeColors();
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

  const bottomPad = Platform.select({ ios: insets.bottom, android: Math.max(insets.bottom, 8), default: 8 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70 + bottomPad,
          paddingBottom: bottomPad,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBg]}>
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(8,8,20,0.82)' : 'rgba(255,255,255,0.88)' },
            ]} />
            <View style={[styles.tabBarTopBorder, { backgroundColor: C.surfaceBorder + '50' }]} />
          </View>
        ),
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarShowLabel: false,
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable
            {...props}
            onPress={(e) => {
              Haptic.select();
              props.onPress?.(e);
            }}
            android_ripple={{ color: C.primarySubtle, borderless: true, radius: 30 }}
            style={[props.style, styles.tabButton]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="home" outlineIcon="home-outline" label="Home" color={color} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="swap-horizontal" outlineIcon="swap-horizontal-outline" label="Requests" color={color} badge={pendingRequests} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="chatbubbles" outlineIcon="chatbubbles-outline" label="Messages" color={color} badge={unreadMessages} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon="person" outlineIcon="person-outline" label="Profile" color={color} dotAlert={kycPending} C={C} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBg: {
    overflow: 'hidden',
  },
  tabBarTopBorder: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 0.5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 56,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
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
