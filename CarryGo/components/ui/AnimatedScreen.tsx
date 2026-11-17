import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInRight,
  ZoomIn,
  LinearTransition,
} from 'react-native-reanimated';

type EntrancePreset =
  | 'fadeUp'
  | 'fadeDown'
  | 'fadeLeft'
  | 'fadeRight'
  | 'fade'
  | 'slideUp'
  | 'slideRight'
  | 'zoomIn'
  | 'hero';

interface AnimatedScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  preset?: EntrancePreset;
  delay?: number;
  duration?: number;
}

const PRESETS = {
  fadeUp: (delay: number, duration: number) =>
    FadeInDown.delay(delay).duration(duration).springify().damping(20).stiffness(90),
  fadeDown: (delay: number, duration: number) =>
    FadeInUp.delay(delay).duration(duration).springify().damping(20).stiffness(90),
  fadeLeft: (delay: number, duration: number) =>
    FadeInRight.delay(delay).duration(duration).springify().damping(18).stiffness(100),
  fadeRight: (delay: number, duration: number) =>
    FadeInLeft.delay(delay).duration(duration).springify().damping(18).stiffness(100),
  fade: (delay: number, duration: number) =>
    FadeIn.delay(delay).duration(duration),
  slideUp: (delay: number, duration: number) =>
    SlideInDown.delay(delay).duration(duration).springify().damping(22).stiffness(120),
  slideRight: (delay: number, duration: number) =>
    SlideInRight.delay(delay).duration(duration).springify().damping(22).stiffness(120),
  zoomIn: (delay: number, duration: number) =>
    ZoomIn.delay(delay).duration(duration).springify().damping(14).stiffness(100),
  hero: (delay: number, duration: number) =>
    FadeInDown.delay(delay).duration(duration).springify().damping(16).stiffness(80),
};

export function AnimatedScreen({
  children,
  style,
  preset = 'fadeUp',
  delay = 0,
  duration = 500,
}: AnimatedScreenProps) {
  const enteringAnimation = PRESETS[preset](delay, duration);

  return (
    <Animated.View
      entering={enteringAnimation}
      layout={LinearTransition.springify().damping(20).stiffness(120)}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </Animated.View>
  );
}

interface StaggerChildProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
  staggerMs?: number;
  preset?: EntrancePreset;
  duration?: number;
}

export function StaggerChild({
  children,
  index,
  style,
  staggerMs = 60,
  preset = 'fadeUp',
  duration = 400,
}: StaggerChildProps) {
  const delay = index * staggerMs;
  const enteringAnimation = PRESETS[preset](delay, duration);

  return (
    <Animated.View entering={enteringAnimation} style={style}>
      {children}
    </Animated.View>
  );
}

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ children, delay = 0, duration = 350, style }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(duration)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function SlideUpView({ children, delay = 0, duration = 450, style }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(duration).springify().damping(18).stiffness(90)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function ZoomInView({ children, delay = 0, duration = 400, style }: FadeInViewProps) {
  return (
    <Animated.View
      entering={ZoomIn.delay(delay).duration(duration).springify().damping(12).stiffness(100)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
