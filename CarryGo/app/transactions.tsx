import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, Pressable, ActivityIndicator,
  Animated, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserPayments } from '@/services/payments.service';
import { Payment } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Haptic } from '@/services/haptics.service';
import { EmptyTransactionsSVG } from '@/components/ui/EmptyState';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { useThemeColors } from '@/hooks/useThemeColors';

// Group payments by month
function groupByMonth(payments: Payment[]): { title: string; data: Payment[] }[] {
  const groups: Record<string, Payment[]> = {};
  for (const p of payments) {
    const date = new Date(p.createdAt);
    const key = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

// ── Summary Header ───────────────────────────────────────────────────────────
function SummaryCard({ payments, userId }: { payments: Payment[]; userId: string }) {
  const { C, S } = useThemeColors();
  const totalEarned = payments.filter(p => p.status === 'released' && p.travellerId === userId).reduce((s, p) => s + p.amount, 0);
  const totalSpent  = payments.filter(p => p.status === 'released' && p.senderId   === userId).reduce((s, p) => s + p.amount, 0);
  const locked      = payments.filter(p => p.status === 'locked').reduce((s, p) => s + p.amount, 0);
  const refunded    = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);
  const net = totalEarned - totalSpent;

  return (
    <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
      <LinearGradient
        colors={[C.primarySubtle, 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      {/* Net balance */}
      <View style={styles.netRow}>
        <View style={[styles.netIconBox, { backgroundColor: net >= 0 ? C.successSubtle : C.errorSubtle }]}>
          <Feather
            name={(net >= 0 ? 'wallet' : 'trending-down') as any}
            size={18}
            color={net >= 0 ? C.success : C.error}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.netLabel, { color: C.textMuted }]}>Net Balance</Text>
          <Text style={[styles.netAmount, { color: C.textPrimary }]}>
            {net >= 0 ? '+' : '-'}Rs {Math.abs(net)}
          </Text>
        </View>
        <View style={[styles.txCountBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorderLight }]}>
          <Text style={[styles.txCountText, { color: C.textSecondary }]}>{payments.length} transfers</Text>
        </View>
      </View>

      {/* 4-stat grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Earned', amount: totalEarned, icon: 'arrow-down-left' as const, color: C.success, bg: C.successSubtle },
          { label: 'Spent',  amount: totalSpent,  icon: 'arrow-up-right' as const,   color: C.error,   bg: C.errorSubtle },
          { label: 'Locked', amount: locked,       icon: 'lock' as const,           color: C.warning, bg: C.warningSubtle },
          { label: 'Refunded', amount: refunded,   icon: 'rotate-ccw' as const,        color: C.info,    bg: C.infoSubtle },
        ].map((s, i) => (
          <View key={i} style={[styles.statBox, { backgroundColor: s.bg }]}>
            <View style={[styles.statIconBox, { backgroundColor: s.color + '12' }]}>
              <Feather name={s.icon} size={11} color={s.color} />
            </View>
            <Text style={[styles.statAmount, { color: C.textPrimary }]}>Rs {s.amount}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ item, userId, onPress }: { item: Payment; userId: string; onPress: () => void }) {
  const { C, S } = useThemeColors();
  const statusConfig = {
    locked:   { color: C.warning, bg: C.warningSubtle,  icon: 'lock' as const,         label: 'Locked',   desc: 'Escrow payment secured' },
    released: { color: C.success, bg: C.successSubtle,  icon: 'check-circle' as const,  label: 'Released', desc: 'Payment completed' },
    refunded: { color: C.error,   bg: C.errorSubtle,    icon: 'rotate-ccw' as const,   label: 'Refunded', desc: 'Returned to sender' },
  };
  const sc = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.locked;
  const isEarning = item.travellerId === userId;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, tension: 300 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start();

  const amountColor = item.status === 'released'
    ? (isEarning ? C.success : C.error)
    : item.status === 'locked'
    ? C.warning
    : C.textMuted;

  const amountPrefix = item.status === 'released' && isEarning ? '+' : item.status === 'released' && !isEarning ? '-' : '';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.txRow,
          { backgroundColor: C.surface, borderColor: C.surfaceBorder },
          S.sm,
          pressed && { backgroundColor: C.surfaceElevated },
        ]}
        onPress={() => { Haptic.tap(); onPress(); }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* Left accent */}
        <View style={[styles.txAccent, { backgroundColor: sc.color }]} />

        <View style={styles.txInner}>
          {/* Icon + info */}
          <View style={styles.txMain}>
            <View style={[styles.txIconBox, { backgroundColor: sc.bg }]}>
              <Feather name={sc.icon} size={18} color={sc.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txTitle, { color: C.textPrimary }]} numberOfLines={1}>
                {isEarning ? 'Earnings from delivery' : 'Payment for parcel'}
              </Text>
              <Text style={[styles.txDate, { color: C.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {/* Amount + badge */}
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: amountColor }]}>
                {amountPrefix}Rs {item.amount}
              </Text>
              <View style={[styles.txStatusBadge, { backgroundColor: sc.bg }]}>
                <Feather name={sc.icon} size={10} color={sc.color} />
                <Text style={[styles.txStatusText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            </View>
          </View>

          {/* Escrow desc row */}
          <View style={[styles.txDescRow, { borderTopWidth: 1, borderTopColor: C.surfaceBorder }]}>
            <Feather name="shield" size={11} color={C.textMuted} />
            <Text style={[styles.txDesc, { color: C.textMuted }]}>{sc.desc}</Text>
            <Feather name="chevron-right" size={14} color={C.textMuted} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────
function MonthHeader({ title, payments, userId }: {
  title: string; payments: Payment[]; userId: string;
}) {
  const { C } = useThemeColors();
  const monthEarned = payments.filter(p => p.status === 'released' && p.travellerId === userId).reduce((s, p) => s + p.amount, 0);
  const monthSpent  = payments.filter(p => p.status === 'released' && p.senderId === userId).reduce((s, p) => s + p.amount, 0);

  return (
    <View style={[styles.monthHeader, { backgroundColor: C.background }]}>
      <View style={styles.monthTitleRow}>
        <View style={[styles.monthDot, { backgroundColor: C.accent }]} />
        <Text style={[styles.monthTitle, { color: C.textSecondary }]}>{title}</Text>
        <View style={styles.monthStats}>
          {monthEarned > 0 ? (
            <View style={[styles.monthStatChip, { backgroundColor: C.successSubtle }]}>
              <Text style={[styles.monthStatText, { color: C.success }]}>+Rs {monthEarned}</Text>
            </View>
          ) : null}
          {monthSpent > 0 ? (
            <View style={[styles.monthStatChip, { backgroundColor: C.errorSubtle }]}>
              <Text style={[styles.monthStatText, { color: C.error }]}>-Rs {monthSpent}</Text>
            </View>
          ) : null}
          <View style={[styles.monthCountChip, { backgroundColor: C.surfaceElevated }]}>
            <Text style={[styles.monthCountText, { color: C.textMuted }]}>{payments.length}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const STATUS_CONFIG = {
    locked:   { color: C.warning, bg: C.warningSubtle,  icon: 'lock' as const },
    released: { color: C.success, bg: C.successSubtle,  icon: 'check-circle' as const },
    refunded: { color: C.error,   bg: C.errorSubtle,    icon: 'rotate-ccw' as const },
  };
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'released' | 'refunded'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await fetchUserPayments(user.id);
    if (data) setPayments(data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (FeatureFlags.payments && user) void load();
    else setLoading(false);
  }, [load, user]);

  const handleRefresh = () => {
    if (!FeatureFlags.payments) return;
    setRefreshing(true);
    load();
  };

  const filtered = filterStatus === 'all' ? payments : payments.filter(p => p.status === filterStatus);
  const sections = groupByMonth(filtered);

  const totalEarned = payments.filter(p => p.status === 'released' && p.travellerId === user?.id).reduce((s, p) => s + p.amount, 0);
  const totalSpent  = payments.filter(p => p.status === 'released' && p.senderId   === user?.id).reduce((s, p) => s + p.amount, 0);

  if (!FeatureFlags.payments) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Feather name="arrow-left" size={20} color={C.textPrimary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Payment Records</Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>Integration unavailable</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Feather name="alert-triangle" size={48} color={C.warning} />
          <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>Payments are not active</Text>
          <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
            {disabledFeatureMessage.payments} No transaction records shown here represent live funds.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <LinearGradient colors={[C.primarySubtle, 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={() => { Haptic.tap(); router.back(); }}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Transactions</Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {payments.length} records · Rs {totalEarned} earned · Rs {totalSpent} spent
            </Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(['all', 'locked', 'released', 'refunded'] as const).map(f => {
            const count = f === 'all' ? payments.length : payments.filter(p => p.status === f).length;
            const sc = f !== 'all' ? STATUS_CONFIG[f] : null;
            return (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  filterStatus === f && { backgroundColor: sc ? sc.bg : C.primarySubtle, borderColor: sc ? sc.color + '44' : C.primary + '44' },
                ]}
                onPress={() => { Haptic.select(); setFilterStatus(f); }}
              >
                {sc ? <Feather name={sc.icon} size={11} color={filterStatus === f ? sc.color : C.textMuted} /> : null}
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === f ? (sc ? sc.color : C.primary) : C.textMuted },
                ]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                <View style={[styles.filterChipCount, { backgroundColor: filterStatus === f ? (sc ? sc.color + '18' : C.primarySubtle) : C.surfaceBorder + '80' }]}>
                  <Text style={[styles.filterChipCountText, { color: filterStatus === f ? (sc ? sc.color : C.primary) : C.textMuted }]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading transactions...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TxRow
              item={item}
              userId={user?.id || ''}
              onPress={() => router.push({ pathname: '/payment/[id]', params: { id: item.requestId } })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <MonthHeader title={section.title} payments={section.data} userId={user?.id || ''} />
          )}
          ListHeaderComponent={
            payments.length > 0 ? (
              <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
                <SummaryCard payments={payments} userId={user?.id || ''} />
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <EmptyTransactionsSVG width={200} height={160} />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
                {filterStatus !== 'all' ? `No ${filterStatus} transactions` : 'No transactions yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                {filterStatus !== 'all'
                  ? `You don't have any ${filterStatus} payments.`
                  : 'Complete a delivery to see your payment history here.'}
              </Text>
              {filterStatus !== 'all' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.clearFilterBtn,
                    { backgroundColor: C.primarySubtle, borderColor: C.primary + '44', opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => setFilterStatus('all')}
                >
                  <MaterialIcons name="filter-list-off" size={14} color={C.primary} />
                  <Text style={[styles.clearFilterText, { color: C.primary }]}>Clear filter</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
        />
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

  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1, flex: 1, justifyContent: 'center',
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  filterChipCount: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full, minWidth: 18, alignItems: 'center',
  },
  filterChipCountText: { fontSize: 10, fontWeight: FontWeight.bold },

  // Summary card
  summaryCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  netIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  netLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 2 },
  netAmount: { fontSize: FontSize.xxl + 2, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  txCountBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  txCountText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1, borderRadius: BorderRadius.md,
    padding: Spacing.sm, alignItems: 'center', gap: 4,
  },
  statIconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 9, fontWeight: FontWeight.medium },

  // Month header
  monthHeader: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  monthTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  monthDot: { width: 6, height: 6, borderRadius: 3 },
  monthTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  monthStats: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  monthStatChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  monthStatText: { fontSize: 10, fontWeight: FontWeight.bold },
  monthCountChip: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  monthCountText: { fontSize: 10, fontWeight: FontWeight.bold },

  // Transaction row
  txRow: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    overflow: 'hidden', flexDirection: 'row',
    marginHorizontal: Spacing.md,
  },
  txAccent: { width: 3, marginVertical: 12, borderRadius: 1.5, marginLeft: 8 },
  txInner: { flex: 1, padding: Spacing.sm + 4, gap: Spacing.sm - 2 },
  txMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  txIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  txDate: { fontSize: FontSize.xs, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  txAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  txStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full,
  },
  txStatusText: { fontSize: 10, fontWeight: FontWeight.bold },
  txDescRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingTop: 10, marginTop: 4,
  },
  txDesc: { flex: 1, fontSize: FontSize.xs },

  // Loading
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm },

  list: { paddingTop: 0 },

  emptyState: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', color: '#9CA3AF', lineHeight: 20 },
  clearFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 4,
  },
  clearFilterText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
