import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, FontSize, FontWeight, Spacing, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { ProductIllustration } from '@/components/illustrations';

interface AsyncStateCardProps {
  C: ThemeColors;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: keyof typeof MaterialIcons.glyphMap;
  onAction?: () => void;
  compact?: boolean;
}

export function AsyncStateCard({
  C,
  icon,
  title,
  message,
  actionLabel,
  actionIcon = 'refresh',
  onAction,
  compact = false,
}: AsyncStateCardProps) {
  const iconScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.05, duration: 1300, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 0.95, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [iconScale]);

  return (
    <View
      style={[
        styles.card,
        compact && styles.compactCard,
        { backgroundColor: C.surface, borderColor: C.surfaceBorder },
      ]}
    >
      {!compact ? <ProductIllustration variant="route" size={112} /> : null}
      <Animated.View style={[styles.iconBox, { backgroundColor: C.primarySubtle, transform: [{ scale: iconScale }] }]}>
        <MaterialIcons name={icon} size={compact ? 19 : 21} color={C.primary} />
      </Animated.View>
      <Text style={[styles.title, { color: C.textSecondary }]}>{title}</Text>
      <Text style={[styles.message, { color: C.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: C.surfaceElevated,
              borderColor: C.surfaceBorder,
              opacity: pressed ? 0.78 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
          onPress={() => {
            Haptic.tap();
            onAction();
          }}
        >
          <MaterialIcons name={actionIcon} size={15} color={C.textSecondary} />
          <Text style={[styles.actionText, { color: C.textSecondary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfflineBanner({ C }: { C: ThemeColors }) {
  return (
    <View style={[styles.banner, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
      <MaterialIcons name="wifi-off" size={15} color={C.warning} />
      <Text style={[styles.bannerText, { color: C.warning }]}>Offline. Showing cached data until connection returns.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactCard: {
    paddingVertical: Spacing.lg,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    maxWidth: 270,
    textAlign: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    lineHeight: 17,
  },
});
