import React from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { FilterOptions, VehicleType } from '@/types';
import { CITIES } from '@/constants/mockData';
import { styles } from '@/app/(tabs)/index.styles';

const VEHICLE_TYPES = [
  { type: 'bike' as VehicleType, label: 'Bike', icon: 'two-wheeler' },
  { type: 'car' as VehicleType, label: 'Car', icon: 'directions-car' },
  { type: 'bus' as VehicleType, label: 'Bus', icon: 'directions-bus' },
  { type: 'train' as VehicleType, label: 'Train', icon: 'train' },
  { type: 'flight' as VehicleType, label: 'Flight', icon: 'flight' },
];

const DEFAULT_FILTERS: FilterOptions = { fromCity: '', toCity: '', vehicleType: '', dateFrom: '', dateTo: '' };

type FilterPanelProps = {
  visible: boolean;
  filters: FilterOptions;
  onClose: () => void;
  onApply: (f: FilterOptions) => void;
  C: ThemeColors;
};

export function FilterPanel({ visible, filters, onClose, onApply, C }: FilterPanelProps) {
  const [local, setLocal] = React.useState<FilterOptions>(filters);
  const update = (key: keyof FilterOptions, val: string) => setLocal(prev => ({ ...prev, [key]: val }));

  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [filters, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: C.overlayMedium }]} onPress={onClose} />
      <View style={[styles.filterSheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.sheetHandle, { backgroundColor: C.surfaceBorderLight }]} />
        <View style={styles.filterHeaderRow}>
          <Text style={[styles.filterTitle, { color: C.textPrimary }]}>Filter Listings</Text>
          <Pressable onPress={() => { setLocal(DEFAULT_FILTERS); onApply(DEFAULT_FILTERS); onClose(); }} style={[styles.resetPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <MaterialIcons name="refresh" size={13} color={C.textSecondary} />
            <Text style={[styles.resetPillText, { color: C.textSecondary }]}>Reset</Text>
          </Pressable>
        </View>
        {[{ label: 'From City', key: 'fromCity' as const }, { label: 'To City', key: 'toCity' as const }].map(field => (
          <View key={field.key} style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: C.textMuted }]}>{field.label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, !local[field.key] && { backgroundColor: C.primary, borderColor: C.primary }]}
                  onPress={() => { Haptic.select(); update(field.key, ''); }}
                >
                  <Text style={[styles.chipText, { color: !local[field.key] ? '#fff' : C.textSecondary }]}>Any</Text>
                </Pressable>
                {CITIES.slice(0, 14).map(c => (
                  <Pressable
                    key={c}
                    style={[styles.chip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, local[field.key] === c && { backgroundColor: C.primary, borderColor: C.primary }]}
                    onPress={() => { Haptic.select(); update(field.key, c); }}
                  >
                    <Text style={[styles.chipText, { color: local[field.key] === c ? '#fff' : C.textSecondary }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: C.textMuted }]}>Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            <Pressable
              style={[styles.vehicleChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, !local.vehicleType && { backgroundColor: C.primary, borderColor: C.primary }]}
              onPress={() => { Haptic.select(); update('vehicleType', ''); }}
            >
              <MaterialIcons name="all-inclusive" size={14} color={!local.vehicleType ? '#fff' : C.textMuted} />
              <Text style={[styles.vehicleChipText, { color: !local.vehicleType ? '#fff' : C.textMuted }]}>Any</Text>
            </Pressable>
            {VEHICLE_TYPES.map(v => (
              <Pressable
                key={v.type}
                style={[styles.vehicleChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, local.vehicleType === v.type && { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => { Haptic.select(); update('vehicleType', v.type); }}
              >
                <MaterialIcons name={v.icon as any} size={14} color={local.vehicleType === v.type ? '#fff' : C.textMuted} />
                <Text style={[styles.vehicleChipText, { color: local.vehicleType === v.type ? '#fff' : C.textMuted }]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
          onPress={() => { Haptic.confirm(); onApply(local); onClose(); }}
        >
          <MaterialIcons name="tune" size={16} color="#fff" />
          <Text style={styles.applyText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
