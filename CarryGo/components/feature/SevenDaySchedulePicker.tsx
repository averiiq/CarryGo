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

function parseTimeToMinutes(label: string): number {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

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
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const todayKey = toLocalDateKey(new Date());

  useEffect(() => {
    if (visible) {
      setDays(getNextSevenDays());
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }
  }, [visible]);

  const isTodaySelected = selectedDate === todayKey;
  const firstFutureTime = TIMES.find(t => parseTimeToMinutes(t) > nowMinutes);

  useEffect(() => {
    if (!visible || days.length === 0) return;
    const dateInRange = initialDate && days.some(day => day.key === initialDate);
    const nextDate = dateInRange ? initialDate : days[0].key;
    setSelectedDate(nextDate);

    const requestedTime = initialTime || '10:00 AM';
    if (nextDate === todayKey && parseTimeToMinutes(requestedTime) <= nowMinutes) {
      setSelectedTime(firstFutureTime || requestedTime);
    } else {
      setSelectedTime(requestedTime);
    }
  }, [days, initialDate, initialTime, visible, todayKey, nowMinutes, firstFutureTime]);

  const selectedDay = days.find(day => day.key === selectedDate) ?? days[0];
  const noFutureTimeToday = includeTime && isTodaySelected && !firstFutureTime;

  const selectedTimePast = isTodaySelected && includeTime && parseTimeToMinutes(selectedTime) <= nowMinutes;
  const canConfirm = Boolean(selectedDay) && !selectedTimePast && !noFutureTimeToday;

  const handleApply = () => {
    if (!selectedDay) return;
    if (selectedTimePast || noFutureTimeToday) {
      Haptic.error();
      return;
    }
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
            onPress={() => {
              Haptic.tap();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close schedule picker"
            style={({ pressed }) => [
              styles.closeCircle,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
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
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.dayRow}
        >
          {days.map(day => {
            const selected = day.key === selectedDate;

            return (
              <Pressable
                key={day.key}
                accessibilityRole="button"
                accessibilityLabel={`${day.relative}, ${day.day} ${day.month}`}
                accessibilityState={{ selected }}
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
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.timeRow}
            >
              {TIMES.map(time => {
                const selected = time === selectedTime;
                const isPast = isTodaySelected && parseTimeToMinutes(time) <= nowMinutes;

                return (
                  <Pressable
                    key={time}
                    accessibilityRole="button"
                    accessibilityLabel={`Time ${time}${isPast ? ' (past)' : ''}`}
                    accessibilityState={{ selected, disabled: isPast }}
                    disabled={isPast}
                    style={({ pressed }) => [
                      styles.timeChip,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      selected && !isPast && { backgroundColor: C.primarySubtle, borderColor: C.primary },
                      isPast && { opacity: 0.4 },
                      pressed && !isPast && { transform: [{ scale: 0.96 }] },
                    ]}
                    onPress={() => {
                      setSelectedTime(time);
                      Haptic.select();
                    }}
                  >
                    <MaterialIcons
                      name={isPast ? 'block' : 'schedule'}
                      size={13}
                      color={selected && !isPast ? C.primary : C.textMuted}
                    />
                    <Text
                      style={[
                        styles.timeText,
                        {
                          color: selected && !isPast ? C.primary : C.textSecondary,
                          fontWeight: selected && !isPast ? FontWeight.bold : FontWeight.medium,
                          textDecorationLine: isPast ? 'line-through' : 'none',
                        },
                      ]}
                    >
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

        {noFutureTimeToday ? (
          <Text style={[styles.pastTimeHint, { color: C.error }]}>
            No remaining time slots today. Please select another day.
          </Text>
        ) : null}

        {/* Confirm Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          accessibilityState={{ disabled: !canConfirm }}
          disabled={!canConfirm}
          style={({ pressed }) => [
            styles.applyBtn,
            { backgroundColor: C.primary, opacity: !canConfirm ? 0.5 : pressed ? 0.92 : 1, transform: [{ scale: pressed && canConfirm ? 0.99 : 1 }] },
          ]}
          onPress={handleApply}
        >
          {canConfirm ? (
            <LinearGradient
              colors={Gradients.primaryVibrant}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
            />
          ) : null}
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
  pastTimeHint: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    marginTop: -4,
  },
});
