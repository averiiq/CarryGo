import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

// ─── Empty State Animated SVG Components ───────────────────────────────────────

interface EmptyStateProps {
  width?: number;
  height?: number;
}

/** Animated empty inbox / no requests */
export function EmptyRequestsSVG({ width = 200, height = 160 }: EmptyStateProps) {
  const { C } = useThemeColors();
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -8, duration: 1400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    floatAnim.start();
    pulseAnim.start();
    return () => { floatAnim.stop(); pulseAnim.stop(); };
  }, [float, pulse]);

  const primary = C.primary;
  const surface = C.surfaceElevated;
  const border = C.surfaceBorder;
  const textMuted = C.textMuted;

  return (
    <View style={[styles.svgContainer, { width, height }]}>
      {/* Shadow ellipse */}
      <Animated.View style={[styles.shadowEllipse, { backgroundColor: primary + '18', transform: [{ scaleX: pulse }] }]} />

      {/* Floating envelope */}
      <Animated.View style={[styles.envelope, { backgroundColor: surface, borderColor: border, transform: [{ translateY: float }] }]}>
        {/* Envelope flap */}
        <View style={[styles.envelopeFlap, { borderBottomColor: primary + '40', borderLeftColor: 'transparent', borderRightColor: 'transparent' }]} />
        {/* X mark lines */}
        <View style={[styles.xLine1, { backgroundColor: textMuted }]} />
        <View style={[styles.xLine2, { backgroundColor: textMuted }]} />
      </Animated.View>

      {/* Floating dots */}
      <Animated.View style={[styles.dot1, { backgroundColor: primary, transform: [{ translateY: float }] }]} />
      <Animated.View style={[styles.dot2, { backgroundColor: primary + '60', transform: [{ translateY: float }] }]} />
      <Animated.View style={[styles.dot3, { backgroundColor: primary + '30', transform: [{ translateY: float }] }]} />
    </View>
  );
}

/** Animated empty trips */
export function EmptyTripsSVG({ width = 200, height = 160 }: EmptyStateProps) {
  const { C } = useThemeColors();
  const move = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const moveAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(move, { toValue: 12, duration: 1200, useNativeDriver: true }),
        Animated.timing(move, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -5, duration: 600, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    moveAnim.start();
    bounceAnim.start();
    return () => { moveAnim.stop(); bounceAnim.stop(); };
  }, [bounce, move]);

  const primary = C.primary;
  const surface = C.surfaceElevated;
  const border = C.surfaceBorder;

  return (
    <View style={[styles.svgContainer, { width, height }]}>
      {/* Road */}
      <View style={[styles.road, { backgroundColor: surface, borderColor: border }]}>
        <View style={[styles.roadLine, { backgroundColor: primary + '40' }]} />
        <View style={[styles.roadLine, { backgroundColor: primary + '40' }]} />
      </View>

      {/* Moving car */}
      <Animated.View style={[styles.car, { backgroundColor: primary, transform: [{ translateX: move }, { translateY: bounce }] }]}>
        <View style={[styles.carRoof, { backgroundColor: primary + 'CC' }]} />
        <View style={[styles.carWheel1, { backgroundColor: surface, borderColor: border }]} />
        <View style={[styles.carWheel2, { backgroundColor: surface, borderColor: border }]} />
      </Animated.View>

      {/* Speed lines */}
      <Animated.View style={[styles.speedLine1, { backgroundColor: primary + '30', transform: [{ translateX: move }] }]} />
      <Animated.View style={[styles.speedLine2, { backgroundColor: primary + '20', transform: [{ translateX: move }] }]} />
    </View>
  );
}

/** Animated empty parcels */
export function EmptyParcelsSVG({ width = 200, height = 160 }: EmptyStateProps) {
  const { C } = useThemeColors();
  const float = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1600, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    const rotateAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    floatAnim.start();
    rotateAnim.start();
    return () => { floatAnim.stop(); rotateAnim.stop(); };
  }, [float, rotate]);

  const rot = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const primary = C.primary;
  const warning = C.warning;

  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <View style={[styles.shadowEllipse, { backgroundColor: warning + '18' }]} />

      <Animated.View style={[styles.box, { backgroundColor: warning + '20', borderColor: warning + '40', transform: [{ translateY: float }, { rotate: rot }] }]}>
        {/* Box cross lines */}
        <View style={[styles.boxLine, { backgroundColor: warning + '60' }]} />
        <View style={[styles.boxLineH, { backgroundColor: warning + '60' }]} />
        {/* Plus symbol */}
        <View style={[styles.plus, { backgroundColor: primary }]} />
      </Animated.View>

      {/* Stars */}
      <Animated.View style={[styles.star1, { backgroundColor: warning, transform: [{ translateY: float }] }]} />
      <Animated.View style={[styles.star2, { backgroundColor: primary, transform: [{ translateY: float }] }]} />
    </View>
  );
}

/** Animated empty messages */
export function EmptyMessagesSVG({ width = 200, height = 160 }: EmptyStateProps) {
  const { C } = useThemeColors();
  const float = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -6, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    const makeDotAnim = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const dot1Anim = makeDotAnim(dot1, 0);
    const dot2Anim = makeDotAnim(dot2, 200);
    const dot3Anim = makeDotAnim(dot3, 400);
    floatAnim.start();
    dot1Anim.start();
    dot2Anim.start();
    dot3Anim.start();
    return () => { floatAnim.stop(); dot1Anim.stop(); dot2Anim.stop(); dot3Anim.stop(); };
  }, [dot1, dot2, dot3, float]);

  const primary = C.primary;
  const surface = C.surfaceElevated;
  const border = C.surfaceBorder;

  return (
    <View style={[styles.svgContainer, { width, height }]}>
      {/* Chat bubbles */}
      <Animated.View style={[styles.bubble1, { backgroundColor: primary, transform: [{ translateY: float }] }]}>
        <View style={[styles.bubbleTail1, { borderTopColor: primary }]} />
      </Animated.View>

      <Animated.View style={[styles.bubble2, { backgroundColor: surface, borderColor: border, transform: [{ translateY: float }] }]}>
        <View style={[styles.bubbleTail2, { borderTopColor: surface }]} />
        {/* Typing dots */}
        <Animated.View style={[styles.typingDot, { backgroundColor: C.textMuted, opacity: dot1 }]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: C.textMuted, opacity: dot2 }]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: C.textMuted, opacity: dot3 }]} />
      </Animated.View>
    </View>
  );
}

/** Animated empty transactions */
export function EmptyTransactionsSVG({ width = 200, height = 160 }: EmptyStateProps) {
  const { C } = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scaleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -8, duration: 1400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    scaleAnim.start();
    floatAnim.start();
    return () => { scaleAnim.stop(); floatAnim.stop(); };
  }, [float, scale]);

  const success = C.success;
  const warning = C.warning;

  return (
    <View style={[styles.svgContainer, { width, height }]}>
      <View style={[styles.shadowEllipse, { backgroundColor: success + '18' }]} />
      <Animated.View style={[styles.coin, { backgroundColor: warning, transform: [{ translateY: float }, { scale }] }]}>
        <View style={[styles.coinInner, { borderColor: warning + '40' }]} />
        <View style={[styles.rupeeBar, { backgroundColor: '#000' }]} />
      </Animated.View>
      <Animated.View style={[styles.sparkle1, { backgroundColor: success, transform: [{ translateY: float }] }]} />
      <Animated.View style={[styles.sparkle2, { backgroundColor: warning, transform: [{ translateY: float }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Shadow
  shadowEllipse: {
    position: 'absolute',
    bottom: 10,
    width: 100,
    height: 20,
    borderRadius: 50,
  },

  // Empty requests - envelope
  envelope: {
    width: 90,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 32,
    borderLeftWidth: 45,
    borderRightWidth: 45,
  },
  xLine1: { width: 28, height: 2.5, borderRadius: 2, transform: [{ rotate: '45deg' }], position: 'absolute' },
  xLine2: { width: 28, height: 2.5, borderRadius: 2, transform: [{ rotate: '-45deg' }], position: 'absolute' },
  dot1: { position: 'absolute', top: 20, left: 30, width: 8, height: 8, borderRadius: 4 },
  dot2: { position: 'absolute', top: 35, right: 25, width: 6, height: 6, borderRadius: 3 },
  dot3: { position: 'absolute', bottom: 20, left: 40, width: 5, height: 5, borderRadius: 2.5 },

  // Empty trips - road + car
  road: {
    position: 'absolute',
    bottom: 22,
    left: 10,
    right: 10,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    gap: 6,
  },
  roadLine: { width: 18, height: 4, borderRadius: 2 },
  car: {
    position: 'absolute',
    bottom: 30,
    width: 52,
    height: 28,
    borderRadius: 8,
  },
  carRoof: { position: 'absolute', top: -14, left: 8, width: 32, height: 16, borderRadius: 8 },
  carWheel1: { position: 'absolute', bottom: -6, left: 6, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  carWheel2: { position: 'absolute', bottom: -6, right: 6, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  speedLine1: { position: 'absolute', bottom: 42, left: 10, width: 30, height: 3, borderRadius: 2 },
  speedLine2: { position: 'absolute', bottom: 52, left: 18, width: 20, height: 2, borderRadius: 1 },

  // Empty parcels - box
  box: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', marginLeft: -1, width: 2, borderRadius: 1 },
  boxLineH: { position: 'absolute', left: 0, right: 0, top: '40%', height: 2, borderRadius: 1 },
  plus: { width: 24, height: 4, borderRadius: 2 },
  star1: { position: 'absolute', top: 14, right: 22, width: 8, height: 8, borderRadius: 4 },
  star2: { position: 'absolute', bottom: 18, left: 24, width: 6, height: 6, borderRadius: 3 },

  // Empty messages - chat bubbles
  bubble1: {
    position: 'absolute',
    top: 18,
    left: 20,
    width: 80,
    height: 36,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleTail1: {
    position: 'absolute',
    bottom: -8,
    left: 10,
    borderTopWidth: 9,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubble2: {
    position: 'absolute',
    bottom: 22,
    right: 16,
    width: 84,
    height: 38,
    borderRadius: 19,
    borderBottomRightRadius: 4,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  bubbleTail2: {
    position: 'absolute',
    bottom: -10,
    right: 10,
    borderTopWidth: 10,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Empty transactions - coin
  coin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 3 },
  rupeeBar: { width: 22, height: 3, borderRadius: 2, marginTop: 2 },
  sparkle1: { position: 'absolute', top: 16, right: 24, width: 9, height: 9, borderRadius: 4.5 },
  sparkle2: { position: 'absolute', bottom: 22, left: 26, width: 7, height: 7, borderRadius: 3.5 },
});
