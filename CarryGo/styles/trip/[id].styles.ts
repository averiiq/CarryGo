import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Navigation Header
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  roundNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitleContainer: {
    alignItems: 'center',
    gap: 2,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  navSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  navStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navSubtitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  navRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },

  // Ticket / Journey Card
  ticketCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketHeader: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  vehicleChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Ticket Route
  ticketRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  routeCityCol: {
    flex: 1,
  },
  routeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  routeCityText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.6,
  },
  transportCapsule: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },

  // Departure Strip
  departureStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  departureStripText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  departureConfirmedBadge: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },

  // Ticket Body
  ticketBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  // Capacity Widget
  capacityWidget: {
    borderRadius: 16,
    padding: Spacing.md,
    gap: 8,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  capacityRemaining: {
    fontSize: 12,
    fontWeight: FontWeight.extrabold,
  },
  capacityTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  capacityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  capacityFooterText: {
    fontSize: 11,
  },
  rateHighlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rateHighlightText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Highlights Row
  highlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  highlightItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  highlightVal: {
    fontSize: 16,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.2,
  },
  highlightLbl: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  highlightDiv: {
    width: 1,
    height: 24,
  },

  // Smart Matching Banner
  matchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 20,
    padding: Spacing.mdl,
    overflow: 'hidden',
  },
  matchingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchingTextWrap: {
    flex: 1,
    gap: 2,
  },
  matchingHeading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  matchingSubheading: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
  },

  // Requests Section
  requestsSection: {
    gap: Spacing.md,
  },
  requestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  requestsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requestsCountText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },

  // Empty Requests
  emptyRequestsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  findParcelsEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  findParcelsEmptyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  requestsList: {
    gap: Spacing.md,
  },
});
