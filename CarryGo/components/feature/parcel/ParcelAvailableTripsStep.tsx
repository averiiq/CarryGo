import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useMatchingTripsOnRoute } from '@/hooks/useMatching';
import { BlaBlaTripCard } from '@/components/feature/BlaBlaTripCard';
import {
  sortMatchingTrips,
  calculateMatchPrice,
  MatchSortOption,
} from '@/components/feature/matching/matchingHelpers';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { Haptic } from '@/services/haptics.service';
import { isUserSubscribedToRoute } from '@/services/subscriptions.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import type { Trip } from '@/types';
import { ParcelDraft, PARCEL_CATEGORIES } from './types';
import { LottieAnimation } from '@/components/ui/LottieViewWrapper';

interface ParcelAvailableTripsStepProps {
  form: ParcelDraft;
  C: any;
  onSelectTrip: (trip: Trip) => void;
  onEditDetails: () => void;
  onPostOpenRequest: () => void;
  isPostingOpenRequest?: boolean;
  onSetRouteAlert?: () => Promise<boolean> | void;
}

export function ParcelAvailableTripsStep({
  form,
  C,
  onSelectTrip,
  onEditDetails,
  onPostOpenRequest,
  isPostingOpenRequest = false,
  onSetRouteAlert,
}: ParcelAvailableTripsStepProps) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<MatchSortOption>('match');
  const [isAlertSubscribed, setIsAlertSubscribed] = useState(false);
  const [isSettingAlert, setIsSettingAlert] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user?.id && form.fromCity && form.toCity) {
      isUserSubscribedToRoute(user.id, form.fromCity, form.toCity)
        .then((subscribed) => {
          if (isMounted) setIsAlertSubscribed(subscribed);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id, form.fromCity, form.toCity]);

  const handleAlertPress = useCallback(async () => {
    if (isAlertSubscribed) {
      Haptic.select();
      return;
    }
    if (!onSetRouteAlert || isSettingAlert) return;
    setIsSettingAlert(true);
    try {
      const result = await onSetRouteAlert();
      if (result !== false) {
        setIsAlertSubscribed(true);
        Haptic.success();
      }
    } catch {
      Haptic.error();
    } finally {
      setIsSettingAlert(false);
    }
  }, [isAlertSubscribed, onSetRouteAlert, isSettingAlert]);

  const browseTripsQuery = useMatchingTripsOnRoute(
    form.fromCity && form.toCity
      ? { fromCity: form.fromCity, toCity: form.toCity, excludeUserId: user?.id }
      : null
  );

  const rawTrips = useMemo(
    () => browseTripsQuery.data?.matches ?? [],
    [browseTripsQuery.data]
  );

  const sortedTrips = useMemo(
    () => sortMatchingTrips(rawTrips, sortBy),
    [rawTrips, sortBy]
  );

  const categoryLabel = useMemo(() => {
    const found = PARCEL_CATEGORIES.find((cat) => cat.type === form.category);
    return found ? found.label : 'Parcel';
  }, [form.category]);

  const parcelWeightNum = Number(form.weight) || 1;
  const isLoading = browseTripsQuery.isLoading;

  // v2 (BlaBlaCar-style): search-first flow. The empty state no longer
  // auto-lists to the marketplace — senders explicitly choose between
  // waiting for a traveller or posting open.

  return (
    <View style={styles.container}>
      {/* ── Summary Card Header ── */}
      <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={styles.summaryTop}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {form.fromCity || 'Origin'}
            </Text>
            <MaterialIcons name="arrow-forward" size={14} color={C.textMuted} />
            <View style={[styles.routeDot, { backgroundColor: C.error }]} />
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {form.toCity || 'Destination'}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Haptic.select();
              browseTripsQuery.refetch();
            }}
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: C.surfaceElevated },
              pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
            ]}
            hitSlop={8}
          >
            <MaterialIcons name="refresh" size={16} color={C.textMuted} />
          </Pressable>
        </View>

        <View style={styles.summaryMeta}>
          <View style={[styles.metaPill, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="event" size={12} color={C.textMuted} />
            <Text style={[styles.metaText, { color: C.textSecondary }]}>
              {form.deliveryDate ? formatScheduleDate(form.deliveryDate) : 'Today'}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="scale" size={12} color={C.textMuted} />
            <Text style={[styles.metaText, { color: C.textSecondary }]}>{parcelWeightNum} kg</Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: C.surfaceElevated }]}>
            <MaterialIcons name="inventory-2" size={12} color={C.textMuted} />
            <Text style={[styles.metaText, { color: C.textSecondary }]}>{categoryLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Section Title & Sort Chips ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Available Trips</Text>
          {sortedTrips.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.countBadgeText, { color: C.primary }]}>
                {sortedTrips.length} {sortedTrips.length === 1 ? 'trip' : 'trips'}
              </Text>
            </View>
          ) : null}
        </View>

        {sortedTrips.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
            <View style={styles.sortRow}>
              {([
                { key: 'match' as MatchSortOption, label: 'Best match', icon: 'auto-awesome' as const },
                { key: 'price' as MatchSortOption, label: 'Cheapest', icon: 'payments' as const },
                { key: 'rating' as MatchSortOption, label: 'Top rated', icon: 'star' as const },
                { key: 'capacity' as MatchSortOption, label: 'Most space', icon: 'scale' as const },
              ] as const).map((s) => {
                const isSelected = sortBy === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => {
                      Haptic.select();
                      setSortBy(s.key);
                    }}
                    style={({ pressed }) => [
                      styles.sortChip,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <MaterialIcons
                      name={s.icon}
                      size={12}
                      color={isSelected ? C.primary : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.sortChipText,
                        { color: isSelected ? C.primary : C.textSecondary },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </View>

      {/* ── Content: Trip List or Empty State ── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
            <LottieAnimation name="matching" style={{ width: 140, height: 110 }} />
          </View>
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>
            Searching trips on this route...
          </Text>
        </View>
      ) : sortedTrips.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={{ width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs }}>
            <LottieAnimation name="locationFetch" style={{ width: 140, height: 110 }} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            {isPostingOpenRequest ? 'Publishing to Marketplace...' : 'No Trips on This Route Yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
            {isPostingOpenRequest
              ? 'Listing your parcel live so travellers on this route can discover it.'
              : `No active travellers found between ${form.fromCity || 'Origin'} and ${form.toCity || 'Destination'}. Choose an option below to proceed:`}
          </Text>

          <View style={styles.actionCardsContainer}>
            {/* 1. Primary Action: Post to Live Marketplace */}
            <Pressable
              disabled={isPostingOpenRequest}
              onPress={() => {
                Haptic.confirm();
                onPostOpenRequest();
              }}
              style={({ pressed }) => [
                styles.primaryActionCard,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                isPostingOpenRequest && { opacity: 0.8 },
              ]}
            >
              <View style={styles.primaryActionIconBox}>
                <MaterialIcons name="rocket-launch" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextCol}>
                <View style={styles.actionHeaderRow}>
                  <Text style={styles.primaryActionTitle}>
                    {isPostingOpenRequest ? 'Publishing to Marketplace...' : 'Post to Live Marketplace'}
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.primaryActionSubtitle}>
                  List your parcel live. Verified travellers on this route will see it and can offer to carry it.
                </Text>
              </View>
              {isPostingOpenRequest ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 6 }} />
              ) : (
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              )}
            </Pressable>

            {/* 2. Secondary Action: Notify Me When a Trip Opens */}
            {onSetRouteAlert ? (
              <Pressable
                disabled={isSettingAlert}
                onPress={handleAlertPress}
                style={({ pressed }) => [
                  styles.secondaryActionCard,
                  {
                    backgroundColor: isAlertSubscribed ? (C.successSubtle || 'rgba(0, 139, 72, 0.08)') : C.surfaceElevated,
                    borderColor: isAlertSubscribed ? (C.success || '#008B48') : C.surfaceBorder,
                  },
                  pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                ]}
              >
                <View
                  style={[
                    styles.secondaryActionIconBox,
                    {
                      backgroundColor: isAlertSubscribed
                        ? (C.successSubtle || 'rgba(0, 139, 72, 0.15)')
                        : C.primarySubtle,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isAlertSubscribed ? 'notifications-active' : 'notifications'}
                    size={20}
                    color={isAlertSubscribed ? (C.success || '#008B48') : C.primary}
                  />
                </View>
                <View style={styles.actionTextCol}>
                  <View style={styles.actionHeaderRow}>
                    <Text
                      style={[
                        styles.secondaryActionTitle,
                        { color: isAlertSubscribed ? (C.success || '#008B48') : C.textPrimary },
                      ]}
                    >
                      {isAlertSubscribed ? 'Route Alert Active 🔔' : 'Notify Me When a Trip Opens'}
                    </Text>
                    {isAlertSubscribed ? (
                      <View style={[styles.activePillBadge, { backgroundColor: C.successSubtle }]}>
                        <MaterialIcons name="check" size={11} color={C.success || '#008B48'} />
                        <Text style={[styles.activePillText, { color: C.success || '#008B48' }]}>ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.secondaryActionSubtitle, { color: C.textSecondary }]}>
                    {isAlertSubscribed
                      ? 'You will receive instant notification the moment a traveller posts a trip on this route.'
                      : 'Get alerted on your phone the moment a traveller opens a trip on this route.'}
                  </Text>
                </View>
                {isSettingAlert ? (
                  <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 6 }} />
                ) : isAlertSubscribed ? (
                  <MaterialIcons name="check-circle" size={20} color={C.success || '#008B48'} style={{ marginLeft: 6 }} />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color={C.textMuted} style={{ marginLeft: 6 }} />
                )}
              </Pressable>
            ) : null}

            {/* 3. Utility Action: Change Route or Date */}
            <Pressable
              onPress={() => {
                Haptic.tap();
                onEditDetails();
              }}
              style={({ pressed }) => [
                styles.tertiaryActionCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.surfaceBorder,
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
              ]}
            >
              <View style={[styles.secondaryActionIconBox, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="edit-calendar" size={18} color={C.textSecondary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={[styles.tertiaryActionTitle, { color: C.textPrimary }]}>
                  Change Route or Date
                </Text>
                <Text style={[styles.tertiaryActionSubtitle, { color: C.textMuted }]}>
                  Adjust cities or pick another delivery day to discover more travellers.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={C.textMuted} style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Helper strip — clarifies the primary action */}
          <View style={[styles.helperStrip, { backgroundColor: C.primarySubtle, borderColor: C.primary + '22' }]}>
            <MaterialIcons name="touch-app" size={14} color={C.primary} />
            <Text style={[styles.helperStripText, { color: C.textSecondary }]}>
              Tap a trip to send your parcel request to that traveller.
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {sortedTrips.map((trip) => {
              const calculatedPrice = calculateMatchPrice(trip.pricePerKg, parcelWeightNum);
              const viaStop = (trip.stopovers || []).length > 0
                && (form.fromCity.trim().toLowerCase() !== (trip.fromCity || '').trim().toLowerCase()
                  || form.toCity.trim().toLowerCase() !== (trip.toCity || '').trim().toLowerCase());
              const matchedSegment = viaStop
                ? { from: form.fromCity, to: form.toCity, viaStopover: true as const }
                : undefined;
              return (
                <View key={trip.id} style={styles.tripCardWrap}>
                  <BlaBlaTripCard
                    trip={trip}
                    price={calculatedPrice}
                    matchedSegment={matchedSegment}
                    onPress={() => onSelectTrip(trip)}
                  />
                </View>
              );
            })}

            {/* Fallback — list on marketplace instead of picking a trip */}
            <View style={[styles.fallbackCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={[styles.fallbackIconCircle, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="campaign" size={20} color={C.primary} />
              </View>
              <Text style={[styles.fallbackTitle, { color: C.textPrimary }]}>
                None of these fit your schedule?
              </Text>
              <Text style={[styles.fallbackSubtitle, { color: C.textMuted }]}>
                List your parcel on the marketplace — other travellers can discover it and send you offers.
              </Text>
              <Pressable
                disabled={isPostingOpenRequest}
                onPress={() => {
                  Haptic.confirm();
                  onPostOpenRequest();
                }}
                style={({ pressed }) => [
                  styles.fallbackBtn,
                  { backgroundColor: C.primary },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  isPostingOpenRequest && { opacity: 0.8 },
                ]}
              >
                {isPostingOpenRequest ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.fallbackBtnText, { color: '#FFFFFF' }]}>Publishing to Marketplace...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="rocket-launch" size={16} color="#FFFFFF" />
                    <Text style={[styles.fallbackBtnText, { color: '#FFFFFF' }]}>List on Live Marketplace</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /* No extra horizontal padding — WizardContainer already provides it */
  },

  /* Summary card replaces cramped pill header */
  summaryCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    maxWidth: 120,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMeta: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  metaText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },

  sectionHeader: {
    marginBottom: Spacing.smd,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  sortScroll: {
    flexGrow: 0,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 90,
  },
  tripCardWrap: {
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.xs,
  },
  actionCardsContainer: {
    width: '100%',
    gap: Spacing.smd,
    marginTop: Spacing.sm,
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.smd,
    shadowColor: '#004AAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTextCol: {
    flex: 1,
    gap: 3,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryActionTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  primaryActionSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 15,
  },
  recommendedBadge: {
    backgroundColor: '#008B48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  secondaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.smd,
  },
  secondaryActionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secondaryActionTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
  },
  secondaryActionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  activePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  tertiaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.smd,
  },
  tertiaryActionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  tertiaryActionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  helperStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  helperStripText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  fallbackCard: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  fallbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fallbackTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
    marginBottom: Spacing.xs,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    width: '100%',
    justifyContent: 'center',
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
});
