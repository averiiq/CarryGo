import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: Spacing.md },

  // Header
  header: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.sm, overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1,
  },
  clearBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Search card
  searchCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    marginHorizontal: Spacing.md, overflow: 'hidden', position: 'relative',
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fieldDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fieldDotInner: { width: 10, height: 10, borderRadius: 5 },
  fieldTextWrap: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldInput: { fontSize: FontSize.md, fontWeight: FontWeight.medium, padding: 0, includeFontPadding: false },
  swapBtn: {
    position: 'absolute', right: Spacing.md, top: '50%',
    marginTop: -18, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, zIndex: 10,
  },

  // Vehicle filter
  vehicleSection: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  vehicleRow: { flexDirection: 'row', gap: Spacing.sm },
  vehicleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  vehicleChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  // Action row
  actionRow: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
  },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  searchBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  subscribeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Result tabs
  resultTabsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
  },
  resultTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: BorderRadius.full, borderWidth: 1,
  },
  resultTabText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  subscribeCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  subscribeCtaText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  resultsList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  resultItem: { marginBottom: Spacing.sm },

  // Empty state
  emptyState: {
    margin: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: 40, paddingHorizontal: Spacing.xl, alignItems: 'center', gap: Spacing.md,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptySubscribeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  emptySubscribeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  // Pre-search
  preSearch: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.lg },
  historySection: { gap: Spacing.sm },
  historySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historySectionTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  clearHistoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  popularSection: { gap: Spacing.sm },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  popularChip: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  popularChipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  popularFrom: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  popularTo: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  hintText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },
});
