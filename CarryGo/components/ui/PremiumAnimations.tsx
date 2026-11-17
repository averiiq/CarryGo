import React, { useCallback } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp, Insets, AccessibilityRole } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeIn,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Haptic } from '@/services/haptics.service';

const SPRING_PRESS = { damping: 15, stiffness: 400, mass: 0.4 };
const SPRING_RELEASE = { damping: 12, stiffness: 200, mass: 0.5 };
const SPRING_BOUNCE = { damping: 8, stiffness: 300, mass: 0.5 };

// Premium pressable with butter-smooth spring physics (runs on UI thread)
interface ReanimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  disabled?: boolean;
  haptic?: boolean;
  hitSlop?: Insets;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  bounceOnMount?: boolean;
}

export function ReanimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  scaleDown = 0.96,
  disabled,
  haptic = true,
  hitSlop,
  accessibilityRole,
  accessibilityLabel,
  bounceOnMount = false,
}: ReanimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, SPRING_PRESS);
    opacity.value = withTiming(0.92, { duration: 80 });
  }, [scale, opacity, scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RELEASE);
    opacity.value = withTiming(1, { duration: 120 });
  }, [scale, opacity]);

  const handlePress = useCallback(() => {
    if (haptic) Haptic.tap();
    // Micro-bounce on tap for satisfying feedback
    scale.value = withSequence(
      withSpring(1.02, { damping: 15, stiffness: 500 }),
      withSpring(1, SPRING_RELEASE),
    );
    onPress?.();
  }, [haptic, onPress, scale]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        entering={bounceOnMount ? FadeInDown.duration(400).springify().damping(14).stiffness(100) : undefined}
        style={[style, animStyle]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Animated card with 3D tilt and glow on press
interface AnimatedCardPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleDown?: number;
}

export function AnimatedCardPressable({
  children,
  onPress,
  style,
  disabled,
  scaleDown = 0.978,
}: AnimatedCardPressableProps) {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.06);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, SPRING_PRESS);
    shadowOpacity.value = withTiming(0.12, { duration: 100 });
  }, [scale, shadowOpacity, scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCE);
    shadowOpacity.value = withTiming(0.06, { duration: 200 });
  }, [scale, shadowOpacity]);

  const handlePress = useCallback(() => {
    Haptic.select();
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Breathing pulse animation (for live indicators)
interface BreathingPulseProps {
  color: string;
  size?: number;
}

export function BreathingPulse({ color, size = 8 }: BreathingPulseProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    const animate = () => {
      pulseScale.value = withSequence(
        withTiming(2.4, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      );
      pulseOpacity.value = withSequence(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 }),
      );
    };

    animate();
    const interval = setInterval(animate, 1500);
    return () => clearInterval(interval);
  }, [pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

// Number counter animation
interface AnimatedCounterProps {
  value: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedCounter({ value }: AnimatedCounterProps) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSequence(
      withSpring(1.25, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
  }, [value, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animStyle} />;
}

// Staggered feed item wrapper (for FlatList items)
interface StaggeredFeedItemProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
}

export function StaggeredFeedItem({ children, index, style }: StaggeredFeedItemProps) {
  // Cap stagger delay to avoid excessively delayed items
  const delay = Math.min(index * 50, 300);

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(350).springify().damping(18).stiffness(90)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Shimmer effect for skeleton loaders
interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const shimmerTranslate = useSharedValue(-1);

  React.useEffect(() => {
    const animate = () => {
      shimmerTranslate.value = -1;
      shimmerTranslate.value = withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      });
    };

    animate();
    const interval = setInterval(animate, 1800);
    return () => clearInterval(interval);
  }, [shimmerTranslate]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shimmerTranslate.value,
      [-1, 0, 1],
      [0.3, 0.7, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
        },
        shimmerStyle,
        style,
      ]}
    />
  );
}

// Entrance animation that plays once per mount
interface EntranceAnimProps {
  children: React.ReactNode;
  delay?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

export function EntranceAnim({ children, delay = 0, translateY = 20, style }: EntranceAnimProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(1, { damping: 18, stiffness: 90, mass: 0.8 }),
    );
  }, [progress, delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [translateY, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}
