import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

const ONBOARDING_KEY = 'carrygo_onboarding_seen';

export default function IndexPage() {
  const { isAuthenticated, isLoading, requiresProfileSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const navigate = async () => {
      try {
        if (isAuthenticated) {
          const target = requiresProfileSetup ? '/profile-setup' : '/(tabs)';
          router.replace(target as any);
          return;
        }
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (seen) {
          router.replace('/login');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/login');
      }
    };
    const timer = setTimeout(navigate, 120);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, requiresProfileSetup]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="local-shipping" size={30} color={Colors.textInverse} />
        </View>
        <Text style={styles.logoText}>CarryGo</Text>
      </View>
      <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: Spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoCircle: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: -1 },
});
