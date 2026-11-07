import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface AdvancedFilterState {
  vehicleTypes: string[];
  dateWindow: 'all' | 'today' | 'tomorrow' | 'week';
  minCapacityKg: number;
  verifiedOnly: boolean;
  maxPrice?: number;
  parcelCategory?: string;
  sortBy: 'date_nearest' | 'price_low' | 'price_high' | 'rating_best';
}

export const DEFAULT_FILTERS: AdvancedFilterState = {
  vehicleTypes: [],
  dateWindow: 'all',
  minCapacityKg: 0,
  verifiedOnly: false,
  maxPrice: undefined,
  parcelCategory: undefined,
  sortBy: 'date_nearest',
};

interface AdvancedFilterModalProps {
  visible: boolean;
  initialFilters?: AdvancedFilterState;
  onClose: () => void;
  onApply: (filters: AdvancedFilterState) => void;
}

const VEHICLE_OPTIONS = [
  { id: 'bike', label: 'Bike', icon: 'two-wheeler' as const },
  { id: 'car', label: 'Car', icon: 'directions-car' as const },
  { id: 'bus', label: 'Bus', icon: 'directions-bus' as const },
  { id: 'train', label: 'Train', icon: 'train' as const },
  { id: 'flight', label: 'Flight', icon: 'flight' as const },
];

const DATE_WINDOWS: { id: AdvancedFilterState['dateWindow']; label: string }[] = [
  { id: 'all', label: 'Any Date' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'Next 7 Days' },
];

const CAPACITY_OPTIONS = [
  { kg: 0, label: 'Any' },
  { kg: 2, label: '2+ kg' },
  { kg: 5, label: '5+ kg' },
  { kg: 10, label: '10+ kg' },
  { kg: 20, label: '20+ kg' },
];

const SORT_OPTIONS: { id: AdvancedFilterState['sortBy']; label: string; icon: string }[] = [
  { id: 'date_nearest', label: 'Nearest Date', icon: 'schedule' },
  { id: 'price_low', label: 'Price: Low to High', icon: 'arrow-downward' },
  { id: 'price_high', label: 'Price: High to Low', icon: 'arrow-upward' },
  { id: 'rating_best', label: 'Highest Rated', icon: 'star' },
];

export function countActiveFilters(filters: AdvancedFilterState): number {
  let count = 0;
  if (filters.vehicleTypes.length > 0) count += filters.vehicleTypes.length;
  if (filters.dateWindow !== 'all') count += 1;
  if (filters.minCapacityKg > 0) count += 1;
  if (filters.verifiedOnly) count += 1;
  if (filters.maxPrice !== undefined) count += 1;
  if (filters.parcelCategory) count += 1;
  if (filters.sortBy !== 'date_nearest') count += 1;
  return count;
}

export function AdvancedFilterModal({
  visible,
  initialFilters = DEFAULT_FILTERS,
  onClose,
  onApply,
}: AdvancedFilterModalProps) {
  const insets = useSafeAreaInsets();
  const { C, isDark } = useThemeColors();
  const [filters, setFilters] = useState<AdvancedFilterState>(initialFilters);

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const toggleVehicle = (type: string) => {
    Haptic.select();
    setFilters((prev) => {
      const exists = prev.vehicleTypes.includes(type);
      return {
        ...prev,
        vehicleTypes: exists
          ? prev.vehicleTypes.filter((t) => t !== type)
          : [...prev.vehicleTypes, type],
      };
    });
  };

  const setDateWindow = (w: AdvancedFilterState['dateWindow']) => {
    Haptic.select();
    setFilters((prev) => ({ ...prev, dateWindow: w }));
  };

  const setMinCapacity = (kg: number) => {
    Haptic.select();
    setFilters((prev) => ({ ...prev, minCapacityKg: kg }));
  };

  const setSortBy = (sort: AdvancedFilterState['sortBy']) => {
    Haptic.select();
    setFilters((prev) => ({ ...prev, sortBy: sort }));
  };

  const handleReset = () => {
    Haptic.confirm();
    setFilters(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    Haptic.confirm();
    onApply(filters);
    onClose();
  };

  const activeCount = countActiveFilters(filters);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.backdrop} onPress={onClose} />

        <View
          style={[
            modalStyles.sheet,
            {
              backgroundColor: C.card,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
              borderTopColor: C.surfaceBorder,
            },
          ]}
        >
          {/* Header */}
          <View style={[modalStyles.header, { borderBottomColor: C.surfaceBorder }]}>
            <View style={modalStyles.titleRow}>
              <Text style={[modalStyles.title, { color: C.textPrimary }]}>Filters</Text>
              {activeCount > 0 && (
                <View style={[modalStyles.badge, { backgroundColor: C.primary }]}>
                  <Text style={modalStyles.badgeText}>{activeCount}</Text>
                </View>
              )}
            </View>
            <View style={modalStyles.headerActions}>
              {activeCount > 0 && (
                <Pressable onPress={handleReset} style={modalStyles.resetBtn}>
                  <Text style={[modalStyles.resetText, { color: C.textSecondary }]}>Reset</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} style={modalStyles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Filter Body */}
          <ScrollView
            style={modalStyles.scrollBody}
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Sort Order */}
            <View style={modalStyles.section}>
              <Text style={[modalStyles.sectionTitle, { color: C.textSecondary }]}>SORT BY</Text>
              <View style={modalStyles.sortGrid}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = filters.sortBy === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setSortBy(opt.id)}
                      style={[
                        modalStyles.sortChip,
                        {
                          borderColor: isSelected ? C.primary : C.surfaceBorder,
                          backgroundColor: isSelected ? (isDark ? '#00332c' : '#E6F4F1') : C.surface,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={opt.icon as any}
                        size={16}
                        color={isSelected ? C.primary : C.textSecondary}
                      />
                      <Text
                        style={[
                          modalStyles.sortChipText,
                          {
                            color: isSelected ? C.primary : C.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Transport Mode */}
            <View style={modalStyles.section}>
              <Text style={[modalStyles.sectionTitle, { color: C.textSecondary }]}>
                TRANSPORT MODE
              </Text>
              <View style={modalStyles.chipsRow}>
                {VEHICLE_OPTIONS.map((v) => {
                  const isSelected = filters.vehicleTypes.includes(v.id);
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => toggleVehicle(v.id)}
                      style={[
                        modalStyles.filterChip,
                        {
                          borderColor: isSelected ? C.primary : C.surfaceBorder,
                          backgroundColor: isSelected ? (isDark ? '#00332c' : '#E6F4F1') : C.surface,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={v.icon}
                        size={18}
                        color={isSelected ? C.primary : C.textSecondary}
                      />
                      <Text
                        style={[
                          modalStyles.chipText,
                          {
                            color: isSelected ? C.primary : C.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date Window */}
            <View style={modalStyles.section}>
              <Text style={[modalStyles.sectionTitle, { color: C.textSecondary }]}>DATE</Text>
              <View style={modalStyles.chipsRow}>
                {DATE_WINDOWS.map((d) => {
                  const isSelected = filters.dateWindow === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setDateWindow(d.id)}
                      style={[
                        modalStyles.filterChip,
                        {
                          borderColor: isSelected ? C.primary : C.surfaceBorder,
                          backgroundColor: isSelected ? (isDark ? '#00332c' : '#E6F4F1') : C.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          modalStyles.chipText,
                          {
                            color: isSelected ? C.primary : C.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Minimum Luggage Capacity */}
            <View style={modalStyles.section}>
              <Text style={[modalStyles.sectionTitle, { color: C.textSecondary }]}>
                MINIMUM CAPACITY AVAILABLE
              </Text>
              <View style={modalStyles.chipsRow}>
                {CAPACITY_OPTIONS.map((c) => {
                  const isSelected = filters.minCapacityKg === c.kg;
                  return (
                    <Pressable
                      key={c.kg}
                      onPress={() => setMinCapacity(c.kg)}
                      style={[
                        modalStyles.filterChip,
                        {
                          borderColor: isSelected ? C.primary : C.surfaceBorder,
                          backgroundColor: isSelected ? (isDark ? '#00332c' : '#E6F4F1') : C.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          modalStyles.chipText,
                          {
                            color: isSelected ? C.primary : C.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* KYC Verified Travelers Only */}
            <View style={[modalStyles.toggleRow, { borderColor: C.surfaceBorder, backgroundColor: C.surface }]}>
              <View style={modalStyles.toggleLeft}>
                <MaterialIcons name="verified-user" size={20} color={C.primary} />
                <View style={modalStyles.toggleTextCol}>
                  <Text style={[modalStyles.toggleLabel, { color: C.textPrimary }]}>Verified Travelers Only</Text>
                  <Text style={[modalStyles.toggleSub, { color: C.textSecondary }]}>
                    Only show listings from government KYC-verified members
                  </Text>
                </View>
              </View>
              <Switch
                value={filters.verifiedOnly}
                onValueChange={(val) => {
                  Haptic.select();
                  setFilters((prev) => ({ ...prev, verifiedOnly: val }));
                }}
                trackColor={{ false: C.surfaceBorder, true: C.primary }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              />
            </View>
          </ScrollView>

          {/* Footer CTA */}
          <View style={[modalStyles.footer, { borderTopColor: C.surfaceBorder }]}>
            <Pressable
              onPress={handleApply}
              style={[modalStyles.applyBtn, { backgroundColor: C.primary }]}
            >
              <Text style={modalStyles.applyBtnText}>
                {activeCount > 0 ? `Apply Filters (${activeCount})` : 'Apply Filters'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: FontSize.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  toggleSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
