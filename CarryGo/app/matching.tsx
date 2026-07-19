import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Animated, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useMatchingTrips, useMatchingParcels, useMatchingTripsOnRoute } from '@/hooks/useMatching';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useParcelQuery, useTripQuery } from '@/features/listings/queries';
import { useRequestsQuery, useCreateRequestMutation } from '@/features/requests/queries';
import { AppErrorBoundary, TripCard, ParcelCard } from '@/components';
import { Request, Trip, Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { sendLocalNotification } from '@/services/notifications.service';
import { Haptic } from '@/services/haptics.service';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Matching screen — two flows:
 *
 * 1. mode = 'parcel', id = parcelId
 *    → User is a SENDER who just listed a parcel (or clicked another user's parcel from feed)
 *    → Show all traveller trips on the same route
 *    → User can "Send Request" to a traveller
 *
 * 2. mode = 'trip', id = tripId
 *    → User is a TRAVELLER who just posted a trip (or clicked a trip from feed)
 *    → Show all open parcels on the same route
 *    → User can "Offer to Carry" a parcel
 *
 * 3. mode = 'browse_trips' (no parcel created yet — sender browsing travellers)
 *    → fromCity + toCity params provided
 *    → Show all trips; user taps one to open parcel creation flow first
 */
export default function MatchingScreen() {
  const { mode, id, fromCity: fcParam, toCity: tcParam } = useLocalSearchParams<{
    mode: string; id: string; fromCity?: string; toCity?: string;
  }>();
  const { user } = useAuth();
  const isParcelMode = mode === 'parcel';
  const isTripMode = mode === 'trip';
  const isBrowseMode = mode === 'browse_trips';

  const parcelQuery = useParcelQuery(isParcelMode ? id : undefined);
  const tripQuery = useTripQuery(isTripMode ? id : undefined);
  const requestsQuery = useRequestsQuery(user?.id);
  const { mutateAsync: createRequestAsync } = useCreateRequestMutation(user?.id);

  const { showAlert } = useAlert();
  const { C } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'capacity'>('price');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  // Resolve source item
  const currentParcel = parcelQuery.data ?? null;
  const currentTrip = tripQuery.data ?? null;

  // Query-based matching
  const matchingTripsQuery = useMatchingTrips(
    isParcelMode && currentParcel
      ? { fromCity: currentParcel.fromCity, toCity: currentParcel.toCity, userId: currentParcel.userId, weight: currentParcel.weight }
      : null
  );

  const matchingParcelsQuery = useMatchingParcels(
    isTripMode && currentTrip
      ? { fromCity: currentTrip.fromCity, toCity: currentTrip.toCity, userId: currentTrip.userId, availableCapacity: currentTrip.availableCapacity }
      : null
  );

  const browseTripsQuery = useMatchingTripsOnRoute(
    isBrowseMode && fcParam && tcParam
      ? { fromCity: fcParam, toCity: tcParam, excludeUserId: user?.id }
      : null
  );

  const matchingTrips = isParcelMode
    ? (matchingTripsQuery.data ?? [])
    : (browseTripsQuery.data ?? []);
  const matchingParcels = matchingParcelsQuery.data ?? [];
  const loading = matchingTripsQuery.isLoading || matchingParcelsQuery.isLoading || browseTripsQuery.isLoading;

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
  const sortedTrips = [...matchingTrips].sort((a, b) => {
    if (sortBy === 'price') return a.pricePerKg - b.pricePerKg;
    if (sortBy === 'rating') return b.userRating - a.userRating;
    if (sortBy === 'capacity') return b.availableCapacity - a.availableCapacity;
    return 0;
  });
  const sortedParcels = [...matchingParcels].sort((a, b) => b.priceOffer - a.priceOffer);

  // ── Send request: sender → traveller ──────────────────────────────────────
  const handleSendRequest = useCallback((trip: Trip) => {
    if (!currentParcel || !user) return;
    if (sentRequests.has(trip.id)) {
      showAlert('Already Sent', 'You have already sent a request to this traveller for this parcel.');
      return;
    }
    const price = Math.round(trip.pricePerKg * currentParcel.weight);
    Haptic.warning();
    showAlert(
      'Send Delivery Request',
      `Ask ${trip.userName} to carry your ${currentParcel.category} (${currentParcel.weight}kg) for ₹${price}?`,
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
                  body: `${user.name} wants you to carry a ${currentParcel.category} (${currentParcel.weight}kg) ${currentParcel.fromCity} → ${currentParcel.toCity} for ₹${price}`,
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
            } catch (error) {
              Haptic.error();
              showAlert('Error', 'Could not send request. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentParcel, user, sentRequests, createRequestAsync, showAlert, router]);

  // ── Offer to carry: traveller → parcel owner ──────────────────────────────
  const handleCarryParcel = useCallback((parcel: Parcel) => {
    if (!currentTrip || !user) return;
    if (sentRequests.has(parcel.id)) {
      showAlert('Already Offered', 'You have already offered to carry this parcel.');
      return;
    }
    Haptic.warning();
    showAlert(
      'Offer to Carry',
      `Offer to carry "${parcel.description}" (${parcel.weight}kg) from ${parcel.fromCity} to ${parcel.toCity} for ₹${parcel.priceOffer}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Offer',
          onPress: async () => {
            Haptic.confirm();
            try {
              const result = await createRequestAsync({
                parcelId: parcel.id,
                tripId: currentTrip.id,
                // The sender is the parcel owner
                senderId: parcel.userId,
                senderName: parcel.userName,
                // The traveller is the current user
                travellerId: user.id,
                travellerName: user.name,
                status: 'pending',
                price: parcel.priceOffer,
                message: `Hi! I am travelling ${currentTrip.fromCity} → ${currentTrip.toCity} on ${currentTrip.date} and can carry your parcel safely.`,
              });
              if (result) {
                setSentRequests(prev => new Set([...prev, parcel.id]));
                // Notify the parcel owner
                /* await createNotification({
                  userId: parcel.userId,
                  title: 'Traveller Offer! 🚀',
                  body: `${user.name} can carry your ${parcel.category} from ${parcel.fromCity} to ${parcel.toCity} for ₹${parcel.priceOffer}`,
                  type: 'new_request',
                  relatedId: result.id,
                }); */
                await sendLocalNotification('Offer Sent!', `Your offer was sent to ${parcel.userName}`);
                Haptic.success();
                showAlert(
                  'Offer Sent! 🎉',
                  `${parcel.userName} will review your offer. Check the Requests tab for their response.`,
                  [
                    { text: 'View Requests', onPress: () => router.push('/(tabs)/requests') },
                    { text: 'Browse More', style: 'cancel' },
                  ]
                );
              } else {
                Haptic.error();
                showAlert('Error', 'Could not send offer. Please try again.');
              }
            } catch (error) {
              Haptic.error();
              showAlert('Error', 'Could not send offer. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentTrip, user, sentRequests, createRequestAsync, showAlert, router]);

  const resultCount = isParcelMode || isBrowseMode ? sortedTrips.length : sortedParcels.length;

  const fromCity = currentParcel?.fromCity ?? currentTrip?.fromCity ?? fcParam ?? '';
  const toCity = currentParcel?.toCity ?? currentTrip?.toCity ?? tcParam ?? '';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* ── Source Card ── */}
        <Animated.View style={[
          styles.sourceCard,
          {
            backgroundColor: C.primarySubtle,
            borderColor: C.primary + '44',
            transform: [{ scale: headerScale }],
          },
        ]}>
          <LinearGradient
            colors={[C.primary + '12', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.sourceIconBox, { backgroundColor: C.primary + '20' }]}>
            <MaterialIcons
              name={isParcelMode ? 'inventory-2' : isTripMode ? 'directions-car' : 'search'}
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
                {currentParcel.category} · {currentParcel.weight}kg · ₹{currentParcel.priceOffer} budget
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
                : isParcelMode || isBrowseMode
                ? `${resultCount} traveller${resultCount !== 1 ? 's' : ''} found`
                : `${resultCount} parcel${resultCount !== 1 ? 's' : ''} found`}
            </Text>
            <Text style={[styles.sectionSub, { color: C.textMuted }]}>
              {isParcelMode || isBrowseMode
                ? 'Tap "Send Request" to book a traveller'
                : 'Tap "Offer to Carry" to earn on this route'}
            </Text>
          </View>
          {/* Sort controls (only for trips list) */}
          {(isParcelMode || isBrowseMode) && resultCount > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.sortRow}>
                {([
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
                {isParcelMode || isBrowseMode
                  ? 'Looking for travellers on your route'
                  : 'Looking for parcels to carry'}
              </Text>
            </View>
          </View>
        ) : isParcelMode || isBrowseMode ? (
          sortedTrips.length === 0 ? (
            <EmptyMatches
              icon="directions-car"
              title="No travellers on this route"
              sub="No one is travelling this route right now. Subscribe to get notified when someone is!"
              cta="Subscribe to Route"
              onCta={() => router.push('/subscriptions')}
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
          sortedParcels.length === 0 ? (
            <EmptyMatches
              icon="inventory-2"
              title="No parcels on this route"
              sub="No one needs delivery on your route right now. Check back later or browse other routes."
              cta="Search Other Routes"
              onCta={() => router.push('/search')}
              C={C}
            />
          ) : (
            <AppErrorBoundary>
              <FlashList
                data={sortedParcels}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: Spacing.md }}>
                    <ParcelCard
                      parcel={item}
                      showCarryButton={!sentRequests.has(item.id)}
                      onCarry={() => handleCarryParcel(item)}
                      onPress={() => router.push({ pathname: '/parcel/[id]', params: { id: item.id } })}
                    />
                  </View>
                )}
                contentContainerStyle={styles.list as any}
                showsVerticalScrollIndicator={false}
              />
            </AppErrorBoundary>
          )
        )}
      </Animated.View>
    </View>
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
  }, []);

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
