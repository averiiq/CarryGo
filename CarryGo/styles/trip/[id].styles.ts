import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  cancelHeaderBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  vehicleBadge: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },

  // Trip hero card
  tripCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
  },

  // Route
  routeSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  routeVisual: { alignItems: 'center', height: 70, justifyContent: 'space-between' },
  originDot: { width: 14, height: 14, borderRadius: 7 },
  routeDash: { height: 34, width: 0, borderLeftWidth: 2, borderStyle: 'dashed' },
  destDot: { width: 14, height: 14, borderRadius: 4 },
  routeText: { flex: 1, height: 70, justifyContent: 'space-between' },
  fromCity: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  toCity: { fontSize: 22, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },

  // Vehicle pill
  vehiclePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  vehiclePillText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  // Stats
  tripStats: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: Spacing.md,
  },
  tripStat: { flex: 1, alignItems: 'center', gap: 4 },
  tripStatValue: { fontSize: 20, fontWeight: FontWeight.extrabold, letterSpacing: -0.3 },
  tripStatLabel: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 0.3, textTransform: 'uppercase' },
  statDiv: { width: 1, height: 32 },

  // Status row
  tripStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  tripStatusDot: { width: 8, height: 8, borderRadius: 4 },
  tripStatusText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  travellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  travellerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  travellerAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  travellerName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  travellerRating: { fontSize: FontSize.xs },

  // Summary chips
  summaryChips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  chipCount: { fontSize: 18, fontWeight: FontWeight.extrabold },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // CTA button
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: 16, paddingVertical: Spacing.md + 4, overflow: 'hidden',
  },
  findBtnGradient: { ...StyleSheet.absoluteFillObject },
  findBtnText: { flex: 1, textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  // Section
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionBadge: {
    minWidth: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  sectionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  itemSpacer: { height: 1, marginHorizontal: Spacing.md },

  // Empty / loading
  loadingState: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm },
  emptyState: {
    paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md,
    borderRadius: 24, borderWidth: 1, padding: Spacing.xl,
  },
  emptyTitle: { fontSize: 20, fontWeight: FontWeight.bold },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
});
