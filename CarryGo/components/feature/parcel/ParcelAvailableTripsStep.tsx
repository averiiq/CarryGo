import React, { useState, useMemo } from 'react';
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
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import type { Trip } from '@/types';
import { ParcelDraft, PARCEL_CATEGORIES } from './types';

interface ParcelAvailableTripsStepProps {
  form: ParcelDraft;
  C: any;
  onSelectTrip: (trip: Trip) => void;
  onEditDetails: () => void;
  onPostOpenRequest: () => void;
  isPostingOpenRequest?: boolean;
}

export function ParcelAvailableTripsStep({
  form,
  C,
  onSelectTrip,
  onEditDetails,
  onPostOpenRequest,
  isPostingOpenRequest = false,
}: ParcelAvailableTripsStepProps) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<MatchSortOption>('match');

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
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>
            Searching trips on this route...
          </Text>
        </View>
      ) : sortedTrips.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="directions-car" size={32} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            No trips on this route yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
            Post your parcel request so travelers can send you offers.
          </Text>

          <Pressable
            disabled={isPostingOpenRequest}
            onPress={() => {
              Haptic.confirm();
              onPostOpenRequest();
            }}
            style={({ pressed }) => [
              styles.postRequestBtn,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isPostingOpenRequest ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.postRequestBtnText}>Post Parcel Request</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptic.tap();
              onEditDetails();
            }}
            style={({ pressed }) => [
              styles.editDetailsBtn,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="edit" size={14} color={C.textSecondary} />
            <Text style={[styles.editDetailsBtnText, { color: C.textSecondary }]}>
              Change Route or Date
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {sortedTrips.map((trip) => {
            const calculatedPrice = calculateMatchPrice(trip.pricePerKg, parcelWeightNum);
            return (
              <View key={trip.id} style={styles.tripCardWrap}>
                <BlaBlaTripCard
                  trip={trip}
                  price={calculatedPrice}
                  onPress={() => onSelectTrip(trip)}
                />
              </View>
            );
          })}
        </ScrollView>
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
    padding: Spacing.xl,
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: Spacing.xs,
  },
  postRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    width: '100%',
    justifyContent: 'center',
  },
  postRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  editDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  editDetailsBtnText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
});
