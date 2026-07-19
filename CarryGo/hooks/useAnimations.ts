import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { Motion } from '@/constants/theme';

export function usePulse(duration = 2200, enabled = true) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.08, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, enabled]);

  return anim;
}

export function useBreathing(min = 0.92, max = 1, duration = 3000, enabled = true) {
  const anim = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, min, max, duration, enabled]);

  return anim;
}

export function useGlowPulse(min = 0.4, max = 1, duration = 2000, enabled = true) {
  const anim = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, min, max, duration, enabled]);

  return anim;
}

export function useFadeIn(delay = 0, duration = 500) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...Motion.springGentle }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [opacity, translateY, delay, duration]);

  return { opacity, transform: [{ translateY }] };
}

export function useStaggeredList(count: number, staggerDelay = 80) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    const animations = anims.slice(0, count).map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 400, delay: i * staggerDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(a.translateY, { toValue: 0, delay: i * staggerDelay, useNativeDriver: true, ...Motion.springGentle }),
      ])
    );
    Animated.parallel(animations).start();
  }, [anims, count, staggerDelay]);

  return anims;
}

export function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue: Motion.pressScale, useNativeDriver: true, ...Motion.springFast }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

export function useShimmer(duration = 1500) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);

  return anim;
}

export function useScaleEntrance(delay = 0, duration = 400) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...Motion.springBouncy }),
        Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [scale, opacity, delay, duration]);

  return { scale, opacity };
}

export function useWobble(duration = 4000) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: duration / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [rotate, duration]);

  return rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '2deg'],
  });
}

export function useInteractivePress(scaleDown = 0.94) {
  const scale = useRef(new Animated.Value(1)).current;
  const brightness = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleDown, useNativeDriver: true, tension: 300, friction: 20 }),
      Animated.timing(brightness, { toValue: 0.92, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [scale, brightness, scaleDown]);

  const onPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(brightness, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scale, brightness]);

  return { scale, brightness, onPressIn, onPressOut };
}

export function useSpringEntrance(delay = 0) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 10 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 140, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [scale, opacity, translateY, delay]);

  return { scale, opacity, translateY };
}

export function useFloating(amplitude = 6, duration = 3000) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -amplitude, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: amplitude, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [translateY, amplitude, duration]);

  return translateY;
}

export function useSuccessBurst() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    scale.setValue(0);
    opacity.setValue(1);
    rotation.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 200, friction: 6 }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 600, delay: 400, useNativeDriver: true }),
      ]),
      Animated.timing(rotation, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return { scale, opacity, rotate, trigger };
}

export function useElasticScale(targetScale = 1, delay = 0) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.spring(scale, {
        toValue: targetScale,
        useNativeDriver: true,
        tension: 120,
        friction: 5,
      }).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [scale, targetScale, delay]);

  return scale;
}

export function useSlideIn(direction: 'left' | 'right' | 'up' | 'down' = 'up', distance = 40, delay = 0) {
  const translate = useRef(new Animated.Value(
    direction === 'up' ? distance : direction === 'down' ? -distance : direction === 'left' ? distance : -distance
  )).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [translate, opacity, delay]);

  const isHorizontal = direction === 'left' || direction === 'right';
  const transform = isHorizontal ? [{ translateX: translate }] : [{ translateY: translate }];

  return { opacity, transform };
}

export function useHeartbeat(interval = 3000, scale = 1.15) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: scale, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 100, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: scale * 0.95, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.delay(interval - 440),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, interval, scale]);

  return anim;
}

export function useTypewriter(totalChars: number, speed = 40) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: totalChars,
      duration: totalChars * speed,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progress, totalChars, speed]);

  return progress;
}

export function useRipple() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  const trigger = useCallback(() => {
    scale.setValue(0);
    opacity.setValue(0.5);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return { scale, opacity, trigger };
}

export function useMicroBounce(trigger: boolean) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    translateY.setValue(0);
    Animated.sequence([
      Animated.timing(translateY, { toValue: -8, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
  }, [translateY, trigger]);

  return translateY;
}
