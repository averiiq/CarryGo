import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
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
import { PanVerificationModal } from '@/components/feature/PanVerificationModal';

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

// ── Summary Header Card ───────────────────────────────────────────────────────
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Escrow Wallet Header */}
      <View style={styles.summaryTopRow}>
        <View style={styles.walletBadgeRow}>
          <View style={[styles.walletIconWrap, { backgroundColor: C.primaryDark }]}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
          </View>
          <View>
            <Text style={[styles.walletTitle, { color: C.textPrimary }]}>Escrow Wallet</Text>
            <Text style={[styles.walletSubtitle, { color: C.textMuted }]}>Protected Transactions</Text>
          </View>
        </View>

        <View style={[styles.txCountBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.txCountText, { color: C.textSecondary }]}>
            {payments.length} {payments.length === 1 ? 'Transaction' : 'Transactions'}
          </Text>
        </View>
      </View>

      {/* Net Balance Row */}
      <View style={styles.netRow}>
        <View>
          <Text style={[styles.netLabel, { color: C.textMuted }]}>NET SETTLED BALANCE</Text>
          <Text style={[styles.netAmount, { color: net >= 0 ? C.textPrimary : C.error }]}>
            {net >= 0 ? '+' : '-'}₹{Math.abs(net).toLocaleString('en-IN')}
          </Text>
        </View>

        {locked > 0 ? (
          <View style={[styles.lockedPill, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44' }]}>
            <Feather name="lock" size={12} color={C.warning} />
            <Text style={[styles.lockedPillText, { color: C.warning }]}>
              ₹{locked.toLocaleString('en-IN')} In Escrow
            </Text>
          </View>
        ) : null}
      </View>

      {/* 4-Stat Metric Grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Earned', amount: totalEarned, icon: 'arrow-down-left' as const, color: C.success, bg: C.successSubtle },
          { label: 'Paid Out', amount: totalSpent, icon: 'arrow-up-right' as const, color: C.error, bg: C.errorSubtle },
          { label: 'In Escrow', amount: locked, icon: 'shield' as const, color: C.warning, bg: C.warningSubtle },
          { label: 'Refunded', amount: refunded, icon: 'rotate-ccw' as const, color: C.info, bg: C.infoSubtle },
        ].map((s, i) => (
          <View key={i} style={[styles.statBox, { backgroundColor: s.bg }]}>
            <View style={[styles.statIconBox, { backgroundColor: s.color + '15' }]}>
              <Feather name={s.icon} size={12} color={s.color} />
            </View>
            <Text style={[styles.statAmount, { color: C.textPrimary }]}>₹{s.amount.toLocaleString('en-IN')}</Text>
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
    locked:   { color: C.warning, bg: C.warningSubtle, icon: 'lock' as const,         label: 'Locked',   desc: 'Held securely in CarryGo Escrow' },
    released: { color: C.success, bg: C.successSubtle, icon: 'check-circle' as const, label: 'Settled',  desc: 'Funds released to traveler' },
    refunded: { color: C.error,   bg: C.errorSubtle,   icon: 'rotate-ccw' as const,   label: 'Refunded', desc: 'Returned to sender account' },
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

  const txDate = new Date(item.createdAt);

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
        {/* Left Status Color Accent Bar */}
        <View style={[styles.txAccent, { backgroundColor: sc.color }]} />

        <View style={styles.txInner}>
          {/* Main Top Row */}
          <View style={styles.txMain}>
            <View style={[styles.txIconBox, { backgroundColor: sc.bg }]}>
              <Feather
                name={
                  isEarning
                    ? (item.status === 'released' ? 'arrow-down-left' : 'lock')
                    : (item.status === 'released' ? 'arrow-up-right' : 'lock')
                }
                size={18}
                color={sc.color}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.txTitle, { color: C.textPrimary }]} numberOfLines={1}>
                {isEarning ? 'Traveler Delivery Remuneration' : 'Sender Escrow Payment'}
              </Text>
              <Text style={[styles.txDate, { color: C.textMuted }]}>
                {txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Amount & Status Badge */}
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: amountColor }]}>
                {amountPrefix}₹{item.amount.toLocaleString('en-IN')}
              </Text>
              <View style={[styles.txStatusBadge, { backgroundColor: sc.bg }]}>
                <Feather name={sc.icon} size={10} color={sc.color} />
                <Text style={[styles.txStatusText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            </View>
          </View>

          {/* Escrow Reference & Receipt Footer Row */}
          <View style={[styles.txDescRow, { borderTopWidth: 1, borderTopColor: C.surfaceBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              <Feather name="shield" size={11} color={C.textMuted} />
              <Text style={[styles.txDesc, { color: C.textMuted }]} numberOfLines={1}>
                {sc.desc}
              </Text>
            </View>

            <View style={styles.viewReceiptAction}>
              <Text style={[styles.viewReceiptText, { color: C.primary }]}>Receipt</Text>
              <Feather name="chevron-right" size={13} color={C.primary} />
            </View>
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
        <View style={[styles.monthDot, { backgroundColor: C.primary }]} />
        <Text style={[styles.monthTitle, { color: C.textSecondary }]}>{title}</Text>
        <View style={styles.monthStats}>
          {monthEarned > 0 ? (
            <View style={[styles.monthStatChip, { backgroundColor: C.successSubtle }]}>
              <Text style={[styles.monthStatText, { color: C.success }]}>+₹{monthEarned.toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
          {monthSpent > 0 ? (
            <View style={[styles.monthStatChip, { backgroundColor: C.errorSubtle }]}>
              <Text style={[styles.monthStatText, { color: C.error }]}>-₹{monthSpent.toLocaleString('en-IN')}</Text>
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

// ── Main Transactions Screen ─────────────────────────────────────────────────
export default function TransactionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  const STATUS_CONFIG = {
    locked:   { color: C.warning, bg: C.warningSubtle, icon: 'shield' as const },
    released: { color: C.success, bg: C.successSubtle, icon: 'check-circle' as const },
    refunded: { color: C.error,   bg: C.errorSubtle,   icon: 'rotate-ccw' as const },
  };

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'released' | 'refunded'>('all');
  const [isPanModalVisible, setIsPanModalVisible] = useState(false);

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

  const renderTxItem = useCallback(({ item }: { item: Payment }) => (
    <TxRow
      item={item}
      userId={user?.id || ''}
      onPress={() => router.push({ pathname: '/payment/[id]', params: { id: item.requestId || item.id } })}
    />
  ), [user?.id, router]);

  const renderMonthHeader = useCallback(({ section }: { section: { title: string; data: Payment[] } }) => (
    <MonthHeader title={section.title} payments={section.data} userId={user?.id || ''} />
  ), [user?.id]);

  const renderTxSeparator = useCallback(() => <View style={{ height: 8 }} />, []);

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
              <Text style={[styles.headerSub, { color: C.textMuted }]}>Feature currently offline</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Feather name="alert-triangle" size={48} color={C.warning} />
          <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>Payments are not active</Text>
          <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
            {disabledFeatureMessage.payments}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Transactions & Invoices</Text>
              {user?.isPanVerified ? (
                <View style={[styles.panHeaderBadge, { backgroundColor: C.successSubtle }]}>
                  <MaterialIcons name="verified" size={11} color={C.success} />
                  <Text style={[styles.panHeaderBadgeText, { color: C.success }]}>KYC Compliant</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {payments.length} transactions · ₹{totalEarned.toLocaleString('en-IN')} earned · ₹{totalSpent.toLocaleString('en-IN')} spent
            </Text>
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'locked', 'released', 'refunded'] as const).map(f => {
            const count = f === 'all' ? payments.length : payments.filter(p => p.status === f).length;
            const sc = f !== 'all' ? STATUS_CONFIG[f] : null;
            const isSelected = filterStatus === f;
            const labelMap = { all: 'All', locked: 'In Escrow', released: 'Settled', refunded: 'Refunded' };

            return (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  isSelected && {
                    backgroundColor: sc ? sc.bg : C.primarySubtle,
                    borderColor: sc ? sc.color + '44' : C.primary + '44',
                  },
                ]}
                onPress={() => { Haptic.select(); setFilterStatus(f); }}
              >
                {sc ? <Feather name={sc.icon} size={11} color={isSelected ? sc.color : C.textMuted} /> : null}
                <Text style={[
                  styles.filterChipText,
                  { color: isSelected ? (sc ? sc.color : C.primary) : C.textMuted },
                ]}>
                  {labelMap[f]}
                </Text>
                <View style={[
                  styles.filterChipCount,
                  { backgroundColor: isSelected ? (sc ? sc.color + '18' : C.primarySubtle) : C.surfaceBorder + '80' },
                ]}>
                  <Text style={[
                    styles.filterChipCountText,
                    { color: isSelected ? (sc ? sc.color : C.primary) : C.textMuted },
                  ]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Transaction List ───────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading transactions & invoices...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderTxItem}
          renderSectionHeader={renderMonthHeader}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.md }}>
              {/* PAN verification banner if not verified */}
              {!user?.isPanVerified ? (
                <View style={[styles.panComplianceCard, { backgroundColor: C.surface, borderColor: C.accent + '44' }]}>
                  <View style={styles.panCardHeader}>
                    <View style={[styles.panIconBox, { backgroundColor: C.accentSubtle }]}>
                      <MaterialIcons name="security" size={22} color={C.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.panCardTitle, { color: C.textPrimary }]}>
                        Tax Compliance (PAN) Required
                      </Text>
                      <Text style={[styles.panCardDesc, { color: C.textSecondary }]}>
                        Mandatory compliance under Indian Income Tax guidelines to receive payouts & carry parcels.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.panVerifyBtn,
                      { backgroundColor: C.accent, opacity: pressed ? 0.88 : 1 },
                    ]}
                    onPress={() => {
                      Haptic.tap();
                      setIsPanModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="verified-user" size={16} color="#fff" />
                    <Text style={styles.panVerifyBtnText}>Verify PAN Card Now</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Escrow Summary Card */}
              {payments.length > 0 && <SummaryCard payments={payments} userId={user?.id || ''} />}
            </View>
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <EmptyTransactionsSVG width={200} height={160} />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
                {filterStatus !== 'all' ? `No ${filterStatus} records` : 'No transactions recorded'}
              </Text>
              <Text style={[styles.emptySubtext, { color: C.textMuted }]}>
                {filterStatus !== 'all'
                  ? `There are no transactions with ${filterStatus} status.`
                  : 'Complete or carry a delivery to generate digital escrow receipts.'}
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
                  <Text style={[styles.clearFilterText, { color: C.primary }]}>Show all transactions</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={renderTxSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
          }
        />
      )}

      {/* PAN Verification Modal */}
      <PanVerificationModal
        visible={isPanModalVisible}
        onClose={() => setIsPanModalVisible(false)}
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
  panHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  panHeaderBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  filterRow: { flexDirection: 'row', gap: Spacing.xs },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  filterChipText: { fontSize: 11, fontWeight: FontWeight.semibold },
  filterChipCount: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    alignItems: 'center',
  },
  filterChipCountText: { fontSize: 9, fontWeight: FontWeight.bold },

  // Summary card
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  walletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  walletSubtitle: {
    fontSize: 10,
  },
  txCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  txCountText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  netLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  netAmount: {
    fontSize: FontSize.xxl + 2,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statAmount: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },

  // PAN Compliance Card
  panComplianceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  panCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  panIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  panCardDesc: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  panVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  panVerifyBtnText: {
    color: '#ffffff',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },

  // Month header
  monthHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  monthDot: { width: 6, height: 6, borderRadius: 3 },
  monthTitle: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  monthStats: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  monthStatChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  monthStatText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  monthCountChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCountText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  // Transaction row
  txRow: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
  },
  txAccent: {
    width: 3.5,
    marginVertical: 10,
    borderRadius: 2,
    marginLeft: 6,
  },
  txInner: {
    flex: 1,
    padding: Spacing.sm + 4,
    gap: Spacing.xs + 2,
  },
  txMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  txDate: {
    fontSize: 10,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  txAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  txStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  txDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 2,
  },
  txDesc: {
    fontSize: 10,
  },
  viewReceiptAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewReceiptText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // Loading
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },

  list: { paddingTop: 0 },

  emptyState: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  emptySubtext: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    color: '#9CA3AF',
    lineHeight: 18,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  clearFilterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
