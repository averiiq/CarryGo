import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Parcel, Request } from '@/types';
import { Haptic } from '@/services/haptics.service';

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description', electronics: 'devices', clothing: 'checkroom',
  food: 'restaurant', medicine: 'local-pharmacy', other: 'inventory-2',
};
const CATEGORY_COLORS: Record<string, string> = {
  documents: '#71717A', electronics: '#52525B', clothing: '#3F3F46',
  food: '#27272A', medicine: '#18181B', other: '#71717A',
};

function ParcelRow({ parcel, requests, onPress, onDelete, C }: {
  parcel: Parcel;
  requests: Request[];
  onPress: () => void;
  onDelete: () => void;
  C: ThemeColors;
}) {
  const catColor = CATEGORY_COLORS[parcel.category] || C.primary;
  const parcelRequests = requests.filter(r => r.parcelId === parcel.id);
  const pending = parcelRequests.filter(r => r.status === 'pending').length;
  const accepted = parcelRequests.filter(r => r.status === 'accepted').length;
  const scale = useRef(new Animated.Value(1)).current;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    open:       { label: 'Open',       color: C.success, bg: C.successSubtle,   icon: 'check-circle' },
    matched:    { label: 'Matched',    color: C.primary, bg: C.primarySubtle,    icon: 'handshake' },
    in_transit: { label: 'In Transit', color: C.textSecondary, bg: C.primarySubtle, icon: 'local-shipping' },
    delivered:  { label: 'Delivered',  color: C.info,    bg: C.infoSubtle,       icon: 'verified' },
    failed:     { label: 'Failed',     color: C.error,   bg: C.errorSubtle,      icon: 'error' },
  };
  const sc = statusConfig[parcel.status] || statusConfig.open;

  return (
    <Animated.View style={[styles.row, { backgroundColor: C.surface, borderColor: C.surfaceBorder, transform: [{ scale }] }]}>
      <View style={[styles.rowAccent, { backgroundColor: catColor }]} />
      <Pressable
        style={styles.rowInner}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, tension: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start()}
      >
        <View style={styles.rowTop}>
          <View style={[styles.rowIconBox, { backgroundColor: catColor + '18' }]}>
            <MaterialIcons name={CATEGORY_ICONS[parcel.category] || 'inventory-2'} size={18} color={catColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowRoute, { color: C.textPrimary }]}>{parcel.fromCity} → {parcel.toCity}</Text>
            <Text style={[styles.rowMeta, { color: C.textSecondary }]} numberOfLines={1}>
              {parcel.description} · {parcel.weight}kg · Rs {parcel.priceOffer}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <MaterialIcons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        <View style={[styles.rowStatsBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={[styles.catChip, { backgroundColor: catColor + '15', borderColor: catColor + '40' }]}>
            <Text style={[styles.catChipText, { color: catColor }]}>
              {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
            </Text>
          </View>
          <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
          {[
            { label: 'Requests', value: String(parcelRequests.length), color: C.textSecondary },
            { label: 'Pending', value: String(pending), color: C.warning },
            { label: 'Accepted', value: String(accepted), color: C.success },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} /> : null}
              <View style={styles.rowStat}>
                <Text style={[styles.rowStatVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.rowStatLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.rowActions}>
          <Pressable
            style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}
            onPress={() => { Haptic.tap(); onPress(); }}
          >
            <MaterialIcons name="open-in-new" size={13} color={C.primary} />
            <Text style={[styles.rowActionText, { color: C.primary }]}>View</Text>
          </Pressable>
          {parcel.status === 'open' ? (
            <Pressable
              style={({ pressed }) => [styles.rowActionBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.7 }]}
              onPress={() => { Haptic.warning(); onDelete(); }}
            >
              <MaterialIcons name="delete-outline" size={13} color={C.error} />
              <Text style={[styles.rowActionText, { color: C.error }]}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyActivity({ onCta, C }: { onCta: () => void; C: ThemeColors }) {
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
        <MaterialIcons name="inventory-2" size={36} color={C.primary} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No parcels yet</Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>
        List your first parcel to find travellers on your route.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyCta, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
        onPress={() => { Haptic.confirm(); onCta(); }}
      >
        <MaterialIcons name="send" size={15} color="#fff" />
        <Text style={styles.emptyCtaText}>Send a Parcel</Text>
      </Pressable>
    </View>
  );
}

type ActivityParcelsListProps = {
  parcels: Parcel[];
  requests: Request[];
  onParcelPress: (parcel: Parcel) => void;
  onDeleteParcel: (parcel: Parcel) => void;
  onEmptyCta: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  listHeader: React.ReactElement | null;
  C: ThemeColors;
};

export function ActivityParcelsList({
  parcels,
  requests,
  onParcelPress,
  onDeleteParcel,
  onEmptyCta,
  refreshing,
  onRefresh,
  listHeader,
  C,
}: ActivityParcelsListProps) {
  return (
    <FlashList
      data={parcels}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ marginBottom: Spacing.sm }}>
          <ParcelRow
            parcel={item}
            requests={requests}
            onPress={() => onParcelPress(item)}
            onDelete={() => onDeleteParcel(item)}
            C={C}
          />
        </View>
      )}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={<EmptyActivity onCta={onEmptyCta} C={C} />}
      contentContainerStyle={styles.list as any}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    />
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

  catChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, flexShrink: 0,
  },
  catChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

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
