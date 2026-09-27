import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Switch,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient, useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AppErrorBoundary } from '@/components';
import {
  fetchSubscriptions,
  createSubscription,
  deleteSubscription,
  toggleSubscription,
} from '@/services/subscriptions.service';
import { fetchTrips } from '@/services/trips.service';
import { fetchParcels } from '@/services/parcels.service';
import { RouteSubscription, Trip, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Haptic } from '@/services/haptics.service';
import { sendLocalNotification } from '@/services/notifications.service';
import { CitySelectModal } from '@/components/feature/CitySelectModal';

// ── Match Alert Data ─────────────────────────────────────────────────────────
interface MatchResult {
  subId: string;
  route: string;
  trips: Trip[];
  parcels: Parcel[];
  newCount: number;
}

const POPULAR_CORRIDORS = [
  { from: 'Delhi', to: 'Gurugram' },
  { from: 'Chandigarh', to: 'Delhi' },
  { from: 'Hisar', to: 'Delhi' },
  { from: 'Rohtak', to: 'Delhi' },
  { from: 'Faridabad', to: 'Gurugram' },
];

// ── Subscription Card ────────────────────────────────────────────────────────
function SubCard({
  item,
  onToggle,
  onDelete,
  onView,
  matchData,
  C,
  S,
}: {
  item: RouteSubscription;
  onToggle: () => void;
  onDelete: () => void;
  onView: () => void;
  matchData?: MatchResult;
  C: ThemeColors;
  S: ReturnType<typeof useThemeColors>['S'];
}) {
  const tripCount = matchData?.trips.length || 0;
  const parcelCount = matchData?.parcels.length || 0;
  const hasMatches = (tripCount + parcelCount) > 0;
  const totalMatches = tripCount + parcelCount;

  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.subCard,
        { backgroundColor: C.surface, borderColor: item.active ? C.primary + '55' : C.surfaceBorder },
        S.card,
      ]}
    >
        {item.active && (
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Accent Bar */}
        <View style={[styles.subAccent, { backgroundColor: item.active ? C.primary : C.surfaceBorder }]} />

        <View style={styles.subInner}>
          {/* Top Row: Route & Toggle */}
          <View style={styles.subHeaderRow}>
            <View style={styles.routePillsRow}>
              <View style={[styles.routePill, { backgroundColor: C.successSubtle }]}>
                <View style={[styles.routeDot, { backgroundColor: C.success }]} />
                <Text style={[styles.routePillText, { color: C.success }]}>{item.fromCity}</Text>
              </View>

              <Feather name="arrow-right" size={14} color={C.textMuted} />

              <View style={[styles.routePill, { backgroundColor: C.errorSubtle }]}>
                <View style={[styles.routeDot, { backgroundColor: C.error }]} />
                <Text style={[styles.routePillText, { color: C.error }]}>{item.toCity}</Text>
              </View>
            </View>

            <Switch
              value={item.active}
              onValueChange={() => {
                Haptic.select();
                onToggle();
              }}
              trackColor={{ false: C.surfaceBorder, true: C.primary + '88' }}
              thumbColor={item.active ? C.primary : C.surfaceBorderLight}
            />
          </View>

          {/* Subtitle / Creation time */}
          <View style={styles.metaRow}>
            <Feather name="radio" size={11} color={item.active ? C.primary : C.textMuted} />
            <Text style={[styles.subDate, { color: C.textMuted }]}>
              {item.active ? 'Radar active' : 'Alert paused'} · Added {formattedDate}
            </Text>
          </View>

          {/* Live Matches Status Banner */}
          {hasMatches && item.active ? (
            <Pressable
              style={({ pressed }) => [
                styles.matchBanner,
                { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                Haptic.tap();
                onView();
              }}
            >
              <View style={[styles.flameIconWrap, { backgroundColor: C.primaryDark }]}>
                <MaterialIcons name="local-fire-department" size={13} color="#fff" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.matchBannerTitle, { color: C.primary }]}>
                  {totalMatches} Active Match{totalMatches > 1 ? 'es' : ''} Right Now
                </Text>
                <Text style={[styles.matchBannerSub, { color: C.textSecondary }]}>
                  {tripCount} trip{tripCount !== 1 ? 's' : ''} · {parcelCount} parcel{parcelCount !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.viewLink}>
                <Text style={[styles.viewLinkText, { color: C.primary }]}>View</Text>
                <Feather name="chevron-right" size={13} color={C.primary} />
              </View>
            </Pressable>
          ) : item.active ? (
            <View style={[styles.noMatchBanner, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Feather name="eye" size={12} color={C.textMuted} />
              <Text style={[styles.noMatchText, { color: C.textMuted }]}>
                Monitoring 24/7. Instant notification on new listings.
              </Text>
            </View>
          ) : (
            <View style={[styles.noMatchBanner, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <Feather name="pause" size={12} color={C.textMuted} />
              <Text style={[styles.noMatchText, { color: C.textMuted }]}>
                Alert paused. Toggle switch to resume live tracking.
              </Text>
            </View>
          )}

          {/* Bottom Card Actions */}
          <View style={[styles.cardFooter, { borderTopColor: C.surfaceBorder }]}>
            <Pressable
              style={({ pressed }) => [
                styles.browseBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { backgroundColor: C.primarySubtle },
              ]}
              onPress={() => {
                Haptic.tap();
                onView();
              }}
            >
              <Feather name="search" size={12} color={C.textPrimary} />
              <Text style={[styles.browseBtnText, { color: C.textPrimary }]}>Search Route</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: C.errorSubtle, borderColor: C.error + '33' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {
                Haptic.warning();
                onDelete();
              }}
            >
              <Feather name="trash-2" size={13} color={C.error} />
              <Text style={[styles.deleteBtnText, { color: C.error }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
  );
}

// ── Main Route Alerts Screen ─────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();

  const [subs, setSubs] = useState<RouteSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [cityPickerTarget, setCityPickerTarget] = useState<'from' | 'to' | null>(null);
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
    await Promise.all(
      activeSubs.map(async sub => {
        const [tripsRes, parcelsRes] = await Promise.all([
          fetchTrips({ fromCity: sub.fromCity, toCity: sub.toCity }),
          fetchParcels({ fromCity: sub.fromCity, toCity: sub.toCity }),
        ]);
        const trips = (tripsRes.data || []).filter((t: Trip) => t.status === 'active' && t.userId !== userId);
        const parcels = (parcelsRes.data || []).filter((p: Parcel) => p.status === 'open' && p.userId !== userId);
        const totalCount = trips.length + parcels.length;
        const prevCount = prevMatchCounts.current[sub.id] ?? -1;

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
      })
    );
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

  const handleSwapCities = () => {
    Haptic.select();
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const handleAdd = async () => {
    if (!fromCity || !toCity) {
      showAlert('Select Route', 'Please choose both origin and destination cities.');
      return;
    }
    if (fromCity.toLowerCase() === toCity.toLowerCase()) {
      showAlert('Invalid Route', 'Origin and destination must be different cities.');
      return;
    }
    setSaving(true);
    const { data } = await createSubscription(user?.id || '', fromCity, toCity);
    if (data) {
      setSubs(prev => [data, ...prev.filter(s => s.id !== data.id)]);
      toggleAddForm();
      Haptic.success();
      showAlert('Route Alert Activated!', `We will notify you immediately when new trips or parcels match ${fromCity} → ${toCity}.`);
    }
    setSaving(false);
  };

  const handleDelete = useCallback((sub: RouteSubscription) => {
    showAlert(
      `Delete Route Alert?`,
      `Stop receiving notifications for ${sub.fromCity} → ${sub.toCity}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSubscription(sub.id, user?.id || '');
            setSubs(prev => prev.filter(s => s.id !== sub.id));
            Haptic.success();
          },
        },
      ]
    );
  }, [showAlert, user?.id]);

  const handleToggle = useCallback(async (sub: RouteSubscription) => {
    await toggleSubscription(sub.id, !sub.active, user?.id || '');
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, active: !s.active } : s));
  }, [user?.id]);

  const handleView = useCallback((sub: RouteSubscription) => {
    router.push({
      pathname: '/matching',
      params: { mode: 'browse_trips', fromCity: sub.fromCity, toCity: sub.toCity },
    });
  }, [router]);

  const renderSubItem = useCallback(
    ({ item }: { item: RouteSubscription }) => (
      <View style={{ marginBottom: Spacing.sm }}>
        <SubCard
          item={item}
          onToggle={() => handleToggle(item)}
          onDelete={() => handleDelete(item)}
          onView={() => handleView(item)}
          matchData={matchData[item.id]}
          C={C}
          S={S}
        />
      </View>
    ),
    [handleToggle, handleDelete, handleView, matchData, C, S]
  );

  const activeSubs = subs.filter(s => s.active).length;
  const totalMatches = Object.values(matchData).reduce(
    (s, m) => s + m.trips.length + m.parcels.length,
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder },
        ]}
      >
        <LinearGradient
          colors={[C.primarySubtle, 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={() => {
              Haptic.tap();
              router.back();
            }}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Route Alerts</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {activeSubs} active corridors · {totalMatches} live listings
            </Text>
          </View>

          <Pressable
            style={[
              styles.addButton,
              { backgroundColor: showAdd ? C.error : C.primaryDark },
            ]}
            onPress={toggleAddForm}
          >
            <Feather name={showAdd ? 'x' : 'plus'} size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Corridor Metric Bar */}
        <View style={styles.statsBar}>
          {[
            { label: 'Subscribed', value: String(subs.length), icon: 'bell' as const, color: C.primary },
            { label: 'Radar Active', value: String(activeSubs), icon: 'activity' as const, color: C.success },
            { label: 'Live Matches', value: String(totalMatches), icon: 'zap' as const, color: C.warning },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                styles.statChip,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              ]}
            >
              <Feather name={s.icon} size={12} color={s.color} />
              <Text style={[styles.statChipVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statChipLabel, { color: C.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Add Route Alert Form ───────────────────────────────────── */}
      {showAdd ? (
        <Animated.View
          style={[
            styles.addCard,
            { backgroundColor: C.surface, borderColor: C.primary + '55' },
            S.card,
            { transform: [{ translateY: addPanY }], opacity: addOpacity },
          ]}
        >
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.addCardHeader}>
            <View style={[styles.addCardIcon, { backgroundColor: C.primaryDark }]}>
              <Feather name="bell" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addCardTitle, { color: C.textPrimary }]}>Create Route Alert</Text>
              <Text style={[styles.addCardSub, { color: C.textMuted }]}>
                Get instantly notified when trips or parcels match
              </Text>
            </View>
          </View>

          {/* City Pickers with Quick Swap */}
          <View style={styles.inputContainer}>
            <Pressable
              style={[
                styles.citySelector,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              ]}
              onPress={() => {
                Haptic.tap();
                setCityPickerTarget('from');
              }}
            >
              <View style={[styles.cityDot, { backgroundColor: C.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.citySelectorLabel, { color: C.textMuted }]}>FROM CITY</Text>
                <Text
                  style={[
                    styles.citySelectorValue,
                    { color: fromCity ? C.textPrimary : C.textMuted },
                  ]}
                >
                  {fromCity || 'Select Origin City'}
                </Text>
              </View>
              <Feather name="chevron-down" size={16} color={C.textMuted} />
            </Pressable>

            {/* Quick Swap Icon Button */}
            <Pressable
              style={[
                styles.swapButton,
                { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              ]}
              onPress={handleSwapCities}
            >
              <Feather name="repeat" size={14} color={C.primary} />
            </Pressable>

            <Pressable
              style={[
                styles.citySelector,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              ]}
              onPress={() => {
                Haptic.tap();
                setCityPickerTarget('to');
              }}
            >
              <View style={[styles.cityDot, { backgroundColor: C.error }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.citySelectorLabel, { color: C.textMuted }]}>TO CITY</Text>
                <Text
                  style={[
                    styles.citySelectorValue,
                    { color: toCity ? C.textPrimary : C.textMuted },
                  ]}
                >
                  {toCity || 'Select Destination City'}
                </Text>
              </View>
              <Feather name="chevron-down" size={16} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Popular Corridors Quick Chips */}
          <View style={styles.popularSection}>
            <Text style={[styles.popularLabel, { color: C.textMuted }]}>POPULAR CORRIDORS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POPULAR_CORRIDORS.map((c, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.corridorChip,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                    fromCity === c.from && toCity === c.to && {
                      backgroundColor: C.primaryDark,
                      borderColor: C.primaryDark,
                    },
                  ]}
                  onPress={() => {
                    Haptic.select();
                    setFromCity(c.from);
                    setToCity(c.to);
                  }}
                >
                  <Text
                    style={[
                      styles.corridorChipText,
                      { color: fromCity === c.from && toCity === c.to ? '#fff' : C.textSecondary },
                    ]}
                  >
                    {c.from} → {c.to}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Activate Button */}
          <Pressable
            style={({ pressed }) => [
              styles.activateBtn,
              { backgroundColor: fromCity && toCity ? C.primaryDark : C.surfaceElevated },
              pressed && { opacity: 0.88 },
            ]}
            onPress={handleAdd}
            disabled={saving || !fromCity || !toCity}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather
                  name="bell"
                  size={16}
                  color={fromCity && toCity ? '#fff' : C.textMuted}
                />
                <Text
                  style={[
                    styles.activateBtnText,
                    { color: fromCity && toCity ? '#fff' : C.textMuted },
                  ]}
                >
                  Activate Route Alert
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      ) : null}

      {/* ── Subscriptions FlashList ────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading route alerts...</Text>
        </View>
      ) : (
        <AppErrorBoundary>
          <FlashList
            data={subs}
            keyExtractor={s => s.id}
            renderItem={renderSubItem}
            estimatedItemSize={140}
            contentContainerStyle={styles.list as any}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.primary}
              />
            }
            ListHeaderComponent={
              subs.length > 0 ? (
                <View
                  style={[
                    styles.pollBanner,
                    { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' },
                  ]}
                >
                  <View style={[styles.pollDot, { backgroundColor: C.success }]} />
                  <Text style={[styles.pollBannerText, { color: C.primary }]}>
                    Active corridors receive real-time push alerts as soon as packages or trips are posted.
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={() => (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
                <View style={[styles.emptyIconBox, { backgroundColor: C.primarySubtle }]}>
                  <Feather name="bell-off" size={36} color={C.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Route Alerts Active</Text>
                <Text style={[styles.emptySub, { color: C.textMuted }]}>
                  Set up route alerts for your frequent travel corridors to get notified whenever senders post matching deliveries.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyCta,
                    { backgroundColor: C.primaryDark, opacity: pressed ? 0.88 : 1 },
                  ]}
                  onPress={toggleAddForm}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyCtaText}>Create Your First Route Alert</Text>
                </Pressable>
              </View>
            )}
          />
        </AppErrorBoundary>
      )}

      {/* ── City Select Modal ─────────────────────────────────────── */}
      <CitySelectModal
        visible={cityPickerTarget !== null}
        title={cityPickerTarget === 'from' ? 'Select Origin City' : 'Select Destination City'}
        subtitle="Search Indian cities or choose popular corridors"
        selectedCity={cityPickerTarget === 'from' ? fromCity : toCity}
        dotColor={cityPickerTarget === 'from' ? C.success : C.error}
        onClose={() => setCityPickerTarget(null)}
        onSelect={(city) => {
          if (cityPickerTarget === 'from') {
            setFromCity(city);
          } else {
            setToCity(city);
          }
          setCityPickerTarget(null);
        }}
      />
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
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  statsBar: { flexDirection: 'row', gap: Spacing.xs },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  statChipVal: { fontSize: FontSize.xs + 1, fontWeight: FontWeight.bold },
  statChipLabel: { fontSize: 9, fontWeight: FontWeight.medium },

  // Add Card
  addCard: {
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  addCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addCardIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addCardTitle: { fontSize: FontSize.sm + 1, fontWeight: FontWeight.bold },
  addCardSub: { fontSize: FontSize.xs, marginTop: 1 },

  inputContainer: { gap: Spacing.xs, position: 'relative' },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  citySelectorLabel: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  citySelectorValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 2 },
  cityDot: { width: 8, height: 8, borderRadius: 4 },
  swapButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  popularSection: { gap: Spacing.xs },
  popularLabel: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  corridorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  corridorChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md - 2,
  },
  activateBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Poll Banner
  pollBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  pollDot: { width: 6, height: 6, borderRadius: 3 },
  pollBannerText: { flex: 1, fontSize: 10, fontWeight: FontWeight.medium, lineHeight: 14 },

  // Sub Card
  subCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  subAccent: { width: 4 },
  subInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  routeDot: { width: 6, height: 6, borderRadius: 3 },
  routePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subDate: { fontSize: 10 },

  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  flameIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBannerTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  matchBannerSub: { fontSize: 10, marginTop: 1 },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewLinkText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  noMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  noMatchText: { fontSize: 10 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.xs + 2,
    marginTop: 2,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  browseBtnText: { fontSize: 10, fontWeight: FontWeight.bold },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 10, fontWeight: FontWeight.bold },

  // Loading
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.sm },

  list: { padding: Spacing.md },

  // Empty
  emptyWrap: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  emptyIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  emptySub: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  emptyCtaText: { fontSize: FontSize.xs + 1, fontWeight: FontWeight.bold, color: '#fff' },
});
