import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';

interface AnimatedEmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AnimatedEmptyState({ icon, title, subtitle, actionLabel, onAction }: AnimatedEmptyStateProps) {
  const { C } = useThemeColors();
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(16)).current;
  const btnScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textTranslate, { toValue: 0, useNativeDriver: true, tension: 160, friction: 14 }),
      ]),
      ...(actionLabel ? [Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 })] : []),
    ]).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: -3, duration: 1900, useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 3, duration: 1900, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [iconScale, iconFloat, textOpacity, textTranslate, btnScale, actionLabel]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: C.primarySubtle, transform: [{ scale: iconScale }, { translateY: iconFloat }] },
        ]}
      >
        <MaterialIcons name={icon} size={36} color={C.primary} />
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }] }}>
        <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>}
      </Animated.View>

      {actionLabel && onAction && (
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Text
            onPress={onAction}
            style={[styles.actionBtn, { color: C.primary }]}
          >
            {actionLabel}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  actionBtn: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
  },
});
