import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptic } from '@/services/haptics.service';

const { width: W } = Dimensions.get('window');
const ONBOARDING_KEY = 'carrygo_onboarding_seen';

const SLIDES = [
  {
    key: 'send',
    eyebrow: 'Send anything, anywhere',
    title: 'Your parcel.\nTheir journey.',
    body: 'Skip the courier. Connect with verified travellers already heading your way — faster, cheaper, and personal.',
    accent: '#4F8EF7',
    accentSoft: '#4F8EF710',
    icon: 'inventory-2' as const,
    details: [
      'Route-matched in seconds',
      'Track every step',
      'Pay only what you agree',
    ],
  },
  {
    key: 'travel',
    eyebrow: 'Earn while you move',
    title: 'Same trip.\nExtra income.',
    body: 'You\'re already going there. Carry a parcel along the way and earn real money — no detours, no hassle.',
    accent: '#22C55E',
    accentSoft: '#22C55E10',
    icon: 'directions-car' as const,
    details: [
      'Set your own price',
      'Choose what you carry',
      'Get paid on delivery',
    ],
  },
  {
    key: 'trust',
    eyebrow: 'Built on trust',
    title: 'Verified people.\nSecure handoffs.',
    body: 'Every user is identity-checked. Every delivery is confirmed with proof. Your parcel is in safe hands.',
    accent: '#F59E0B',
    accentSoft: '#F59E0B10',
    icon: 'verified-user' as const,
    details: [
      'ID verification for all users',
      'Photo proof of delivery',
      'Ratings you can trust',
    ],
  },
];

function SlideIllustration({ icon, accent }: { icon: keyof typeof MaterialIcons.glyphMap; accent: string }) {
  const breathe = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.04, duration: 2400, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 2400, useNativeDriver: true }),
    ])).start();
  }, [breathe]);

  return (
    <View style={ilStyles.wrap}>
      <View style={[ilStyles.ringOuter, { borderColor: accent + '10' }]} />
      <View style={[ilStyles.ringInner, { borderColor: accent + '20' }]} />
      <Animated.View style={[ilStyles.iconCircle, { backgroundColor: accent + '12', borderColor: accent + '30', transform: [{ scale: breathe }] }]}>
        <MaterialIcons name={icon} size={48} color={accent} />
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const slide = SLIDES[activeIndex];
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
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    Haptic.success();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.logo}>CarryGo</Text>
        {!isLast ? (
          <Pressable onPress={handleFinish} style={styles.skipBtn} hitSlop={14}>
            <Text style={styles.skipText}>Skip</Text>
            <MaterialIcons name="arrow-forward" size={14} color="rgba(255,255,255,0.4)" />
          </Pressable>
        ) : null}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        decelerationRate="fast"
      >
        {SLIDES.map((s) => (
          <View key={s.key} style={styles.slide}>
            {/* Illustration */}
            <SlideIllustration icon={s.icon} accent={s.accent} />

            {/* Text content */}
            <View style={styles.textBlock}>
              <Text style={[styles.eyebrow, { color: s.accent }]}>{s.eyebrow}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>

            {/* Details */}
            <View style={styles.detailsList}>
              {s.details.map((d, i) => (
                <View key={i} style={styles.detailRow}>
                  <View style={[styles.detailDot, { backgroundColor: s.accent }]} />
                  <Text style={styles.detailText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Pagination */}
        <View style={styles.pagination}>
          {SLIDES.map((s, idx) => {
            const inputRange = [(idx - 1) * W, idx * W, (idx + 1) * W];
            const width = scrollX.interpolate({ inputRange, outputRange: [8, 32, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
            return (
              <Pressable key={s.key} onPress={() => scrollRef.current?.scrollTo({ x: W * idx, animated: true })} hitSlop={8}>
                <Animated.View style={[styles.dot, { width, opacity, backgroundColor: slide.accent }]} />
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={goNext}
          disabled={finishing}
        >
          <LinearGradient
            colors={[slide.accent, slide.accent + 'DD']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          <MaterialIcons name={isLast ? 'arrow-forward' : 'arrow-forward'} size={20} color="#fff" />
        </Pressable>

        {/* Step counter */}
        <Text style={styles.stepCounter}>{activeIndex + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const ilStyles = StyleSheet.create({
  wrap: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ringOuter: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, borderWidth: 1,
  },
  ringInner: {
    position: 'absolute', width: 150, height: 150,
    borderRadius: 75, borderWidth: 1,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  logo: {
    fontSize: 18, fontWeight: FontWeight.bold, color: '#fff',
    letterSpacing: -0.5,
  },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  skipText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)', fontWeight: FontWeight.medium },

  slide: {
    width: W, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl + 4,
  },

  textBlock: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  eyebrow: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  title: {
    fontSize: 32, fontWeight: FontWeight.bold, color: '#FAFAFA',
    lineHeight: 40, letterSpacing: -0.8, textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md, color: 'rgba(255,255,255,0.5)',
    lineHeight: 24, textAlign: 'center', maxWidth: 300,
  },

  detailsList: { gap: 12, width: '100%', maxWidth: 300 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailDot: { width: 6, height: 6, borderRadius: 3 },
  detailText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: FontWeight.medium },

  bottom: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    gap: Spacing.md, alignItems: 'center',
  },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, width: '100%', paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  ctaText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  stepCounter: { fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: FontWeight.medium },
});
