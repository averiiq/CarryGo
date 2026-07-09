import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { VehicleType } from '@/types';
import {
  estimateTransitTime,
  formatTransitTime,
  calculateRouteDistance,
} from '@/services/route-intelligence.service';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface ETACardProps {
  fromCity: string;
  toCity: string;
  vehicleType: VehicleType;
  departureTime?: string; // ISO date string for when delivery started
  isInProgress?: boolean;
}

export const ETACard = React.memo(function ETACard({
  fromCity,
  toCity,
  vehicleType,
  departureTime,
  isInProgress = false,
}: ETACardProps) {
  const { C } = useThemeColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);

  const transitHours = estimateTransitTime(fromCity, toCity, vehicleType);
  const distance = calculateRouteDistance(fromCity, toCity, vehicleType);

  // Calculate ETA and progress when delivery is in progress
  useEffect(() => {
    if (!isInProgress || !departureTime || !transitHours) return;

    const updateProgress = () => {
      const startMs = new Date(departureTime).getTime();
      const nowMs = Date.now();
      const totalMs = transitHours * 60 * 60 * 1000;
      const elapsedMs = nowMs - startMs;
      const pct = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
      setProgress(pct);

      const remainingMs = Math.max(totalMs - elapsedMs, 0);
      const remainingHours = remainingMs / (60 * 60 * 1000);

      if (remainingMs <= 0) {
        setCountdown('Arriving soon');
      } else {
        setCountdown(formatTransitTime(remainingHours));
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 30_000); // Update every 30s
    return () => clearInterval(interval);
  }, [isInProgress, departureTime, transitHours]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  if (!transitHours || !distance) {
    return null;
  }

  const expectedArrival = departureTime
    ? new Date(new Date(departureTime).getTime() + transitHours * 60 * 60 * 1000)
    : null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient
        colors={[C.primary + '08', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.etaBadge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="schedule" size={14} color={C.primary} />
          <Text style={[styles.etaLabel, { color: C.primary }]}>ETA</Text>
        </View>
        <Text style={[styles.etaValue, { color: C.textPrimary }]}>
          {isInProgress && countdown ? countdown : formatTransitTime(transitHours)}
        </Text>
      </View>

      {/* Route info */}
      <View style={styles.routeRow}>
        <View style={styles.routeCity}>
          <View style={[styles.cityDot, { backgroundColor: C.success }]} />
          <Text style={[styles.cityName, { color: C.textSecondary }]} numberOfLines={1}>
            {fromCity}
          </Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: C.surfaceBorder }]}>
          <MaterialIcons name="arrow-forward" size={12} color={C.textMuted} />
        </View>
        <View style={styles.routeCity}>
          <View style={[styles.cityDot, { backgroundColor: C.error }]} />
          <Text style={[styles.cityName, { color: C.textSecondary }]} numberOfLines={1}>
            {toCity}
          </Text>
        </View>
      </View>

      {/* Progress bar (only when in progress) */}
      {isInProgress && (
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: C.surfaceElevated }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth, backgroundColor: C.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: C.textMuted }]}>
            {Math.round(progress * 100)}% complete
          </Text>
        </View>
      )}

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons name="straighten" size={13} color={C.textMuted} />
          <Text style={[styles.metaText, { color: C.textMuted }]}>{distance} km</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialIcons
            name={vehicleType === 'flight' ? 'flight' : vehicleType === 'train' ? 'train' : 'directions-car'}
            size={13}
            color={C.textMuted}
          />
          <Text style={[styles.metaText, { color: C.textMuted }]}>
            {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
          </Text>
        </View>
        {expectedArrival && isInProgress && (
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={13} color={C.textMuted} />
            <Text style={[styles.metaText, { color: C.textMuted }]}>
              {expectedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  etaLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  etaValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeCity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  routeLine: {
    width: 30,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
