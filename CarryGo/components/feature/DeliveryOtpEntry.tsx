import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { DELIVERY_OTP_LENGTH } from '@/constants/security';

type DeliveryOtpEntryProps = {
  value: string;
  onChange: (v: string) => void;
  C: ThemeColors;
};

export function DeliveryOtpEntry({ value, onChange, C }: DeliveryOtpEntryProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable style={styles.otpEntryWrap} onPress={() => inputRef.current?.focus()}>
      <View style={styles.otpEntryDigits}>
        {Array.from({ length: DELIVERY_OTP_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.otpEntryBox,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              value[i] ? { borderColor: C.primary, backgroundColor: C.primarySubtle } : null,
              i === value.length ? { borderColor: C.primary, borderWidth: 2 } : null,
            ]}
          >
            <Text style={[styles.otpEntryDigitText, { color: C.primary }]}>
              {value[i] || ''}
            </Text>
            {i === value.length && !value[i] ? (
              <View style={[styles.cursor, { backgroundColor: C.primary }]} />
            ) : null}
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, DELIVERY_OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={DELIVERY_OTP_LENGTH}
        accessibilityLabel="OTP entry"
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  otpEntryWrap: { alignItems: 'center', gap: Spacing.md },
  otpEntryDigits: { flexDirection: 'row', gap: Spacing.sm },
  otpEntryBox: {
    width: 44, height: 56, borderRadius: BorderRadius.md,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  otpEntryDigitText: { fontSize: 24, fontWeight: FontWeight.bold },
  cursor: { width: 2, height: 24, position: 'absolute' },
  hiddenInput: { height: 0, opacity: 0, position: 'absolute' },
});
