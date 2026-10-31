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

  // Traveler Profile Card (for sender)
  travelerProfileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.mdl,
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
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  travelerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerAvatarInitials: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  travelerVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerInfoCol: {
    flex: 1,
    gap: 2,
  },
  travelerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelerName: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  travelerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  travelerSubtitle: {
    fontSize: 12,
  },

  // "Can Carry" categories section
  canCarryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.mdl,
    gap: Spacing.md,
  },
  canCarryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  canCarryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canCarryTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  canCarrySub: {
    fontSize: 11,
    marginTop: 1,
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
  },
  ownerStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  ownerStatVal: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  ownerStatLbl: {
    fontSize: 11,
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
  },
  requestDeliveryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
});
