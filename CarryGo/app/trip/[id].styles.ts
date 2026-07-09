import { StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelHeaderBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.errorSubtle,
    borderWidth: 1, borderColor: Colors.error + '30',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  vehicleBadge: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },

  // Trip hero
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeCity: { flex: 1, gap: 4 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeCityName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  routeMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, gap: 4 },
  routeLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorderLight },
  routeVehicle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  routeVehicleText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  tripStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  tripStat: { flex: 1, alignItems: 'center', gap: 3 },
  tripStatValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tripStatLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.medium },
  statDiv: { width: 1, height: 28, backgroundColor: Colors.surfaceBorder },

  tripStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  tripStatusDot: { width: 6, height: 6, borderRadius: 3 },
  tripStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  travellerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  travellerAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  travellerAvatarText: { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.primary },
  travellerName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  travellerRating: { fontSize: FontSize.xs, color: Colors.textMuted },

  // Summary chips
  summaryChips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  chipCount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Section
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  sectionBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  sectionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  itemSpacer: { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: Spacing.md },

  // Empty / loading
  loadingState: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  emptyState: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md + 2,
  },
  findBtnText: { flex: 1, textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
