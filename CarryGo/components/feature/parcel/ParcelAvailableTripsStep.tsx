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
      {/* ── BlaBlaCar Top Header Pill ── */}
      <View style={[styles.headerPill, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to parcel details"
          onPress={() => {
            Haptic.tap();
            onEditDetails();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.headerInfoCol}>
          <View style={styles.routeRow}>
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {form.fromCity || 'Origin'}
            </Text>
            <MaterialIcons name="swap-horiz" size={16} color={C.textMuted} style={styles.swapIcon} />
            <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
              {form.toCity || 'Destination'}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: C.textMuted }]} numberOfLines={1}>
            {form.deliveryDate ? formatScheduleDate(form.deliveryDate) : 'Today'} · {parcelWeightNum} kg · {categoryLabel}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptic.select();
            browseTripsQuery.refetch();
          }}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <MaterialIcons name="refresh" size={18} color={C.textMuted} />
        </Pressable>
      </View>

      {/* ── Section Title & Sort Chips ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            Outbound · {form.deliveryDate ? formatScheduleDate(form.deliveryDate) : 'Today'}
          </Text>
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
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
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
            Searching available trips from {form.fromCity} to {form.toCity}...
          </Text>
        </View>
      ) : sortedTrips.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="directions-car" size={36} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            No Direct Trips Available Today
          </Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
            No travelers are currently traveling on the {form.fromCity} → {form.toCity} corridor on this date.
            You can list your parcel as an Open Request so traveling members can send you delivery offers!
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
              pressed && { opacity: 0.9 },
            ]}
          >
            {isPostingOpenRequest ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.postRequestBtnText}>Publish to Live Marketplace</Text>
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
              pressed && { opacity: 0.7 },
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
    paddingHorizontal: Spacing.md,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 10,
  },
  backBtn: {
    padding: 2,
  },
  headerInfoCol: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
    maxWidth: 110,
  },
  swapIcon: {
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 11,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 4,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
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
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: Spacing.sm,
  },
  postRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
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
