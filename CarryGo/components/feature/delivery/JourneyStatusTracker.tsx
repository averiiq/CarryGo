import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type DeliveryProgressStage = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';

export interface JourneyStatusTrackerProps {
  currentStage: DeliveryProgressStage;
  testID?: string;
}

const JOURNEY_STEPS = [
  {
    key: 'picked_up' as const,
    label: 'Picked Up',
    subtext: 'Parcel Collected & Verified',
    icon: 'inventory-2' as const,
  },
  {
    key: 'in_transit' as const,
    label: 'In Transit',
    subtext: 'En Route to Destination',
    icon: 'local-shipping' as const,
  },
  {
    key: 'delivered' as const,
    label: 'Delivered',
    subtext: 'Verified & Escrow Released',
    icon: 'check-circle' as const,
  },
];

export function JourneyStatusTracker({
  currentStage,
  testID = 'journey-status-tracker',
}: JourneyStatusTrackerProps) {
  const { C, S } = useThemeColors();

  // Helper to determine step completion
  const getStepState = (stepKey: 'picked_up' | 'in_transit' | 'delivered') => {
    if (currentStage === 'delivered') {
      return { isCompleted: true, isActive: stepKey === 'delivered' };
    }
    if (currentStage === 'in_transit') {
      if (stepKey === 'picked_up') return { isCompleted: true, isActive: false };
      if (stepKey === 'in_transit') return { isCompleted: false, isActive: true };
      return { isCompleted: false, isActive: false };
    }
    if (currentStage === 'picked_up') {
      if (stepKey === 'picked_up') return { isCompleted: true, isActive: true };
      return { isCompleted: false, isActive: false };
    }
    // awaiting_pickup
    return { isCompleted: false, isActive: stepKey === 'picked_up' };
  };

  const getStageHeaderLabel = () => {
    switch (currentStage) {
      case 'awaiting_pickup':
        return 'Step 1: Ready for Pickup Handover';
      case 'picked_up':
        return 'Step 1 Complete: Parcel Picked Up';
      case 'in_transit':
        return 'Step 2: Journey in Transit';
      case 'delivered':
        return 'Step 3: Delivered & Escrow Released';
      default:
        return 'Live Delivery Journey';
    }
  };

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        S.card,
        {
          backgroundColor: C.card,
          borderColor: C.surfaceBorder,
        },
      ]}
    >
      {/* Header Eyebrow */}
      <View style={styles.headerRow}>
        <View style={styles.eyebrowRow}>
          <MaterialIcons name="timeline" size={14} color="#10B981" />
          <Text style={[styles.eyebrowText, { color: C.textMuted }]}>
            JOURNEY STATUS TRACKER
          </Text>
        </View>

        <View
          style={[
            styles.liveBadge,
            {
              backgroundColor: currentStage === 'delivered' ? '#ECFDF5' : '#ECFDF5',
              borderColor: '#10B981',
            },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.liveBadgeText}>
            {currentStage === 'delivered' ? 'COMPLETED' : 'IN PROGRESS'}
          </Text>
        </View>
      </View>

      <Text style={[styles.stageHeading, { color: C.textPrimary }]}>
        {getStageHeaderLabel()}
      </Text>

      {/* Visual Timeline: Picked Up ➔ In Transit ➔ Delivered */}
      <View style={styles.timelineRow}>
        {JOURNEY_STEPS.map((step, index) => {
          const { isCompleted, isActive } = getStepState(step.key);
          const isLast = index === JOURNEY_STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step Node */}
              <View style={styles.nodeColumn}>
                <View
                  style={[
                    styles.nodeCircle,
                    {
                      backgroundColor: isCompleted
                        ? '#10B981'
                        : isActive
                          ? '#ECFDF5'
                          : C.surfaceElevated,
                      borderColor: isCompleted || isActive ? '#10B981' : C.surfaceBorder,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <MaterialIcons
                      name={step.icon}
                      size={15}
                      color={isActive ? '#10B981' : C.textMuted}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.nodeTitle,
                    {
                      color: isCompleted || isActive ? C.textPrimary : C.textMuted,
                      fontWeight: isActive || isCompleted ? FontWeight.bold : FontWeight.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Connecting Line */}
              {!isLast ? (
                <View style={styles.connectorWrap}>
                  <View
                    style={[
                      styles.connectorLine,
                      {
                        backgroundColor:
                          (currentStage === 'in_transit' && index === 0) ||
                          currentStage === 'delivered'
                            ? '#10B981'
                            : C.surfaceBorder,
                      },
                    ]}
                  />
                  <MaterialIcons
                    name="arrow-forward"
                    size={12}
                    color={
                      (currentStage === 'in_transit' && index === 0) ||
                      currentStage === 'delivered'
                        ? '#10B981'
                        : C.textMuted
                    }
                    style={styles.connectorArrow}
                  />
                </View>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Active Stage Explanatory Footnote */}
      <View
        style={[
          styles.footnoteBox,
          {
            backgroundColor: C.surfaceElevated,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        <MaterialIcons
          name={currentStage === 'delivered' ? 'verified' : 'info-outline'}
          size={14}
          color="#10B981"
        />
        <Text style={[styles.footnoteText, { color: C.textSecondary }]}>
          {currentStage === 'awaiting_pickup'
            ? 'Meet the sender and confirm pickup to begin the travel route.'
            : currentStage === 'picked_up'
              ? 'Parcel collected. Tap "Start Transit" to notify the sender that you are moving.'
              : currentStage === 'in_transit'
                ? 'Travel underway. When you arrive, tap "Mark as Delivered" to trigger OTP & Escrow release.'
                : 'Escrow payment released and trip successfully closed!'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl, // 24 from index.styles.ts
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#064E3B',
    letterSpacing: 0.4,
  },
  stageHeading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.2,
  },

  // Timeline Row
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  nodeColumn: {
    alignItems: 'center',
    gap: 6,
    width: 80,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  connectorWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  connectorLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  connectorArrow: {
    position: 'absolute',
  },

  // Footnote Box
  footnoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  footnoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
  },
});
