import React, { useCallback, useRef, useEffect } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Haptic } from '@/services/haptics.service';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  disabled?: boolean;
  haptic?: boolean;
}

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  scaleDown = 0.96,
  disabled,
  haptic = true,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleDown,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [scale, scaleDown]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 8,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic) Haptic.tap();
    onPress?.();
  }, [haptic, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface PulsingDotProps {
  color: string;
  size?: number;
}

export function PulsingDot({ color, size = 8 }: PulsingDotProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.pulsingRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      <View
        style={[
          styles.pulsingCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

interface PresenceIndicatorProps {
  active: boolean;
  color?: string;
  size?: number;
}

export function PresenceIndicator({ active, color = '#10B981', size = 10 }: PresenceIndicatorProps) {
  const scale = useRef(new Animated.Value(active ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      tension: 200,
      friction: 12,
    }).start();
  }, [active, scale]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, breathe]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Animated.View
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          backgroundColor: color + '30',
          position: 'absolute',
          top: -3,
          left: -3,
          transform: [{ scale: breathe }],
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#fff',
        }}
      />
    </Animated.View>
  );
}

interface CountBadgeProps {
  count: number;
  color?: string;
}

export function CountBadge({ count, color = '#EF4444' }: CountBadgeProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > 0 && prevCount.current === 0) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 250,
        friction: 6,
      }).start();
    } else if (count === 0 && prevCount.current > 0) {
      Animated.spring(scale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 14,
      }).start();
    } else if (count > prevCount.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, scale]);

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badge, { backgroundColor: color, transform: [{ scale }] }]}>
      <Animated.Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Animated.Text>
    </Animated.View>
  );
}

interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function SlideUp({ children, delay = 0, style }: SlideUpProps) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [translateY, opacity, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScaleIn({ children, delay = 0, style }: ScaleInProps) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [scale, opacity, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pulsingRing: {
    position: 'absolute',
  },
  pulsingCore: {
    position: 'absolute',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
