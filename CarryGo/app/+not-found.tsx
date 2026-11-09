import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { useResponsive } from '@/hooks/useResponsive';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  const { C, S, isDark } = useThemeColors();
  const { isTablet } = useResponsive();

  const handleHome = () => {
    Haptic.confirm();
    router.replace('/');
  };

  const handleBack = () => {
    Haptic.tap();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={[isDark ? '#00332c' : '#E6F4F1', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 0.6 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
          isTablet && styles.tabletContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Badge & Icon */}
        <View style={[styles.iconWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <View style={[styles.iconGlow, { backgroundColor: C.primarySubtle }]} />
          <MaterialIcons name="wrong-location" size={48} color={C.primary} />
        </View>

        <View style={[styles.codeBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.codeBadgeText, { color: C.primary }]}>404 • ROUTE NOT FOUND</Text>
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>Lost in Transit?</Text>
        <Text style={[styles.message, { color: C.textSecondary }]}>
          The corridor, delivery request, or page you are looking for has departed or does not exist.
        </Text>

        {/* Primary Action Buttons */}
        <View style={styles.actionBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleHome}
          >
            <MaterialIcons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Return to Feed</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleBack}
          >
            <MaterialIcons name="arrow-back" size={18} color={C.textPrimary} />
            <Text style={[styles.secondaryBtnText, { color: C.textPrimary }]}>Go Back</Text>
          </Pressable>
        </View>

        {/* Popular Quick Destinations */}
        <View style={[styles.suggestionsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.suggestionsTitle, { color: C.textMuted }]}>POPULAR DESTINATIONS</Text>
          
          <Pressable
            style={styles.suggestionRow}
            onPress={() => {
              Haptic.select();
              router.push('/search');
            }}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: C.primarySubtle }]}>
              <Ionicons name="search" size={16} color={C.primary} />
            </View>
            <View style={styles.suggestionTextCol}>
              <Text style={[styles.suggestionLabel, { color: C.textPrimary }]}>Search Routes & Corridors</Text>
              <Text style={[styles.suggestionSub, { color: C.textMuted }]}>Find active trips and parcels</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: C.surfaceBorder }]} />

          <Pressable
            style={styles.suggestionRow}
            onPress={() => {
              Haptic.select();
              router.push('/create-parcel');
            }}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="inventory-2" size={16} color="#D97706" />
            </View>
            <View style={styles.suggestionTextCol}>
              <Text style={[styles.suggestionLabel, { color: C.textPrimary }]}>Send a Parcel</Text>
              <Text style={[styles.suggestionSub, { color: C.textMuted }]}>Match with travelers today</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: C.surfaceBorder }]} />

          <Pressable
            style={styles.suggestionRow}
            onPress={() => {
              Haptic.select();
              router.push('/support');
            }}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: '#E0F2FE' }]}>
              <MaterialIcons name="help-outline" size={16} color="#0284C7" />
            </View>
            <View style={styles.suggestionTextCol}>
              <Text style={[styles.suggestionLabel, { color: C.textPrimary }]}>CaryGoo Support</Text>
              <Text style={[styles.suggestionSub, { color: C.textMuted }]}>Get assistance from our team</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.md,
  },
  tabletContainer: {
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
  },
  codeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  codeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  actionBlock: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  suggestionsCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  suggestionsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  suggestionSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
});
