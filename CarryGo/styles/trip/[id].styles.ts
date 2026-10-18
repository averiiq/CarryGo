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

  // Traveler Trust Profile Card
  travelerProfileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  travelerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  travelerAvatarWrap: {
    position: 'relative',
  },
  travelerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  travelerAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerAvatarInitials: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
  },
  travelerVerifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  travelerInfoCol: {
    flex: 1,
  },
  travelerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelerName: {
    fontSize: 17,
    fontWeight: FontWeight.bold,
  },
  kycChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kycChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#2563EB',
  },
  travelerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  travelerTripsCount: {
    fontSize: 12,
  },
  trustPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  trustPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustPointText: {
    fontSize: 12,
    fontWeight: FontWeight.medium,
  },

  // What Traveler Allows To Carry Card
  allowsToCarryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  allowsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  allowsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowsHeaderTitle: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  allowsHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  allowsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryCheckText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  prohibitedBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  prohibitedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prohibitedTitle: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  prohibitedText: {
    fontSize: 11,
    lineHeight: 16,
  },
  parcelCompatibilityBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  parcelCompatTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  parcelCompatSub: {
    fontSize: 12,
  },

  // Fixed Bottom Action Bar for Senders
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  negotiateBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  negotiateBtnText: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  bookTripBtn: {
    flex: 1.3,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bookTripBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: FontWeight.extrabold,
  },
});
