import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

const ONBOARDING_KEY = 'carrygo_onboarding_seen';

export default function IndexPage() {
  const { isAuthenticated, isLoading, requiresProfileSetup } = useAuth();
  const { C } = useThemeColors();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      try {
        if (isAuthenticated) {
          const target = requiresProfileSetup ? '/profile-setup' : '/(tabs)';
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
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      <View style={styles.logoRow}>
        <View style={[styles.logoCircle, { backgroundColor: C.primary }]}> 
          <MaterialIcons name="local-shipping" size={30} color={C.textInverse} />
        </View>
        <Text style={[styles.logoText, { color: C.textPrimary }]}>CarryGo</Text>
      </View>
      <ActivityIndicator color={C.primary} size="large" style={{ marginTop: Spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
});
