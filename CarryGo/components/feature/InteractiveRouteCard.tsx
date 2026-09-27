import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { findCity, getDistance } from '@/constants/indian-cities';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { CitySelectModal } from './CitySelectModal';

interface InteractiveRouteCardProps {
  fromCity: string;
  toCity: string;
  onFromCityChange: (city: string) => void;
  onToCityChange: (city: string) => void;
  fromError?: string;
  toError?: string;
  onUseCurrentLocation?: () => void;
  isDetectingCurrentLocation?: boolean;
  locationHint?: string | null;
}

export function InteractiveRouteCard({
  fromCity,
  toCity,
  onFromCityChange,
  onToCityChange,
  fromError,
  toError,
  onUseCurrentLocation,
  isDetectingCurrentLocation = false,
  locationHint,
}: InteractiveRouteCardProps) {
  const { C } = useThemeColors();

  // Modal selector state
  const [modalField, setModalField] = useState<'from' | 'to' | null>(null);

  // Rotation animation for swap button
  const swapRotation = useSharedValue(0);
  const swapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swapRotation.value}deg` }],
  }));

  const handleSwap = () => {
    Haptic.select();
    swapRotation.value = withSpring(swapRotation.value + 180, {
      damping: 14,
      stiffness: 180,
    });

    const currentFrom = fromCity;
    const currentTo = toCity;

    onFromCityChange(currentTo);
    onToCityChange(currentFrom);
  };

  // Corridor distance & travel time estimation
  const corridorInfo = useMemo(() => {
    if (!fromCity || !toCity) return null;
    const c1 = findCity(fromCity);
    const c2 = findCity(toCity);
    if (!c1 || !c2) return null;
    const dist = Math.round(getDistance(c1, c2));
    if (dist <= 0) return null;

    const hours = Math.floor(dist / 55);
    const mins = Math.round(((dist % 55) / 55) * 60);
    const timeStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

    return {
      distanceKm: dist,
      timeStr,
    };
  }, [fromCity, toCity]);

  const handleSelectFromModal = useCallback(
    (selected: string) => {
      if (modalField === 'from') {
        onFromCityChange(selected);
        // If destination is not selected yet, automatically prompt for destination next
        if (!toCity) {
          setTimeout(() => {
            setModalField('to');
          }, 350);
        } else {
          setModalField(null);
        }
      } else if (modalField === 'to') {
        onToCityChange(selected);
        setModalField(null);
      }
    },
    [modalField, onFromCityChange, onToCityChange, toCity]
  );

  return (
    <View style={styles.wrapper}>
      {/* Route Card Container */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: fromError || toError ? C.error : C.surfaceBorder,
          },
        ]}
      >
        {/* Left: Route Track Graphic */}
        <View style={styles.trackColumn}>
          <View style={[styles.originRing, { borderColor: C.primary + '55' }]}>
            <View style={[styles.originDot, { backgroundColor: C.primary }]} />
          </View>
          <View style={styles.dashedLineContainer}>
            <View style={[styles.dashedSegment, { backgroundColor: C.surfaceBorder }]} />
            <View style={[styles.dashedSegment, { backgroundColor: C.surfaceBorder }]} />
            <View style={[styles.dashedSegment, { backgroundColor: C.surfaceBorder }]} />
          </View>
          <MaterialIcons name="location-on" size={20} color={C.error} style={styles.destPin} />
        </View>

        {/* Center: Tap-To-Select City Rows */}
        <View style={styles.inputsColumn}>
          {/* Pickup City Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pickup city: ${fromCity || 'Not selected'}. Tap to select.`}
            onPress={() => {
              Haptic.tap();
              setModalField('from');
            }}
            style={({ pressed }) => [
              styles.cityRow,
              pressed && { opacity: 0.75 },
            ]}
          >
            <View style={styles.cityTextWrapper}>
              <Text style={[styles.fieldLabel, { color: C.textMuted }]}>PICKUP LOCATION</Text>
              <Text
                style={[
                  styles.cityValue,
                  { color: fromCity ? C.textPrimary : C.textMuted },
                  fromError ? { color: C.error } : null,
                ]}
                numberOfLines={1}
              >
                {fromCity || 'Where from? (e.g. Gurugram, Delhi)'}
              </Text>
            </View>

            {/* Quick GPS Action or Clear Button */}
            {fromCity ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear pickup city"
                onPress={() => {
                  Haptic.tap();
                  onFromCityChange('');
                }}
                hitSlop={10}
                style={styles.clearBtn}
              >
                <MaterialIcons name="cancel" size={18} color={C.textMuted} />
              </Pressable>
            ) : onUseCurrentLocation ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use current GPS location"
                onPress={() => {
                  Haptic.tap();
                  onUseCurrentLocation();
                }}
                disabled={isDetectingCurrentLocation}
                style={({ pressed }) => [
                  styles.gpsChip,
                  { backgroundColor: C.primarySubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {isDetectingCurrentLocation ? (
                  <ActivityIndicator size="small" color={C.primary} style={{ transform: [{ scale: 0.7 }] }} />
                ) : (
                  <MaterialIcons name="my-location" size={13} color={C.primary} />
                )}
                <Text style={[styles.gpsText, { color: C.primary }]}>
                  {isDetectingCurrentLocation ? 'Detecting' : 'GPS'}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>

          {/* Elegant Divider */}
          <View style={[styles.divider, { backgroundColor: C.surfaceBorderLight }]} />

          {/* Delivery City Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delivery city: ${toCity || 'Not selected'}. Tap to select.`}
            onPress={() => {
              Haptic.tap();
              setModalField('to');
            }}
            style={({ pressed }) => [
              styles.cityRow,
              pressed && { opacity: 0.75 },
            ]}
          >
            <View style={styles.cityTextWrapper}>
              <Text style={[styles.fieldLabel, { color: C.textMuted }]}>DELIVERY LOCATION</Text>
              <Text
                style={[
                  styles.cityValue,
                  { color: toCity ? C.textPrimary : C.textMuted },
                  toError ? { color: C.error } : null,
                ]}
                numberOfLines={1}
              >
                {toCity || 'Where to? (e.g. Rohtak, Chandigarh)'}
              </Text>
            </View>

            {toCity ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear delivery city"
                onPress={() => {
                  Haptic.tap();
                  onToCityChange('');
                }}
                hitSlop={10}
                style={styles.clearBtn}
              >
                <MaterialIcons name="cancel" size={18} color={C.textMuted} />
              </Pressable>
            ) : (
              <MaterialIcons name="search" size={18} color={C.textMuted} style={{ marginRight: 4 }} />
            )}
          </Pressable>
        </View>

        {/* Right: Circular 1-Tap Animated City Swap Button */}
        <Animated.View style={[styles.swapBtnWrapper, swapAnimatedStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Swap origin and destination cities"
            onPress={handleSwap}
            style={({ pressed }) => [
              styles.swapButton,
              {
                backgroundColor: C.card,
                borderColor: C.surfaceBorder,
              },
              pressed && {
                backgroundColor: C.primarySubtle,
                borderColor: C.primary,
                transform: [{ scale: 0.92 }],
              },
            ]}
          >
            <MaterialIcons name="swap-vert" size={20} color={C.primary} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Corridor Distance & Estimated Travel Time Badge */}
      {corridorInfo ? (
        <View style={[styles.corridorBanner, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <MaterialIcons name="directions" size={16} color={C.primary} />
          <Text style={[styles.corridorText, { color: C.textPrimary }]}>
            <Text style={{ fontWeight: FontWeight.bold }}>~{corridorInfo.distanceKm} km</Text> corridor • Est. travel ~{corridorInfo.timeStr}
          </Text>
          <View style={[styles.corridorPill, { backgroundColor: C.surface }]}>
            <Text style={[styles.corridorPillText, { color: C.primary }]}>Active Route</Text>
          </View>
        </View>
      ) : null}

      {/* Errors or Location Hint */}
      {fromError ? (
        <Text style={[styles.errorText, { color: C.error }]}>{fromError}</Text>
      ) : toError ? (
        <Text style={[styles.errorText, { color: C.error }]}>{toError}</Text>
      ) : locationHint ? (
        <Text
          style={[
            styles.hintText,
            {
              color: locationHint.startsWith('Using ')
                ? C.success
                : locationHint.startsWith('Detecting')
                  ? C.primary
                  : C.error,
            },
          ]}
        >
          {locationHint}
        </Text>
      ) : null}

      {/* Dedicated Keyboard-Safe City Selector Modal */}
      <CitySelectModal
        visible={modalField !== null}
        onClose={() => setModalField(null)}
        onSelect={handleSelectFromModal}
        title={modalField === 'from' ? 'Select Pickup City' : 'Select Delivery City'}
        subtitle={
          modalField === 'from'
            ? 'Choose where the package will be handed over'
            : 'Choose where the package needs to be delivered'
        }
        selectedCity={modalField === 'from' ? fromCity : toCity}
        dotColor={modalField === 'from' ? '#10B981' : '#EF4444'}
        onUseCurrentLocation={modalField === 'from' ? onUseCurrentLocation : undefined}
        isDetectingLocation={isDetectingCurrentLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs + 2,
    zIndex: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  trackColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    paddingVertical: 8,
  },
  originRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashedLineContainer: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dashedSegment: {
    width: 2,
    height: 6,
    borderRadius: 1,
  },
  destPin: {
    marginTop: -2,
  },
  inputsColumn: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xl + 8,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 4,
  },
  cityTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cityValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 2,
  },
  swapBtnWrapper: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -18,
    zIndex: 10,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  gpsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  clearBtn: {
    padding: 6,
  },
  corridorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  corridorText: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  corridorPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  corridorPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  errorText: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  hintText: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
});
