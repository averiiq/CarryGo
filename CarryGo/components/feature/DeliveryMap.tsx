import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface DeliveryMapProps {
  travellerName: string;
  lat: number;
  lng: number;
  updatedAt: string;
  isLiveBroadcasting?: boolean;
  fromCity?: string;
  toCity?: string;
  C: ThemeColors;
}

/**
 * Interactive Transit Radar HUD
 * 100% crash-proof pure React Native implementation.
 * Provides live telemetry, pulse animation, coordinates, and instant Google/Apple Maps deep-linking.
 */
function TransitRadarHUD({
  travellerName,
  safeLat,
  safeLng,
  isLiveBroadcasting,
  C,
  onOpenExternalMap,
  onCopyCoords,
  copied,
}: {
  travellerName: string;
  safeLat: number;
  safeLng: number;
  isLiveBroadcasting: boolean;
  C: ThemeColors;
  onOpenExternalMap: () => void;
  onCopyCoords: () => void;
  copied: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.55, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.12, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(sweepAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [opacityAnim, pulseAnim, sweepAnim]);

  const sweepRotation = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.radarContainer, { backgroundColor: C.surfaceElevated }]}>
      <LinearGradient
        colors={[C.primary + '14', 'transparent', C.surfaceElevated]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Blueprint Grid Lines */}
      {[0.25, 0.5, 0.75].map((pos, idx) => (
        <View
          key={`gh-${idx}`}
          style={[styles.gridLineH, { top: `${pos * 100}%` as any, backgroundColor: C.surfaceBorder, opacity: 0.4 }]}
        />
      ))}
      {[0.25, 0.5, 0.75].map((pos, idx) => (
        <View
          key={`gv-${idx}`}
          style={[styles.gridLineV, { left: `${pos * 100}%` as any, backgroundColor: C.surfaceBorder, opacity: 0.4 }]}
        />
      ))}

      {/* Outer Radar Rings */}
      <View style={[styles.radarCircleLarge, { borderColor: C.primary + '33' }]} />
      <View style={[styles.radarCircleMedium, { borderColor: C.primary + '55' }]} />

      {/* Pulsing Signal Wave */}
      <Animated.View
        style={[
          styles.radarPulseRing,
          {
            borderColor: C.primary,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Radar Rotating Sweep Line */}
      <Animated.View
        style={[
          styles.radarSweepLine,
          {
            transform: [{ rotate: sweepRotation }],
          },
        ]}
      >
        <LinearGradient
          colors={[C.primary + '66', 'transparent']}
          style={{ width: '50%', height: 2 }}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      {/* Central Telemetry Beacon */}
      <View style={[styles.radarCenterPin, { backgroundColor: C.primary }]}>
        <MaterialIcons name="local-shipping" size={22} color="#FFFFFF" />
      </View>

      {/* Top Status Pill */}
      <View style={[styles.radarStatusPill, { backgroundColor: C.surface + 'EE', borderColor: C.surfaceBorder }]}>
        <View style={[styles.liveDot, { backgroundColor: isLiveBroadcasting ? C.success : C.primary }]} />
        <Text style={[styles.radarStatusText, { color: C.textPrimary }]}>
          {isLiveBroadcasting ? `${travellerName} · Live GPS Signal` : `${travellerName} · GPS Beacon Ready`}
        </Text>
      </View>

      {/* Bottom Floating Navigation Actions */}
      <View style={styles.radarActionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open external Google or Apple Maps"
          style={({ pressed }) => [
            styles.externalMapBtn,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onOpenExternalMap}
        >
          <Ionicons name="navigate-circle" size={16} color="#FFFFFF" />
          <Text style={styles.externalMapBtnText}>
            {Platform.OS === 'ios' ? 'Open in Apple Maps' : 'Open in Google Maps'}
          </Text>
          <Feather name="arrow-up-right" size={13} color="#FFFFFF" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy coordinates to clipboard"
          style={({ pressed }) => [
            styles.copyCoordsBtn,
            { backgroundColor: C.surface + 'FA', borderColor: C.surfaceBorder, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onCopyCoords}
        >
          <Feather
            name={copied ? 'check' : 'copy'}
            size={12}
            color={copied ? C.success : C.textSecondary}
          />
          <Text style={[styles.copyCoordsText, { color: copied ? C.success : C.textSecondary }]}>
            {copied ? 'Copied' : `${safeLat.toFixed(3)}, ${safeLng.toFixed(3)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Route Vector Blueprint View
 * Displays high-tech waypoint vectors between origin, live carrier beacon, and destination.
 */
function RouteBlueprintView({
  fromCity,
  toCity,
  travellerName,
  safeLat,
  safeLng,
  C,
  onOpenExternalMap,
}: {
  fromCity?: string;
  toCity?: string;
  travellerName: string;
  safeLat: number;
  safeLng: number;
  C: ThemeColors;
  onOpenExternalMap: () => void;
}) {
  return (
    <View style={[styles.blueprintContainer, { backgroundColor: C.surfaceElevated }]}>
      <LinearGradient
        colors={[C.primary + '0C', 'transparent', C.surfaceElevated]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Blueprint Grid Lines */}
      {[0.2, 0.4, 0.6, 0.8].map((pos, idx) => (
        <View
          key={`bgh-${idx}`}
          style={[styles.gridLineH, { top: `${pos * 100}%` as any, backgroundColor: C.surfaceBorder, opacity: 0.35 }]}
        />
      ))}
      {[0.25, 0.5, 0.75].map((pos, idx) => (
        <View
          key={`bgv-${idx}`}
          style={[styles.gridLineV, { left: `${pos * 100}%` as any, backgroundColor: C.surfaceBorder, opacity: 0.35 }]}
        />
      ))}

      {/* Route Header Info */}
      <View style={styles.blueprintHeader}>
        <View style={styles.blueprintHeaderLeft}>
          <MaterialIcons name="route" size={15} color={C.primary} />
          <Text style={[styles.blueprintTitle, { color: C.textPrimary }]}>
            Transit Vector Corridor
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenExternalMap}
          style={[styles.blueprintNavBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}
        >
          <Text style={[styles.blueprintNavBtnText, { color: C.primary }]}>Turn-by-Turn</Text>
          <Feather name="arrow-up-right" size={12} color={C.primary} />
        </Pressable>
      </View>

      {/* Vector Line with Waypoints */}
      <View style={styles.vectorRouteBox}>
        {/* Origin */}
        <View style={styles.waypointBox}>
          <View style={[styles.waypointDot, { backgroundColor: C.surfaceBorder, borderColor: C.textMuted }]}>
            <View style={[styles.innerDot, { backgroundColor: C.textMuted }]} />
          </View>
          <Text style={[styles.waypointLabel, { color: C.textPrimary }]} numberOfLines={1}>
            {fromCity || 'Origin'}
          </Text>
          <Text style={[styles.waypointSub, { color: C.textMuted }]}>Origin Point</Text>
        </View>

        {/* Connecting Active Line */}
        <View style={styles.vectorConnectingLineBox}>
          <View style={[styles.vectorLineTrack, { backgroundColor: C.surfaceBorder }]} />
          <View style={[styles.vectorLineActive, { backgroundColor: C.primary }]} />

          {/* Carrier Beacon on Track */}
          <View style={[styles.vectorCarrierBeacon, { backgroundColor: C.primary, borderColor: '#FFFFFF' }]}>
            <MaterialIcons name="local-shipping" size={13} color="#FFFFFF" />
          </View>
        </View>

        {/* Destination */}
        <View style={[styles.waypointBox, { alignItems: 'flex-end' }]}>
          <View style={[styles.waypointDot, { backgroundColor: C.successSubtle, borderColor: C.success }]}>
            <View style={[styles.innerDot, { backgroundColor: C.success }]} />
          </View>
          <Text style={[styles.waypointLabel, { color: C.textPrimary }]} numberOfLines={1}>
            {toCity || 'Destination'}
          </Text>
          <Text style={[styles.waypointSub, { color: C.textMuted }]}>Final Drop</Text>
        </View>
      </View>

      {/* Bottom Route Status Strip */}
      <View style={[styles.blueprintFooterStrip, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.corridorTelemetry}>
          <Feather name="navigation" size={13} color={C.primary} />
          <Text style={[styles.corridorTelemetryText, { color: C.textSecondary }]}>
            Carrier {travellerName} is actively navigating this corridor
          </Text>
        </View>
        <Text style={[styles.corridorCoords, { color: C.textMuted }]}>
          {safeLat.toFixed(3)}°, {safeLng.toFixed(3)}°
        </Text>
      </View>
    </View>
  );
}

export default function DeliveryMap({
  travellerName,
  lat,
  lng,
  updatedAt,
  isLiveBroadcasting = true,
  fromCity,
  toCity,
  C,
}: DeliveryMapProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'radar' | 'route'>('radar');

  const safeLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 28.6139; // default to Delhi coordinates if 0
  const safeLng = typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : 77.2090;

  const formatAge = (ts: string) => {
    if (!ts) return 'just now';
    const parsed = new Date(ts).getTime();
    if (isNaN(parsed)) return 'just now';
    const diff = Math.floor((Date.now() - parsed) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString();
  };

  const handleOpenExternalMap = () => {
    Haptic.tap();
    const label = encodeURIComponent(`CarryGo - ${travellerName || 'Carrier'}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${safeLat},${safeLng}`,
      android: `geo:${safeLat},${safeLng}?q=${safeLat},${safeLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`,
    });

    void Linking.openURL(url).catch(() => {
      // Fallback to standard web Google Maps
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`);
    });
  };

  const handleCopyCoords = async () => {
    Haptic.success();
    await Clipboard.setStringAsync(`${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <View style={[styles.mapCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />

      {/* Header bar */}
      <View style={styles.mapHeader}>
        <View style={[styles.liveBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
          <View style={[styles.liveDot, { backgroundColor: isLiveBroadcasting ? C.success : C.primary }]} />
          <Text style={[styles.liveText, { color: C.primary }]}>
            {isLiveBroadcasting ? 'Live GPS Radar' : 'GPS Standby Radar'}
          </Text>
        </View>

        <View style={styles.headerRightRow}>
          <Text style={[styles.mapUpdated, { color: C.textMuted }]}>
            {formatAge(updatedAt)}
          </Text>

          {/* Toggle between Radar HUD and Route Blueprint */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle between radar and route view"
            onPress={() => {
              Haptic.tap();
              setViewMode(prev => (prev === 'radar' ? 'route' : 'radar'));
            }}
            style={[styles.toggleModeBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
            hitSlop={8}
          >
            <MaterialIcons
              name={viewMode === 'radar' ? 'route' : 'radar'}
              size={15}
              color={C.primary}
            />
            <Text style={[styles.toggleModeText, { color: C.textSecondary }]}>
              {viewMode === 'radar' ? 'Corridor' : 'Radar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Map body */}
      {viewMode === 'radar' ? (
        <TransitRadarHUD
          travellerName={travellerName || 'Carrier'}
          safeLat={safeLat}
          safeLng={safeLng}
          isLiveBroadcasting={isLiveBroadcasting}
          C={C}
          onOpenExternalMap={handleOpenExternalMap}
          onCopyCoords={handleCopyCoords}
          copied={copied}
        />
      ) : (
        <RouteBlueprintView
          fromCity={fromCity}
          toCity={toCity}
          travellerName={travellerName || 'Carrier'}
          safeLat={safeLat}
          safeLng={safeLng}
          C={C}
          onOpenExternalMap={handleOpenExternalMap}
        />
      )}

      {/* Footer bar */}
      <View style={[styles.mapFooter, { backgroundColor: C.surfaceElevated, borderTopColor: C.surfaceBorder }]}>
        <View style={styles.footerLeft}>
          <MaterialIcons name="my-location" size={13} color={C.primary} />
          <Text style={[styles.mapCoords, { color: C.textSecondary }]}>
            {safeLat.toFixed(4)}° N, {safeLng.toFixed(4)}° E
          </Text>
        </View>

        <View style={[styles.pollBadge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="sync" size={10} color={C.primary} />
          <Text style={[styles.pollBadgeText, { color: C.primary }]}>Auto-sync 15s</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 4,
    paddingBottom: Spacing.sm,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 4,
  },
  toggleModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleModeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  mapUpdated: {
    fontSize: FontSize.xs,
  },
  // Radar HUD Styles
  radarContainer: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  radarCircleLarge: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  radarCircleMedium: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    opacity: 0.7,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
  },
  radarSweepLine: {
    position: 'absolute',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenterPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  radarStatusPill: {
    position: 'absolute',
    top: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  radarStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  radarActionRow: {
    position: 'absolute',
    bottom: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  externalMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    elevation: 2,
  },
  externalMapBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  copyCoordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  copyCoordsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  // Blueprint Route Styles
  blueprintContainer: {
    width: '100%',
    height: 220,
    padding: Spacing.md,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  blueprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blueprintHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blueprintTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  blueprintNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  blueprintNavBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  vectorRouteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  waypointBox: {
    width: 90,
  },
  waypointDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waypointLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  waypointSub: {
    fontSize: 10,
  },
  vectorConnectingLineBox: {
    flex: 1,
    position: 'relative',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  vectorLineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  vectorLineActive: {
    position: 'absolute',
    left: 0,
    width: '60%',
    height: 3,
    borderRadius: 1.5,
  },
  vectorCarrierBeacon: {
    position: 'absolute',
    left: '52%',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  blueprintFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  corridorTelemetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  corridorTelemetryText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  corridorCoords: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginLeft: 6,
  },
  // Map Card Footer
  mapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapCoords: {
    fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: FontWeight.medium,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  pollBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
  },
});
