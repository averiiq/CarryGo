import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Trip, Parcel } from '@/types';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface MapMarker {
  id: string;
  coordinate: { latitude: number; longitude: number };
  title: string;
  description: string;
  type: 'trip' | 'parcel';
  color: string;
}

interface RouteMapViewProps {
  trips?: Trip[];
  parcels?: Parcel[];
  onMarkerPress?: (marker: MapMarker) => void;
  height?: number;
  showLegend?: boolean;
}

export const RouteMapView = React.memo(function RouteMapView({
  trips = [],
  parcels = [],
  height = 300,
}: RouteMapViewProps) {
  const { C } = useThemeColors();

  // Find all unique city pairs/routes
  const routes = React.useMemo(() => {
    const list: { from: string; to: string; type: 'trip' | 'parcel'; label: string }[] = [];
    trips.forEach(t => {
      list.push({ from: t.fromCity, to: t.toCity, type: 'trip', label: `${t.userName} (${t.vehicleType})` });
    });
    parcels.forEach(p => {
      list.push({ from: p.fromCity, to: p.toCity, type: 'parcel', label: `${p.userName} (${p.weight}kg)` });
    });
    return list.slice(0, 3); // show top 3 routes to keep it clean
  }, [trips, parcels]);

  const hasData = routes.length > 0;

  if (!hasData) {
    return (
      <View style={[styles.emptyContainer, { height, backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <MaterialIcons name="map" size={40} color={C.textMuted} />
        <Text style={[styles.emptyText, { color: C.textMuted }]}>
          No routes to display
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, borderColor: C.surfaceBorder, backgroundColor: C.surface }]}>
      <LinearGradient colors={[C.primary + '08', 'transparent']} style={StyleSheet.absoluteFillObject} />

      {/* Blueprint grid background */}
      {[0, 1, 2, 3, 4].map(i => (
        <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${i * 25}%` as any, backgroundColor: C.surfaceBorderLight, opacity: 0.3 }]} />
      ))}
      {[0, 1, 2, 3, 4].map(i => (
        <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${i * 25}%` as any, backgroundColor: C.surfaceBorderLight, opacity: 0.3 }]} />
      ))}

      <View style={styles.header}>
        <MaterialIcons name="map" size={16} color={C.primary} />
        <Text style={[styles.title, { color: C.textPrimary }]}>Route Blueprint View</Text>
      </View>

      <View style={styles.routesList}>
        {routes.map((route, idx) => (
          <View key={idx} style={[styles.routeRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <View style={styles.routeCities}>
              <View style={styles.cityBadge}>
                <Text style={[styles.cityText, { color: C.textPrimary }]}>{route.from}</Text>
              </View>
              <View style={styles.connector}>
                <View style={[styles.dashedLine, { borderColor: route.type === 'trip' ? C.primary + '88' : C.success + '88' }]} />
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={route.type === 'trip' ? C.primary : C.success}
                />
              </View>
              <View style={styles.cityBadge}>
                <Text style={[styles.cityText, { color: C.textPrimary }]}>{route.to}</Text>
              </View>
            </View>
            <View style={styles.routeMeta}>
              <MaterialIcons
                name={route.type === 'trip' ? 'directions-car' : 'inventory-2'}
                size={12}
                color={route.type === 'trip' ? C.primary : C.success}
              />
              <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
                {route.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  gridLine: { position: 'absolute' },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    zIndex: 2,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routesList: {
    gap: Spacing.sm,
    zIndex: 2,
  },
  routeRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    gap: 8,
  },
  routeCities: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  cityText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  connector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  dashedLine: {
    flex: 1,
    height: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: FontSize.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
