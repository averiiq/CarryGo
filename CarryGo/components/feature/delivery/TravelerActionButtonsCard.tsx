import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

export interface TravelerActionButtonsCardProps {
  currentStage: 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered';
  onMarkPickedUp: () => void;
  onStartTransit: () => void;
  onTapDelivered: () => void;
  onUpdateTransitStatus?: (status: string) => void;
  currentTransitStatus?: string;
  loading?: boolean;
  testID?: string;
}

const TRANSIT_PRESETS = [
  'On Highway',
  'Approaching Destination',
  'Arriving in 15 Mins',
  'At Drop-off Location',
];

export function TravelerActionButtonsCard({
  currentStage,
  onMarkPickedUp,
  onStartTransit,
  onTapDelivered,
  onUpdateTransitStatus,
  currentTransitStatus,
  loading = false,
  testID = 'traveler-action-buttons-card',
}: TravelerActionButtonsCardProps) {
  const { C, S } = useThemeColors();
  const [selectedTransitStatus, setSelectedTransitStatus] = useState(
    currentTransitStatus || TRANSIT_PRESETS[0]
  );

  const handleTransitPresetPress = (preset: string) => {
    Haptic.select();
    setSelectedTransitStatus(preset);
    onUpdateTransitStatus?.(preset);
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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
          <MaterialIcons name="touch-app" size={20} color="#10B981" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
            Traveler Journey Controls
          </Text>
          <Text style={[styles.cardSubtitle, { color: C.textMuted }]}>
            Update delivery milestones and release escrow payment upon handover.
          </Text>
        </View>
      </View>

      {/* When in transit, show quick transit status chips */}
      {currentStage === 'in_transit' ? (
        <View style={styles.transitPresetsSection}>
          <Text style={[styles.presetsHeading, { color: C.textMuted }]}>
            TRANSIT STATUS UPDATES
          </Text>
          <View style={styles.chipGrid}>
            {TRANSIT_PRESETS.map((preset) => {
              const isSelected = selectedTransitStatus === preset;
              return (
                <Pressable
                  key={preset}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? '#ECFDF5' : C.surfaceElevated,
                      borderColor: isSelected ? '#10B981' : C.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleTransitPresetPress(preset)}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-circle' : 'navigation'}
                    size={12}
                    color={isSelected ? '#10B981' : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? '#064E3B' : C.textPrimary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                      },
                    ]}
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Traveler Action Button based on current stage strictly in #10B981 */}
      {currentStage === 'awaiting_pickup' ? (
        <Pressable
          style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
          onPress={() => {
            Haptic.confirm();
            onMarkPickedUp();
          }}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Mark parcel as picked up"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="inventory-2" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Confirm Parcel Picked Up</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      ) : currentStage === 'picked_up' ? (
        <Pressable
          style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
          onPress={() => {
            Haptic.confirm();
            onStartTransit();
          }}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Start transit and journey"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="directions-car" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Start Transit (In Transit)</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      ) : currentStage === 'in_transit' ? (
        <Pressable
          style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
          onPress={() => {
            Haptic.confirm();
            onTapDelivered();
          }}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Mark parcel as delivered and trigger escrow release"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Mark as Delivered</Text>
              <View style={styles.escrowTriggerPill}>
                <Text style={styles.escrowTriggerText}>OTP TRIGGER</Text>
              </View>
            </>
          )}
        </Pressable>
      ) : (
        <View style={[styles.completedBanner, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
          <MaterialIcons name="verified" size={18} color="#10B981" />
          <Text style={styles.completedBannerText}>
            Delivery Completed & Escrow Funds Released
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl, // 24
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },

  // Presets
  transitPresetsSection: {
    gap: 6,
  },
  presetsHeading: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },

  // Green Action Button strictly matching index.styles.ts (#10B981)
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 50,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  escrowTriggerPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  escrowTriggerText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  completedBannerText: {
    color: '#064E3B',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
