import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { MatchingDiagnostic, DiagnosticAction } from '@/services/smart-matching.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

interface MatchDiagnosticCardProps {
  diagnostic: MatchingDiagnostic;
  onActionPress?: (action: DiagnosticAction) => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

interface ReasonTheme {
  icon: keyof typeof MaterialIcons.glyphMap;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
}

function getReasonTheme(reason: MatchingDiagnostic['reason'], C: ThemeColors): ReasonTheme {
  switch (reason) {
    case 'capacity_exceeded':
      return {
        icon: 'fitness-center',
        badgeLabel: 'Luggage Reserve Advisory',
        badgeBg: '#FEF3C7',
        badgeColor: '#D97706',
        borderColor: '#F59E0B40',
        glowColor: '#F59E0B15',
      };
    case 'date_misaligned':
      return {
        icon: 'event-busy',
        badgeLabel: 'Itinerary Timing Advisory',
        badgeBg: '#E0F2FE',
        badgeColor: '#0284C7',
        borderColor: '#0284C740',
        glowColor: '#0284C715',
      };
    case 'price_gap':
      return {
        icon: 'payments',
        badgeLabel: 'Fare Harmony Advisory',
        badgeBg: '#F3E8FF',
        badgeColor: '#7C3AED',
        borderColor: '#8B5CF640',
        glowColor: '#8B5CF615',
      };
    case 'no_active_listings':
      return {
        icon: 'history',
        badgeLabel: 'Awaiting Active Journeys',
        badgeBg: '#F1F5F9',
        badgeColor: '#475569',
        borderColor: '#94A3B840',
        glowColor: '#94A3B815',
      };
    case 'corridor_unserved':
    default:
      return {
        icon: 'explore-off',
        badgeLabel: 'Uncharted Travel Pathway',
        badgeBg: '#FFE4E6',
        badgeColor: '#E11D48',
        borderColor: '#F43F5E40',
        glowColor: '#F43F5E15',
      };
  }
}

export function MatchDiagnosticCard({
  diagnostic,
  onActionPress,
  onRetry,
  isRetrying,
}: MatchDiagnosticCardProps) {
  const { C } = useThemeColors();
  const theme = getReasonTheme(diagnostic.reason, C);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const { details } = diagnostic;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.surface,
          borderColor: theme.borderColor,
        },
      ]}
    >
      {/* Top Banner with Bottleneck Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
          <MaterialIcons name={theme.icon} size={13} color={theme.badgeColor} />
          <Text style={[styles.badgeText, { color: theme.badgeColor }]}>
            {theme.badgeLabel}
          </Text>
        </View>

        {diagnostic.candidateCount > 0 && (
          <View style={[styles.candidatePill, { backgroundColor: C.surfaceElevated }]}>
            <Text style={[styles.candidateText, { color: C.textSecondary }]}>
              {diagnostic.candidateCount} driver{diagnostic.candidateCount > 1 ? 's' : ''} on route
            </Text>
          </View>
        )}
      </View>

      {/* Primary Diagnostic Explanation */}
      <View style={styles.titleSection}>
        <Animated.View
          style={[
            styles.iconBubble,
            {
              backgroundColor: theme.glowColor,
              borderColor: theme.borderColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MaterialIcons name={theme.icon} size={26} color={theme.badgeColor} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{diagnostic.title}</Text>
          <Text style={[styles.explanation, { color: C.textSecondary }]}>
            {diagnostic.explanation}
          </Text>
        </View>
      </View>

      {/* Metrics / Diagnostics Breakdown */}
      {details && (
        <View
          style={[
            styles.metricsStrip,
            { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
          ]}
        >
          {details.requiredCapacity !== undefined && details.maxAvailableCapacity !== undefined && (
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: C.textMuted }]}>Required Space</Text>
              <Text style={[styles.metricValue, { color: C.textPrimary }]}>
                {details.requiredCapacity} kg
              </Text>
              <Text style={[styles.metricSub, { color: C.warning }]}>
                Max spare: {details.maxAvailableCapacity} kg
              </Text>
            </View>
          )}

          {details.parcelDeliveryDate && details.earliestTripDate && (
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: C.textMuted }]}>Your Deadline</Text>
              <Text style={[styles.metricValue, { color: C.textPrimary }]}>
                {details.parcelDeliveryDate}
              </Text>
              <Text style={[styles.metricSub, { color: theme.badgeColor }]}>
                Next trip: {details.earliestTripDate}
              </Text>
            </View>
          )}

          {details.parcelPriceOffer !== undefined && details.averageTripPrice !== undefined && (
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: C.textMuted }]}>Your Offer</Text>
              <Text style={[styles.metricValue, { color: C.textPrimary }]}>
                ₹{details.parcelPriceOffer}
              </Text>
              <Text style={[styles.metricSub, { color: theme.badgeColor }]}>
                Route avg: ₹{details.averageTripPrice}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actionable Recommendations */}
      {diagnostic.actions && diagnostic.actions.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={[styles.actionsSectionTitle, { color: C.textMuted }]}>
            RECOMMENDED JOURNEY OPTIONS
          </Text>

          <View style={styles.actionCardsGroup}>
            {diagnostic.actions.map((action, index) => {
              const isPrimary = index === 0;
              return (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: isPrimary ? C.primarySubtle : C.surfaceElevated,
                      borderColor: isPrimary ? C.primary + '55' : C.surfaceBorder,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    Haptic.tap();
                    onActionPress?.(action);
                  }}
                >
                  <View
                    style={[
                      styles.actionIconBox,
                      {
                        backgroundColor: isPrimary ? C.primary : C.surface,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={(action.icon as any) || 'arrow-forward'}
                      size={16}
                      color={isPrimary ? '#FFFFFF' : C.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.actionLabel,
                        { color: isPrimary ? C.primary : C.textPrimary },
                      ]}
                    >
                      {action.label}
                    </Text>
                    <Text style={[styles.actionHint, { color: C.textMuted }]}>
                      {action.hint}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={isPrimary ? C.primary : C.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Bottom Retry / Refresh Trigger */}
      {onRetry && (
        <View style={styles.retryWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              Haptic.select();
              onRetry();
            }}
            disabled={isRetrying}
          >
            <Ionicons
              name="refresh"
              size={14}
              color={C.textMuted}
              style={isRetrying ? styles.rotating : undefined}
            />
            <Text style={[styles.retryBtnText, { color: C.textMuted }]}>
              {isRetrying ? 'Checking again...' : 'Refresh Route Matches'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  candidatePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  candidateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
    marginBottom: 4,
  },
  explanation: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  metricsStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  metricSub: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  actionsSection: {
    gap: Spacing.sm,
    marginTop: 4,
  },
  actionsSectionTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  actionCardsGroup: {
    gap: Spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  actionHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  retryWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
  },
});
