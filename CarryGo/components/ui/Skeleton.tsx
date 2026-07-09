import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

function ShimmerBar({ width, height = 14, borderRadius = 7, style }: {
  width: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const { C } = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: C.surfaceBorderLight, opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { C } = useThemeColors();

  return (
    <View style={[skeletonStyles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={skeletonStyles.topRow}>
        <ShimmerBar width={44} height={44} borderRadius={14} />
        <View style={skeletonStyles.topText}>
          <ShimmerBar width="70%" height={16} />
          <ShimmerBar width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={skeletonStyles.midRow}>
        <ShimmerBar width="50%" height={12} />
        <ShimmerBar width="30%" height={12} />
      </View>
      <View style={skeletonStyles.bottomRow}>
        <ShimmerBar width={70} height={26} borderRadius={13} />
        <ShimmerBar width={70} height={26} borderRadius={13} />
        <ShimmerBar width={60} height={26} borderRadius={13} />
      </View>
    </View>
  );
}

export function FeedSkeletonList({ count = 3 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={skeletonStyles.list}>
      {items.map(i => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topText: {
    flex: 1,
    gap: 2,
  },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
});
