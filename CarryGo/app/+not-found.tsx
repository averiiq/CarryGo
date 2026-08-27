import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={[C.primarySubtle, 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 0.8 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <View style={[styles.iconGlow, { backgroundColor: C.primarySubtle }]} />
          <MaterialIcons name="explore-off" size={44} color={C.primary} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>We could not find that page</Text>
        <Text style={[styles.message, { color: C.textSecondary }]}>It may have moved, or the link is no longer valid.</Text>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.86 : 1 }]}
          onPress={() => router.replace('/')}
        >
          <MaterialIcons name="home" size={17} color="#fff" />
          <Text style={styles.primaryBtnText}>Go to Home</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.82 : 1 },
          ]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={17} color={C.textSecondary} />
          <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  secondaryBtn: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
