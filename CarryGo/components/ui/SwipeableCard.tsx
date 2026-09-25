import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

interface SwipeableCardProps {
  children: React.ReactNode;
  onShare?: () => void;
  onSecondaryAction?: () => void;
  secondaryIcon?: keyof typeof MaterialIcons.glyphMap;
  secondaryLabel?: string;
  enabled?: boolean;
}

export const SwipeableCard = React.memo(function SwipeableCard({
  children,
  onShare,
  onSecondaryAction,
  secondaryIcon = 'navigation',
  secondaryLabel = 'Quick View',
  enabled = true,
}: SwipeableCardProps) {
  const { C } = useThemeColors();
  const swipeableRef = useRef<Swipeable>(null);

  if (!enabled || (!onShare && !onSecondaryAction)) {
    return <>{children}</>;
  }

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [70, 0],
    });

    const scale = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.9, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {onSecondaryAction ? (
          <Animated.View style={[styles.actionBtnWrap, { transform: [{ translateX: trans }, { scale }] }]}>
            <Pressable
              onPress={() => {
                Haptic.tap();
                swipeableRef.current?.close();
                onSecondaryAction();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <MaterialIcons name={secondaryIcon} size={20} color={C.primary} />
              <Text style={[styles.actionBtnText, { color: C.primary }]}>{secondaryLabel}</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {onShare ? (
          <Animated.View style={[styles.actionBtnWrap, { transform: [{ translateX: trans }, { scale }] }]}>
            <Pressable
              onPress={() => {
                Haptic.confirm();
                swipeableRef.current?.close();
                onShare();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share listing"
            >
              <Feather name="share-2" size={18} color={C.textPrimary} />
              <Text style={[styles.actionBtnText, { color: C.textPrimary }]}>Share</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        Haptic.tap();
      }}
      containerStyle={styles.swipeContainer}
    >
      {children}
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  actionBtnWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    width: 68,
    height: 72,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
});
