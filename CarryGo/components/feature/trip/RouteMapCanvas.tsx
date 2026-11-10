import React, { memo, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, {
  Path,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteOption } from '@/services/routing.service';
import { findCity } from '@/constants/indian-cities';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, BorderRadius, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface RouteMapCanvasProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute?: (routeId: string) => void;
  fromCity: string;
  toCity: string;
  stopovers: string[];
  height?: number;
  isLoading?: boolean;
}

const TILE_SIZE = 256;
const OSM_SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Standard Web Mercator (EPSG:3857) projection math
 */
function projectToWorldPixels(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const scale = (TILE_SIZE * Math.pow(2, zoom)) / (2 * Math.PI);
  const x = scale * ((lng * Math.PI) / 180 + Math.PI);
  const y = scale * (Math.PI - Math.log((1 + clampedSin) / (1 - clampedSin)) / 2);
  return { x, y };
}

export const RouteMapCanvas = memo(function RouteMapCanvas({
  routes,
  selectedRouteId,
  onSelectRoute,
  fromCity,
  toCity,
  stopovers,
  height = 240,
  isLoading = false,
}: RouteMapCanvasProps) {
  const { C, isDark } = useThemeColors();
  const screenWidth = Dimensions.get('window').width;
  const initialWidth = Math.max(300, Math.min(screenWidth - 32, 540));
  const [containerWidth, setContainerWidth] = useState<number>(initialWidth);
  const [userZoomDelta, setUserZoomDelta] = useState<number>(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const startCityObj = useMemo(() => findCity(fromCity), [fromCity]);
  const endCityObj = useMemo(() => findCity(toCity), [toCity]);

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || routes[0] || null,
    [routes, selectedRouteId]
  );

  // Compute natural bounding box
  const naturalBounds = useMemo(() => {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const includePoint = (lng: number, lat: number) => {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    };

    if (startCityObj) includePoint(startCityObj.lng, startCityObj.lat);
    if (endCityObj) includePoint(endCityObj.lng, endCityObj.lat);

    stopovers.forEach((name) => {
      const city = findCity(name);
      if (city) includePoint(city.lng, city.lat);
    });

    routes.forEach((r) => {
      r.geometry.forEach(([lng, lat]) => includePoint(lng, lat));
    });

    if (!Number.isFinite(minLng) || minLng === maxLng) {
      minLng = (startCityObj?.lng || 76.8) - 0.25;
      maxLng = (endCityObj?.lng || 77.2) + 0.25;
    }
    if (!Number.isFinite(minLat) || minLat === maxLat) {
      minLat = (startCityObj?.lat || 28.3) - 0.25;
      maxLat = (endCityObj?.lat || 29.5) + 0.25;
    }

    return { minLng, maxLng, minLat, maxLat };
  }, [routes, startCityObj, endCityObj, stopovers]);

  // Determine base zoom level fitting the container
  const baseZoom = useMemo(() => {
    const { minLng, maxLng, minLat, maxLat } = naturalBounds;
    let bestZ = 12;
    for (let z = 12; z >= 5; z--) {
      const p1 = projectToWorldPixels(minLng, maxLat, z);
      const p2 = projectToWorldPixels(maxLng, minLat, z);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      if (w <= containerWidth * 0.76 && h <= height * 0.76) {
        bestZ = z;
        break;
      }
    }
    return bestZ;
  }, [naturalBounds, containerWidth, height]);

  // Reset user zoom adjustments whenever route/cities change
  useEffect(() => {
    setUserZoomDelta(0);
  }, [fromCity, toCity, routes.length]);

  const effectiveZoom = Math.max(5, Math.min(14, baseZoom + userZoomDelta));

  // Compute center and tile grid using OpenStreetMap standard tiles (100% free, no API key required)
  const mapProjection = useMemo(() => {
    const { minLng, maxLng, minLat, maxLat } = naturalBounds;
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerWorld = projectToWorldPixels(centerLng, centerLat, effectiveZoom);

    const project = (lng: number, lat: number) => {
      const pt = projectToWorldPixels(lng, lat, effectiveZoom);
      const x = containerWidth / 2 + (pt.x - centerWorld.x);
      const y = height / 2 + (pt.y - centerWorld.y);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    };

    // World pixel bounding box for current viewport
    const leftWorld = centerWorld.x - containerWidth / 2;
    const rightWorld = centerWorld.x + containerWidth / 2;
    const topWorld = centerWorld.y - height / 2;
    const bottomWorld = centerWorld.y + height / 2;

    const startTileX = Math.floor(leftWorld / TILE_SIZE);
    const endTileX = Math.floor(rightWorld / TILE_SIZE);
    const startTileY = Math.floor(topWorld / TILE_SIZE);
    const endTileY = Math.floor(bottomWorld / TILE_SIZE);

    const tiles: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
    }> = [];

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const sub = OSM_SUBDOMAINS[Math.abs(tx + ty) % OSM_SUBDOMAINS.length];
        const tileLeft = Math.round(containerWidth / 2 + (tx * TILE_SIZE - centerWorld.x));
        const tileTop = Math.round(height / 2 + (ty * TILE_SIZE - centerWorld.y));

        // OpenStreetMap standard tile servers (fast, reliable, unrestricted, zero watermark)
        const tileUrl = `https://${sub}.tile.openstreetmap.org/${effectiveZoom}/${tx}/${ty}.png`;

        tiles.push({
          key: `osm-${effectiveZoom}-${tx}-${ty}`,
          url: tileUrl,
          left: tileLeft,
          top: tileTop,
        });
      }
    }

    return { project, tiles };
  }, [naturalBounds, effectiveZoom, containerWidth, height]);

  // Convert geometry coordinates to SVG path string
  const renderPathD = (coords: Array<[number, number]>) => {
    if (!coords || coords.length === 0) return '';
    const step = Math.max(1, Math.floor(coords.length / 150));
    const sampled: Array<[number, number]> = [];
    sampled.push(coords[0]);
    for (let i = step; i < coords.length - 1; i += step) {
      sampled.push(coords[i]);
    }
    sampled.push(coords[coords.length - 1]);

    let d = '';
    for (let i = 0; i < sampled.length; i++) {
      const [lng, lat] = sampled[i];
      const pt = mapProjection.project(lng, lat);
      d += i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`;
    }
    return d;
  };

  const startPt = startCityObj ? mapProjection.project(startCityObj.lng, startCityObj.lat) : null;
  const endPt = endCityObj ? mapProjection.project(endCityObj.lng, endCityObj.lat) : null;

  const stopoverPoints = useMemo(() => {
    return stopovers
      .map((name, idx) => {
        const city = findCity(name);
        if (!city) return null;
        const pt = mapProjection.project(city.lng, city.lat);
        return { name, index: idx + 1, ...pt };
      })
      .filter(Boolean) as Array<{ name: string; index: number; x: number; y: number }>;
  }, [stopovers, mapProjection]);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.mapCard,
        {
          height,
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          borderColor: C.surfaceBorder,
        },
      ]}
    >
      {/* ── REAL OPENSTREETMAP TILE LAYER ── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {mapProjection.tiles.map((t) => (
          <ExpoImage
            key={t.key}
            source={{
              uri: t.url,
              headers: {
                'User-Agent': 'CarryGo/1.0 (contact@carrygo.in)',
              },
            }}
            style={[
              styles.tileImage,
              {
                left: t.left,
                top: t.top,
              },
            ]}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
          />
        ))}
        {/* Subtle contrast overlay to enhance route visibility in dark mode */}
        {isDark ? (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(15, 23, 42, 0.35)',
              },
            ]}
          />
        ) : null}
      </View>

      {/* ── SVG ROUTE & PIN OVERLAY ── */}
      <Svg width={containerWidth} height={height} style={StyleSheet.absoluteFillObject}>
        {/* Inactive Alternative Routes */}
        {routes
          .filter((r) => r.id !== activeRoute?.id)
          .map((altRoute) => {
            const d = renderPathD(altRoute.geometry);
            if (!d) return null;
            return (
              <G key={altRoute.id}>
                {/* Wide touch target */}
                <Path
                  d={d}
                  stroke="transparent"
                  strokeWidth={26}
                  fill="none"
                  onPress={() => {
                    Haptic.select();
                    onSelectRoute?.(altRoute.id);
                  }}
                />
                {/* White casing for contrast against road map */}
                <Path
                  d={d}
                  stroke="#FFFFFF"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.85}
                />
                {/* Polyline */}
                <Path
                  d={d}
                  stroke="#475569"
                  strokeWidth={3}
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </G>
            );
          })}

        {/* Active Route */}
        {activeRoute ? (
          <G>
            {/* White casing for sharp contrast over map streets */}
            <Path
              d={renderPathD(activeRoute.geometry)}
              stroke="#FFFFFF"
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.95}
            />
            {/* Outer halo / glow */}
            <Path
              d={renderPathD(activeRoute.geometry)}
              stroke={C.primary}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.25}
              fill="none"
            />
            {/* Core vibrant Cobalt Blue route polyline */}
            <Path
              d={renderPathD(activeRoute.geometry)}
              stroke={C.primary}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </G>
        ) : null}

        {/* Numbered Stopover Pins */}
        {stopoverPoints.map((s) => (
          <G key={`stop-pin-${s.name}-${s.index}`}>
            {/* Soft drop shadow */}
            <Circle cx={s.x} cy={s.y + 1.5} r={12} fill="#000000" opacity={0.25} />
            {/* White Badge Ring */}
            <Circle cx={s.x} cy={s.y} r={11} fill="#FFFFFF" stroke={C.primary} strokeWidth={2.4} />
            {/* Number inside pin */}
            <SvgText
              x={s.x}
              y={s.y + 3.8}
              fontSize={10.5}
              fontWeight="bold"
              fill={C.primary}
              textAnchor="middle"
            >
              {s.index}
            </SvgText>
            {/* City Label with halo */}
            <SvgText
              x={s.x}
              y={s.y + 20}
              fontSize={9.5}
              fontWeight="bold"
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={3}
              textAnchor="middle"
            >
              {s.name}
            </SvgText>
            <SvgText
              x={s.x}
              y={s.y + 20}
              fontSize={9.5}
              fontWeight="bold"
              fill="#0F172A"
              textAnchor="middle"
            >
              {s.name}
            </SvgText>
          </G>
        ))}

        {/* Origin Pin (Emerald Green 'A') */}
        {startPt ? (
          <G>
            <Circle cx={startPt.x} cy={startPt.y + 2} r={13} fill="#000000" opacity={0.28} />
            <Circle cx={startPt.x} cy={startPt.y} r={12} fill={C.success} stroke="#FFFFFF" strokeWidth={2.5} />
            <SvgText
              x={startPt.x}
              y={startPt.y + 4.2}
              fontSize={11}
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              A
            </SvgText>
            {/* City Name with white halo */}
            <SvgText
              x={startPt.x}
              y={startPt.y - 15}
              fontSize={10.5}
              fontWeight="bold"
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              textAnchor="middle"
            >
              {fromCity}
            </SvgText>
            <SvgText
              x={startPt.x}
              y={startPt.y - 15}
              fontSize={10.5}
              fontWeight="bold"
              fill="#0F172A"
              textAnchor="middle"
            >
              {fromCity}
            </SvgText>
          </G>
        ) : null}

        {/* Destination Pin (Crimson 'B') */}
        {endPt ? (
          <G>
            <Circle cx={endPt.x} cy={endPt.y + 2} r={13} fill="#000000" opacity={0.28} />
            <Circle cx={endPt.x} cy={endPt.y} r={12} fill={C.error} stroke="#FFFFFF" strokeWidth={2.5} />
            <SvgText
              x={endPt.x}
              y={endPt.y + 4.2}
              fontSize={11}
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              B
            </SvgText>
            {/* City Name with white halo */}
            <SvgText
              x={endPt.x}
              y={endPt.y - 15}
              fontSize={10.5}
              fontWeight="bold"
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              textAnchor="middle"
            >
              {toCity}
            </SvgText>
            <SvgText
              x={endPt.x}
              y={endPt.y - 15}
              fontSize={10.5}
              fontWeight="bold"
              fill="#0F172A"
              textAnchor="middle"
            >
              {toCity}
            </SvgText>
          </G>
        ) : null}
      </Svg>

      {/* ── TOP MAP CONTROLS & STATUS BADGES ── */}
      <View style={styles.topControlRow}>
        <View style={[styles.mapSourceBadge, { backgroundColor: '#FFFFFFEE', borderColor: '#E2E8F0' }]}>
          <MaterialIcons name="map" size={12} color={C.primary} />
          <Text style={[styles.mapSourceText, { color: '#1E293B' }]}>
            OpenRoute Map
          </Text>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            onPress={() => {
              Haptic.tap();
              setUserZoomDelta((prev) => Math.min(prev + 1, 3));
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="add" size={16} color="#0F172A" />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            onPress={() => {
              Haptic.tap();
              setUserZoomDelta((prev) => Math.max(prev - 1, -2));
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="remove" size={16} color="#0F172A" />
          </Pressable>
          {userZoomDelta !== 0 ? (
            <>
              <View style={styles.zoomDivider} />
              <Pressable
                onPress={() => {
                  Haptic.select();
                  setUserZoomDelta(0);
                }}
                hitSlop={6}
                style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="fit-screen" size={14} color={C.primary} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {/* ── BOTTOM STATS BAR & ATTRIBUTION ── */}
      <View style={styles.bottomBarRow}>
        {activeRoute ? (
          <View style={[styles.statsPill, { backgroundColor: '#FFFFFFEE', borderColor: '#E2E8F0' }]}>
            <MaterialIcons name="directions-car" size={13} color={C.primary} />
            <Text style={[styles.statsDistance, { color: '#0F172A' }]}>
              {activeRoute.distanceKm} km
            </Text>
            <Text style={styles.statsDot}>•</Text>
            <Text style={[styles.statsDuration, { color: '#475569' }]}>
              {Math.floor(activeRoute.durationMin / 60)}h {activeRoute.durationMin % 60}m
            </Text>
          </View>
        ) : (
          <View />
        )}

        <Text style={styles.attributionText}>© OpenStreetMap</Text>
      </View>

      {/* Loading Overlay */}
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.loadingText}>Fetching highway routes...</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  mapSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  mapSourceText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFFEE',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  bottomBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 10,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  statsDistance: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  statsDot: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
  },
  statsDuration: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  attributionText: {
    fontSize: 9,
    color: '#334155',
    backgroundColor: '#FFFFFFCC',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    fontWeight: FontWeight.medium,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 20,
  },
  loadingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#1E293B',
  },
});
