import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface AnimatedFeedbackProps {
  visible: boolean;
  type: FeedbackType;
  message: string;
  onDismiss?: () => void;
  duration?: number;
}

const ICONS: Record<FeedbackType, keyof typeof MaterialIcons.glyphMap> = {
  success: 'check-circle',
  error: 'error',
  info: 'info',
  warning: 'warning',
};

export function AnimatedFeedback({ visible, type, message, onDismiss, duration = 3000 }: AnimatedFeedbackProps) {
  const { C } = useThemeColors();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 200, friction: 16 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }),
      ]).start();

      if (onDismiss && duration > 0) {
        const timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onDismiss());
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      translateY.setValue(-80);
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible, translateY, opacity, scale, onDismiss, duration]);

  if (!visible) return null;

  const color = C[type];
  const bgColor = C[`${type}Subtle` as keyof typeof C] || color + '12';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: color + '30',
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={ICONS[type]} size={18} color={color} />
      </View>
      <Text style={[styles.message, { color: C.textPrimary }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

interface SuccessCheckmarkProps {
  visible: boolean;
  size?: number;
  color?: string;
}

export function SuccessCheckmark({ visible, size = 60, color }: SuccessCheckmarkProps) {
  const { C } = useThemeColors();
  const checkColor = color || C.success;
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      rotation.setValue(0);
      ringScale.setValue(0);
      ringOpacity.setValue(0.6);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
          Animated.timing(rotation, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(ringScale, { toValue: 2, useNativeDriver: true, tension: 100, friction: 14 }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible, scale, rotation, ringScale, ringOpacity]);

  if (!visible) return null;

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <View style={[styles.checkWrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: checkColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.checkCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: checkColor,
            transform: [{ scale }, { rotate }],
          },
        ]}
      >
        <MaterialIcons name="check" size={size * 0.5} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
  checkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
  },
  checkCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
