import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, letterSpacing: 0.3 },
  userName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 8, color: '#fff', fontWeight: '800' },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  body: { paddingHorizontal: Spacing.md, gap: Spacing.md },

  // KYC Alert
  kycAlert: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm + 4, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  kycAlertIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kycAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  kycAlertSub: { fontSize: FontSize.xs, marginTop: 1 },

  // Actions
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionCard: {
    flex: 1, borderRadius: BorderRadius.xl,
    padding: Spacing.md, minHeight: 160,
    gap: 6, position: 'relative', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  actionIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff', marginTop: 6 },
  actionSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', lineHeight: 17 },
  actionArrowWrap: {
    position: 'absolute', bottom: Spacing.md, right: Spacing.md,
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2, alignItems: 'center', gap: 3, borderWidth: 1,
  },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 9, fontWeight: FontWeight.medium },

  // Feed Header
  feedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedTabs: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  feedTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 9,
    borderRadius: BorderRadius.full, borderWidth: 1,
    flex: 1, justifyContent: 'center',
  },
  feedTabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  filterBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
  },
  activeFilterBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1,
  },
  activeFilterText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  clearFilter: { padding: 4, borderRadius: 6 },

  // Feed
  feed: { gap: Spacing.md, paddingBottom: Spacing.md },
  loadingCard: {
    alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm,
    borderRadius: BorderRadius.xl, borderWidth: 1,
  },
  loadingIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  loadingSubtext: { fontSize: FontSize.sm },

  emptyFeedCard: {
    alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm,
    borderRadius: BorderRadius.xl, borderWidth: 1, paddingHorizontal: Spacing.lg,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginTop: 4 },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 250 },
  emptyClearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 4,
  },
  emptyClearText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  emptyCTA: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  emptyCTAText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  // Modal
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
