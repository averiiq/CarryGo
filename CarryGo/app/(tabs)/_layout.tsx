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
  focused,
  icon,
  outlineIcon,
  label,
  color,
  badge = 0,
  dotAlert = false,
  C,
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
  const scale = useRef(new Animated.Value(focused ? 1 : 0.94)).current;
  const translateY = useRef(new Animated.Value(focused ? -1 : 0)).current;
  const pillWidth = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springFast }),
        Animated.spring(translateY, { toValue: -1, useNativeDriver: true, ...Motion.springFast }),
        Animated.timing(pillWidth, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(pillOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, ...Motion.springDefault }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...Motion.springDefault }),
      Animated.timing(pillWidth, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      Animated.timing(pillOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start();
  }, [focused, scale, translateY, pillWidth, pillOpacity]);

  const indicatorWidth = pillWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

  return (
    <Animated.View style={[styles.tabItem, { transform: [{ scale }, { translateY }] }]}> 
      <Animated.View style={[styles.focusPill, { backgroundColor: C.primaryDark, opacity: pillOpacity }]} />
      <View style={styles.iconContainer}>
        <Ionicons
          name={focused ? icon : outlineIcon}
          size={23}
          color={focused ? C.textInverse : color}
        />
        {badge > 0 && <TabBadge count={badge} C={C} />}
        {dotAlert && badge === 0 && (
          <View style={[styles.alertDot, { backgroundColor: C.error, borderColor: C.tabBarBg }]} />
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? C.textInverse : C.textMuted },
          focused && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: focused ? C.primaryLight : C.primary, width: indicatorWidth },
        ]}
      />
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

  const bottomPad = Platform.select({ ios: Math.max(insets.bottom, 8), android: Math.max(insets.bottom, 8), default: 8 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 10,
          left: 12,
          right: 12,
          height: 64 + bottomPad,
          paddingBottom: bottomPad,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#173A2A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          borderRadius: 24,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBg]}>
            <BlurView
              intensity={56}
              tint={'light'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(255,255,255,0.9)' },
              ]}
            />
            <View style={[styles.tabBarTopBorder, { backgroundColor: C.surfaceBorder + '88' }]} />
          </View>
        ),
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarShowLabel: false,
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable
            {...props}
            onPress={(event) => {
              Haptic.select();
              props.onPress?.(event);
            }}
            android_ripple={{ color: C.primarySubtle, borderless: true, radius: 34 }}
            style={[props.style, styles.tabButton]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name={'index'}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon={'home'} outlineIcon={'home-outline'} label={'Home'} color={color} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name={'requests'}
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon={'swap-horizontal'} outlineIcon={'swap-horizontal-outline'} label={'Requests'} color={color} badge={pendingRequests} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name={'messages'}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon={'chatbubbles'} outlineIcon={'chatbubbles-outline'} label={'Messages'} color={color} badge={unreadMessages} C={C} />
          ),
        }}
      />
      <Tabs.Screen
        name={'profile'}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} icon={'person'} outlineIcon={'person-outline'} label={'Profile'} color={color} dotAlert={kycPending} C={C} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBg: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(221,229,219,0.9)',
  },
  tabBarTopBorder: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 62,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  focusPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    height: 2,
    borderRadius: 2,
    marginTop: 1,
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
