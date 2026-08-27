import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, Animated, Switch, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient, useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AppErrorBoundary } from '@/components';
import {
  fetchSubscriptions, createSubscription, deleteSubscription, toggleSubscription,
} from '@/services/subscriptions.service';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { RouteSubscription, Trip, Parcel } from '@/types';
import { INDIAN_CITIES } from '@/constants/indian-cities';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Haptic } from '@/services/haptics.service';
import { sendLocalNotification } from '@/services/notifications.service';

const CITIES = INDIAN_CITIES.map(c => c.name);

// ── City Picker ──────────────────────────────────────────────────────────────
function CityPicker({
  label, selected, onSelect, excluded, C,
}: { label: string; selected: string; onSelect: (c: string) => void; excluded: string; C: ThemeColors }) {
  return (
    <View style={styles.pickerSection}>
      <Text style={[styles.pickerLabel, { color: C.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.cityRow}>
          {CITIES.filter(c => c !== excluded).map(city => (
            <Pressable
              key={city}
              style={[
                styles.cityChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                selected === city && { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
              ]}
              onPress={() => { Haptic.select(); onSelect(city); }}
            >
              <Text style={[styles.cityChipText, { color: selected === city ? C.textInverse : C.textSecondary }]}>
                {city}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Match Alert ──────────────────────────────────────────────────────────────
interface MatchResult {
  subId: string;
  route: string;
  trips: Trip[];
  parcels: Parcel[];
  newCount: number;
}

// ── Subscription Card ────────────────────────────────────────────────────────
function SubCard({
  item, onToggle, onDelete, onView, matchData, C,
}: {
  item: RouteSubscription;
  onToggle: () => void;
  onDelete: () => void;
  onView: () => void;
  matchData?: MatchResult;
  C: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start();

  const hasMatches = matchData && (matchData.trips.length + matchData.parcels.length) > 0;
  const totalMatches = hasMatches ? matchData!.trips.length + matchData!.parcels.length : 0;

  return (
    <Animated.View style={[
      styles.subCard,
      { backgroundColor: C.surface, borderColor: item.active ? C.primary + '44' : C.surfaceBorder },
      { transform: [{ scale }] },
    ]}>
      {item.active ? (
        <LinearGradient
          colors={[C.primary + '08', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      ) : null}

      {/* Left accent */}
      <View style={[styles.subAccent, { backgroundColor: item.active ? C.primary : C.surfaceBorderLight }]} />

      <Pressable
        style={styles.subInner}
        onPress={() => { Haptic.tap(); onView(); }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* Route header */}
        <View style={styles.subRouteRow}>
          <View style={[styles.subIconBox, { backgroundColor: item.active ? C.primary + '18' : C.surfaceElevated }]}>
            <MaterialIcons
              name="notifications-active"
              size={18}
              color={item.active ? C.primary : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.routePills}>
              <View style={[styles.routePill, { backgroundColor: C.successSubtle }]}>
                <View style={[styles.routeDot, { backgroundColor: C.success }]} />
                <Text style={[styles.routePillText, { color: C.success }]}>{item.fromCity}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={12} color={C.textMuted} />
              <View style={[styles.routePill, { backgroundColor: C.errorSubtle }]}>
                <View style={[styles.routeDot, { backgroundColor: C.error }]} />
                <Text style={[styles.routePillText, { color: C.error }]}>{item.toCity}</Text>
              </View>
            </View>
            <Text style={[styles.subSince, { color: C.textMuted }]}>
              Since {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          {/* Toggle */}
          <Switch
            value={item.active}
            onValueChange={() => { Haptic.select(); onToggle(); }}
            trackColor={{ false: C.surfaceBorderLight, true: C.primary + '88' }}
            thumbColor={item.active ? C.primary : C.surfaceBorder}
            ios_backgroundColor={C.surfaceBorderLight}
          />
        </View>

        {/* Match stats */}
        {hasMatches ? (
          <View style={[styles.matchBar, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
            <MaterialIcons name="local-fire-department" size={13} color={C.primary} />
            <Text style={[styles.matchBarText, { color: C.primary }]}>
              {matchData!.trips.length} trip{matchData!.trips.length !== 1 ? 's' : ''} · {matchData!.parcels.length} parcel{matchData!.parcels.length !== 1 ? 's' : ''} available now
            </Text>
            <View style={[styles.matchBadge, { backgroundColor: C.primary }]}>
              <Text style={styles.matchBadgeText}>{totalMatches}</Text>
            </View>
          </View>
        ) : item.active ? (
          <View style={[styles.matchBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="search" size={13} color={C.textMuted} />
            <Text style={[styles.matchBarText, { color: C.textMuted }]}>No listings on this route right now</Text>
          </View>
        ) : (
          <View style={[styles.matchBar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="notifications-off" size={13} color={C.textMuted} />
            <Text style={[styles.matchBarText, { color: C.textMuted }]}>Alerts paused</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.subActions}>
          {hasMatches ? (
            <Pressable
              style={({ pressed }) => [
                styles.viewMatchesBtn,
                { backgroundColor: C.primaryDark, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => { Haptic.confirm(); onView(); }}
            >
              <MaterialIcons name="open-in-new" size={13} color={C.textInverse} />
              <Text style={styles.viewMatchesBtnText}>View Matches</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              { backgroundColor: C.errorSubtle, borderColor: C.error + '44', opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => { Haptic.warning(); onDelete(); }}
          >
            <MaterialIcons name="delete-outline" size={14} color={C.error} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  const [subs, setSubs] = useState<RouteSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [matchData, setMatchData] = useState<Record<string, MatchResult>>({});
  const prevMatchCounts = useRef<Record<string, number>>({});
  const addPanY = useRef(new Animated.Value(-20)).current;
  const addOpacity = useRef(new Animated.Value(0)).current;
  const userId = user?.id;

  const loadSubs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await fetchSubscriptions(userId);
    if (data) setSubs(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) void loadSubs();
  }, [loadSubs, userId]);

  const refreshMatches = useCallback(async () => {
    const activeSubs = subs.filter(s => s.active);
    if (activeSubs.length === 0) return;

    const results: Record<string, MatchResult> = {};
    await Promise.all(activeSubs.map(async sub => {
      const [tripsRes, parcelsRes] = await Promise.all([
        fetchTrips({ fromCity: sub.fromCity, toCity: sub.toCity }),
        fetchParcels({ fromCity: sub.fromCity, toCity: sub.toCity }),
      ]);
      const trips = (tripsRes.data || []).filter(t => t.status === 'active' && t.userId !== userId);
      const parcels = (parcelsRes.data || []).filter(p => p.status === 'open' && p.userId !== userId);
      const totalCount = trips.length + parcels.length;
      const prevCount = prevMatchCounts.current[sub.id] ?? -1;

      // Alert if new matches appeared
      if (prevCount >= 0 && totalCount > prevCount) {
        const newCount = totalCount - prevCount;
        await sendLocalNotification(
          `New match on ${sub.fromCity} → ${sub.toCity}`,
          `${newCount} new listing${newCount > 1 ? 's' : ''} available on your subscribed route!`
        );
      }
      prevMatchCounts.current[sub.id] = totalCount;

      results[sub.id] = {
        subId: sub.id,
        route: `${sub.fromCity} → ${sub.toCity}`,
        trips,
        parcels,
        newCount: 0,
      };
    }));
    setMatchData(results);
  }, [subs, userId]);

  useEffect(() => {
    if (!userId || subs.length === 0) return;
    void refreshMatches();

    const sb = getSupabaseClient();
    const tripsChannel = sb
      .channel(`route-sub-trips:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        void refreshMatches();
      })
      .subscribe();

    const parcelsChannel = sb
      .channel(`route-sub-parcels:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, () => {
        void refreshMatches();
      })
      .subscribe();

    return () => {
      void sb.removeChannel(tripsChannel);
      void sb.removeChannel(parcelsChannel);
    };
  }, [refreshMatches, subs.length, userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubs();
    await refreshMatches();
    setRefreshing(false);
  };

  const toggleAddForm = () => {
    if (!showAdd) {
      setShowAdd(true);
      Animated.parallel([
        Animated.spring(addPanY, { toValue: 0, tension: 200, friction: 18, useNativeDriver: true }),
        Animated.timing(addOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(addPanY, { toValue: -20, duration: 200, useNativeDriver: true }),
        Animated.timing(addOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setShowAdd(false);
        setFromCity('');
        setToCity('');
      });
    }
    Haptic.tap();
  };

  const handleAdd = async () => {
    if (!fromCity || !toCity) {
      showAlert('Select Route', 'Please select both origin and destination cities.');
      return;
    }
    if (fromCity === toCity) {
      showAlert('Invalid Route', 'Origin and destination must be different.');
      return;
    }
    setSaving(true);
    const { data } = await createSubscription(user?.id || '', fromCity, toCity);
    if (data) {
      setSubs(prev => [data, ...prev.filter(s => s.id !== data.id)]);
      toggleAddForm();
      Haptic.success();
      showAlert('Alert Created!', `You'll be notified when trips or parcels appear on ${fromCity} → ${toCity}.`);
    }
    setSaving(false);
  };

  const handleDelete = (sub: RouteSubscription) => {
    showAlert(`Remove Alert?`, `Stop receiving alerts for ${sub.fromCity} → ${sub.toCity}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await deleteSubscription(sub.id, user?.id || '');
          setSubs(prev => prev.filter(s => s.id !== sub.id));
          Haptic.success();
        },
      },
    ]);
  };

  const handleToggle = async (sub: RouteSubscription) => {
    await toggleSubscription(sub.id, !sub.active, user?.id || '');
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, active: !s.active } : s));
    Haptic.select();
  };

  const handleView = (sub: RouteSubscription) => {
    // Navigate to matching screen in browse mode
    router.push({ pathname: '/matching', params: { mode: 'browse_trips', fromCity: sub.fromCity, toCity: sub.toCity } });
  };

  const activeSubs = subs.filter(s => s.active).length;
  const totalMatches = Object.values(matchData).reduce((s, m) => s + m.trips.length + m.parcels.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <LinearGradient
          colors={[C.primarySubtle, 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={() => { Haptic.tap(); router.back(); }}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Route Alerts</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {activeSubs} active · {totalMatches} listings available
            </Text>
          </View>
          <Pressable
            style={[
              styles.addButton,
              { backgroundColor: showAdd ? C.error : C.primaryDark },
            ]}
            onPress={toggleAddForm}
          >
            <MaterialIcons name={showAdd ? 'close' : 'add'} size={20} color={C.textInverse} />
          </Pressable>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          {[
            { label: 'Subscriptions', value: String(subs.length), icon: 'notifications' as const, color: C.primary },
            { label: 'Active', value: String(activeSubs), icon: 'notifications-active' as const, color: C.success },
            { label: 'Live matches', value: String(totalMatches), icon: 'local-fire-department' as const, color: C.warning },
          ].map((s, i) => (
            <View key={i} style={[styles.statChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name={s.icon} size={13} color={s.color} />
              <Text style={[styles.statChipVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statChipLabel, { color: C.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Add Form ───────────────────────────────────── */}
      {showAdd ? (
        <Animated.View style={[
          styles.addCard,
          { backgroundColor: C.surface, borderColor: C.primary + '44' },
          { transform: [{ translateY: addPanY }], opacity: addOpacity },
        ]}>
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.addCardHeader}>
            <View style={[styles.addCardIcon, { backgroundColor: C.primarySubtle }]}>
              <Ionicons name="notifications" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addCardTitle, { color: C.textPrimary }]}>New Route Alert</Text>
              <Text style={[styles.addCardSub, { color: C.textMuted }]}>
                Notified whenever a trip or parcel appears
              </Text>
            </View>
            {fromCity && toCity ? (
              <View style={[styles.routePreview, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}>
                <Text style={[styles.routePreviewText, { color: C.primary }]}>{fromCity} → {toCity}</Text>
              </View>
            ) : null}
          </View>

          <CityPicker label="FROM CITY" selected={fromCity} onSelect={setFromCity} excluded={toCity} C={C} />
          <CityPicker label="TO CITY" selected={toCity} onSelect={setToCity} excluded={fromCity} C={C} />

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: fromCity && toCity ? C.primaryDark : C.surfaceElevated },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleAdd}
            disabled={saving || !fromCity || !toCity}
          >
            {saving ? (
              <ActivityIndicator color={C.textInverse} size="small" />
            ) : (
              <>
                <Ionicons name="notifications" size={16} color={fromCity && toCity ? C.textInverse : C.textMuted} />
                <Text style={[styles.saveBtnText, { color: fromCity && toCity ? C.textInverse : C.textMuted }]}>
                  Subscribe to Route
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── List ───────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading subscriptions...</Text>
        </View>
      ) : (
        <AppErrorBoundary>
          <FlashList
            data={subs}
            keyExtractor={s => s.id}
            renderItem={({ item }) => (
              <View style={{ marginBottom: Spacing.sm }}>
                <SubCard
                  item={item}
                  onToggle={() => handleToggle(item)}
                  onDelete={() => handleDelete(item)}
                  onView={() => handleView(item)}
                  matchData={matchData[item.id]}
                  C={C}
                />
              </View>
            )}
            contentContainerStyle={styles.list as any}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.primary}
              />
            }
            ListHeaderComponent={subs.length > 0 ? (
              <View style={[styles.pollBanner, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
                <View style={[styles.pollDot, { backgroundColor: C.success }]} />
                <Text style={[styles.pollBannerText, { color: C.primary }]}>
                  Live route updates enabled · Pull to refresh
                </Text>
              </View>
            ) : null}
            ListEmptyComponent={() => (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <View style={[styles.emptyIconBox, { backgroundColor: C.primarySubtle }]}>
                  <MaterialIcons name="notifications-off" size={40} color={C.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No route alerts</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  Subscribe to routes you care about and get instantly notified when trips or parcels appear.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.emptyCta, { backgroundColor: C.primaryDark, opacity: pressed ? 0.85 : 1 }]}
                  onPress={toggleAddForm}
                >
                  <MaterialIcons name="add" size={16} color={C.textInverse} />
                  <Text style={styles.emptyCtaText}>Add First Alert</Text>
                </Pressable>
              </View>
            )}
          />
        </AppErrorBoundary>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  addButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  statsBar: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1, justifyContent: 'center',
  },
  statChipVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statChipLabel: { fontSize: 9, fontWeight: FontWeight.medium },

  // Add form
  addCard: {
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  addCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  addCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  addCardSub: { fontSize: FontSize.xs, marginTop: 2 },
  routePreview: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, flexShrink: 0,
  },
  routePreviewText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  pickerSection: { gap: Spacing.sm },
  pickerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.6 },
  cityRow: { flexDirection: 'row', gap: Spacing.sm },
  cityChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  cityChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  saveBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  // Poll banner
  pollBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  pollDot: { width: 7, height: 7, borderRadius: 4 },
  pollBannerText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Sub card
  subCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    overflow: 'hidden', flexDirection: 'row',
  },
  subAccent: { width: 4 },
  subInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  subRouteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  subIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routePills: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  routePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  routeDot: { width: 5, height: 5, borderRadius: 3 },
  routePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  subSince: { fontSize: 10, marginTop: 3 },

  matchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm + 4, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  matchBarText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  matchBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  matchBadgeText: { fontSize: 10, color: '#fff', fontWeight: FontWeight.bold },

  subActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  viewMatchesBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
  },
  viewMatchesBtnText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  // Loading
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm },

  // List
  list: { padding: Spacing.md },

  // Empty
  emptyWrap: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: 48, paddingHorizontal: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  emptyCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
