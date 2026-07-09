import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Pressable, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface AnimatedTabIndicatorProps {
  tabs: Tab[];
  activeKey: string;
  onTabPress: (key: string) => void;
}

export function AnimatedTabIndicator({ tabs, activeKey, onTabPress }: AnimatedTabIndicatorProps) {
  const { C } = useThemeColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;
  const activeIndex = tabs.findIndex(t => t.key === activeKey);
  const tabWidth = 100 / tabs.length;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(indicatorScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: activeIndex * tabWidth,
          useNativeDriver: false,
          tension: 250,
          friction: 20,
        }),
        Animated.spring(indicatorScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]),
    ]).start();
  }, [activeIndex, translateX, indicatorScale, tabWidth]);

  const handlePress = (key: string) => {
    Haptic.select();
    onTabPress(key);
  };

  const indicatorLeft = translateX.interpolate({
    inputRange: tabs.map((_, i) => i * tabWidth),
    outputRange: tabs.map((_, i) => `${i * tabWidth}%`),
  });

  return (
    <View style={[styles.container, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            width: `${tabWidth}%` as any,
            backgroundColor: C.primarySubtle,
            borderColor: C.primary + '44',
            left: indicatorLeft as any,
            transform: [{ scaleX: indicatorScale }],
          },
        ]}
      />
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab.key)}
          >
            {tab.icon}
            <Text style={[styles.tabLabel, { color: isActive ? C.primary : C.textMuted }]}>
              {tab.label}
            </Text>
            {tab.badge && tab.badge > 0 ? (
              <View style={[styles.tabBadge, { backgroundColor: C.error }]}>
                <Text style={styles.tabBadgeText}>{tab.badge > 9 ? '9+' : tab.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.semibold,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
