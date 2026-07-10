import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, FontSize, FontWeight, Gradients, Spacing, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

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
  const [year, month, day] = dateKey.split('-').map(Number);
  return FULL_DATE_FORMATTER.format(new Date(year, month - 1, day));
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
  timeLabel = 'Time',
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.pickerOverlay, { backgroundColor: C.overlay }]} onPress={onClose} />
      <View style={[styles.pickerSheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.pickerHandle, { backgroundColor: C.surfaceBorderLight }]} />

        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="event-available" size={20} color={C.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>{title}</Text>
            <Text style={[styles.pickerSubtitle, { color: C.textMuted }]}>{subtitle}</Text>
          </View>
        </View>

        <Text style={[styles.pickerLabel, { color: C.textMuted }]}>Next 7 days</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
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
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => {
                  setSelectedDate(day.key);
                  Haptic.select();
                }}
              >
                <Text style={[styles.dayRelative, { color: selected ? '#fff' : C.textMuted }]}>{day.relative}</Text>
                <Text style={[styles.dayNum, { color: selected ? '#fff' : C.textPrimary }]}>{day.day}</Text>
                <Text style={[styles.dayMonth, { color: selected ? '#fff' : C.textSecondary }]}>{day.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {includeTime ? (
          <>
            <Text style={[styles.pickerLabel, { color: C.textMuted }]}>{timeLabel}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
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
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => {
                      setSelectedTime(time);
                      Haptic.select();
                    }}
                  >
                    <MaterialIcons name="schedule" size={12} color={selected ? C.primary : C.textMuted} />
                    <Text style={[styles.timeText, { color: selected ? C.primary : C.textSecondary }]}>{time}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={[styles.previewRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name={includeTime ? 'departure-board' : 'calendar-today'} size={16} color={C.primary} />
          <Text style={[styles.previewText, { color: C.textPrimary }]}>
            {selectedDay?.label}{includeTime ? ` at ${selectedTime}` : ''}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
          onPress={handleApply}
        >
          <LinearGradient
            colors={Gradients.primaryVibrant}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
          />
          <MaterialIcons name="check" size={18} color="#fff" />
          <Text style={styles.applyText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  pickerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  pickerSubtitle: { fontSize: FontSize.sm, lineHeight: 18 },
  pickerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  dayCell: {
    width: 76,
    minHeight: 86,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: Spacing.sm,
  },
  dayRelative: { fontSize: 10, fontWeight: FontWeight.semibold },
  dayNum: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  dayMonth: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  timeRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  timeText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  previewText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  applyText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
