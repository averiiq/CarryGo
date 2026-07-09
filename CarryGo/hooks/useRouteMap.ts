import { useMemo } from 'react';
import { Trip, Parcel } from '@/types';
import { findCity, IndianCity } from '@/constants/indian-cities';

export interface MapMarker {
  id: string;
  type: 'trip' | 'parcel';
  coordinate: { latitude: number; longitude: number };
  title: string;
  description: string;
  color: string;
}

export interface MapPolyline {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface RouteMapData {
  region: MapRegion;
  markers: MapMarker[];
  polylines: MapPolyline[];
  hasData: boolean;
}

const TRIP_COLOR = '#10B981'; // green
const PARCEL_COLOR = '#3B82F6'; // blue

const DEFAULT_REGION: MapRegion = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

function getCityCoord(cityName: string): { latitude: number; longitude: number } | null {
  const city = findCity(cityName);
  if (!city) return null;
  return { latitude: city.lat, longitude: city.lng };
}

/**
 * Hook for map-based route visualization.
 * Takes arrays of trips and parcels and returns map region, markers, and polylines.
 */
export function useRouteMap(
  trips: Trip[] = [],
  parcels: Parcel[] = [],
): RouteMapData {
  return useMemo(() => {
    const markers: MapMarker[] = [];
    const polylines: MapPolyline[] = [];
    const allCoords: { latitude: number; longitude: number }[] = [];

    // Process trips
    for (const trip of trips) {
      const from = getCityCoord(trip.fromCity);
      const to = getCityCoord(trip.toCity);

      if (from) {
        markers.push({
          id: `trip-from-${trip.id}`,
          type: 'trip',
          coordinate: from,
          title: `${trip.fromCity} (Trip)`,
          description: `${trip.userName} - ${trip.vehicleType} - ${trip.availableCapacity}kg`,
          color: TRIP_COLOR,
        });
        allCoords.push(from);
      }

      if (to) {
        markers.push({
          id: `trip-to-${trip.id}`,
          type: 'trip',
          coordinate: to,
          title: `${trip.toCity} (Trip)`,
          description: `To: ${trip.toCity} on ${trip.date}`,
          color: TRIP_COLOR,
        });
        allCoords.push(to);
      }

      if (from && to) {
        polylines.push({
          id: `trip-route-${trip.id}`,
          coordinates: [from, to],
          color: TRIP_COLOR,
        });
      }
    }

    // Process parcels
    for (const parcel of parcels) {
      const from = getCityCoord(parcel.fromCity);
      const to = getCityCoord(parcel.toCity);

      if (from) {
        markers.push({
          id: `parcel-from-${parcel.id}`,
          type: 'parcel',
          coordinate: from,
          title: `${parcel.fromCity} (Parcel)`,
          description: `${parcel.userName} - ${parcel.weight}kg - ${parcel.category}`,
          color: PARCEL_COLOR,
        });
        allCoords.push(from);
      }

      if (to) {
        markers.push({
          id: `parcel-to-${parcel.id}`,
          type: 'parcel',
          coordinate: to,
          title: `${parcel.toCity} (Parcel)`,
          description: `To: ${parcel.toCity} - Rs ${parcel.priceOffer}`,
          color: PARCEL_COLOR,
        });
        allCoords.push(to);
      }

      if (from && to) {
        polylines.push({
          id: `parcel-route-${parcel.id}`,
          coordinates: [from, to],
          color: PARCEL_COLOR,
        });
      }
    }

    if (allCoords.length === 0) {
      return { region: DEFAULT_REGION, markers: [], polylines: [], hasData: false };
    }

    // Calculate region to fit all points
    const region = calculateFitRegion(allCoords);

    // Deduplicate markers at same location (clustering)
    const clusteredMarkers = clusterMarkers(markers);

    return { region, markers: clusteredMarkers, polylines, hasData: true };
  }, [trips, parcels]);
}

function calculateFitRegion(
  coords: { latitude: number; longitude: number }[],
): MapRegion {
  if (coords.length === 0) return DEFAULT_REGION;
  if (coords.length === 1) {
    return {
      latitude: coords[0].latitude,
      longitude: coords[0].longitude,
      latitudeDelta: 2,
      longitudeDelta: 2,
    };
  }

  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;

  for (const coord of coords) {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  }

  const PADDING = 1.3;
  const latDelta = (maxLat - minLat) * PADDING;
  const lngDelta = (maxLng - minLng) * PADDING;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 1),
    longitudeDelta: Math.max(lngDelta, 1),
  };
}

/**
 * Simple marker clustering: deduplicate markers within ~0.01 degrees of each other.
 */
function clusterMarkers(markers: MapMarker[]): MapMarker[] {
  const THRESHOLD = 0.01;
  const clustered: MapMarker[] = [];

  for (const marker of markers) {
    const existing = clustered.find(
      m =>
        Math.abs(m.coordinate.latitude - marker.coordinate.latitude) < THRESHOLD &&
        Math.abs(m.coordinate.longitude - marker.coordinate.longitude) < THRESHOLD &&
        m.type === marker.type,
    );
    if (!existing) {
      clustered.push(marker);
    }
  }

  return clustered;
}
