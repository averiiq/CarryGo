import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import {
  useConversationsQuery,
} from '@/features/conversations/queries';
import {
  useParcelQuery,
  useUpdateParcelStatusMutation,
} from '@/features/listings/queries';
import {
  useRequestsByParcelQuery,
  useUpdateRequestStatusMutation,
} from '@/features/requests/queries';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Request, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Shadow } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const categoryIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  documents: 'description',
  electronics: 'devices',
  clothing: 'checkroom',
  food: 'restaurant',
  medicine: 'local-pharmacy',
  other: 'inventory-2',
};

const categoryColors: Record<string, string> = {
  documents: '#8B5CF6',
  electronics: '#06B6D4',
  clothing: '#F59E0B',
  food: '#22C55E',
  medicine: '#EF4444',
  other: '#3B82F6',
};

type StatusKey = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'failed';

const TIMELINE_ORDER: StatusKey[] = ['pending', 'accepted', 'completed'];

function timelineStep(status: StatusKey): number {
  if (status === 'accepted') return 1;
  if (status === 'completed') return 2;
  return 0;
}

interface RequestRowProps {
  request: Request;
  isSender: boolean;
  onCancel: () => void;
  onChat: () => void;
  onTrack: () => void;
  onPayment: () => void;
  C: ThemeColors;
  S: typeof Shadow;
}

function RequestRow({ request, isSender, onCancel, onChat, onTrack, onPayment, C, S }: RequestRowProps) {
  const step = timelineStep(request.status as StatusKey);
  const isRejectedOrCancelled = request.status === 'rejected' || request.status === 'cancelled';

  const statusConfig = {
    pending:   { label: 'Pending',   color: C.warning,   bg: C.warningSubtle,   icon: 'hourglass-empty' as const },
    accepted:  { label: 'Accepted',  color: C.success,   bg: C.successSubtle,   icon: 'check-circle' as const },
    rejected:  { label: 'Rejected',  color: C.error,     bg: C.errorSubtle,     icon: 'cancel' as const },
    completed: { label: 'Completed', color: C.info,      bg: C.infoSubtle,      icon: 'verified' as const },
    cancelled: { label: 'Cancelled', color: C.textMuted, bg: C.surfaceElevated, icon: 'block' as const },
    failed:    { label: 'Failed',    color: C.error,     bg: C.errorSubtle,     icon: 'error' as const },
  };
  const sc = statusConfig[request.status as StatusKey] || statusConfig.pending;
  const tlos = [statusConfig.pending, statusConfig.accepted, statusConfig.completed];

  return (
    <View style={[styles.reqRow, { borderBottomColor: C.surfaceBorder }]}>
      {/* Traveller row */}
      <View style={styles.reqHeader}>
        <View style={[styles.tAvatar, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.tAvatarText, { color: C.textSecondary }]}>{request.travellerName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tName, { color: C.textPrimary }]}>{request.travellerName}</Text>
          <Text style={[styles.tTime, { color: C.textMuted }]}>
            {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {' · '}
            {new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <MaterialIcons name={sc.icon} size={11} color={sc.color} />
          <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Message */}
      {request.message ? (
        <View style={[styles.msgBox, { backgroundColor: C.surfaceElevated, borderLeftColor: C.surfaceBorderLight }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textMuted} />
          <Text style={[styles.msgText, { color: C.textSecondary }]} numberOfLines={2}>{request.message}</Text>
        </View>
      ) : null}

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: C.textMuted }]}>Offered price</Text>
        <Text style={[styles.priceValue, { color: C.primary }]}>₹{request.price}</Text>
      </View>

      {/* Timeline */}
      {!isRejectedOrCancelled && (
        <View style={[styles.progressRow, { backgroundColor: C.surfaceElevated, borderRadius: BorderRadius.sm }]}>
          {TIMELINE_ORDER.map((_, i) => {
            const done = step >= i;
            const psc = tlos[i];
            return (
              <React.Fragment key={i}>
                <View style={[styles.pStep, { backgroundColor: done ? psc.color : C.surfaceBorderLight }]}>
                  {done ? <MaterialIcons name={psc.icon} size={11} color="#fff" /> : <View style={[styles.pDot, { backgroundColor: C.surfaceBorder }]} />}
                </View>
                {i < 2 ? <View style={[styles.pLine, { backgroundColor: done && i < step ? tlos[i].color : C.surfaceBorderLight }]} /> : null}
              </React.Fragment>
            );
          })}
          <Text style={[styles.pLabel, { color: C.textMuted }]}>{sc.label}</Text>
        </View>
      )}

      {/* Actions */}
      {isSender && request.status === 'pending' ? (
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, { backgroundColor: C.errorSubtle, borderColor: C.error + '44' }, pressed && { opacity: 0.75 }]}
          onPress={onCancel}
        >
          <MaterialIcons name="close" size={15} color={C.error} />
          <Text style={[styles.cancelBtnText, { color: C.error }]}>Cancel Request</Text>
        </Pressable>
      ) : null}

      {request.status === 'accepted' ? (
        <View style={styles.actionRow}>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.75 }]} onPress={onPayment}>
            <MaterialIcons name="account-balance-wallet" size={14} color={C.warning} />
            <Text style={[styles.aBtnText, { color: C.warning }]}>Payment</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.75 }]} onPress={onChat}>
            <Ionicons name="chatbubble-outline" size={14} color={C.info} />
            <Text style={[styles.aBtnText, { color: C.info }]}>Chat</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.aBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }, pressed && { opacity: 0.75 }]} onPress={onTrack}>
            <MaterialIcons name="local-shipping" size={14} color={C.primary} />
            <Text style={[styles.aBtnText, { color: C.primary }]}>Track</Text>
          </Pressable>
        </View>
      ) : null}

      {request.status === 'completed' ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.success} />
          <Text style={[styles.doneText, { color: C.success }]}>Delivered successfully</Text>
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
  const { C, S } = useThemeColors();
  const parcelQuery = useParcelQuery(id);
  const requestsQuery = useRequestsByParcelQuery(id);
  const conversationsQuery = useConversationsQuery(user?.id);
  const { mutateAsync: updateRequestStatusAsync } = useUpdateRequestStatusMutation(user?.id);
  const updateParcelStatusMutation = useUpdateParcelStatusMutation();

  const [refreshing, setRefreshing] = useState(false);

  const parcel = (parcelQuery.data ?? undefined) as Parcel | undefined;
  const requests = requestsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];
  const loading = parcelQuery.isLoading || requestsQuery.isLoading;
  const isSender = parcel?.userId === user?.id;
  const canOffer = !isSender && parcel?.status === 'open'; // traveller viewing someone else's parcel
  const catColor = parcel ? (categoryColors[parcel.category] || C.primary) : C.primary;

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
          /* await createNotification({
            userId: req.travellerId,
            title: 'Request Cancelled',
            body: `${req.senderName} cancelled their delivery request.`,
            type: 'general', relatedId: req.id,
          }); */
          await requestsQuery.refetch();
        },
      },
    ]);
  };

  const handleChat = (req: Request) => {
    const conv = conversations.find(c => c.requestId === req.id);
    if (conv) router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
    else showAlert('No Chat', 'Chat opens once the request is accepted.');
  };

  const handleCancelParcel = () => {
    if (!parcel || !isSender) return;
    showAlert('Cancel Parcel?', 'This will remove your parcel listing from the marketplace.', [
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

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'accepted');
  const done = requests.filter(r => ['completed','rejected','cancelled','failed'].includes(r.status));

  if (!parcel) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: catColor + '33' }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{parcel.fromCity} → {parcel.toCity}</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>{parcel.description}</Text>
        </View>
        {isSender && parcel.status === 'open' ? (
          <Pressable
            onPress={handleCancelParcel}
            style={({ pressed }) => [{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: C.errorSubtle,
              borderWidth: 1, borderColor: C.error + '30',
              alignItems: 'center' as const, justifyContent: 'center' as const,
              marginRight: Spacing.sm,
            }, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <MaterialIcons name="close" size={16} color={C.error} />
          </Pressable>
        ) : null}
        <View style={[styles.catBadge, { backgroundColor: catColor + '18', borderColor: catColor + '44' }]}>
          <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={16} color={catColor} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Parcel hero card */}
        <View style={[styles.parcelCard, S.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder, borderTopColor: catColor }]}>
          {/* Route */}
          <View style={styles.routeRow}>
            <View style={styles.cityBlock}>
              <View style={[styles.cityDot, { backgroundColor: C.success }]} />
              <Text style={[styles.cityName, { color: C.textPrimary }]}>{parcel.fromCity}</Text>
            </View>
            <View style={styles.routeMid}>
              <View style={[styles.routeLine, { backgroundColor: C.surfaceBorderLight }]} />
              <View style={[styles.catPill, { backgroundColor: catColor + '18', borderColor: catColor + '44' }]}>
                <MaterialIcons name={categoryIcons[parcel.category] || 'inventory-2'} size={13} color={catColor} />
                <Text style={[styles.catPillText, { color: catColor }]}>
                  {parcel.category.charAt(0).toUpperCase() + parcel.category.slice(1)}
                </Text>
              </View>
              <View style={[styles.routeLine, { backgroundColor: C.surfaceBorderLight }]} />
            </View>
            <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
              <View style={[styles.cityDot, { backgroundColor: C.error }]} />
              <Text style={[styles.cityName, { color: C.textPrimary }]}>{parcel.toCity}</Text>
            </View>
          </View>

          {/* Image if available */}
          {parcel.imageUri ? (
            <Image
              source={{ uri: parcel.imageUri }}
              style={styles.parcelImage}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          {/* Description */}
          <View style={[styles.descBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.descText, { color: C.textSecondary }]}>{parcel.description}</Text>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: C.surfaceElevated }]}>
            <View style={styles.statItem}>
              <MaterialIcons name="scale" size={14} color={C.textMuted} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>{parcel.weight}kg</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Weight</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="payments" size={14} color={C.primary} />
              <Text style={[styles.statVal, { color: C.primary }]}>₹{parcel.priceOffer}</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Offered</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="swap-horiz" size={14} color={C.textMuted} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>{requests.length}</Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Requests</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <View style={[styles.statusDot, {
                backgroundColor:
                  parcel.status === 'open' ? C.success :
                  parcel.status === 'matched' ? C.primary :
                  parcel.status === 'in_transit' ? C.warning :
                  parcel.status === 'delivered' ? C.info : C.error
              }]} />
              <Text style={[styles.statVal, { color: C.textPrimary }]}>
                {parcel.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <Text style={[styles.statLbl, { color: C.textMuted }]}>Status</Text>
            </View>
          </View>

          {/* Owner */}
          <View style={styles.ownerRow}>
            <View style={[styles.ownerAvatar, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.ownerAvatarText, { color: C.primary }]}>{parcel.userName.charAt(0)}</Text>
            </View>
            <Text style={[styles.ownerName, { color: C.textSecondary }]}>{parcel.userName}</Text>
            <Text style={[styles.postedDate, { color: C.textMuted }]}>
              Posted {new Date(parcel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* CTA for travellers: offer to carry this parcel */}
        {canOffer ? (
          <Pressable
            style={({ pressed }) => [
              styles.findBtn,
              { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => {
              // Check if user has any active trips that match this route
              // Navigate to matching screen in 'trip' mode — user must select their trip first
              // Or navigate directly to matching if user has a matching trip
              router.push({ pathname: '/matching', params: { mode: 'parcel', id: parcel!.id } });
            }}
          >
            <MaterialIcons name="local-shipping" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Offer to Carry This Parcel</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : isSender && parcel?.status === 'open' ? (
          <Pressable
            style={({ pressed }) => [
              styles.findBtn,
              { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => router.push({ pathname: '/matching', params: { mode: 'parcel', id: parcel!.id } })}
          >
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={styles.findBtnText}>Find Travellers for This Parcel</Text>
            <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Summary chips */}
        <View style={styles.chips}>
          {[
            { count: pending.length, label: 'Pending', color: C.warning, icon: 'hourglass-empty' as const },
            { count: active.length, label: 'Active', color: C.success, icon: 'check-circle' as const },
            { count: done.filter(r => r.status === 'completed').length, label: 'Done', color: C.info, icon: 'verified' as const },
          ].map(c => (
            <View key={c.label} style={[styles.chip, { backgroundColor: c.color + '12', borderColor: c.color + '33' }]}>
              <MaterialIcons name={c.icon} size={12} color={c.color} />
              <Text style={[styles.chipCount, { color: c.color }]}>{c.count}</Text>
              <Text style={[styles.chipLabel, { color: c.color }]}>{c.label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="inbox" size={52} color={C.surfaceBorderLight} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No requests yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              {isSender
                ? 'Travellers on your route will send requests here.'
                : 'Send a request to this sender to carry their parcel.'}
            </Text>
          </View>
        ) : (
          <>
            {[
              { label: 'Pending', icon: 'hourglass-empty' as const, color: C.warning, items: pending },
              { label: 'In Progress', icon: 'local-shipping' as const, color: C.primary, items: active },
              { label: 'History', icon: 'history' as const, color: C.textMuted, items: done },
            ].filter(s => s.items.length > 0).map(section => (
              <View key={section.label} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: section.color + '15' }]}>
                    <MaterialIcons name={section.icon} size={14} color={section.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{section.label}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.color + '20' }]}>
                    <Text style={[styles.sectionBadgeText, { color: section.color }]}>{section.items.length}</Text>
                  </View>
                </View>
                <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder, borderLeftColor: section.color + '55' }]}>
                  {section.items.map((req, i) => (
                    <RequestRow
                      key={req.id}
                      request={req}
                      isSender={isSender}
                      onCancel={() => handleCancel(req)}
                      onChat={() => handleChat(req)}
                      onTrack={() => router.push({ pathname: '/delivery/[id]', params: { id: req.id } })}
                      onPayment={() => router.push({ pathname: '/payment/[id]', params: { id: req.id } })}
                      C={C}
                      S={S}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSub: { fontSize: FontSize.xs, marginTop: 1 },
  catBadge: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },

  parcelCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    borderTopWidth: 3, padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityBlock: { flex: 1, gap: 4 },
  cityDot: { width: 8, height: 8, borderRadius: 4 },
  cityName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  routeMid: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, gap: 4 },
  routeLine: { flex: 1, height: 1 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  catPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  parcelImage: { width: '100%', height: 160, borderRadius: BorderRadius.md },
  descBox: { borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1 },
  descText: { fontSize: FontSize.sm, lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  statLbl: { fontSize: 9, fontWeight: FontWeight.medium },
  statDiv: { width: 1, height: 28 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ownerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ownerAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  ownerName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  postedDate: { fontSize: FontSize.xs },

  chips: { flexDirection: 'row', gap: Spacing.sm },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  chipCount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  chipLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  sectionBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  sectionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, borderLeftWidth: 3, overflow: 'hidden' },

  reqRow: { padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1 },
  reqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  tAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  tName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tTime: { fontSize: FontSize.xs, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold },
  msgBox: { flexDirection: 'row', gap: Spacing.sm, borderRadius: BorderRadius.sm, padding: Spacing.sm, borderLeftWidth: 2 },
  msgText: { flex: 1, fontSize: FontSize.xs, lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  priceLabel: { fontSize: FontSize.xs },
  priceValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  progressRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm },
  pStep: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pDot: { width: 6, height: 6, borderRadius: 3 },
  pLine: { flex: 1, height: 2 },
  pLabel: { marginLeft: Spacing.sm, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, borderWidth: 1 },
  cancelBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  aBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, borderWidth: 1 },
  aBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  doneText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  loadingState: { paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm },
  emptyState: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md + 2,
  },
  findBtnText: { flex: 1, textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
