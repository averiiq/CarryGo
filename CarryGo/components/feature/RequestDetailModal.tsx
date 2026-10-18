import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Request } from '@/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { STATUS_CONFIG, getRouteLocations, getRequestCardViewModel } from '@/components/feature/RequestCard';

interface RequestDetailModalProps {
  visible: boolean;
  onClose: () => void;
  request: Request | null;
  currentUserId?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onChat?: () => void;
  onPayment?: () => void;
  onDelivery?: () => void;
  onViewParcelListing?: (parcelId: string) => void;
  onViewTripListing?: (tripId: string) => void;
}

export function RequestDetailModal({
  visible,
  onClose,
  request,
  currentUserId,
  onAccept,
  onReject,
  onCancel,
  onChat,
  onPayment,
  onDelivery,
  onViewParcelListing,
  onViewTripListing,
}: RequestDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();

  if (!request) return null;

  const sc = STATUS_CONFIG(C)[request.status] || STATUS_CONFIG(C).pending;
  const { pickup, drop } = getRouteLocations(request);
  const vm = getRequestCardViewModel({
    request,
    type: request.senderId === currentUserId ? 'outgoing' : 'incoming',
    currentUserId,
    C,
  });

  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: C.surface,
              borderColor: C.surfaceBorder,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          {/* Top Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: C.surfaceBorder }]} />
          </View>

          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerRoute, { color: C.textPrimary }]} numberOfLines={1}>
                {pickup} ➔ {drop}
              </Text>
              <Text style={[styles.headerSubtitle, { color: C.textMuted }]}>
                Created on {formattedDate}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptic.tap();
                onClose();
              }}
              style={[styles.closeBtn, { backgroundColor: C.surfaceElevated }]}
              hitSlop={TouchTarget.smallHitSlop}
              accessibilityRole="button"
              accessibilityLabel="Close details"
            >
              <Ionicons name="close" size={20} color={C.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Status & Escrow Pill */}
            <View style={styles.statusRow}>
              <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                <Ionicons name={sc.icon} size={13} color={sc.color} />
                <Text style={[styles.statusChipText, { color: sc.color }]}>{sc.label}</Text>
              </View>

              <View style={[styles.roleChip, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                <Ionicons
                  name={vm.isTraveller ? 'bicycle-outline' : 'cube-outline'}
                  size={13}
                  color={C.primary}
                />
                <Text style={[styles.roleChipText, { color: C.primary }]}>
                  {vm.isTraveller ? 'You are Traveler' : 'You are Sender'}
                </Text>
              </View>
            </View>

            {/* Counterpart Card */}
            <View style={[styles.counterpartCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <View style={styles.counterpartLeft}>
                <View style={[styles.counterpartAvatar, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.counterpartInitial, { color: C.primary }]}>
                    {vm.personName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.counterpartMeta}>
                  <View style={styles.counterpartNameRow}>
                    <Text style={[styles.counterpartName, { color: C.textPrimary }]}>
                      {vm.personName}
                    </Text>
                    <MaterialIcons name="verified" size={14} color={C.primary} />
                  </View>
                  <Text style={[styles.counterpartRole, { color: C.textMuted }]}>
                    {vm.roleLabel}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  Haptic.tap();
                  onClose();
                  onChat?.();
                }}
                style={[styles.counterpartChatBtn, { backgroundColor: C.primary }]}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${vm.personName}${request.status === 'pending' ? ' before accepting' : ''}`}
              >
                <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                <Text style={styles.counterpartChatText}>
                  {request.status === 'pending' ? 'Chat Directly' : 'Chat'}
                </Text>
              </Pressable>
            </View>

            {/* Pre-acceptance Guidance Banner */}
            {request.status === 'pending' && (
              <View
                style={[
                  styles.preAcceptHint,
                  { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder },
                ]}
              >
                <Ionicons name="information-circle-outline" size={15} color={C.primary} />
                <Text style={[styles.preAcceptHintText, { color: C.textPrimary }]}>
                  You can chat freely to coordinate route compatibility, parcel size, or pickup timing before accepting.
                </Text>
              </View>
            )}

            {/* Fare Spotlight */}
            <View style={[styles.fareBox, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
              <View>
                <Text style={[styles.fareLabel, { color: C.textMuted }]}>
                  {vm.isTraveller ? 'Your Total Payout' : 'Escrow Deposit Amount'}
                </Text>
                <Text style={[styles.fareAmount, { color: C.primary }]}>
                  ₹{request.price}
                </Text>
              </View>

              <View style={[styles.escrowBadge, { backgroundColor: C.surface, borderColor: C.primaryBorder }]}>
                <MaterialIcons name="shield" size={14} color={C.primary} />
                <Text style={[styles.escrowBadgeText, { color: C.primary }]}>100% Escrow Safe</Text>
              </View>
            </View>

            {/* Parcel Details Section */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Package Details</Text>
              <View style={[styles.specGrid, { borderColor: C.surfaceBorder }]}>
                <View style={styles.specCell}>
                  <MaterialIcons name="category" size={16} color={C.primary} />
                  <View>
                    <Text style={[styles.specCellLabel, { color: C.textMuted }]}>Category</Text>
                    <Text style={[styles.specCellValue, { color: C.textPrimary }]}>
                      {request.parcelCategory || 'General Parcel'}
                    </Text>
                  </View>
                </View>

                <View style={styles.specCell}>
                  <MaterialIcons name="scale" size={16} color={C.primary} />
                  <View>
                    <Text style={[styles.specCellLabel, { color: C.textMuted }]}>Weight</Text>
                    <Text style={[styles.specCellValue, { color: C.textPrimary }]}>
                      {request.parcelWeight ? `${request.parcelWeight} kg` : 'Standard'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Optional Note */}
            {request.message ? (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Note from {vm.personName}</Text>
                <View style={[styles.messageBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={16} color={C.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.messageContent, { color: C.textSecondary }]}>
                    "{request.message}"
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Quick Listing Links */}
            <View style={styles.linksRow}>
              {request.parcelId ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    onViewParcelListing?.(request.parcelId);
                  }}
                  style={[styles.linkBtn, { borderColor: C.surfaceBorder }]}
                >
                  <MaterialIcons name="inventory-2" size={14} color={C.primary} />
                  <Text style={[styles.linkBtnText, { color: C.primary }]}>View Parcel Listing</Text>
                </Pressable>
              ) : null}

              {request.tripId ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    onViewTripListing?.(request.tripId);
                  }}
                  style={[styles.linkBtn, { borderColor: C.surfaceBorder }]}
                >
                  <MaterialIcons name="flight-takeoff" size={14} color={C.primary} />
                  <Text style={[styles.linkBtnText, { color: C.primary }]}>View Trip Route</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: C.surfaceBorder }]}>
            {vm.showAcceptDecline ? (
              <View style={styles.footerActionsRow}>
                <Pressable
                  onPress={() => {
                    Haptic.warning();
                    onClose();
                    onReject?.();
                  }}
                  style={[styles.footerDeclineBtn, { borderColor: C.error + '44', backgroundColor: C.errorSubtle }]}
                >
                  <Text style={[styles.footerDeclineText, { color: C.error }]}>Decline</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptic.success();
                    onClose();
                    onAccept?.();
                  }}
                  style={[styles.footerAcceptBtn, { backgroundColor: C.primary }]}
                >
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  <Text style={[styles.footerAcceptText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {vm.isTraveller ? `Accept & Earn ₹${request.price}` : `Accept Offer (₹${request.price})`}
                  </Text>
                </Pressable>
              </View>
            ) : vm.showPayButton ? (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  onClose();
                  onPayment?.();
                }}
                style={[styles.footerPayBtn, { backgroundColor: C.primary }]}
              >
                <MaterialIcons name="lock" size={16} color="#FFFFFF" />
                <Text style={styles.footerPayText}>Pay Escrow (₹{request.price})</Text>
              </Pressable>
            ) : vm.showDeliveryButton ? (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  onClose();
                  onDelivery?.();
                }}
                style={[styles.footerPayBtn, { backgroundColor: C.primary }]}
              >
                <MaterialIcons name="local-shipping" size={16} color="#FFFFFF" />
                <Text style={styles.footerPayText}>
                  {vm.isTraveller ? 'Process Handover' : 'Track Delivery'}
                </Text>
              </Pressable>
            ) : vm.showCancel ? (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  onClose();
                  onCancel?.();
                }}
                style={[styles.footerCancelBtn, { borderColor: C.error + '44', backgroundColor: C.errorSubtle }]}
              >
                <Text style={[styles.footerCancelText, { color: C.error }]}>Cancel Request</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerRoute: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  counterpartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  counterpartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  counterpartAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterpartInitial: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  counterpartMeta: {
    gap: 2,
    flex: 1,
  },
  counterpartNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterpartName: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  counterpartRole: {
    fontSize: 11,
  },
  counterpartChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  counterpartChatText: {
    fontSize: 11.5,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  preAcceptHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  preAcceptHintText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  fareBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  fareLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  escrowBadgeText: {
    fontSize: 10.5,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  sectionWrap: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  specGrid: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  specCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm + 2,
  },
  specCellLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  specCellValue: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 8,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  messageContent: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    flex: 1,
  },
  timelineCard: {
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  timelineTextWrap: {
    flex: 1,
    gap: 2,
  },
  timelineItemTitle: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  timelineItemSub: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  linkBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerDeclineBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDeclineText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  footerAcceptBtn: {
    flex: 2,
    height: 44,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerAcceptText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  footerPayBtn: {
    height: 44,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerPayText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  footerDeliveryBtn: {
    height: 44,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerDeliveryText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  footerCancelBtn: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCancelText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
});
