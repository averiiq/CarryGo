import React, { useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import LottieView, { LottieViewProps } from 'lottie-react-native';

export const Animations = {
  packageBox: require('@/assets/animations/package-box.json'),
  deliveryCar: require('@/assets/animations/delivery-car.json'),
  searchEmpty: require('@/assets/animations/search-empty.json'),
  successCheck: require('@/assets/animations/success-check.json'),
  radarMatch: require('@/assets/animations/radar-match.json'),
};

export type AnimationKey = keyof typeof Animations;

interface LottieAnimationProps {
  name?: AnimationKey;
  source?: any;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function LottieAnimation({
  name,
  source,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  testID,
}: LottieAnimationProps) {
  const animationRef = useRef<LottieView>(null);
  const resolvedSource = source || (name ? Animations[name] : null);

  if (!resolvedSource) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <LottieView
        ref={animationRef}
        source={resolvedSource}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={styles.animation}
        renderMode={Platform.OS === 'android' ? 'HARDWARE' : 'AUTOMATIC'}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
