import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Trip, Request } from '@/types';
import { Haptic } from '@/services/haptics.service';

const VEHICLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bike: 'two-wheeler', car: 'directions-car', bus: 'directions-bus',
  train: 'train', flight: 'flight',
};
const VEHICLE_COLORS: Record<string, string> = {
  bike: '#71717A', car: '#52525B', bus: '#3F3F46', train: '#27272A', flight: '#18181B',
};

function TripRow({ trip, requests, onPress, onCancel, onDelete, onRepost, C }: {
  trip: Trip;
  requests: Request[];
  onPress: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRepost: () => void;
  C: ThemeColors;
}) {
  const vColor = VEHICLE_COLORS[trip.vehicleType] || C.primary;
  const tripRequests = requests.filter(r => r.tripId === trip.id);
  const accepted = tripRequests.filter(r => r.status === 'accepted').length;
  const completed = tripRequests.filter(r => r.status === 'completed').length;
  const earned = tripRequests.filter(r => r.status === 'completed').reduce((s, r) => s + r.price, 0);
  const scale = useRef(new Animated.Value(1)).current;

  const statusConfig = {
    active: { label: 'Active', color: C.success, bg: C.successSubtle, icon: 'check-circle' as const },
    completed: { label: 'Completed', color: C.info, bg: C.infoSubtle, icon: 'verified' as const },
    cancelled: { label: 'Cancelled', color: C.error, bg: C.errorSubtle, icon: 'cancel' as const },
  };
  const sc = statusConfig[trip.status] || statusConfig.active;

  return (
    <Animated.View style={[styles.row, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
      <View style={[styles.rowAccent, { backgroundColor: vColor }]} />
      <Pressable
        style={styles.rowInner}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start()}
      >
        <View style={styles.rowTop}>
          <View style={[styles.rowIconBox, { backgroundColor: vColor + '18' }]}>
            <MaterialIcons name={VEHICLE_ICONS[trip.vehicleType] || 'directions-car'} size={18} color={vColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowRoute, { color: C.textPrimary }]}>{trip.fromCity} → {trip.toCity}</Text>
            <Text style={[styles.rowMeta, { color: C.textSecondary }]}>
              {trip.date} · {trip.time} · {trip.availableCapacity}kg · Rs {trip.pricePerKg}/kg
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <MaterialIcons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        <View style={[styles.rowStatsBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          {[
            { label: 'Requests', value: String(tripRequests.length), icon: 'swap-horiz' as const, color: C.textSecondary },
            { label: 'Accepted', value: String(accepted), icon: 'check-circle' as const, color: C.success },
            { label: 'Done', value: String(completed), icon: 'verified' as const, color: C.info },
            { label: 'Earned', value: `Rs ${earned}`, icon: 'payments' as const, color: C.primary },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} /> : null}
              <View style={styles.rowStat}>
                <MaterialIcons name={s.icon} size={11} color={s.color} />
                <Text style={[styles.rowStatVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.rowStatLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {trip.status === 'active' ? (
          <View style={styles.rowActions}>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.tap(); onPress(); }}
            >
              <MaterialIcons name="open-in-new" size={13} color={C.primary} />
              <Text style={[styles.rowActionText, { color: C.primary }]}>View</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onCancel(); }}
            >
              <MaterialIcons name="block" size={13} color={C.warning} />
              <Text style={[styles.rowActionText, { color: C.warning }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onDelete(); }}
            >
              <MaterialIcons name="delete-outline" size={13} color={C.error} />
              <Text style={[styles.rowActionText, { color: C.error }]}>Delete</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.rowActions}>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.tap(); onPress(); }}
            >
              <MaterialIcons name="open-in-new" size={13} color={C.textSecondary} />
              <Text style={[styles.rowActionText, { color: C.textSecondary }]}>Details</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.confirm(); onRepost(); }}
            >
              <MaterialIcons name="refresh" size={13} color={C.primary} />
              <Text style={[styles.rowActionText, { color: C.primary }]}>Repost</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

type ActivityTripsListProps = {
  trips: Trip[];
  requests: Request[];
  onTripPress: (trip: Trip) => void;
  onCancelTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
  onRepostTrip: (trip: Trip) => void;
  onEmptyCta: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  listHeader: React.ReactElement | null;
  C: ThemeColors;
};

export function ActivityTripsList({
  trips,
  requests,
  onTripPress,
  onCancelTrip,
  onDeleteTrip,
  onRepostTrip,
  onEmptyCta,
  refreshing,
  onRefresh,
  listHeader,
  C,
}: ActivityTripsListProps) {
  return (
    <FlashList
      data={trips}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ marginBottom: Spacing.sm }}>
          <TripRow
            trip={item}
            requests={requests}
            onPress={() => onTripPress(item)}
            onCancel={() => onCancelTrip(item)}
            onDelete={() => onDeleteTrip(item)}
            onRepost={() => onRepostTrip(item)}
            C={C}
          />
        </View>
      )}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyActivity tab="trips" onCta={onEmptyCta} C={C} />
      }
      contentContainerStyle={styles.list as any}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    />
  );
}

function EmptyActivity({ tab, onCta, C }: { tab: 'trips' | 'parcels'; onCta: () => void; C: ThemeColors }) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, [bounceAnim]);
  return (
    <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[styles.emptyIcon, { backgroundColor: C.primarySubtle, transform: [{ scale: bounceAnim }] }]}>
        <MaterialIcons name={tab === 'trips' ? 'directions-car' : 'inventory-2'} size={36} color={C.primary} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No {tab === 'trips' ? 'trips' : 'parcels'} yet</Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        {tab === 'trips'
          ? 'Post your first trip to start carrying parcels and earning.'
          : 'List your first parcel to find travellers on your route.'}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyCta, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
        onPress={() => { Haptic.confirm(); onCta(); }}
      >
        <MaterialIcons name={tab === 'trips' ? 'add' : 'send'} size={15} color="#fff" />
        <Text style={styles.emptyCtaText}>{tab === 'trips' ? 'Post a Trip' : 'Send a Parcel'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: Spacing.sm },

  row: {
    borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row',
  },
  rowAccent: { width: 4 },
  rowInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  rowIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowRoute: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  rowMeta: { fontSize: FontSize.xs, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, flexShrink: 0,
  },
  statusPillText: { fontSize: 10, fontWeight: FontWeight.bold },

  rowStatsBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.sm,
    borderWidth: 1, padding: Spacing.sm, gap: 0,
  },
  rowStat: { flex: 1, alignItems: 'center', gap: 2 },
  rowStatVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  rowStatLabel: { fontSize: 9, fontWeight: FontWeight.medium },
  statDiv: { width: 1, height: 22, marginHorizontal: 2 },

  rowActions: { flexDirection: 'row', gap: Spacing.sm },
  rowActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    justifyContent: 'center', paddingVertical: Spacing.sm + 1,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  rowActionText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  emptyWrap: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  emptyCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
