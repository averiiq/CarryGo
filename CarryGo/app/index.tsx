import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const ONBOARDING_KEY = 'carrygo_onboarding_seen';

export default function IndexPage() {
  const { isAuthenticated, isLoading, requiresProfileSetup } = useAuth();
  const { C } = useThemeColors();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      try {
        if (isAuthenticated) {
          const target = requiresProfileSetup ? '/kyc' : '/(tabs)';
          router.replace(target as Href);
          return;
        }

        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        router.replace(seen ? '/login' : '/onboarding');
      } catch {
        router.replace('/login');
      }
    })();
  }, [isAuthenticated, isLoading, requiresProfileSetup, router]);

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Centered Logo Box */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('@/assets/images/splash-logo.png')}
          style={styles.splashLogo}
          contentFit="contain"
          priority="high"
          accessibilityLabel="CaryGoo - Move . Connect . Deliver"
        />
      </Animated.View>

      {/* Subtle Loading & Brand Footer */}
      <View style={styles.footer}>
        <ActivityIndicator color={C.primary} size="small" />
        <Text style={[styles.footerText, { color: C.textMuted }]}>
          Move • Connect • Deliver
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  splashLogo: {
    width: 260,
    height: 260,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  },
});
