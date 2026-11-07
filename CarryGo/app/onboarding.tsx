import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Haptic } from '@/services/haptics.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ProductIllustration, ProductIllustrationVariant } from '@/components/illustrations';

export const ONBOARDING_KEY = 'carrygo_onboarding_seen';
export const USER_PERSONA_KEY = 'carrygo_user_persona';
export const USER_HOME_CITY_KEY = 'carrygo_home_city';

export type UserPersona = 'sender' | 'traveler' | 'both';

const SLIDES = [
  {
    key: 'match',
    eyebrow: 'Route matching',
    title: 'Send parcels with people already on that route.',
    body: 'Choose a trip, lock price up front, and follow each handoff in real time.',
    illustration: 'route' as ProductIllustrationVariant,
    details: ['Match in seconds', 'Transparent pricing', 'Live updates'],
  },
  {
    key: 'earn',
    eyebrow: 'Earn on your trip',
    title: 'Turn spare luggage space into extra income.',
    body: 'Post your trip once, accept what you can carry, and get paid after delivery proof.',
    illustration: 'payment' as ProductIllustrationVariant,
    details: ['You control capacity', 'No hidden fees', 'Fast payouts'],
  },
  {
    key: 'trust',
    eyebrow: 'Verified community',
    title: 'Every delivery is identity checked and trackable.',
    body: 'CaryGoo combines profile verification, delivery proof, and clear ratings.',
    illustration: 'profile' as ProductIllustrationVariant,
    details: ['Identity checks', 'Photo confirmation', 'Real ratings'],
  },
  {
    key: 'preferences',
    eyebrow: 'Quick Setup',
    title: 'Personalize your CaryGoo experience.',
    body: 'Tell us how you want to use the platform so we can show relevant listings.',
    illustration: 'profile' as ProductIllustrationVariant,
    details: [],
  },
];

const PERSONA_OPTIONS: { id: UserPersona; label: string; desc: string; icon: any }[] = [
  { id: 'sender', label: 'Send Parcels', desc: 'Fast, secure peer delivery', icon: 'inventory-2' },
  { id: 'traveler', label: 'Travel & Earn', desc: 'Carry parcels during your trips', icon: 'luggage' },
  { id: 'both', label: 'Both', desc: 'Send items and earn on trips', icon: 'all-inclusive' },
];

const POPULAR_HUBS = [
  'Gurugram',
  'Delhi',
  'Faridabad',
  'Panipat',
  'Ambala',
  'Karnal',
  'Rohtak',
  'Hisar',
  'Chandigarh',
];

export default function OnboardingScreen() {
  const { width: W } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, G, isDark } = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Preference capture state
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>('both');
  const [selectedCity, setSelectedCity] = useState<string>('Gurugram');

  const isLast = activeIndex === SLIDES.length - 1;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== activeIndex && idx >= 0 && idx < SLIDES.length) {
      setActiveIndex(idx);
      Haptic.select();
    }
  }, [activeIndex, W]);

  const goNext = () => {
    Haptic.tap();
    if (!isLast) {
      scrollRef.current?.scrollTo({ x: W * (activeIndex + 1), animated: true });
      return;
    }
    void handleFinish();
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    Haptic.success();
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_KEY, 'true'],
        [USER_PERSONA_KEY, selectedPersona],
        [USER_HOME_CITY_KEY, selectedCity],
      ]);
    } catch {
      // Non-blocking fallback
    }
    router.replace('/login');
  };

  return (
    <LinearGradient colors={G.hero} style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require('@/assets/images/logo-horizontal.png')}
          style={{ width: 120, height: 38 }}
          contentFit="contain"
        />
        {!isLast ? (
          <Pressable
            onPress={() => void handleFinish()}
            style={[styles.skipBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
            hitSlop={14}
          >
            <Text style={[styles.skipText, { color: C.textSecondary }]}>Skip</Text>
            <MaterialIcons name="arrow-forward" size={14} color={C.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => {
          if (slide.key === 'preferences') {
            return (
              <View key={slide.key} style={[styles.slide, { width: W }]}>
                <View style={styles.textBlock}>
                  <Text style={[styles.eyebrow, { color: C.primary }]}>{slide.eyebrow}</Text>
                  <Text style={[styles.title, { color: C.textPrimary }]}>{slide.title}</Text>
                  <Text style={[styles.body, { color: C.textSecondary }]}>{slide.body}</Text>
                </View>

                {/* Persona selector */}
                <View style={styles.captureSection}>
                  <Text style={[styles.captureLabel, { color: C.textSecondary }]}>YOUR MAIN GOAL</Text>
                  <View style={styles.personaRow}>
                    {PERSONA_OPTIONS.map((opt) => {
                      const isSelected = selectedPersona === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => {
                            Haptic.select();
                            setSelectedPersona(opt.id);
                          }}
                          style={[
                            styles.personaCard,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? '#00332c' : '#E6F4F1')
                                : C.surface,
                              borderColor: isSelected ? C.primary : C.surfaceBorder,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={opt.icon}
                            size={20}
                            color={isSelected ? C.primary : C.textSecondary}
                          />
                          <Text
                            style={[
                              styles.personaTitle,
                              {
                                color: isSelected ? C.primary : C.textPrimary,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={[styles.personaDesc, { color: C.textMuted }]}>{opt.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Home city selector */}
                <View style={[styles.captureSection, { marginTop: Spacing.md }]}>
                  <Text style={[styles.captureLabel, { color: C.textSecondary }]}>YOUR BASE CITY</Text>
                  <View style={styles.cityChipsWrap}>
                    {POPULAR_HUBS.map((city) => {
                      const isSelected = selectedCity === city;
                      return (
                        <Pressable
                          key={city}
                          onPress={() => {
                            Haptic.select();
                            setSelectedCity(city);
                          }}
                          style={[
                            styles.cityChip,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? '#00332c' : '#E6F4F1')
                                : C.surface,
                              borderColor: isSelected ? C.primary : C.surfaceBorder,
                            },
                          ]}
                        >
                          {isSelected && <MaterialIcons name="check" size={13} color={C.primary} />}
                          <Text
                            style={[
                              styles.cityChipText,
                              {
                                color: isSelected ? C.primary : C.textPrimary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {city}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View key={slide.key} style={[styles.slide, { width: W }]}>
              <View style={styles.illustrationWrap}>
                <ProductIllustration variant={slide.illustration} size={230} />
              </View>

              <View style={styles.textBlock}>
                <Text style={[styles.eyebrow, { color: C.primary }]}>{slide.eyebrow}</Text>
                <Text style={[styles.title, { color: C.textPrimary }]}>{slide.title}</Text>
                <Text style={[styles.body, { color: C.textSecondary }]}>{slide.body}</Text>
              </View>

              <View style={styles.detailsList}>
                {slide.details.map((detail) => (
                  <View key={detail} style={styles.detailRow}>
                    <View style={[styles.detailDot, { backgroundColor: C.primary }]} />
                    <Text style={[styles.detailText, { color: C.textSecondary }]}>{detail}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.pagination}>
          {SLIDES.map((slide, idx) => {
            const inputRange = [(idx - 1) * W, idx * W, (idx + 1) * W];
            const width = scrollX.interpolate({ inputRange, outputRange: [8, 30, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });

            return (
              <Pressable key={slide.key} onPress={() => scrollRef.current?.scrollTo({ x: W * idx, animated: true })} hitSlop={8}>
                <Animated.View style={[styles.dot, { width, opacity, backgroundColor: C.primary }]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, { backgroundColor: C.primaryDark }, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={goNext}
          disabled={finishing}
        >
          <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>{isLast ? 'Complete & Start' : 'Continue'}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable onPress={() => void handleFinish()} hitSlop={10} style={styles.signInLink}>
          <Text style={[styles.signInText, { color: C.textSecondary }]}>
            Already have an account? <Text style={{ color: C.primary, fontWeight: FontWeight.bold }}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  illustrationWrap: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  textBlock: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.lg },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    lineHeight: 34,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  detailsList: { gap: 12, width: '100%', maxWidth: 300 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailDot: { width: 6, height: 6, borderRadius: 3 },
  detailText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  captureSection: {
    width: '100%',
    gap: 8,
  },
  captureLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  personaRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  personaCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  personaTitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  personaDesc: {
    fontSize: 10,
    lineHeight: 13,
  },
  cityChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: FontSize.xs,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ctaText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  signInLink: { paddingVertical: Spacing.xs, alignItems: 'center', justifyContent: 'center' },
  signInText: { fontSize: FontSize.sm },
});
