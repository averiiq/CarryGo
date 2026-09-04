import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Animated, ScrollView, Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useMatchingTrips, useMatchingTripsOnRoute } from '@/hooks/useMatching';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useParcelQuery, useTripQuery } from '@/features/listings/queries';
import { useRequestsQuery, useCreateRequestMutation } from '@/features/requests/queries';
import { AppErrorBoundary, TripCard } from '@/components';
import { Trip } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { sendLocalNotification } from '@/services/notifications.service';
import { Haptic } from '@/services/haptics.service';
import { LinearGradient } from 'expo-linear-gradient';
import { scoreMatch, MatchScore } from '@/services/smart-matching.service';

/**
 * Matching screen supports sender-led request flow.
 *
 * 1) `mode=parcel`: sender sees matching travellers and sends request.
 * 2) `mode=browse_trips`: sender browses route-matching travellers.
 * 3) `mode=trip`: legacy route, informational only.
 */
export default function MatchingScreen() {
  const { mode, id, fromCity: fcParam, toCity: tcParam } = useLocalSearchParams<{
    mode: string; id: string; fromCity?: string; toCity?: string;
  }>();
  const { user } = useAuth();
  const isParcelMode = mode === 'parcel';
  const isTripModeLegacy = mode === 'trip';
  const isBrowseMode = mode === 'browse_trips';

  const parcelQuery = useParcelQuery(isParcelMode ? id : undefined);
  const tripQuery = useTripQuery(isTripModeLegacy ? id : undefined);
  const requestsQuery = useRequestsQuery(user?.id);
  const { mutateAsync: createRequestAsync, isPending: isCreatingRequest } = useCreateRequestMutation(user?.id);

  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'rating' | 'capacity'>('match');
  const [activeMatchDetails, setActiveMatchDetails] = useState<{
    title: string;
    score: MatchScore;
  } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  // Resolve source item
  const currentParcel = parcelQuery.data ?? null;
  const currentTrip = tripQuery.data ?? null;

  // Query-based matching
  const matchingTripsQuery = useMatchingTrips(
    isParcelMode && currentParcel
      ? {
          fromCity: currentParcel.fromCity,
          toCity: currentParcel.toCity,
          userId: currentParcel.userId,
          weight: currentParcel.weight,
          priceOffer: currentParcel.priceOffer,
          createdAt: currentParcel.createdAt,
          deliveryDate: currentParcel.deliveryDate,
          category: currentParcel.category,
          description: currentParcel.description,
        }
      : null
  );

  const browseTripsQuery = useMatchingTripsOnRoute(
    isBrowseMode && fcParam && tcParam
      ? { fromCity: fcParam, toCity: tcParam, excludeUserId: user?.id }
      : null
  );

  const matchingTrips = useMemo(
    () => (isParcelMode ? (matchingTripsQuery.data ?? []) : (browseTripsQuery.data ?? [])),
    [browseTripsQuery.data, isParcelMode, matchingTripsQuery.data]
  );
  const loading = matchingTripsQuery.isLoading || browseTripsQuery.isLoading;

  // Pre-populate sentRequests from existing requests to prevent duplicate sends
  useEffect(() => {
    const existing = new Set<string>();
    const reqs = requestsQuery.data ?? [];
    reqs.forEach(r => {
      if (r.senderId === user?.id || r.travellerId === user?.id) {
        existing.add(r.parcelId);
        existing.add(r.tripId);
      }
    });
    setSentRequests(existing);
  }, [requestsQuery.data, user?.id]);

  // Animate in when data loads
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, fadeAnim, headerScale]);

  // Sort helpers
  const sortedTrips = useMemo(() => (
    sortBy === 'match'
      ? [...matchingTrips]
      : [...matchingTrips].sort((a, b) => {
        if (sortBy === 'price') return a.pricePerKg - b.pricePerKg;
        if (sortBy === 'rating') return b.userRating - a.userRating;
        if (sortBy === 'capacity') return b.availableCapacity - a.availableCapacity;
        return 0;
      })
  ), [matchingTrips, sortBy]);
  const tripMatchBreakdowns = useMemo(() => {
    if (!currentParcel) return new Map<string, MatchScore>();
    return new Map(sortedTrips.map(trip => [trip.id, scoreMatch(trip, currentParcel)]));
  }, [sortedTrips, currentParcel]);

  // ── Send request: sender → traveller ──────────────────────────────────────
  const handleSendRequest = useCallback((trip: Trip) => {
    if (!currentParcel) return;
    if (!user) {
      Haptic.warning();
      showAlert('Sign In Required', 'Please sign in before sending a delivery request.');
      return;
    }
    if (currentParcel.userId !== user.id) {
      Haptic.warning();
      showAlert('Sender Only', 'Only the parcel owner can send request to a traveller.');
      return;
    }
    if (isCreatingRequest) {
      showAlert('Request in Progress', 'Please wait while we finish your previous request.');
      return;
    }
    if (sentRequests.has(trip.id)) {
      showAlert('Already Sent', 'You have already sent a request to this traveller for this parcel.');
      return;
    }
    const price = Math.round(trip.pricePerKg * currentParcel.weight);
    Haptic.warning();
    showAlert(
      'Send Delivery Request',
      `Ask ${trip.userName} to carry your ${currentParcel.category} (${currentParcel.weight}kg) for Rs ${price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            Haptic.confirm();
            try {
              const result = await createRequestAsync({
                parcelId: currentParcel.id,
                tripId: trip.id,
                senderId: user.id,
                senderName: user.name,
                travellerId: trip.userId,
                travellerName: trip.userName,
                status: 'pending',
                price,
                message: `Hi! I need to send my ${currentParcel.category} from ${currentParcel.fromCity} to ${currentParcel.toCity}. It weighs ${currentParcel.weight}kg.`,
              });
              if (result) {
                setSentRequests(prev => new Set([...prev, trip.id]));
                // Notify the traveller
                /* await createNotification({
                  userId: trip.userId,
                  title: 'New Delivery Request!',
                  body: `${user.name} wants you to carry a ${currentParcel.category} (${currentParcel.weight}kg) ${currentParcel.fromCity} → ${currentParcel.toCity} for Rs ${price}`,
                  type: 'new_request',
                  relatedId: result.id,
                }); */
                await sendLocalNotification('Request Sent!', `Your request was sent to ${trip.userName}`);
                Haptic.success();
                showAlert(
                  'Request Sent! 🎉',
                  `${trip.userName} will review your request. Check the Requests tab for updates.`,
                  [
                    { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
                    { text: 'Browse More', style: 'cancel' },
                  ]
                );
              } else {
                Haptic.error();
                showAlert('Error', 'Could not send request. Please try again.');
              }
            } catch {
              Haptic.error();
              showAlert('Error', 'Could not send request. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentParcel, user, sentRequests, createRequestAsync, showAlert, router, isCreatingRequest]);

  const resultCount = isTripModeLegacy ? 0 : sortedTrips.length;

  const fromCity = currentParcel?.fromCity ?? currentTrip?.fromCity ?? fcParam ?? '';
  const toCity = currentParcel?.toCity ?? currentTrip?.toCity ?? tcParam ?? '';

  const handleRepostNow = useCallback(() => {
    if (currentParcel) {
      router.push({
        pathname: '/create-parcel',
        params: {
          repost: '1',
          fromCity: currentParcel.fromCity,
          toCity: currentParcel.toCity,
          deliveryDate: currentParcel.deliveryDate ?? '',
          category: currentParcel.category,
          description: currentParcel.description,
          weight: String(currentParcel.weight),
          priceOffer: String(currentParcel.priceOffer),
        },
      });
      return;
    }

    if (currentTrip) {
      router.push({
        pathname: '/create-trip',
        params: {
          repost: '1',
          fromCity: currentTrip.fromCity,
          toCity: currentTrip.toCity,
          date: currentTrip.date,
          time: currentTrip.time,
          vehicle: currentTrip.vehicleType,
          capacity: String(currentTrip.availableCapacity),
          price: String(currentTrip.pricePerKg),
        },
      });
    }
  }, [currentParcel, currentTrip, router]);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* ── Source Card ── */}
        <Animated.View style={[
          styles.sourceCard,
          {
            backgroundColor: C.surface,
            borderColor: C.surfaceBorder,
            transform: [{ scale: headerScale }],
          },
        ]}>
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.sourceIconBox, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons
              name={isParcelMode ? 'inventory-2' : isTripModeLegacy ? 'directions-car' : 'search'}
              size={22}
              color={C.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sourceRouteRow}>
              <Text style={[styles.sourceCity, { color: C.textPrimary }]}>{fromCity}</Text>
              <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
              <Text style={[styles.sourceCity, { color: C.textPrimary }]}>{toCity}</Text>
            </View>
            {currentParcel ? (
              <Text style={[styles.sourceMeta, { color: C.textSecondary }]}>
                {currentParcel.category} · {currentParcel.weight}kg · Rs {currentParcel.priceOffer} budget
              </Text>
            ) : currentTrip ? (
              <Text style={[styles.sourceMeta, { color: C.textSecondary }]}>
                {currentTrip.date} · {currentTrip.vehicleType} · {currentTrip.availableCapacity}kg capacity
              </Text>
            ) : (
              <Text style={[styles.sourceMeta, { color: C.textSecondary }]}>
                Browsing available trips
              </Text>
            )}
          </View>
          {/* Results badge */}
          <View style={[styles.resultsBadge, { backgroundColor: loading ? C.surfaceElevated : C.primary }]}>
            {loading ? (
              <ActivityIndicator size="small" color={C.textMuted} />
            ) : (
              <Text style={styles.resultsBadgeText}>{resultCount}</Text>
            )}
          </View>
        </Animated.View>
        {/* ── What's being shown ── */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
              {loading
                ? 'Searching...'
                : isTripModeLegacy
                  ? 'Trip is live'
                  : `${resultCount} traveller${resultCount !== 1 ? 's' : ''} found`}
            </Text>
            <Text style={[styles.sectionSub, { color: C.textMuted }]}>
              {isTripModeLegacy
                ? 'Travellers receive sender requests on matching parcel routes'
                : 'Tap "Send Request" to book a traveller'}
            </Text>
          </View>
          {/* Sort controls (only for trips list) */}
          {(isParcelMode || isBrowseMode) && resultCount > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.sortRow}>
                {([
                  { key: 'match', label: 'Best match', icon: 'auto-awesome' },
                  { key: 'price', label: 'Cheapest', icon: 'payments' },
                  { key: 'rating', label: 'Top rated', icon: 'star' },
                  { key: 'capacity', label: 'Most space', icon: 'scale' },
                ] as const).map(s => (
                  <Pressable
                    key={s.key}
                    style={[
                      styles.sortChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      sortBy === s.key && { backgroundColor: C.primarySubtle, borderColor: C.primary + '88' },
                    ]}
                    onPress={() => { Haptic.select(); setSortBy(s.key); }}
                  >
                    <MaterialIcons name={s.icon as any} size={11} color={sortBy === s.key ? C.primary : C.textMuted} />
                    <Text style={[styles.sortChipText, { color: sortBy === s.key ? C.primary : C.textMuted }]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
        {/* ── Content ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <View style={[styles.loadingCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={[styles.loadingText, { color: C.textSecondary }]}>Finding matches...</Text>
              <Text style={[styles.loadingSub, { color: C.textMuted }]}>
                {isTripModeLegacy
                  ? 'Preparing your trip dashboard'
                  : 'Looking for travellers on your route'}
              </Text>
            </View>
          </View>
        ) : isParcelMode || isBrowseMode ? (
          sortedTrips.length === 0 ? (
            <EmptyMatches
              icon="directions-car"
              title="No travellers on this route"
              sub={isParcelMode
                ? 'No one is travelling this route right now. Repost quickly or subscribe for alerts when a traveller appears.'
                : 'No one is travelling this route right now. Subscribe to get notified when someone is!'}
              cta={isParcelMode ? 'Repost Now' : 'Subscribe to Route'}
              onCta={isParcelMode ? handleRepostNow : () => router.push('/subscriptions')}
              C={C}
            />
          ) : (
            <AppErrorBoundary>
              <FlashList
                data={sortedTrips}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: Spacing.md }}>
                    <TripCard
                      trip={item}
                      matchScore={isParcelMode ? tripMatchBreakdowns.get(item.id)?.total : undefined}
                      onMatchPress={isParcelMode
                        ? () => {
                          const score = tripMatchBreakdowns.get(item.id);
                          if (!score) return;
                          setActiveMatchDetails({
                            title: `${item.fromCity} → ${item.toCity}`,
                            score,
                          });
                        }
                        : undefined}
                      showRequestButton={!sentRequests.has(item.id)}
                      onRequest={() => handleSendRequest(item)}
                      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
                    />
                  </View>
                )}
                contentContainerStyle={styles.list as any}
                showsVerticalScrollIndicator={false}
              />
            </AppErrorBoundary>
          )
        ) : (
          <EmptyMatches
            icon="directions-car"
            title="Trip posted successfully"
            sub="Senders with matching routes will send requests to you. If no match happens in 24 hours, this listing auto-disables and you can repost."
            cta="Repost Now"
            onCta={handleRepostNow}
            C={C}
          />
        )}

        <MatchBreakdownSheet
          visible={Boolean(activeMatchDetails)}
          details={activeMatchDetails}
          onClose={() => setActiveMatchDetails(null)}
          C={C}
        />
      </Animated.View>
    </View>
  );
}

function MatchBreakdownSheet({ visible, details, onClose, C }: {
  visible: boolean;
  details: { title: string; score: MatchScore } | null;
  onClose: () => void;
  C: ThemeColors;
}) {
  if (!details) return null;

  const rows = [
    { label: 'Route Fit', value: details.score.breakdown.routeScore, icon: 'directions' as const },
    { label: 'Time Fit', value: details.score.breakdown.dateScore, icon: 'schedule' as const },
    { label: 'Capacity Fit', value: details.score.breakdown.capacityScore, icon: 'fitness-center' as const },
    { label: 'Price Fit', value: details.score.breakdown.priceScore, icon: 'currency-rupee' as const },
    { label: 'Rating Fit', value: details.score.breakdown.ratingScore, icon: 'star' as const },
    { label: 'Reliability', value: details.score.breakdown.reliabilityScore, icon: 'verified-user' as const },
  ];

  return (
    <Modal visible={visible} transparent animationType={'slide'} onRequestClose={onClose}>
      <Pressable style={[styles.sheetOverlay, { backgroundColor: C.overlay }]} onPress={onClose} />
      <View style={[styles.sheetContainer, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.sheetHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Why this match?</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialIcons name={'close'} size={20} color={C.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.sheetRoute, { color: C.textSecondary }]}>{details.title}</Text>

        <View style={[styles.sheetTotalCard, { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' }]}>
          <Text style={[styles.sheetTotalLabel, { color: C.textSecondary }]}>Overall Match</Text>
          <Text style={[styles.sheetTotalValue, { color: C.primary }]}>{details.score.total}%</Text>
          <Text style={[styles.sheetGrade, { color: C.textMuted }]}>{details.score.grade.toUpperCase()}</Text>
        </View>

        <View style={styles.sheetRows}>
          {rows.map((row) => (
            <View key={row.label} style={styles.sheetRow}>
              <View style={styles.sheetRowLabelWrap}>
                <MaterialIcons name={row.icon} size={14} color={C.textSecondary} />
                <Text style={[styles.sheetRowLabel, { color: C.textSecondary }]}>{row.label}</Text>
              </View>
              <Text style={[styles.sheetRowValue, { color: C.textPrimary }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function EmptyMatches({ icon, title, sub, cta, onCta, C }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string; sub: string; cta: string; onCta: () => void; C: ThemeColors;
}) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();
  }, [bounceAnim]);

  return (
    <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[
        styles.emptyIconBox,
        { backgroundColor: C.surfaceElevated, transform: [{ scale: bounceAnim }] },
      ]}>
        <MaterialIcons name={icon} size={40} color={C.textMuted} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: C.textMuted }]}>{sub}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.emptyCta,
          { backgroundColor: C.primarySubtle, borderColor: C.primary + '55' },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => { Haptic.tap(); onCta(); }}
      >
        <Ionicons name="notifications-outline" size={15} color={C.primary} />
        <Text style={[styles.emptyCtaText, { color: C.primary }]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    margin: Spacing.md, marginBottom: 0,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, overflow: 'hidden',
  },
  sourceIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sourceRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceCity: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sourceMeta: { fontSize: FontSize.xs, marginTop: 3 },
  resultsBadge: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  resultsBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionSub: { fontSize: FontSize.xs, marginTop: 1 },

  sortRow: { flexDirection: 'row', gap: Spacing.sm },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  sortChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  loadingWrap: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, justifyContent: 'center' },
  loadingCard: {
    alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md,
    borderRadius: BorderRadius.xl, borderWidth: 1,
  },
  loadingText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  loadingSub: { fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },

  sheetOverlay: { flex: 1 },
  sheetContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 2,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sheetRoute: { fontSize: FontSize.sm, marginTop: -2 },
  sheetTotalCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  sheetTotalLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sheetTotalValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  sheetGrade: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sheetRows: { gap: 6, marginTop: 4 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  sheetRowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetRowLabel: { fontSize: FontSize.sm },
  sheetRowValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  emptyWrap: {
    margin: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1,
    paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg,
    alignItems: 'center', gap: Spacing.sm,
  },
  emptyIconBox: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, textAlign: 'center' },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, maxWidth: 270 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: Spacing.sm,
  },
  emptyCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
