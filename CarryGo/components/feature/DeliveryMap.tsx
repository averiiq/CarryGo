import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

import MapView, { Marker, Circle } from 'react-native-maps';

const NativeMapView = MapView;
const NativeMarker = Marker;
const NativeCircle = Circle;

interface DeliveryMapProps {
  travellerName: string;
  lat: number;
  lng: number;
  updatedAt: string;
  C: ThemeColors;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[DeliveryMap] MapView runtime error intercepted:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Interactive Transit Radar HUD
 * Shown when native map is loading, fallback active, or when user prefers HUD mode.
 * Provides live telemetry, pulse animation, coordinates, and instant Google/Apple Maps deep-linking.
 */
function TransitRadarHUD({
  travellerName,
  safeLat,
  safeLng,
  updatedAt,
  C,
  formatAge,
  onOpenExternalMap,
  onCopyCoords,
  copied,
}: {
  travellerName: string;
  safeLat: number;
  safeLng: number;
  updatedAt: string;
  C: ThemeColors;
  formatAge: (ts: string) => string;
  onOpenExternalMap: () => void;
  onCopyCoords: () => void;
  copied: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.15, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [opacityAnim, pulseAnim]);

  return (
    <View style={[styles.radarContainer, { backgroundColor: C.surfaceElevated }]}>
      <LinearGradient
        colors={[C.primary + '12', C.surfaceElevated]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Circular Radar Grid */}
      <View style={[styles.radarCircleLarge, { borderColor: C.surfaceBorder }]} />
      <View style={[styles.radarCircleMedium, { borderColor: C.primary + '22' }]} />

      {/* Animated Ping Waves */}
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

      {/* Center Marker Vehicle Icon */}
      <View style={[styles.radarCenterPin, { backgroundColor: C.primary }]}>
        <MaterialIcons name="local-shipping" size={20} color="#FFFFFF" />
      </View>

      {/* Floating Status Pill */}
      <View style={[styles.radarStatusPill, { backgroundColor: C.surface + 'EE', borderColor: C.surfaceBorder }]}>
        <View style={[styles.liveDot, { backgroundColor: C.success }]} />
        <Text style={[styles.radarStatusText, { color: C.textPrimary }]}>
          {travellerName} · Active Transit
        </Text>
      </View>

      {/* Action Buttons Overlay */}
      <View style={styles.radarActionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open in Maps"
          style={({ pressed }) => [
            styles.externalMapBtn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
          onPress={onOpenExternalMap}
        >
          <Ionicons name="map-outline" size={14} color="#FFFFFF" />
          <Text style={styles.externalMapBtnText}>
            {Platform.OS === 'ios' ? 'Open Apple Maps' : 'Open Google Maps'}
          </Text>
          <Feather name="arrow-up-right" size={13} color="#FFFFFF" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy GPS coordinates"
          style={({ pressed }) => [
            styles.copyCoordsBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onCopyCoords}
        >
          <Feather name={copied ? 'check' : 'copy'} size={13} color={copied ? C.success : C.textSecondary} />
          <Text style={[styles.copyCoordsText, { color: copied ? C.success : C.textSecondary }]}>
            {copied ? 'Copied' : 'GPS Coords'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DeliveryMap({ travellerName, lat, lng, updatedAt, C }: DeliveryMapProps) {
  const [copied, setCopied] = useState(false);
  const [useNativeMap, setUseNativeMap] = useState<boolean>(Boolean(NativeMapView));

  const safeLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 28.6139; // default to Delhi region if 0
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
    const label = encodeURIComponent(`CarryGo - ${travellerName}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${safeLat},${safeLng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`,
    });
    void Linking.openURL(url).catch(() => {
      // Fallback to standard web Google Maps
      void Linking.openURL(`https://www.google.com/maps?q=${safeLat},${safeLng}`);
    });
  };

  const handleCopyCoords = async () => {
    Haptic.success();
    await Clipboard.setStringAsync(`${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const renderRadarFallback = () => (
    <TransitRadarHUD
      travellerName={travellerName}
      safeLat={safeLat}
      safeLng={safeLng}
      updatedAt={updatedAt}
      C={C}
      formatAge={formatAge}
      onOpenExternalMap={handleOpenExternalMap}
      onCopyCoords={handleCopyCoords}
      copied={copied}
    />
  );

  return (
    <View style={[styles.mapCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />

      {/* Header bar */}
      <View style={styles.mapHeader}>
        <View style={[styles.liveBadge, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
          <View style={[styles.liveDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.liveText, { color: C.primary }]}>Live GPS Radar</Text>
        </View>

        <View style={styles.headerRightRow}>
          <Text style={[styles.mapUpdated, { color: C.textMuted }]}>
            {formatAge(updatedAt)}
          </Text>
          {NativeMapView ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle map view mode"
              onPress={() => {
                Haptic.tap();
                setUseNativeMap(prev => !prev);
              }}
              style={[styles.toggleModeBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              hitSlop={8}
            >
              <MaterialIcons
                name={useNativeMap ? 'radar' : 'map'}
                size={14}
                color={C.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Map body */}
      {useNativeMap && NativeMapView ? (
        <MapErrorBoundary fallback={renderRadarFallback()}>
          <View style={styles.mapWrapper}>
            <NativeMapView
              style={styles.map}
              region={{
                latitude: safeLat,
                longitude: safeLng,
                latitudeDelta: 0.035,
                longitudeDelta: 0.035,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              toolbarEnabled={false}
            >
              {NativeMarker ? (
                <NativeMarker coordinate={{ latitude: safeLat, longitude: safeLng }} title={travellerName}>
                  <View style={[styles.markerPin, { backgroundColor: C.primary }]}>
                    <MaterialIcons name="local-shipping" size={16} color="#FFFFFF" />
                  </View>
                </NativeMarker>
              ) : null}

              {NativeCircle ? (
                <NativeCircle
                  center={{ latitude: safeLat, longitude: safeLng }}
                  radius={500}
                  fillColor={C.primary + '18'}
                  strokeColor={C.primary + '55'}
                  strokeWidth={1.5}
                />
              ) : null}
            </NativeMapView>

            {/* Quick Open in External Maps floating badge on top of map */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open in full maps app"
              onPress={handleOpenExternalMap}
              style={[styles.floatingMapLauncher, { backgroundColor: C.surface + 'F0', borderColor: C.surfaceBorder }]}
            >
              <Ionicons name="navigate-circle" size={15} color={C.primary} />
              <Text style={[styles.floatingMapLauncherText, { color: C.textPrimary }]}>Full Navigation</Text>
              <Feather name="arrow-up-right" size={11} color={C.textMuted} />
            </Pressable>
          </View>
        </MapErrorBoundary>
      ) : (
        renderRadarFallback()
      )}

      {/* Footer bar */}
      <View style={[styles.mapFooter, { backgroundColor: C.surfaceElevated, borderTopColor: C.surfaceBorder }]}>
        <View style={styles.footerLeft}>
          <MaterialIcons name="my-location" size={12} color={C.primary} />
          <Text style={[styles.mapCoords, { color: C.textMuted }]}>
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
    gap: Spacing.xs + 2,
  },
  toggleModeBtn: {
    padding: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 210,
  },
  map: {
    width: '100%',
    height: 210,
  },
  markerPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  floatingMapLauncher: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  floatingMapLauncherText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  // Radar HUD Styles
  radarContainer: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  radarCircleLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  radarCircleMedium: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    opacity: 0.7,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
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
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  externalMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  copyCoordsText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
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
