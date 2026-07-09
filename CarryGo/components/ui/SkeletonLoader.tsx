import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = BorderRadius.sm, style }: SkeletonProps) {
  const { C } = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true })
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
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: C.surfaceBorderLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
  hasAvatar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ lines = 3, hasAvatar = true, style }: SkeletonCardProps) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, style]}>
      <View style={styles.cardHeader}>
        {hasAvatar && <Skeleton width={40} height={40} borderRadius={20} />}
        <View style={styles.headerLines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} />
        </View>
      </View>
      <View style={styles.cardBody}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '70%' : '100%'}
            height={12}
          />
        ))}
      </View>
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonList({ count = 4, style }: SkeletonListProps) {
  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  headerLines: {
    flex: 1,
    gap: 6,
  },
  cardBody: {
    gap: 8,
  },
  list: {
    gap: Spacing.md,
  },
});
