import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp, Insets, AccessibilityRole, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Extrapolation,
  Easing,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { Haptic } from '@/services/haptics.service';

export interface AnimatedPressableProps {
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
}

export function AnimatedPressable({
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
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: pressOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400, mass: 0.4 });
    pressOpacity.value = withTiming(0.92, { duration: 80 });
  }, [scale, pressOpacity, scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 });
    pressOpacity.value = withTiming(1, { duration: 120 });
  }, [scale, pressOpacity]);

  const handlePress = useCallback(() => {
    if (haptic) Haptic.tap();
    // Satisfying micro-bounce on tap
    scale.value = withSequence(
      withSpring(1.015, { damping: 15, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
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
      <Animated.View style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const PressableScale = AnimatedPressable;

interface PulsingDotProps {
  color: string;
  size?: number;
}

export function PulsingDot({ color, size = 8 }: PulsingDotProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    // Continuous breathing pulse on the UI thread
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(2.2, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [pulseScale, pulseOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

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
          },
          ringStyle,
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
  const indicatorScale = useSharedValue(active ? 1 : 0);
  const breathe = useSharedValue(1);

  React.useEffect(() => {
    indicatorScale.value = withSpring(active ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [active, indicatorScale]);

  React.useEffect(() => {
    if (!active) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [active, breathe]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: indicatorScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <Animated.View style={containerStyle}>
      <Animated.View
        style={[
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: color + '30',
            position: 'absolute',
            top: -3,
            left: -3,
          },
          glowStyle,
        ]}
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
  const badgeScale = useSharedValue(count > 0 ? 1 : 0);
  const prevCountRef = React.useRef(count);

  React.useEffect(() => {
    const prev = prevCountRef.current;
    if (count > 0 && prev === 0) {
      // Pop in
      badgeScale.value = 0;
      badgeScale.value = withSpring(1, { damping: 6, stiffness: 250 });
    } else if (count === 0 && prev > 0) {
      // Shrink out
      badgeScale.value = withSpring(0, { damping: 14, stiffness: 200 });
    } else if (count > prev) {
      // Bump animation on increment
      badgeScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 8, stiffness: 300 }),
      );
    }
    prevCountRef.current = count;
  }, [count, badgeScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badge, { backgroundColor: color }, badgeStyle]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function SlideUp({ children, delay = 0, style }: SlideUpProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify().damping(18).stiffness(90)}
      style={style}
    >
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
  return (
    <Animated.View
      entering={ZoomIn.delay(delay).duration(350).springify().damping(10).stiffness(160)}
      style={style}
    >
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
