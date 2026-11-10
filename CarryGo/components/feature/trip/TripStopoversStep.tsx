import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { CitySelectModal } from '@/components/feature/CitySelectModal';
import { RouteMapCanvas } from '@/components/feature/trip/RouteMapCanvas';
import { FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  fetchRouteAlternatives,
  RouteOption,
  MAX_STOPOVERS,
} from '@/services/routing.service';
import { findCity, getDistance } from '@/constants/indian-cities';

export interface TripStopoversStepProps {
  fromCity: string;
  toCity: string;
  stopovers: string[];
  onChange: (next: string[]) => void;
  selectedRouteId?: string;
  onRouteChange?: (route: RouteOption) => void;
}

export const TripStopoversStep = memo(function TripStopoversStep({
  fromCity,
  toCity,
  stopovers,
  onChange,
  selectedRouteId: externalSelectedRouteId,
  onRouteChange,
}: TripStopoversStepProps) {
  const { C } = useThemeColors();
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch available routes and stopovers whenever departure or destination changes
  useEffect(() => {
    let cancelled = false;
    if (!fromCity || !toCity) {
      setRoutes([]);
      setActiveRouteId('');
      return;
    }

    setLoading(true);
    fetchRouteAlternatives(fromCity, toCity).then((result) => {
      if (cancelled) return;
      setLoading(false);
      setRoutes(result.routes);
      const initialId = externalSelectedRouteId || result.selectedRouteId || result.routes[0]?.id || '';
      setActiveRouteId(initialId);

      const matchedRoute = result.routes.find((r) => r.id === initialId) || result.routes[0];
      if (matchedRoute && onRouteChange) {
        onRouteChange(matchedRoute);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fromCity, toCity]);

  // Current active route object
  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) || routes[0] || null,
    [routes, activeRouteId]
  );

  const atCap = stopovers.length >= MAX_STOPOVERS;

  // Stopover suggestions specifically along the active route corridor
  const suggestions = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.suggestedStopovers || [];
  }, [activeRoute]);

  const handleSelectRoute = (routeId: string) => {
    if (routeId === activeRouteId) return;
    Haptic.select();
    setActiveRouteId(routeId);
    const chosen = routes.find((r) => r.id === routeId);
    if (chosen && onRouteChange) {
      onRouteChange(chosen);
    }
  };

  const toggleSuggestion = (city: string) => {
    if (stopovers.includes(city)) {
      Haptic.tap();
      onChange(stopovers.filter((c) => c !== city));
      return;
    }
    if (atCap) {
      Haptic.warning();
      return;
    }
    Haptic.select();
    onChange([...stopovers, city]);
  };

  const addCustomCity = (city: string) => {
    setShowAddModal(false);
    if (!city) return;
    if (city === fromCity || city === toCity) return;
    if (stopovers.includes(city)) return;
    if (atCap) {
      Haptic.warning();
      return;
    }
    Haptic.success();
    onChange([...stopovers, city]);
  };

  const removeStopover = (city: string) => {
    Haptic.tap();
    onChange(stopovers.filter((c) => c !== city));
  };

  const moveStopover = (idx: number, delta: -1 | 1) => {
    const next = [...stopovers];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    Haptic.select();
    onChange(next);
  };

  const startCityObj = useMemo(() => findCity(fromCity), [fromCity]);

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.stepInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={130}
      >
        {/* Minimal Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
            Route & Stopovers
          </Text>
          <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
            Select your preferred highway corridor and add stops along your path to carry more parcels.
          </Text>
        </View>

        {/* Real Route Map Canvas */}
        <RouteMapCanvas
          routes={routes}
          selectedRouteId={activeRouteId}
          onSelectRoute={handleSelectRoute}
          fromCity={fromCity}
          toCity={toCity}
          stopovers={stopovers}
          height={210}
          isLoading={loading}
        />

        {/* Route Alternatives Selector */}
        {routes.length > 1 ? (
          <View style={styles.routeSelectorContainer}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="alt-route" size={15} color={C.primary} />
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                Available Routes
              </Text>
              <Text style={[styles.sectionSubtitle, { color: C.textMuted }]}>
                Tap to switch corridor
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routesScroll}
            >
              {routes.map((r, idx) => {
                const isSelected = r.id === activeRouteId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => handleSelectRoute(r.id)}
                    style={({ pressed }) => [
                      styles.routeCard,
                      {
                        backgroundColor: isSelected ? C.primarySubtle : C.surface,
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                      },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <View style={styles.routeCardTop}>
                      <View style={styles.routeIndexBadge}>
                        <Text style={[styles.routeIndexText, { color: isSelected ? C.primary : C.textSecondary }]}>
                          Route {idx + 1}
                        </Text>
                      </View>
                      {r.isFastest ? (
                        <View style={[styles.fastestBadge, { backgroundColor: C.successSubtle }]}>
                          <Text style={[styles.fastestText, { color: C.success }]}>Fastest</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.routeName, { color: C.textPrimary }]} numberOfLines={1}>
                      {r.name}
                    </Text>

                    <View style={styles.routeCardMeta}>
                      <Text style={[styles.routeMetaText, { color: C.textSecondary }]}>
                        {r.distanceKm} km
                      </Text>
                      <Text style={[styles.routeMetaDot, { color: C.textMuted }]}>•</Text>
                      <Text style={[styles.routeMetaText, { color: C.textSecondary }]}>
                        {Math.floor(r.durationMin / 60)}h {r.durationMin % 60}m
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Minimal Stops Itinerary */}
        <View style={[styles.itineraryCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder, ...Shadow.sm }]}>
          <View style={styles.itineraryHeader}>
            <View style={styles.itineraryHeaderLeft}>
              <MaterialIcons name="timeline" size={16} color={C.primary} />
              <Text style={[styles.itineraryTitle, { color: C.textPrimary }]}>Trip Itinerary</Text>
            </View>
            <View style={[styles.counterBadge, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.counterBadgeText, { color: C.primary }]}>
                {stopovers.length}/{MAX_STOPOVERS} stops
              </Text>
            </View>
          </View>

          {/* Departure City */}
          <View style={styles.timelineRow}>
            <View style={[styles.timelineNode, { backgroundColor: C.success }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineCity, { color: C.textPrimary }]}>{fromCity || '—'}</Text>
              <Text style={[styles.timelineLabel, { color: C.success }]}>DEPARTURE</Text>
            </View>
          </View>

          {/* Stops */}
          {stopovers.map((s, idx) => {
            const cityObj = findCity(s);
            const dist = startCityObj && cityObj ? Math.round(getDistance(startCityObj, cityObj)) : null;

            return (
              <View key={`${s}-${idx}`} style={styles.timelineRow}>
                <View style={[styles.timelineConnector, { backgroundColor: C.surfaceBorder }]} />
                <View style={[styles.timelineStopBadge, { backgroundColor: C.primary, borderColor: C.surface }]}>
                  <Text style={styles.timelineStopNumber}>{idx + 1}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineCity, { color: C.textPrimary }]}>{s}</Text>
                  <Text style={[styles.timelineLabel, { color: C.textMuted }]}>
                    {dist ? `${dist} km from start` : `Stopover ${idx + 1}`}
                  </Text>
                </View>
                <View style={styles.timelineActions}>
                  <Pressable
                    onPress={() => moveStopover(idx, -1)}
                    disabled={idx === 0}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      idx === 0 && styles.actionBtnDisabled,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <MaterialIcons name="arrow-upward" size={14} color={idx === 0 ? C.textMuted : C.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveStopover(idx, 1)}
                    disabled={idx === stopovers.length - 1}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      idx === stopovers.length - 1 && styles.actionBtnDisabled,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <MaterialIcons name="arrow-downward" size={14} color={idx === stopovers.length - 1 ? C.textMuted : C.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeStopover(s)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="close" size={14} color={C.error} />
                  </Pressable>
                </View>
              </View>
            );
          })}

          {/* Destination City */}
          <View style={styles.timelineRow}>
            {stopovers.length > 0 ? (
              <View style={[styles.timelineConnector, { backgroundColor: C.surfaceBorder }]} />
            ) : null}
            <View style={[styles.timelineNode, { backgroundColor: C.error }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineCity, { color: C.textPrimary }]}>{toCity || '—'}</Text>
              <Text style={[styles.timelineLabel, { color: C.error }]}>DESTINATION</Text>
            </View>
          </View>
        </View>

        {/* Suggested Stopovers along this route */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="auto-awesome" size={15} color={C.primary} />
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
              Stopovers on this Route
            </Text>
          </View>

          <View style={styles.chipGrid}>
            {suggestions.map((s) => {
              const isSelected = stopovers.includes(s.city);
              return (
                <Pressable
                  key={s.city}
                  onPress={() => toggleSuggestion(s.city)}
                  disabled={atCap && !isSelected}
                  style={({ pressed }) => [
                    styles.suggestChip,
                    {
                      backgroundColor: isSelected ? C.primarySubtle : C.surface,
                      borderColor: isSelected ? C.primary : C.surfaceBorder,
                    },
                    atCap && !isSelected && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-circle' : 'add-circle-outline'}
                    size={14}
                    color={isSelected ? C.primary : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.suggestChipText,
                      { color: isSelected ? C.primary : C.textPrimary },
                    ]}
                  >
                    {s.city}
                  </Text>
                  <Text style={[styles.suggestChipDist, { color: C.textMuted }]}>
                    {s.distanceFromOriginKm}km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Add custom stop */}
        <Pressable
          onPress={() => {
            if (atCap) {
              Haptic.warning();
              return;
            }
            Haptic.tap();
            setShowAddModal(true);
          }}
          disabled={atCap}
          style={({ pressed }) => [
            styles.addCustomBtn,
            { borderColor: C.primary, backgroundColor: C.surface },
            atCap && { opacity: 0.4 },
            pressed && !atCap && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="add-location-alt" size={16} color={C.primary} />
          <Text style={[styles.addCustomText, { color: C.primary }]}>
            {atCap ? `Max ${MAX_STOPOVERS} stops reached` : '+ Add custom stopover'}
          </Text>
        </Pressable>

        {/* Helper Note */}
        <View style={styles.helperBox}>
          <MaterialIcons name="info-outline" size={13} color={C.textMuted} />
          <Text style={[styles.helperText, { color: C.textMuted }]}>
            Adding stopovers allows senders along your route to send parcels directly to those cities.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <CitySelectModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSelect={addCustomCity}
        title="Add Stopover"
        subtitle="Choose a city along your route"
        oppositeCity={toCity}
      />
    </>
  );
});

const styles = StyleSheet.create({
  stepContent: { flex: 1 },
  stepInner: {
    padding: Spacing.md,
    gap: 14,
    paddingBottom: Spacing.xl + 40,
  },
  header: { gap: 4 },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  // Route selector
  routeSelectorContainer: { gap: 8 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
  },
  routesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  routeCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: 12,
    minWidth: 148,
    maxWidth: 190,
    gap: 4,
  },
  routeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeIndexBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  routeIndexText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  fastestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  fastestText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  routeName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  routeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  routeMetaText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  routeMetaDot: {
    fontSize: 10,
  },

  // Itinerary Card
  itineraryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 14,
    gap: 12,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itineraryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itineraryTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  counterBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    minHeight: 34,
  },
  timelineConnector: {
    position: 'absolute',
    left: 7,
    top: -18,
    bottom: 18,
    width: 2,
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineStopBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -1,
  },
  timelineStopNumber: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  timelineContent: {
    flex: 1,
  },
  timelineCity: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  timelineActions: {
    flexDirection: 'row',
    gap: 2,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.3 },

  // Suggestions
  suggestionsContainer: {
    gap: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  suggestChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  suggestChipDist: {
    fontSize: 10,
  },

  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
  },
  addCustomText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  helperText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
