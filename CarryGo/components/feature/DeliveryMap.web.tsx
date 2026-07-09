import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';

interface DeliveryMapProps {
  travellerName: string;
  lat: number;
  lng: number;
  updatedAt: string;
  C: ThemeColors;
}

export default function DeliveryMap({ travellerName, lat, lng, updatedAt, C }: DeliveryMapProps) {
  const formatAge = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <View style={[styles.mapCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <LinearGradient colors={[C.primary + '0A', 'transparent']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.mapHeader}>
        <View style={[styles.liveBadge, { backgroundColor: C.successSubtle, borderColor: C.success + '44' }]}>
          <View style={[styles.liveDot, { backgroundColor: C.success }]} />
          <Text style={[styles.liveText, { color: C.success }]}>Live Tracking</Text>
        </View>
        <Text style={[styles.mapUpdated, { color: C.textMuted }]}>Updated {formatAge(updatedAt)}</Text>
      </View>

      <View style={[styles.map, styles.mapPlaceholder, { backgroundColor: C.surfaceElevated }]}>
        <LinearGradient
          colors={[C.primary + '08', C.surfaceElevated]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${i * 25}%` as any, backgroundColor: C.surfaceBorder }]} />
        ))}
        {[0, 1, 2, 3, 4].map(i => (
          <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${i * 25}%` as any, backgroundColor: C.surfaceBorder }]} />
        ))}
        {/* Simulated pin */}
        <View style={styles.mapPinContainer}>
          <View style={[styles.mapPinRing, { borderColor: C.primary + '40' }]} />
          <View style={[styles.mapPinDot, { backgroundColor: C.primary }]}>
            <MaterialIcons name="local-shipping" size={14} color="#fff" />
          </View>
        </View>
        <View style={[styles.mapPlaceholderLabel, { backgroundColor: C.surface + 'DD' }]}>
          <MaterialIcons name="location-on" size={12} color={C.primary} />
          <Text style={[styles.mapPlaceholderText, { color: C.textSecondary }]}>{travellerName} · Live location</Text>
        </View>
      </View>

      <View style={[styles.mapFooter, { backgroundColor: C.surfaceElevated }]}>
        <MaterialIcons name="location-on" size={12} color={C.textMuted} />
        <Text style={[styles.mapCoords, { color: C.textMuted }]}>{lat.toFixed(4)}, {lng.toFixed(4)}</Text>
        <View style={[styles.pollBadge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="refresh" size={10} color={C.primary} />
          <Text style={[styles.pollBadgeText, { color: C.primary }]}>Every 15s</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mapUpdated: { fontSize: FontSize.xs },
  map: { width: '100%', height: 200 },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  gridLine: { position: 'absolute', opacity: 0.5 },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  mapPinContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mapPinRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
  mapPinDot: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  mapPlaceholderLabel: {
    position: 'absolute', bottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  mapPlaceholderText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  mapFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  mapCoords: { flex: 1, fontSize: FontSize.xs },
  pollBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full,
  },
  pollBadgeText: { fontSize: 9, fontWeight: FontWeight.semibold },
});
