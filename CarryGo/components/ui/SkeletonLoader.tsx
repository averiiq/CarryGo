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

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { C } = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.75, 0.35],
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

export function ParcelCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={44} height={44} borderRadius={14} />
        <View style={styles.headerLines}>
          <Skeleton width="65%" height={15} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      <View style={styles.routeRow}>
        <Skeleton width="42%" height={14} />
        <Skeleton width={20} height={14} borderRadius={7} />
        <Skeleton width="42%" height={14} />
      </View>
      <View style={styles.cardFooter}>
        <Skeleton width={80} height={20} borderRadius={10} />
        <Skeleton width={90} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function TripCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.headerLines}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="35%" height={11} />
        </View>
        <Skeleton width={50} height={20} borderRadius={10} />
      </View>
      <View style={styles.routeRow}>
        <Skeleton width="40%" height={14} />
        <Skeleton width={24} height={14} borderRadius={7} />
        <Skeleton width="40%" height={14} />
      </View>
      <View style={styles.cardFooter}>
        <Skeleton width={110} height={24} borderRadius={12} />
        <Skeleton width={75} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

export function RequestCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerLines}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={10} />
        </View>
        <Skeleton width={70} height={20} borderRadius={10} />
      </View>
      <View style={styles.bodyBlock}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="85%" height={12} />
      </View>
      <View style={styles.actionRow}>
        <Skeleton width="48%" height={38} borderRadius={19} />
        <Skeleton width="48%" height={38} borderRadius={19} />
      </View>
    </View>
  );
}

export function ConversationItemSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { C } = useThemeColors();

  return (
    <View style={[styles.conversationRow, { borderColor: C.surfaceBorderLight }, style]}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.conversationInfo}>
        <View style={styles.conversationTop}>
          <Skeleton width="50%" height={14} />
          <Skeleton width={45} height={10} />
        </View>
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
}

export function FeedSkeletonList({ count = 3, type = 'mixed' }: { count?: number; type?: 'parcel' | 'trip' | 'request' | 'mixed' }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => {
        if (type === 'parcel') return <ParcelCardSkeleton key={i} />;
        if (type === 'trip') return <TripCardSkeleton key={i} />;
        if (type === 'request') return <RequestCardSkeleton key={i} />;
        return i % 2 === 0 ? <TripCardSkeleton key={i} /> : <ParcelCardSkeleton key={i} />;
      })}
    </View>
  );
}

export function SkeletonCard({ lines = 3, hasAvatar = true, style }: { lines?: number; hasAvatar?: boolean; style?: StyleProp<ViewStyle> }) {
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
          <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
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
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm,
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
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  bodyBlock: {
    gap: 6,
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  conversationInfo: {
    flex: 1,
    gap: 6,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    gap: 8,
  },
  list: {
    gap: Spacing.md,
  },
});
