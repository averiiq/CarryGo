import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptic } from '@/services/haptics.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ProductIllustration, ProductIllustrationVariant } from '@/components/illustrations';

const { width: W } = Dimensions.get('window');
const ONBOARDING_KEY = 'carrygo_onboarding_seen';

const SLIDES = [
  {
    key: 'match',
    eyebrow: 'Route matching',
    title: 'Send parcels with people already on that route.',
    body: 'Choose a trip, lock price up front, and follow each handoff in real time.',
    icon: 'route' as const,
    illustration: 'route' as ProductIllustrationVariant,
    details: ['Match in seconds', 'Transparent pricing', 'Live updates'],
  },
  {
    key: 'earn',
    eyebrow: 'Earn on your trip',
    title: 'Turn spare luggage space into extra income.',
    body: 'Post your trip once, accept what you can carry, and get paid after delivery proof.',
    icon: 'payments' as const,
    illustration: 'payment' as ProductIllustrationVariant,
    details: ['You control capacity', 'No hidden fees', 'Fast payouts'],
  },
  {
    key: 'trust',
    eyebrow: 'Verified community',
    title: 'Every delivery is identity checked and trackable.',
    body: 'CarryGo combines profile verification, delivery proof, and clear ratings.',
    icon: 'verified-user' as const,
    illustration: 'profile' as ProductIllustrationVariant,
    details: ['Identity checks', 'Photo confirmation', 'Real ratings'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, G } = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== activeIndex && idx >= 0 && idx < SLIDES.length) {
      setActiveIndex(idx);
      Haptic.select();
    }
  }, [activeIndex]);

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
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  };

  return (
    <LinearGradient colors={G.hero} style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
        <Text style={[styles.logo, { color: C.textPrimary }]}>CarryGo</Text>
        {!isLast ? (
          <Pressable onPress={() => void handleFinish()} style={[styles.skipBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]} hitSlop={14}>
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
        {SLIDES.map((slide) => (
          <View key={slide.key} style={styles.slide}>
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
        ))}
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
          style={({ pressed }) => [styles.cta, { backgroundColor: C.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={goNext}
          disabled={finishing}
        >
          <Text style={[styles.ctaText, { color: C.textInverse }]}>{isLast ? 'Get Started' : 'Continue'}</Text>
          <MaterialIcons name="arrow-forward" size={18} color={C.textInverse} />
        </Pressable>

        <Text style={[styles.stepCounter, { color: C.textMuted }]}>{activeIndex + 1} / {SLIDES.length}</Text>
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
  logo: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
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
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl + 4,
  },
  illustrationWrap: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  textBlock: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: FontWeight.bold,
    lineHeight: 40,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  detailsList: { gap: 12, width: '100%', maxWidth: 300 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailDot: { width: 6, height: 6, borderRadius: 3 },
  detailText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
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
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ctaText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  stepCounter: { fontSize: 11, fontWeight: FontWeight.medium },
});
