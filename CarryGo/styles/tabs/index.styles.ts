import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── Header ────────────────────────────────────────────────────
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, opacity: 0.6 },
  userName: { fontSize: 30, fontWeight: FontWeight.extrabold, letterSpacing: -1.2 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },

  body: { paddingHorizontal: Spacing.md, gap: Spacing.lg, marginBottom: Spacing.md },

  // ─── KYC Alert ─────────────────────────────────────────────────
  kycAlert: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1,
  },
  kycAlertIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kycAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  kycAlertSub: { fontSize: FontSize.xs, marginTop: 2 },

  // ─── Hero Action Cards ─────────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  actionCard: {
    flex: 1, borderRadius: 24,
    padding: Spacing.lg, minHeight: 180,
    gap: Spacing.sm, position: 'relative', overflow: 'hidden',
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: 19, fontWeight: FontWeight.extrabold, marginTop: Spacing.sm },
  actionSub: { fontSize: FontSize.xs, lineHeight: 17, opacity: 0.7 },
  actionArrowWrap: {
    position: 'absolute', bottom: Spacing.lg, right: Spacing.lg,
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Stats Bento ───────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  statVal: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.5 },

  // ─── Feed Header ───────────────────────────────────────────────
  feedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedTabs: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  feedTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    flex: 1, justifyContent: 'center',
  },
  feedTabText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
  },
  activeFilterBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1,
  },
  activeFilterText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  clearFilter: { padding: 5, borderRadius: 8 },

  // ─── Feed ──────────────────────────────────────────────────────
  feed: { gap: Spacing.md, paddingBottom: Spacing.md },
  loadingCard: {
    alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm,
    borderRadius: BorderRadius.xl, borderWidth: 1,
  },
  loadingIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  loadingSubtext: { fontSize: FontSize.sm },

  emptyFeedCard: {
    alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md,
    borderRadius: 24, borderWidth: 1, paddingHorizontal: Spacing.xl,
    marginHorizontal: Spacing.md,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 4 },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyClearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 8,
  },
  emptyClearText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  emptyCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl + 8, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, marginTop: 8,
  },
  emptyCTAText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },

  // ─── Modal ─────────────────────────────────────────────────────
  overlay: { flex: 1 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  notifSheet: {
    borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '78%', padding: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1,
  },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  notifTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: Spacing.sm },
  markReadText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  notifEmpty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyIconBox: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifEmptyText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  notifEmptySub: { fontSize: FontSize.sm },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderBottomWidth: 1, paddingHorizontal: 4,
    borderRadius: 8, marginHorizontal: -4,
  },
  notifIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifItemTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  notifItemBody: { fontSize: FontSize.xs, lineHeight: 18 },
  notifItemTime: { fontSize: 10, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },

  filterSheet: {
    borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, gap: Spacing.md,
  },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  resetPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  resetPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  filterSection: { gap: Spacing.sm },
  filterLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  chipText: { fontSize: FontSize.sm },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vehicleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  vehicleChipText: { fontSize: FontSize.sm },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  applyText: { fontSize: FontSize.md, color: '#fff', fontWeight: FontWeight.semibold },
  loadMoreBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, marginTop: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  loadMoreText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
