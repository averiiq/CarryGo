import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Share, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsQuery } from '@/features/conversations/queries';
import { useParcelQuery, useUpdateParcelStatusMutation } from '@/features/listings/queries';
import { useRequestsByParcelQuery, useUpdateRequestStatusMutation } from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

const categoryGradients: Record<string, [string, string]> = {
  documents: ['#475569', '#1E293B'],
  electronics: ['#4F46E5', '#312E81'],
  clothing: ['#BE185D', '#831843'],
  food: ['#EA580C', '#9A3412'],
  medicine: ['#059669', '#064E3B'],
  other: ['#4338CA', '#1E1B4B'],
};

type TabFilter = 'all' | 'pending' | 'active' | 'done';

interface ProposalCardProps {
  request: Request;
  viewerRole: 'sender' | 'traveller' | 'observer';
  onCancel: () => void;
  onChat: () => void;
  onTrack: () => void;
  onPayment: () => void;
  C: ThemeColors;
}

function ProposalCard({
  request,
  viewerRole,
  onCancel,
  onChat,
  onTrack,
  onPayment,
  C,
}: ProposalCardProps) {
  const isSender = viewerRole === 'sender';
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';

  return (
    <View style={[styles.proposalCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {/* Carrier Info Header */}
      <View style={styles.carrierHeader}>
        <View style={styles.carrierLeft}>
          <View style={[styles.carrierAvatar, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.carrierAvatarText, { color: C.primary }]}>
              {request.travellerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.carrierMeta}>
            <View style={styles.carrierNameRow}>
              <Text style={[styles.carrierName, { color: C.textPrimary }]}>
                {request.travellerName}
              </Text>
              <View style={[styles.verifiedPill, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="verified" size={11} color={C.success} />
                <Text style={[styles.verifiedPillText, { color: C.success }]}>Verified</Text>
              </View>
            </View>
            <Text style={[styles.carrierDate, { color: C.textMuted }]}>
              Offered on {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.bidAmountBox}>
          <Text style={[styles.bidAmount, { color: C.success }]}>₹{request.price}</Text>
          <Text style={[styles.bidLabel, { color: C.textMuted }]}>Proposed</Text>
        </View>
      </View>

      {/* Message from Carrier */}
      {request.message ? (
        <View style={[styles.carrierMessageBox, { backgroundColor: C.surfaceElevated }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primary} />
          <Text style={[styles.carrierMessageText, { color: C.textSecondary }]}>
            "{request.message}"
          </Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      {isSender && isPending ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelOfferBtn,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 }
            ]}
            onPress={onCancel}
          >
            <MaterialIcons name="close" size={15} color={C.error} />
            <Text style={[styles.cancelOfferText, { color: C.error }]}>Decline</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.chatOfferBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.chatOfferText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>
        </View>
      ) : null}

      {isAccepted ? (
        <View style={styles.proposalActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.chatOfferBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.chatOfferText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {isSender ? (
            <Pressable
              style={({ pressed }) => [
                styles.escrowBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.75 }
              ]}
              onPress={onPayment}
            >
              <MaterialIcons name="account-balance-wallet" size={15} color={C.warning} />
              <Text style={[styles.escrowBtnText, { color: C.warning }]}>Escrow</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.trackLiveBtn,
              pressed && { opacity: 0.9 }
            ]}
            onPress={onTrack}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <MaterialIcons name={isSender ? 'radar' : 'fact-check'} size={16} color="#fff" />
            <Text style={styles.trackLiveText}>
              {isSender ? 'Track Delivery' : 'Process Shipment'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.deliveryCompletedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={[styles.deliveryCompletedText, { color: C.success }]}>
            Successfully Delivered
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ParcelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { C } = useThemeColors();

  const parcelQuery = useParcelQuery(id);
  const requestsQuery = useRequestsByParcelQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabFilter>('all');
  const [showImageModal, setShowImageModal] = useState(false);

  const parcel = (parcelQuery.data ?? undefined) as Parcel | undefined;
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const loading = parcelQuery.isLoading || requestsQuery.isLoading;

  const isSender = parcel?.userId === user?.id;
  const visibleRequests = useMemo(() => {
    if (isSender) return requests;
    return requests.filter(request => request.travellerId === user?.id);
  }, [isSender, requests, user?.id]);

  const viewerRole: 'sender' | 'traveller' | 'observer' = isSender
    ? 'sender'
    : visibleRequests.length > 0
      ? 'traveller'
      : 'observer';

  const catGradient: [string, string] = parcel
    ? (categoryGradients[parcel.category] || ['#4F46E5', '#312E81'])
    : ['#4F46E5', '#312E81'];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      parcelQuery.refetch(),
      requestsQuery.refetch(),
      conversationsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleCancel = (req: Request) => {
    showAlert('Cancel Request?', 'Cancel your request to this traveller?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Request', style: 'destructive', onPress: async () => {
          await updateRequestStatusAsync({ requestId: req.id, status: 'cancelled' });
          await requestsQuery.refetch();
        },
      },
    ]);
  };

  const handleChat = (req: Request) => {
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv?.id) router.push(`/chat/${encodeURIComponent(String(conv.id))}` as never);
    else showAlert('No Chat', 'Chat opens once the request is accepted.');
  };

  const handleCancelParcel = () => {
    if (!parcel || !isSender) return;
    showAlert('Cancel Parcel?', 'This will remove your parcel listing from the marketplace. Any active deliveries will continue.', [
      { text: 'Keep Parcel', style: 'cancel' },
      {
        text: 'Cancel Parcel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateParcelStatusMutation.mutateAsync({ parcelId: parcel.id, status: 'cancelled' });
            Haptic.success();
            showAlert('Parcel Cancelled', 'Your parcel listing has been removed.');
          } catch (error) {
            Haptic.error();
            showAlert('Error', error instanceof Error ? error.message : 'Could not cancel parcel. Please try again.');
          }
        },
      },
    ]);
  };

  const handleShareParcel = async () => {
    if (!parcel) return;
    try {
      await Share.share({
        message: `CarryGo Shipment: ${parcel.description} from ${parcel.fromCity} to ${parcel.toCity}! Weight: ${parcel.weight}kg, Reward: ₹${parcel.priceOffer}. Connect with me on CarryGo.`,
      });
    } catch {
      // Ignored
    }
  };

  const pending = visibleRequests.filter(r => r.status === 'pending');
  const active = visibleRequests.filter(r => r.status === 'accepted');
  const done = visibleRequests.filter(r => ['completed', 'rejected', 'cancelled', 'failed'].includes(r.status));

  const displayedRequests = useMemo(() => {
    if (selectedTab === 'pending') return pending;
    if (selectedTab === 'active') return active;
    if (selectedTab === 'done') return done;
    return visibleRequests;
  }, [selectedTab, visibleRequests, pending, active, done]);

  if (!parcel) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isParcelOpen = parcel.status === 'open';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Top Floating App Bar */}
      <View style={[styles.topNavBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.roundNavBtn,
            { backgroundColor: C.surface, borderColor: C.surfaceBorder },
            pressed && { opacity: 0.75 }
          ]}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: C.textPrimary }]}>
            {isSender ? 'Manage Shipment' : 'Parcel Details'}
          </Text>
          <View style={styles.navSubRow}>
            <View style={[
              styles.navStatusDot,
              { backgroundColor: isParcelOpen ? C.success : C.primary }
            ]} />
            <Text style={[styles.navSubtitle, { color: C.textMuted }]}>
              {parcel.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.navRightRow}>
          <Pressable
            onPress={handleShareParcel}
            style={({ pressed }) => [
              styles.roundNavBtn,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            hitSlop={6}
          >
            <MaterialIcons name="share" size={18} color={C.textSecondary} />
          </Pressable>

          {isSender && isParcelOpen ? (
            <Pressable
              onPress={handleCancelParcel}
              style={({ pressed }) => [
                styles.roundNavBtn,
                { backgroundColor: C.errorSubtle, borderColor: C.error + '30' },
                pressed && { opacity: 0.75 }
              ]}
              hitSlop={6}
            >
              <MaterialIcons name="delete-outline" size={18} color={C.error} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Package Identity Card */}
        <View style={[styles.packageCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {parcel.imageUri ? (
            <Pressable onPress={() => setShowImageModal(true)} style={styles.packageImageContainer}>
              <Image source={{ uri: parcel.imageUri }} style={styles.packageImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.imageScrim}
              />
              <View style={styles.imageOverlayTop}>
                <View style={[styles.categoryBadgePill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={14} color="#fff" />
                  <Text style={styles.categoryBadgeText}>{parcel.category.toUpperCase()}</Text>
                </View>
                <View style={styles.zoomHintBadge}>
                  <MaterialIcons name="fullscreen" size={16} color="#fff" />
                  <Text style={styles.zoomHintText}>Inspect</Text>
                </View>
              </View>
              <View style={styles.imageOverlayBottom}>
                <Text style={styles.packageImageTitle} numberOfLines={2}>
                  {parcel.description}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.packageNoImageHeader}>
              <LinearGradient
                colors={catGradient}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.noImageTop}>
                <View style={styles.noImageCategoryPill}>
                  <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={14} color="#fff" />
                  <Text style={styles.noImageCategoryText}>{parcel.category.toUpperCase()}</Text>
                </View>
                <View style={styles.packageWeightPill}>
                  <MaterialIcons name="scale" size={13} color="#fff" />
                  <Text style={styles.packageWeightPillText}>{parcel.weight} kg</Text>
                </View>
              </View>
              <Text style={styles.packageNoImageTitle}>
                {parcel.description}
              </Text>
            </View>
          )}

          {/* Courier Route Section (Vertical Delivery Flow) */}
          <View style={styles.routeSection}>
            {/* Origin Step */}
            <View style={styles.routeStep}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.pickupDot, { backgroundColor: C.success }]} />
                <View style={[styles.verticalLine, { backgroundColor: C.surfaceBorder }]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, { color: C.textMuted }]}>PICKUP LOCATION</Text>
                <Text style={[styles.stepCity, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
              </View>
            </View>

            {/* Destination Step */}
            <View style={styles.routeStep}>
              <View style={styles.stepIndicatorCol}>
                <View style={[styles.dropoffPin, { backgroundColor: C.primary }]}>
                  <MaterialIcons name="location-on" size={12} color="#fff" />
                </View>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, { color: C.textMuted }]}>DELIVERY DESTINATION</Text>
                <Text style={[styles.stepCity, { color: C.textPrimary }]}>{parcel.toCity}</Text>
              </View>
            </View>
          </View>

          {/* Compensation & Escrow Guarantee Strip */}
          <View style={[styles.escrowBanner, { backgroundColor: C.surfaceElevated }]}>
            <View style={styles.escrowLeft}>
              <Text style={[styles.offerAmount, { color: C.textPrimary }]}>₹{parcel.priceOffer}</Text>
              <Text style={[styles.offerSubtext, { color: C.textMuted }]}>
                Carrier Reward ({parcel.weight} kg)
              </Text>
            </View>
            <View style={[styles.escrowRight, { backgroundColor: C.successSubtle }]}>
              <MaterialIcons name="security" size={15} color={C.success} />
              <Text style={[styles.escrowProtectedText, { color: C.success }]}>
                100% Escrow
              </Text>
            </View>
          </View>
        </View>

        {/* Find Travellers Smart Action Card (when open & owned) */}
        {isSender && isParcelOpen ? (
          <Pressable
            style={({ pressed }) => [
              styles.matchingCard,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }
            ]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'parcel', id: parcel.id } })}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
            />
            <View style={styles.matchingIconCircle}>
              <MaterialIcons name="explore" size={24} color="#fff" />
            </View>
            <View style={styles.matchingTextCol}>
              <Text style={styles.matchingTitle}>Find Matching Travellers</Text>
              <Text style={styles.matchingSub}>
                Browse travellers heading from {parcel.fromCity} to {parcel.toCity}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Carrier Proposals Section */}
        <View style={styles.proposalsSection}>
          <View style={styles.proposalsHeaderRow}>
            <View style={styles.proposalsTitleRow}>
              <Text style={[styles.proposalsTitle, { color: C.textPrimary }]}>
                Carrier Bids
              </Text>
              <View style={[styles.proposalsCountBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.proposalsCountText, { color: C.primary }]}>
                  {visibleRequests.length}
                </Text>
              </View>
            </View>

            {/* Segmented Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { key: 'all' as TabFilter, label: 'All' },
                { key: 'pending' as TabFilter, label: `Pending (${pending.length})` },
                { key: 'active' as TabFilter, label: `Active (${active.length})` },
              ].map((tab) => {
                const isSelected = selectedTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? C.primary : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      }
                    ]}
                    onPress={() => {
                      Haptic.select();
                      setSelectedTab(tab.key);
                    }}
                  >
                    <Text style={[
                      styles.filterPillText,
                      { color: isSelected ? '#fff' : C.textMuted }
                    ]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Proposals List or Empty State */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 32 }} />
          ) : displayedRequests.length === 0 ? (
            <View style={[styles.emptyBidsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={[styles.emptyBidsIconCircle, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="radar" size={32} color={C.primary} />
              </View>
              <Text style={[styles.emptyBidsTitle, { color: C.textPrimary }]}>
                Waiting for Carrier Offers
              </Text>
              <Text style={[styles.emptyBidsSub, { color: C.textMuted }]}>
                {isSender
                  ? 'Your parcel is live on the marketplace. Travellers along this route can submit bids to carry it.'
                  : 'No bids submitted yet.'}
              </Text>
              {isSender && isParcelOpen ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.inviteTravellerBtn,
                    { backgroundColor: C.primary },
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={() => router.push({ pathname: '/matching', params: { mode: 'parcel', id: parcel.id } })}
                >
                  <MaterialIcons name="person-search" size={16} color="#fff" />
                  <Text style={styles.inviteTravellerText}>Invite Travellers</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.proposalsList}>
              {displayedRequests.map((req) => (
                <ProposalCard
                  key={req.id}
                  request={req}
                  viewerRole={viewerRole}
                  onCancel={() => handleCancel(req)}
                  onChat={() => handleChat(req)}
                  onTrack={() => router.push({ pathname: '/delivery/[id]', params: { id: req.id } })}
                  onPayment={() => router.push({ pathname: '/payment/[id]', params: { id: req.id } })}
                  C={C}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full Photo Modal */}
      {parcel.imageUri ? (
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowImageModal(false)}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
            <Image
              source={{ uri: parcel.imageUri }}
              style={styles.modalImg}
              contentFit="contain"
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Navigation Bar
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

  // Package Card
  packageCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Image Header
  packageImageContainer: {
    height: 220,
    position: 'relative',
  },
  packageImage: {
    width: '100%',
    height: '100%',
  },
  imageScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  zoomHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  imageOverlayBottom: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
  },
  packageImageTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: FontWeight.extrabold,
    lineHeight: 24,
  },

  // No-Image Header
  packageNoImageHeader: {
    padding: Spacing.xl,
    minHeight: 140,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  noImageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noImageCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  noImageCategoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  packageWeightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  packageWeightPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  packageNoImageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  // Vertical Delivery Route Flow
  routeSection: {
    padding: Spacing.lg,
    gap: 16,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  verticalLine: {
    width: 2,
    height: 32,
    marginTop: 4,
    borderRadius: 1,
  },
  dropoffPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  stepCity: {
    fontSize: 16,
    fontWeight: FontWeight.extrabold,
  },

  // Escrow Strip
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  escrowLeft: {
    gap: 2,
  },
  offerAmount: {
    fontSize: 22,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  offerSubtext: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  escrowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  escrowProtectedText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Smart Matching Card
  matchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 20,
    padding: Spacing.mdl,
    overflow: 'hidden',
  },
  matchingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchingTextCol: {
    flex: 1,
    gap: 2,
  },
  matchingTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  matchingSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
  },

  // Proposals Section
  proposalsSection: {
    gap: Spacing.md,
  },
  proposalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proposalsTitle: {
    fontSize: 18,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  proposalsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proposalsCountText: {
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

  // Empty Bids
  emptyBidsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emptyBidsIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBidsTitle: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  emptyBidsSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  inviteTravellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  inviteTravellerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },

  // Proposals List
  proposalsList: {
    gap: Spacing.md,
  },
  proposalCard: {
    borderRadius: 20,
    padding: Spacing.mdl,
    borderWidth: 1,
    gap: Spacing.md,
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
  },
  carrierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierAvatarText: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  carrierMeta: {
    gap: 2,
  },
  carrierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carrierName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  carrierDate: {
    fontSize: 11,
  },
  bidAmountBox: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  bidLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  carrierMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  carrierMessageText: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  proposalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelOfferText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  chatOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  chatOfferText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  escrowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  escrowBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  trackLiveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    overflow: 'hidden',
  },
  trackLiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  deliveryCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryCompletedText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImg: {
    width: '94%',
    height: '75%',
  },
});
