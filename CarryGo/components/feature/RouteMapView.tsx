import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouteMap, MapMarker } from '@/hooks/useRouteMap';
import { Trip, Parcel } from '@/types';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

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
  onMarkerPress,
  height = 300,
  showLegend = true,
}: RouteMapViewProps) {
  const { C } = useThemeColors();
  const { region, markers, polylines, hasData } = useRouteMap(trips, parcels);
  const mapRef = useRef<MapView>(null);

  const handleMarkerPress = useCallback(
    (marker: MapMarker) => {
      if (onMarkerPress) {
        onMarkerPress(marker);
      }
    },
    [onMarkerPress],
  );

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
    <View style={[styles.container, { borderColor: C.surfaceBorder }]}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height }]}
        region={region}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        rotateEnabled={false}
      >
        {markers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => handleMarkerPress(marker)}
          >
            <View
              style={[
                styles.markerContainer,
                { backgroundColor: marker.color },
              ]}
            >
              <MaterialIcons
                name={marker.type === 'trip' ? 'directions-car' : 'inventory-2'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </Marker>
        ))}

        {polylines.map(polyline => (
          <Polyline
            key={polyline.id}
            coordinates={polyline.coordinates}
            strokeColor={polyline.color + 'AA'}
            strokeWidth={2.5}
            lineDashPattern={[8, 4]}
          />
        ))}
      </MapView>

      {showLegend && (
        <View style={[styles.legend, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: C.textSecondary }]}>
              Trips ({trips.length})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.legendText, { color: C.textSecondary }]}>
              Parcels ({parcels.length})
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    width: '100%',
  },
  emptyContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
