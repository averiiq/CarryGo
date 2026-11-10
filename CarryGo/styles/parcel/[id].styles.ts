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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCapsuleText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
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

  // Digital Waybill Showcase Card
  showcaseCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.md,
  },
  mediaContainer: {
    height: 220,
    position: 'relative',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  mediaBadgesTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mediaCategoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mediaWeightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mediaWeightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  zoomBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },

  // Showcase Body
  showcaseBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleRow: {
    gap: 6,
  },
  parcelHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryLabelText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  parcelTitle: {
    fontSize: FontSize.lg + 2,
    fontWeight: FontWeight.bold,
    lineHeight: 28,
  },

  // Route Transit Visualizer
  routeCard: {
    borderRadius: 18,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  routeHeaderTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  routeDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  routeDistanceText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  routeVisualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  routeNode: {
    flex: 1,
    gap: 3,
  },
  routeDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  routeDotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  routeCityName: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  routeCitySub: {
    fontSize: 11,
  },
  routeConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  routeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Specifications 2x2 Grid
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  specHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  specValue: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },

  // Safe Handover Guarantee Banner
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  guaranteeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeContent: {
    flex: 1,
    gap: 2,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  guaranteeText: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Sender Attribution Card (Traveler Perspective)
  senderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  senderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  senderMeta: {
    flex: 1,
    gap: 2,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  senderSub: {
    fontSize: 11,
  },
  senderVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  senderVerifiedText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  // Traveler Live Offer Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  statusBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerContent: {
    flex: 1,
    gap: 2,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  statusBannerSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  statusBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  statusBannerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Section Header (Carrier Offers)
  section: {
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Empty Offers State
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  emptyRadarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  findTravelersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  findTravelersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  // Proposals List
  proposalsList: {
    gap: Spacing.md,
  },
  proposalCard: {
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  carrierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carrierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  carrierAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
  },
  carrierMeta: {
    flex: 1,
    gap: 2,
  },
  carrierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carrierName: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  carrierDate: {
    fontSize: 11,
  },
  bidAmountBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  bidAmount: {
    fontSize: 19,
    fontWeight: FontWeight.bold,
  },
  bidLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  carrierMessageBox: {
    padding: Spacing.md,
    borderRadius: 14,
    gap: 2,
  },
  carrierMessageText: {
    fontSize: 12,
    lineHeight: 17,
  },
  carrierCanCarryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  carrierCanCarryLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  carrierCanCarryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  carrierCanCarryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  carrierCanCarryPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  carrierMismatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  carrierMismatchText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  proposalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  actionBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  deliveryCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  deliveryCompletedText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Floating Bottom Action Bar (Traveler)
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    // Upward-casting shadow — navy-tinted, soft. Negative height lifts the bar
    // off the content behind it instead of looking like a stamped line.
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceCol: {
    gap: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  bottomBarPrice: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
  },
  bottomRateSub: {
    fontSize: 11,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    ...Shadow.brand,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  tabletCentered: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  primaryCtaBtnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 6,
  },
  primaryCtaTextSmall: {
    fontSize: 13,
  },

  // Full Image Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImg: {
    width: '92%',
    height: '75%',
  },
  modalCaptionWrap: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  modalCaption: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
});

