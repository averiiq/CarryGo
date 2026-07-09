import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';

interface AnimatedProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export function AnimatedProgressBar({
  progress,
  color,
  height = 6,
  showLabel = false,
  animated = true,
}: AnimatedProgressBarProps) {
  const { C } = useThemeColors();
  const barColor = color || C.primary;
  const width = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(width, {
        toValue: progress,
        useNativeDriver: false,
        tension: 100,
        friction: 14,
      }).start();
    } else {
      width.setValue(progress);
    }
  }, [progress, width, animated]);

  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [progress, glow]);

  const widthPercent = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { height, backgroundColor: barColor + '18' }]}>
        <Animated.View
          style={[
            styles.barFill,
            { height, backgroundColor: barColor, width: widthPercent },
          ]}
        />
        {progress > 0 && progress < 100 && (
          <Animated.View
            style={[
              styles.barGlow,
              {
                height,
                backgroundColor: barColor,
                width: widthPercent,
                opacity: glow,
              },
            ]}
          />
        )}
      </View>
      {showLabel && (
        <Text style={[styles.barLabel, { color: barColor }]}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  color?: string;
  labels?: string[];
}

export function StepProgress({ currentStep, totalSteps, color, labels }: StepProgressProps) {
  const { C } = useThemeColors();
  const stepColor = color || C.primary;

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <StepDot
              active={i < currentStep}
              current={i === currentStep}
              color={stepColor}
              index={i}
            />
            {i < totalSteps - 1 && (
              <View style={[styles.stepLine, { backgroundColor: i < currentStep ? stepColor : C.surfaceBorder }]} />
            )}
          </React.Fragment>
        ))}
      </View>
      {labels && labels[currentStep] && (
        <Text style={[styles.stepLabel, { color: C.textSecondary }]}>{labels[currentStep]}</Text>
      )}
    </View>
  );
}

function StepDot({ active, current, color, index }: { active: boolean; current: boolean; color: string; index: number }) {
  const { C } = useThemeColors();
  const scale = useRef(new Animated.Value(active || current ? 1 : 0.7)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active || current ? 1 : 0.7,
      useNativeDriver: true,
      tension: 250,
      friction: 10,
    }).start();
  }, [active, current, scale]);

  useEffect(() => {
    if (!current) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [current, pulse]);

  return (
    <View style={styles.stepDotWrap}>
      {current && (
        <Animated.View
          style={[
            styles.stepPulseRing,
            { borderColor: color + '40', transform: [{ scale: pulse }] },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.stepDot,
          {
            backgroundColor: active || current ? color : C.surfaceBorder,
            transform: [{ scale }],
          },
        ]}
      >
        {active && (
          <View style={styles.stepCheck}>
            <Text style={styles.stepCheckText}>✓</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barTrack: {
    flex: 1,
    borderRadius: 100,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 100,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  barGlow: {
    borderRadius: 100,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  barLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  stepContainer: {
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  stepDotWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheck: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
});
