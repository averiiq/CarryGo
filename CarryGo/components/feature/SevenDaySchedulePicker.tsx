import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSize, FontWeight, Gradients, Spacing, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

const TIMES = [
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM',
];

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function toLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatScheduleDate(dateKey: string) {
  if (!dateKey) return '';
  try {
    const cleaned = dateKey.split('T')[0];
    const parts = cleaned.split('-').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [year, month, day] = parts;
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        return FULL_DATE_FORMATTER.format(d);
      }
    }
    const fallback = new Date(dateKey);
    if (!isNaN(fallback.getTime())) {
      return FULL_DATE_FORMATTER.format(fallback);
    }
  } catch {
    // Fallback to returning raw string if formatting fails
  }
  return dateKey;
}

function getNextSevenDays() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: toLocalDateKey(date),
      day: String(date.getDate()),
      month: MONTH_FORMATTER.format(date),
      weekday: WEEKDAY_FORMATTER.format(date),
      label: FULL_DATE_FORMATTER.format(date),
      relative: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : WEEKDAY_FORMATTER.format(date),
    };
  });
}

type SevenDaySchedulePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string, time?: string) => void;
  C: ThemeColors;
  initialDate?: string;
  initialTime?: string;
  includeTime?: boolean;
  title?: string;
  subtitle?: string;
  timeLabel?: string;
  confirmLabel?: string;
};

export function SevenDaySchedulePicker({
  visible,
  onClose,
  onSelect,
  C,
  initialDate,
  initialTime,
  includeTime = true,
  title = 'Schedule within 7 days',
  subtitle = 'Choose one of the next seven days.',
  timeLabel = 'Preferred Departure Time',
  confirmLabel = 'Confirm Schedule',
}: SevenDaySchedulePickerProps) {
  const [days, setDays] = useState(() => getNextSevenDays());
  const [selectedDate, setSelectedDate] = useState(days[0]?.key ?? '');
  const [selectedTime, setSelectedTime] = useState(initialTime || '10:00 AM');

  useEffect(() => {
    if (visible) setDays(getNextSevenDays());
  }, [visible]);

  useEffect(() => {
    if (!visible || days.length === 0) return;
    const dateInRange = initialDate && days.some(day => day.key === initialDate);
    setSelectedDate(dateInRange ? initialDate : days[0].key);
    setSelectedTime(initialTime || '10:00 AM');
  }, [days, initialDate, initialTime, visible]);

  const selectedDay = days.find(day => day.key === selectedDate) ?? days[0];

  const handleApply = () => {
    if (!selectedDay) return;
    onSelect(selectedDay.key, includeTime ? selectedTime : undefined);
    onClose();
    Haptic.confirm();
  };

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="86%"
      showHandle
      enablePanDownToClose
    >
      <View style={styles.sheetBody}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="event-available" size={22} color={C.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>{title}</Text>
            <Text style={[styles.pickerSubtitle, { color: C.textMuted }]}>{subtitle}</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeCircle,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Next 7 Days Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.pickerLabel, { color: C.textMuted }]}>Choose Date</Text>
          <Text style={[styles.selectedDateBadge, { color: C.primary }]}>
            {selectedDay?.relative} ({selectedDay?.label})
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.dayRow}
        >
          {days.map(day => {
            const selected = day.key === selectedDate;

            return (
              <Pressable
                key={day.key}
                style={({ pressed }) => [
                  styles.dayCell,
                  { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                  selected && { backgroundColor: C.primary, borderColor: C.primary },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => {
                  setSelectedDate(day.key);
                  Haptic.select();
                }}
              >
                <Text style={[styles.dayRelative, { color: selected ? '#ffffff' : C.textMuted }]}>
                  {day.relative}
                </Text>
                <Text style={[styles.dayNum, { color: selected ? '#ffffff' : C.textPrimary }]}>
                  {day.day}
                </Text>
                <Text style={[styles.dayMonth, { color: selected ? 'rgba(255,255,255,0.85)' : C.textSecondary }]}>
                  {day.month}
                </Text>
                {selected && (
                  <View style={styles.selectedDot} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time Selection Carousel */}
        {includeTime ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.pickerLabel, { color: C.textMuted }]}>{timeLabel}</Text>
              <Text style={[styles.selectedTimeBadge, { color: C.primary }]}>{selectedTime}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.timeRow}
            >
              {TIMES.map(time => {
                const selected = time === selectedTime;

                return (
                  <Pressable
                    key={time}
                    style={({ pressed }) => [
                      styles.timeChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      selected && { backgroundColor: C.primarySubtle, borderColor: C.primary },
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                    onPress={() => {
                      setSelectedTime(time);
                      Haptic.select();
                    }}
                  >
                    <MaterialIcons name="schedule" size={13} color={selected ? C.primary : C.textMuted} />
                    <Text style={[styles.timeText, { color: selected ? C.primary : C.textSecondary, fontWeight: selected ? FontWeight.bold : FontWeight.medium }]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* Schedule Preview Bar */}
        <View style={[styles.previewRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={[styles.previewIconBox, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name={includeTime ? 'departure-board' : 'calendar-today'} size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewHeaderLabel, { color: C.textMuted }]}>SCHEDULE SUMMARY</Text>
            <Text style={[styles.previewText, { color: C.textPrimary }]}>
              {selectedDay?.label}{includeTime ? ` at ${selectedTime}` : ''}
            </Text>
          </View>
        </View>

        {/* Confirm Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.applyBtn,
            { backgroundColor: C.primary, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
          ]}
          onPress={handleApply}
        >
          <LinearGradient
            colors={Gradients.primaryVibrant}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
          />
          <MaterialIcons name="check-circle" size={19} color="#fff" />
          <Text style={styles.applyText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  pickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  pickerSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectedDateBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  selectedTimeBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  dayRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  dayCell: {
    width: 74,
    minHeight: 88,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    position: 'relative',
  },
  selectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: 6,
  },
  dayRelative: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 28,
  },
  dayMonth: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  timeText: {
    fontSize: FontSize.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  previewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  previewText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  applyText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
