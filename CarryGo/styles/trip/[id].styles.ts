import { StyleSheet } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

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
    paddingBottom: Spacing.md,
  },
  roundNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitleContainer: {
    alignItems: 'center',
    gap: 3,
  },
  navTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusCapsuleText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.card,
  },
  ticketHeader: {
    padding: Spacing.lg,
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
  },

  // Route in Ticket
  routeRow: {
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
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  routeCityText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: FontWeight.bold,
  },
  routeArrowBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },

  // Stopover chain (optional intermediate cities)
  stopoverChainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  stopoverChainLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stopoverChipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stopoverChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stopoverChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Schedule Ribbon
  scheduleRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scheduleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.medium,
  },

  // Ticket Body
  ticketBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityLabel: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
  },
  capacityVal: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  capacityProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  rateText: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  totalSpaceText: {
    fontSize: 12,
  },

  // Traveler Profile Card (for sender and owner)
  travelerProfileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  travelerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  travelerSectionTitle: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  travelerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  travelerRoleText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  travelerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  travelerVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  travelerInfoCol: {
    flex: 1,
    gap: 4,
  },
  travelerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelerName: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  travelerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  travelerSubtitle: {
    fontSize: 12,
  },
  travelerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  travelerTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  travelerTrustText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },

  // "Can Carry" categories section
  canCarryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  canCarryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  canCarryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canCarryTitle: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  canCarrySub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  canCarrySpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  canCarrySpecItem: {
    flex: 1,
    alignItems: 'center',
  },
  canCarrySpecVal: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  canCarrySpecLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  canCarrySpecDivider: {
    width: 1,
    height: 24,
  },
  canCarrySummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  canCarrySummaryText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  canCarryGrid: {
    gap: 8,
  },
  canCarryCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  canCarryCategoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canCarryCategoryInfo: {
    flex: 1,
    gap: 2,
  },
  canCarryCategoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  canCarryCategoryTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  canCarryCategoryTagline: {
    fontSize: 11,
  },
  canCarryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  canCarryBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  canCarryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  canCarryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  canCarryPillText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  canCarryMismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  canCarryMismatchText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  canCarryMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  canCarryMatchText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: FontWeight.medium,
  },
  vehicleSpaceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  vehicleSpaceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleSpaceTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  vehicleSpaceDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  canCarryGuidelinesBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  canCarryGuidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  canCarryGuidelineText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },

  // Request Status Banner (for sender when request exists)
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.mdl,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  statusBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  statusBannerActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Owner Summary Stats Strip
  ownerStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  ownerStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  ownerStatVal: {
    fontSize: 22,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  ownerStatLbl: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ownerStatDiv: {
    width: 1,
    height: 24,
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
  requestsTitle: {
    fontSize: FontSize.lg,
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
  requestsList: {
    gap: Spacing.sm,
  },

  // Empty Requests Card
  emptyRequestsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  browseParcelsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  browseParcelsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  // Fixed Bottom Bar (for sender)
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    // Upward-casting shadow — navy-tinted, soft. Lifts the bar off scrolling
    // content behind it instead of looking like a stamped border line.
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomPriceCol: {
    gap: 1,
  },
  bottomPriceLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  bottomPriceAmount: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  bottomRateSub: {
    fontSize: 10,
  },
  bottomActionsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  negotiateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  negotiateBtnText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  requestDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    ...Shadow.brand,
  },
  requestDeliveryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  tabletCentered: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  bottomBarInnerSmall: {
    gap: Spacing.xs + 2,
  },
  negotiateBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  negotiateBtnTextSmall: {
    fontSize: 12,
  },
  requestDeliveryBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  requestDeliveryBtnTextSmall: {
    fontSize: 12,
  },

  // Map & Itinerary Section Styles
  mapSectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.card,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  mapHeaderTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  osmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  osmBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  mapCanvasWrapper: {
    height: 220,
    width: '100%',
    overflow: 'hidden',
  },
  itineraryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  itineraryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itineraryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  itinerarySubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  matchedLegPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  matchedLegPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginVertical: 4,
  },
  matchedBannerHeading: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  matchedBannerSub: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  matchedBannerPrice: {
    alignItems: 'flex-end',
  },
  matchedBannerPriceVal: {
    fontSize: 16,
    fontWeight: FontWeight.extrabold,
  },
  matchedBannerPriceSub: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  timelineNodesList: {
    marginTop: 8,
    gap: 0,
  },
  timelineNodeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 46,
  },
  nodeTimeCol: {
    width: 60,
    alignItems: 'flex-start',
    paddingTop: 1,
  },
  nodeTimeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  nodeDistText: {
    fontSize: 10,
    marginTop: 1,
  },
  nodeTrackCol: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    zIndex: 2,
  },
  nodeTrackLine: {
    position: 'absolute',
    top: 12,
    bottom: 0,
    width: 2,
    zIndex: 1,
  },
  nodeInfoCol: {
    flex: 1,
    paddingLeft: 6,
    paddingBottom: 14,
  },
  nodeInfoColMatched: {
    borderRadius: BorderRadius.sm,
  },
  nodeCityText: {
    fontSize: 13,
    fontWeight: FontWeight.medium,
  },
  nodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  nodeBadgeText: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
  },
  stopoverBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.xs,
  },
  stopoverBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
});
